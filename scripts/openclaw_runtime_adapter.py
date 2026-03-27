#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
import subprocess
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path
from typing import Any

ACTIVE_WINDOW_MS = 2 * 60 * 60 * 1000
SESSION_TYPE_PERSISTENT = "persistent"
SESSION_TYPE_ONE_SHOT = "one_shot"


def resolve_openclaw_bin() -> str:
    found = shutil.which("openclaw")
    if found:
        return found
    fallback = Path.home() / ".npm-global/bin/openclaw"
    if fallback.exists():
        return str(fallback)
    raise FileNotFoundError(
        "openclaw binary not found in PATH or ~/.npm-global/bin/openclaw"
    )


def run_capture(cmd: list[str]) -> str:
    return subprocess.check_output(cmd, text=True, stderr=subprocess.STDOUT)


def extract_first_json(text: str) -> Any:
    decoder = json.JSONDecoder()
    for idx, ch in enumerate(text):
        if ch not in "{[":
            continue
        try:
            obj, _ = decoder.raw_decode(text[idx:])
            return obj
        except json.JSONDecodeError:
            continue
    raise RuntimeError("No JSON payload found in command output")


def run_optional_capture(cmd: list[str]) -> str | None:
    try:
        return run_capture(cmd)
    except (FileNotFoundError, subprocess.CalledProcessError):
        return None


def _to_int(value: Any, default: int = 0) -> int:
    try:
        return max(int(value), 0)
    except (TypeError, ValueError):
        return default


def _first_non_none(*values: Any) -> Any:
    for value in values:
        if value is not None:
            return value
    return None


def _normalize_session_type(raw_value: Any) -> str | None:
    value = str(raw_value or "").strip().lower()
    if value in {"persistent", "session"}:
        return SESSION_TYPE_PERSISTENT
    if value in {"oneshot", "one-shot", "one_shot", "run"}:
        return SESSION_TYPE_ONE_SHOT
    return None


def _session_type_sort_key(session_type: str) -> tuple[int, str]:
    order = {
        SESSION_TYPE_PERSISTENT: 0,
        SESSION_TYPE_ONE_SHOT: 1,
    }
    return (order.get(session_type, 99), session_type)


def classify_session_type(session: dict[str, Any]) -> str:
    for key in ("session_type", "sessionType", "mode", "kindMode"):
        normalized = _normalize_session_type(session.get(key))
        if normalized:
            return normalized

    session_key = str(session.get("key") or "")
    lowered = session_key.lower()
    if ":subagent:" in lowered or ":run:" in lowered or "oneshot" in lowered:
        return SESSION_TYPE_ONE_SHOT
    return SESSION_TYPE_PERSISTENT


def coerce_timestamp(value: Any) -> datetime | None:
    if value is None:
        return None
    try:
        if isinstance(value, (int, float)):
            timestamp = float(value)
            if timestamp > 10_000_000_000:
                timestamp /= 1000.0
            return datetime.fromtimestamp(timestamp).astimezone()
        if isinstance(value, str) and value.strip():
            return datetime.fromisoformat(value.strip().replace("Z", "+00:00")).astimezone()
    except (TypeError, ValueError, OSError):
        return None
    return None


def session_updated_on_date(
    *,
    session: dict[str, Any],
    store_entry: dict[str, Any],
    recent_entry: dict[str, Any],
    target_date: date,
) -> bool:
    for source in (session, store_entry, recent_entry):
        if not isinstance(source, dict):
            continue
        for key in ("updatedAt", "updated_at", "timestamp", "ts"):
            moment = coerce_timestamp(source.get(key))
            if moment is not None:
                return moment.date() == target_date
    return True


def load_store_entries(session_sources: dict[str, Any]) -> dict[str, dict[str, Any]]:
    entries_by_key: dict[str, dict[str, Any]] = {}
    for store in session_sources.get("stores", []):
        raw_path = store.get("path")
        if not raw_path:
            continue
        path = Path(str(raw_path))
        if not path.exists():
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(payload, dict):
            continue
        for key, entry in payload.items():
            if isinstance(entry, dict):
                entries_by_key[str(key)] = entry
    return entries_by_key


def derive_systemd_unit_name(gateway_status: dict[str, Any]) -> str | None:
    source_path = gateway_status.get("service", {}).get("command", {}).get("sourcePath")
    if isinstance(source_path, str) and source_path.endswith(".service"):
        return Path(source_path).name
    configured = os.getenv("OPENCLAW_GATEWAY_SYSTEMD_UNIT")
    if configured:
        return configured
    return "openclaw-gateway.service"


