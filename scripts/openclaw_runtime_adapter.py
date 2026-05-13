#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path
from typing import Any

ACTIVE_WINDOW_MS = 2 * 60 * 60 * 1000
SESSION_TYPE_PERSISTENT = "persistent"
SESSION_TYPE_ONE_SHOT = "one_shot"
DELIVERY_QUEUE_PENDING = "delivery_queue_pending"
DELIVERY_QUEUE_FAILED = "delivery_queue_failed"
ADAPTER_TIMEOUT_BUDGET_SECONDS = 2.5
FALLBACK_SESSIONS_COMMAND_TIMEOUT_SECONDS = 0.8
OPTIONAL_COMMAND_TIMEOUT_SECONDS = 0.4
JOURNAL_COMMAND_TIMEOUT_SECONDS = 0.4


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


def _format_timeout_seconds(timeout_seconds: float) -> str:
    return f"{timeout_seconds:g}s"


def run_capture(cmd: list[str], *, timeout_seconds: float) -> str:
    return subprocess.check_output(
        cmd,
        text=True,
        stderr=subprocess.STDOUT,
        timeout=timeout_seconds,
    )


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


def run_optional_capture(
    cmd: list[str],
    *,
    timeout_seconds: float = OPTIONAL_COMMAND_TIMEOUT_SECONDS,
) -> str | None:
    try:
        return run_capture(cmd, timeout_seconds=timeout_seconds)
    except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None


def build_waiting_payload(
    *,
    now: datetime,
    reason: str,
    gateway_status: dict[str, Any] | None = None,
    gateway_call_status: dict[str, Any] | None = None,
    delivery_queue_dir: Path | None = None,
) -> dict[str, Any]:
    queue_rows = extract_queue_rows(
        _as_dict(gateway_call_status),
        delivery_queue_dir=delivery_queue_dir,
    )
    gateway_status = _as_dict(gateway_status)
    gateway_service = _as_dict(gateway_status.get("service"))
    gateway_runtime = _as_dict(gateway_service.get("runtime"))
    gateway_running = gateway_runtime.get("status") == "running"

    return {
        "captured_at": now.isoformat(),
        "source_version": "openclaw-cli-runtime",
        "capture_status": "waiting",
        "sessions": {
            "total": 0,
            "active": 0,
            "by_agent": [],
            "by_state": [
                {"state_name": "active", "session_count": 0},
                {"state_name": "idle", "session_count": 0},
            ],
            "by_type": [],
        },
        "queues": queue_rows,
        "gateways": {
            "total": 1 if gateway_running else 0,
            "states": {
                "online": 1 if gateway_running else 0,
                "offline": 0 if gateway_running else 1,
            },
        },
        "tokens": [],
        "runtime_status_reason": reason,
    }
 

def capture_json_command(
    cmd: list[str],
    *,
    required: bool,
    timeout_seconds: float,
) -> tuple[Any, str | None]:
    if timeout_seconds <= 0:
        return None, f"{' '.join(cmd)} skipped because the adapter time budget was exhausted"
    try:
        return extract_first_json(run_capture(cmd, timeout_seconds=timeout_seconds)), None
    except FileNotFoundError as error:
        if required:
            raise
        return None, str(error)
    except subprocess.TimeoutExpired:
        return None, (
            f"{' '.join(cmd)} timed out after {_format_timeout_seconds(timeout_seconds)}"
        )
    except subprocess.CalledProcessError as error:
        return None, f"{' '.join(cmd)} exited with status {error.returncode}"
    except RuntimeError as error:
        return None, str(error)


def resolve_delivery_queue_dir() -> Path:
    configured = os.getenv("OPENCLAW_DELIVERY_QUEUE_DIR")
    if configured:
        return Path(configured).expanduser()
    return Path.home() / ".openclaw" / "delivery-queue"


def resolve_openclaw_agents_dir() -> Path:
    configured = os.getenv("OPENCLAW_AGENTS_DIR")
    if configured:
        return Path(configured).expanduser()
    return Path.home() / ".openclaw" / "agents"


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


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _normalize_session_type(raw_value: Any) -> str | None:
    value = str(raw_value or "").strip().lower()
    if value in {"persistent", "session"}:
        return SESSION_TYPE_PERSISTENT
    if value in {"oneshot", "one-shot", "one_shot", "run"}:
        return SESSION_TYPE_ONE_SHOT
    return None


def _derive_agent_name(session_key: str, fallback: str) -> str:
    parts = session_key.split(":")
    if len(parts) >= 2 and parts[0] == "agent" and parts[1]:
        return parts[1]
    return fallback


def _derive_age_ms(entry: dict[str, Any], now: datetime) -> int:
    for key in ("updatedAt", "lastInteractionAt", "startedAt", "sessionStartedAt"):
        moment = coerce_timestamp(entry.get(key))
        if moment is None:
            continue
        delta_ms = int(max((now - moment).total_seconds() * 1000, 0))
        return delta_ms
    return ACTIVE_WINDOW_MS + 1


def _derive_session_kind(entry: dict[str, Any]) -> str:
    for value in (
        entry.get("chatType"),
        entry.get("channel"),
        entry.get("lastChannel"),
        _as_dict(entry.get("deliveryContext")).get("channel"),
        _as_dict(entry.get("origin")).get("chatType"),
        _as_dict(entry.get("origin")).get("surface"),
    ):
        if isinstance(value, str) and value.strip():
            return value.strip()
    return "default"


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


def isoformat_or_none(value: Any) -> str | None:
    moment = coerce_timestamp(value)
    return moment.isoformat() if moment is not None else None


def extract_latest_user_message(session: dict[str, Any], store_entry: dict[str, Any], recent_entry: dict[str, Any]) -> tuple[str | None, str | None]:
    candidates: list[tuple[str | None, str | None]] = []
    for source in (session, recent_entry, store_entry):
        if not isinstance(source, dict):
            continue
        direct_text = _first_non_none(
            source.get("latestUserInput"),
            source.get("latest_user_input"),
            source.get("latestUserMessage"),
            source.get("latest_user_message"),
        )
        direct_timestamp = _first_non_none(
            source.get("latestUserInputTimestamp"),
            source.get("latest_user_input_timestamp"),
            source.get("latestUserMessageTimestamp"),
            source.get("latest_user_message_timestamp"),
        )
        if isinstance(direct_text, str) and direct_text.strip():
            candidates.append((direct_text.strip(), isoformat_or_none(direct_timestamp)))

        history = source.get("messages") or source.get("history") or source.get("events")
        if isinstance(history, list):
            for item in reversed(history):
                if not isinstance(item, dict):
                    continue
                role = str(item.get("role") or item.get("sender") or item.get("type") or "").lower()
                if role not in {"user", "human", "input"}:
                    continue
                text = _first_non_none(item.get("content"), item.get("text"), item.get("message"), item.get("value"))
                if isinstance(text, list):
                    text = " ".join(str(part).strip() for part in text if str(part).strip())
                if isinstance(text, str) and text.strip():
                    timestamp = _first_non_none(item.get("timestamp"), item.get("ts"), item.get("createdAt"), item.get("created_at"))
                    candidates.append((text.strip(), isoformat_or_none(timestamp)))
                    break
    for text, timestamp in candidates:
        if text:
            return text, timestamp
    return None, None