def derive_gateway_exit_count(gateway_status: dict[str, Any]) -> tuple[int, str]:
    runtime = gateway_status.get("service", {}).get("runtime", {})
    for key in ("exitCountToday", "exitsToday", "todayExitCount"):
        value = runtime.get(key)
        if isinstance(value, (int, float, str)):
            try:
                return max(int(value), 0), "runtime-structured"
            except ValueError:
                continue

    if gateway_status.get("service", {}).get("label") == "systemd":
        unit_name = derive_systemd_unit_name(gateway_status)
        journal_output = run_optional_capture(
            [
                "journalctl",
                "--user",
                "-u",
                unit_name,
                "--since",
                "today",
                "--output",
                "json",
                "--no-pager",
            ]
        )
        if journal_output is not None:
            exit_events = 0
            for line in journal_output.splitlines():
                line = line.strip()
                if not line.startswith("{"):
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                message = str(entry.get("MESSAGE", ""))
                if "Main process exited" in message:
                    exit_events += 1
            return exit_events, "systemd-journal-heuristic"

    return 0, "unavailable"


def extract_queue_rows(gateway_call_status: dict[str, Any]) -> list[dict[str, Any]]:
    for key in ("queueDepthByLane", "queue_depth_by_lane", "lanes", "queues"):
        candidate = gateway_call_status.get(key)
        rows = _coerce_queue_rows(candidate)
        if rows:
            return rows

    queued_system_events = gateway_call_status.get("queuedSystemEvents")
    if isinstance(queued_system_events, list):
        return [{"lane_name": "queued_system_events", "depth": len(queued_system_events)}]

    return []


def _coerce_queue_rows(candidate: Any) -> list[dict[str, Any]]:
    if isinstance(candidate, dict):
        rows = []
        for name, value in candidate.items():
            if isinstance(value, dict):
                depth = value.get("depth", value.get("size", value.get("count")))
            else:
                depth = value
            if isinstance(depth, (int, float, str)):
                rows.append(
                    {
                        "lane_name": str(name),
                        "depth": _to_int(depth),
                    }
                )
        rows.sort(key=lambda item: (-item["depth"], item["lane_name"]))
        return rows

    if isinstance(candidate, list):
        rows = []
        for item in candidate:
            if not isinstance(item, dict):
                continue
            lane_name = item.get("lane_name") or item.get("name") or item.get("lane")
            depth = item.get("depth", item.get("size", item.get("count")))
            if lane_name and isinstance(depth, (int, float, str)):
                rows.append(
                    {
                        "lane_name": str(lane_name),
                        "depth": _to_int(depth),
                    }
                )
        rows.sort(key=lambda item: (-item["depth"], item["lane_name"]))
        return rows

    return []