def build_store_session_sources(now: datetime) -> dict[str, Any]:
    agents_dir = resolve_openclaw_agents_dir()
    stores: list[dict[str, Any]] = []
    sessions: list[dict[str, Any]] = []
    if not agents_dir.exists():
        return {"stores": stores, "sessions": sessions}

    for path in sorted(agents_dir.glob("*/sessions/sessions.json")):
        stores.append({"path": str(path)})
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(payload, dict):
            continue

        fallback_agent_name = path.parts[-3] if len(path.parts) >= 3 else "unknown"
        for session_key, entry in payload.items():
            if not isinstance(entry, dict):
                continue
            normalized_key = str(session_key)
            sessions.append(
                {
                    "key": normalized_key,
                    "agentId": _derive_agent_name(normalized_key, fallback_agent_name),
                    "sessionId": entry.get("sessionId"),
                    "updatedAt": entry.get("updatedAt"),
                    "startedAt": entry.get("startedAt"),
                    "lastInteractionAt": entry.get("lastInteractionAt"),
                    "ageMs": _derive_age_ms(entry, now),
                    "thinkingLevel": entry.get("thinkingLevel"),
                    "inputTokens": entry.get("inputTokens"),
                    "outputTokens": entry.get("outputTokens"),
                    "cacheRead": entry.get("cacheRead"),
                    "cacheWrite": entry.get("cacheWrite"),
                    "model": entry.get("model"),
                    "modelProvider": entry.get("modelProvider"),
                    "kind": _derive_session_kind(entry),
                    "channel": entry.get("channel") or entry.get("lastChannel"),
                    "status": entry.get("status"),
                    "session_type": entry.get("chatType"),
                }
            )

    return {"stores": stores, "sessions": sessions}


def merge_session_sources(
    base_sources: dict[str, Any],
    override_sources: dict[str, Any],
) -> dict[str, Any]:
    merged_stores: list[dict[str, Any]] = []
    seen_paths: set[str] = set()
    for store in _as_list(base_sources.get("stores")) + _as_list(override_sources.get("stores")):
        if not isinstance(store, dict):
            continue
        path = store.get("path")
        key = str(path) if path else json.dumps(store, sort_keys=True)
        if key in seen_paths:
            continue
        seen_paths.add(key)
        merged_stores.append(store)

    sessions_by_key: dict[str, dict[str, Any]] = {}
    for source in (_as_list(base_sources.get("sessions")), _as_list(override_sources.get("sessions"))):
        for session in source:
            if not isinstance(session, dict):
                continue
            key = session.get("key")
            if not key:
                continue
            sessions_by_key[str(key)] = session

    return {
        "stores": merged_stores,
        "sessions": list(sessions_by_key.values()),
    }


def count_session_rows(session_sources: dict[str, Any]) -> int:
    return len(
        [
            session
            for session in _as_list(_as_dict(session_sources).get("sessions"))
            if isinstance(session, dict)
        ]
    )


def _remaining_timeout_seconds(
    deadline: float,
    requested_timeout_seconds: float,
) -> float:
    return max(min(deadline - time.monotonic(), requested_timeout_seconds), 0.0)


def build_fallback_session_sources(
    *,
    openclaw_bin: str,
    now: datetime,
    deadline: float,
) -> tuple[dict[str, Any], list[str]]:
    session_sources = {"stores": [], "sessions": []}
    reasons: list[str] = []

    quick_sessions_obj, quick_sessions_error = capture_json_command(
        [openclaw_bin, "sessions", "--json", "--limit", "200"],
        required=False,
        timeout_seconds=_remaining_timeout_seconds(
            deadline,
            FALLBACK_SESSIONS_COMMAND_TIMEOUT_SECONDS,
        ),
    )
    if isinstance(quick_sessions_obj, dict):
        session_sources = merge_session_sources(session_sources, quick_sessions_obj)
    elif quick_sessions_error:
        reasons.append(quick_sessions_error)

    return session_sources, reasons


def extract_task_details(session: dict[str, Any], store_entry: dict[str, Any], recent_entry: dict[str, Any]) -> list[str]:
    details: list[str] = []
    for source in (session, recent_entry, store_entry):
        if not isinstance(source, dict):
            continue
        raw_tasks = source.get("tasks") or source.get("activeTasks") or source.get("taskDetails")
        if isinstance(raw_tasks, list):
            for task in raw_tasks:
                if isinstance(task, dict):
                    summary = _first_non_none(task.get("title"), task.get("summary"), task.get("name"), task.get("content"))
                else:
                    summary = task
                if isinstance(summary, str) and summary.strip():
                    details.append(summary.strip())
        elif isinstance(raw_tasks, str) and raw_tasks.strip():
            details.append(raw_tasks.strip())
    unique_details: list[str] = []
    seen = set()
    for item in details:
        if item not in seen:
            seen.add(item)
            unique_details.append(item)
    return unique_details


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
    for store in _as_list(_as_dict(session_sources).get("stores")):
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
    service = _as_dict(_as_dict(gateway_status).get("service"))
    source_path = _as_dict(service.get("command")).get("sourcePath")
    if isinstance(source_path, str) and source_path.endswith(".service"):
        return Path(source_path).name
    configured = os.getenv("OPENCLAW_GATEWAY_SYSTEMD_UNIT")
    if configured:
        return configured
    return "openclaw-gateway.service"


def derive_gateway_exit_count(gateway_status: dict[str, Any]) -> tuple[int, str]:
    service = _as_dict(_as_dict(gateway_status).get("service"))
    runtime = _as_dict(service.get("runtime"))
    for key in ("exitCountToday", "exitsToday", "todayExitCount"):
        value = runtime.get(key)
        if isinstance(value, (int, float, str)):
            try:
                return max(int(value), 0), "runtime-structured"
            except ValueError:
                continue

    if service.get("label") == "systemd":
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
            ],
            timeout_seconds=JOURNAL_COMMAND_TIMEOUT_SECONDS,
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
                if "Main process exited" in message or ("Stopped " in message and unit_name.lower() in message.lower()):
                    exit_events += 1
            return exit_events, "systemd-journal-heuristic"

    return 0, "unavailable"


def extract_queue_rows(
    gateway_call_status: dict[str, Any],
    delivery_queue_dir: Path | None = None,
) -> list[dict[str, Any]]:
    gateway_call_status = _as_dict(gateway_call_status)
    delivery_queue_rows = extract_delivery_queue_rows(delivery_queue_dir)
    if delivery_queue_rows:
        return delivery_queue_rows

    for key in ("queueDepthByLane", "queue_depth_by_lane", "lanes", "queues"):
        candidate = gateway_call_status.get(key)
        rows = _coerce_queue_rows(candidate)
        if rows:
            return rows

    queued_system_events = gateway_call_status.get("queuedSystemEvents")
    if isinstance(queued_system_events, list):
        return [{"lane_name": "queued_system_events", "depth": len(queued_system_events)}]

    return []


def extract_delivery_queue_rows(
    delivery_queue_dir: Path | None = None,
) -> list[dict[str, Any]]:
    queue_dir = delivery_queue_dir or resolve_delivery_queue_dir()
    failed_dir = queue_dir / "failed"

    pending_depth = _count_delivery_queue_items(queue_dir)
    failed_depth = _count_delivery_queue_items(failed_dir)
    if pending_depth is None or failed_depth is None:
        return []

    if not queue_dir.exists() and not failed_dir.exists():
        return []

    return [
        {
            "lane_name": DELIVERY_QUEUE_PENDING,
            "depth": pending_depth,
        },
        {
            "lane_name": DELIVERY_QUEUE_FAILED,
            "depth": failed_depth,
        },
    ]