def build_payload_from_sources(
    *,
    sessions_obj: dict[str, Any],
    gateway_call_status: dict[str, Any],
    gateway_status: dict[str, Any],
    now: datetime,
    store_entries: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    sessions = sessions_obj.get("sessions", [])
    recent_sessions = {
        str(item.get("key")): item
        for item in gateway_call_status.get("sessions", {}).get("recent", [])
        if isinstance(item, dict) and item.get("key")
    }

    per_agent: dict[str, dict[str, int]] = defaultdict(lambda: {"active": 0, "total": 0})
    provider_model_channel: dict[tuple[str, str, str], dict[str, int]] = defaultdict(
        lambda: {
            "input": 0,
            "output": 0,
            "cache_read": 0,
            "cache_write": 0,
            "cache_metrics_present": 0,
        }
    )
    session_types: dict[str, int] = defaultdict(int)
    active_count = 0
    idle_count = 0

    for session in sessions:
        if not isinstance(session, dict):
            continue

        session_key = str(session.get("key") or "")
        agent = session.get("agentId") or "unknown"
        per_agent[str(agent)]["total"] += 1

        age_ms = _to_int(session.get("ageMs"))
        if age_ms <= ACTIVE_WINDOW_MS:
            per_agent[str(agent)]["active"] += 1
            active_count += 1
        else:
            idle_count += 1

        session_type = classify_session_type(session)
        session_types[session_type] += 1

        store_entry = store_entries.get(session_key, {})
        recent_entry = recent_sessions.get(session_key, {})
        provider = session.get("modelProvider") or store_entry.get("modelProvider") or "unknown"
        model = session.get("model") or store_entry.get("model") or "unknown"
        channel = session.get("kind") or "default"

        cache_metrics_present = any(
            source.get(field) is not None
            for source in (session, store_entry, recent_entry)
            for field in ("cacheRead", "cacheWrite")
            if isinstance(source, dict)
        )
        cache_read = _to_int(
            _first_non_none(
                session.get("cacheRead"),
                store_entry.get("cacheRead"),
                recent_entry.get("cacheRead"),
            )
        )
        cache_write = _to_int(
            _first_non_none(
                session.get("cacheWrite"),
                store_entry.get("cacheWrite"),
                recent_entry.get("cacheWrite"),
            )
        )

        if not session_updated_on_date(
            session=session,
            store_entry=store_entry,
            recent_entry=recent_entry,
            target_date=now.date(),
        ):
            continue

        provider_model_channel[(str(provider), str(model), str(channel))]["input"] += _to_int(
            session.get("inputTokens")
        )
        provider_model_channel[(str(provider), str(model), str(channel))]["output"] += _to_int(
            session.get("outputTokens")
        )
        provider_model_channel[(str(provider), str(model), str(channel))]["cache_read"] += cache_read
        provider_model_channel[(str(provider), str(model), str(channel))]["cache_write"] += cache_write
        if cache_metrics_present:
            provider_model_channel[(str(provider), str(model), str(channel))][
                "cache_metrics_present"
            ] = 1

    gateway_runtime = gateway_status.get("service", {}).get("runtime", {})
    gateway_running = gateway_runtime.get("status") == "running"
    gateway_exit_count, gateway_exit_source = derive_gateway_exit_count(gateway_status)

    day_key = now.date().isoformat()
    token_rows = []
    for (provider, model, channel), values in sorted(provider_model_channel.items()):
        token_rows.append(
            {
                "day_key": day_key,
                "provider": provider,
                "model": model,
                "channel": channel,
                "input_tokens": values["input"],
                "output_tokens": values["output"],
                "cache_read_tokens": values["cache_read"],
                "cache_write_tokens": values["cache_write"],
                "cache_metrics_present": bool(values["cache_metrics_present"]),
            }
        )

    return {
        "captured_at": now.isoformat(),
        "source_version": "openclaw-cli-runtime",
        "capture_status": "ok",
        "sessions": {
            "total": len(sessions),
            "active": active_count,
            "by_agent": [
                {
                    "agent_name": agent,
                    "active_sessions": counts["active"],
                    "total_sessions": counts["total"],
                }
                for agent, counts in sorted(per_agent.items())
            ],
            "by_state": [
                {"state_name": "active", "session_count": active_count},
                {"state_name": "idle", "session_count": idle_count},
            ],
            "by_type": [
                {
                    "session_type": session_type,
                    "session_count": count,
                }
                for session_type, count in sorted(
                    session_types.items(),
                    key=lambda item: (-item[1], _session_type_sort_key(item[0])),
                )
            ],
        },
        "queues": extract_queue_rows(gateway_call_status),
        "gateways": {
            "total": 1 if gateway_running else 0,
            "exits_today": gateway_exit_count,
            "states": {
                "online": 1 if gateway_running else 0,
                "offline": 0 if gateway_running else 1,
            },
        },
        "gateway_exit_count_source": gateway_exit_source,
        "tokens": token_rows,
    }


def build_payload() -> dict[str, Any]:
    openclaw_bin = resolve_openclaw_bin()
    sessions_obj = extract_first_json(
        run_capture([openclaw_bin, "sessions", "--all-agents", "--json"])
    )
    gateway_call_status = extract_first_json(
        run_capture([openclaw_bin, "gateway", "call", "status", "--json"])
    )
    gateway_status = extract_first_json(
        run_capture([openclaw_bin, "gateway", "status", "--json"])
    )

    now = datetime.now().astimezone()
    store_entries = load_store_entries(sessions_obj)
    return build_payload_from_sources(
        sessions_obj=sessions_obj,
        gateway_call_status=gateway_call_status,
        gateway_status=gateway_status,
        now=now,
        store_entries=store_entries,
    )


def main() -> None:
    print(json.dumps(build_payload()))


if __name__ == "__main__":
    main()