def _count_delivery_queue_items(directory: Path) -> int | None:
    try:
        if not directory.exists():
            return 0
        if not directory.is_dir():
            return None

        count = 0
        for entry in directory.iterdir():
            if entry.is_file() and entry.suffix.lower() == ".json":
                count += 1
        return count
    except OSError:
        return None


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
    delivery_queue_dir: Path | None = None,
    source_version: str = "openclaw-cli-runtime",
) -> dict[str, Any]:
    missing = object()
    sessions_obj = _as_dict(sessions_obj)
    gateway_call_status = _as_dict(gateway_call_status)
    gateway_status = _as_dict(gateway_status)

    raw_sessions = sessions_obj.get("sessions", missing)
    sessions = _as_list(raw_sessions)
    has_session_data = len(sessions) > 0
    source_issues: list[str] = []
    raw_gateway_sessions = gateway_call_status.get("sessions", missing)
    if raw_gateway_sessions is None:
        source_issues.append("gateway sessions payload unavailable")
    if raw_gateway_sessions is not missing and raw_gateway_sessions is not None and not isinstance(raw_gateway_sessions, dict):
        source_issues.append("gateway sessions payload was malformed")
    raw_recent_sessions = (
        _as_dict(raw_gateway_sessions).get("recent", missing)
        if isinstance(raw_gateway_sessions, dict)
        else missing
    )
    if raw_recent_sessions is None:
        source_issues.append("gateway recent sessions payload unavailable")
    if raw_recent_sessions is not missing and raw_recent_sessions is not None and not isinstance(raw_recent_sessions, list):
        source_issues.append("gateway recent sessions payload was malformed")
    raw_gateway_service = gateway_status.get("service", missing)
    if raw_gateway_service is None:
        source_issues.append("gateway service payload unavailable")
    if raw_gateway_service is not missing and raw_gateway_service is not None and not isinstance(raw_gateway_service, dict):
        source_issues.append("gateway service payload was malformed")
    recent_sessions = {
        str(item.get("key")): item
        for item in _as_list(raw_recent_sessions)
        if isinstance(item, dict) and item.get("key")
    }

    per_agent: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "active": 0,
            "total": 0,
            "role_style_key": None,
            "thinking_level": None,
            "latest_user_input": None,
            "latest_user_input_timestamp": None,
            "session_model": None,
            "task_details": [],
        }
    )
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
        latest_user_input, latest_user_input_timestamp = extract_latest_user_message(session, store_entry, recent_entry)
        thinking_level = _first_non_none(
            session.get("thinkingLevel"),
            session.get("thinking_level"),
            recent_entry.get("thinkingLevel"),
            recent_entry.get("thinking_level"),
            store_entry.get("thinkingLevel"),
            store_entry.get("thinking_level"),
        )
        role_style_key = _first_non_none(
            session.get("roleStyleKey"),
            session.get("role_style_key"),
            recent_entry.get("roleStyleKey"),
            recent_entry.get("role_style_key"),
            store_entry.get("roleStyleKey"),
            store_entry.get("role_style_key"),
        )
        task_details = extract_task_details(session, store_entry, recent_entry)
        agent_bucket = per_agent[str(agent)]
        if role_style_key and not agent_bucket["role_style_key"]:
            agent_bucket["role_style_key"] = str(role_style_key)
        if thinking_level and not agent_bucket["thinking_level"]:
            agent_bucket["thinking_level"] = str(thinking_level)
        if latest_user_input and not agent_bucket["latest_user_input"]:
            agent_bucket["latest_user_input"] = str(latest_user_input)
        if latest_user_input_timestamp and not agent_bucket["latest_user_input_timestamp"]:
            agent_bucket["latest_user_input_timestamp"] = str(latest_user_input_timestamp)
        if model and not agent_bucket["session_model"]:
            agent_bucket["session_model"] = str(model)
        for detail in task_details:
            if detail not in agent_bucket["task_details"]:
                agent_bucket["task_details"].append(detail)

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

    gateway_service = _as_dict(gateway_status.get("service"))
    gateway_runtime = _as_dict(gateway_service.get("runtime"))
    gateway_running = gateway_runtime.get("status") == "running"
    gateway_exit_count, gateway_exit_source = derive_gateway_exit_count(gateway_status)
    capture_status = "ok"
    if not isinstance(raw_sessions, list):
        capture_status = "waiting"
    elif source_issues and has_session_data:
        capture_status = "degraded"
    elif source_issues:
        capture_status = "waiting"

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
        "source_version": source_version,
        "capture_status": capture_status,
        "sessions": {
            "total": len(sessions),
            "active": active_count,
            "by_agent": [
                {
                    "agent_name": agent,
                    "active_sessions": counts["active"],
                    "total_sessions": counts["total"],
                    "role_style_key": counts.get("role_style_key"),
                    "thinking_level": counts.get("thinking_level"),
                    "latest_user_input": counts.get("latest_user_input"),
                    "latest_user_input_timestamp": counts.get("latest_user_input_timestamp"),
                    "session_model": counts.get("session_model"),
                    "task_details": counts.get("task_details") or None,
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
        "queues": extract_queue_rows(
            gateway_call_status,
            delivery_queue_dir=delivery_queue_dir,
        ),
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
        **(
            {"runtime_status_reason": "; ".join(source_issues)}
            if source_issues
            else {}
        ),
    }


def build_payload() -> dict[str, Any]:
    now = datetime.now().astimezone()
    deadline = time.monotonic() + ADAPTER_TIMEOUT_BUDGET_SECONDS
    delivery_queue_dir = resolve_delivery_queue_dir()
    status_reasons: list[str] = []
    sessions_obj = build_store_session_sources(now)
    session_row_count = count_session_rows(sessions_obj)
    used_local_store = session_row_count > 0

    try:
        openclaw_bin = resolve_openclaw_bin()
    except FileNotFoundError as error:
        openclaw_bin = None
        status_reasons.append(str(error))

    if session_row_count == 0 and openclaw_bin:
        sessions_obj, fallback_reasons = build_fallback_session_sources(
            openclaw_bin=openclaw_bin,
            now=now,
            deadline=deadline,
        )
        status_reasons.extend(fallback_reasons)
        session_row_count = count_session_rows(sessions_obj)

    gateway_status: Any = {}
    gateway_call_status: Any = {}
    gateway_status_error = None
    gateway_call_status_error = None
    if openclaw_bin:
        gateway_status, gateway_status_error = capture_json_command(
            [openclaw_bin, "gateway", "status", "--json"],
            required=False,
            timeout_seconds=_remaining_timeout_seconds(
                deadline,
                OPTIONAL_COMMAND_TIMEOUT_SECONDS,
            ),
        )
        gateway_call_status, gateway_call_status_error = capture_json_command(
            [openclaw_bin, "gateway", "call", "status", "--json"],
            required=False,
            timeout_seconds=_remaining_timeout_seconds(
                deadline,
                OPTIONAL_COMMAND_TIMEOUT_SECONDS,
            ),
        )

    if session_row_count == 0:
        reason = "; ".join(status_reasons) or (
            "No local OpenClaw session-store entries or bounded CLI sessions were available"
        )
        return build_waiting_payload(
            now=now,
            reason=reason,
            gateway_status=_as_dict(gateway_status),
            gateway_call_status=_as_dict(gateway_call_status),
            delivery_queue_dir=delivery_queue_dir,
        )

    store_entries = load_store_entries(sessions_obj)
    payload = build_payload_from_sources(
        sessions_obj=sessions_obj,
        gateway_call_status=_as_dict(gateway_call_status),
        gateway_status=_as_dict(gateway_status),
        now=now,
        store_entries=store_entries,
        delivery_queue_dir=delivery_queue_dir,
        source_version=(
            "openclaw-local-store-runtime"
            if used_local_store
            else "openclaw-cli-runtime"
        ),
    )
    status_reasons.extend(
        reason
        for reason in (gateway_status_error, gateway_call_status_error)
        if reason
    )
    if payload.get("runtime_status_reason"):
        status_reasons.insert(0, str(payload["runtime_status_reason"]))
    status_reasons = [reason for reason in status_reasons if reason]
    if status_reasons:
        payload["runtime_status_reason"] = "; ".join(dict.fromkeys(status_reasons))
        if payload.get("capture_status") != "waiting":
            payload["capture_status"] = "degraded"
    return payload


def main() -> None:
    print(json.dumps(build_payload()))


if __name__ == "__main__":
    main()
