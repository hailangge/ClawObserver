#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
import subprocess
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


def resolve_openclaw_bin() -> str:
    found = shutil.which("openclaw")
    if found:
        return found
    fallback = Path.home() / ".npm-global/bin/openclaw"
    if fallback.exists():
        return str(fallback)
    raise FileNotFoundError("openclaw binary not found in PATH or ~/.npm-global/bin/openclaw")


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


def build_payload() -> dict[str, Any]:
    openclaw_bin = resolve_openclaw_bin()
    sessions_obj = extract_first_json(run_capture([openclaw_bin, "sessions", "--all-agents", "--json"]))
    sessions = sessions_obj.get("sessions", [])
    now = datetime.now().astimezone()
    active_window_ms = 2 * 60 * 60 * 1000

    per_agent: dict[str, dict[str, int]] = defaultdict(lambda: {"active": 0, "total": 0})
    provider_model_channel: dict[tuple[str, str, str], dict[str, int]] = defaultdict(
        lambda: {"input": 0, "output": 0}
    )
    active_count = 0
    idle_count = 0

    for session in sessions:
        agent = session.get("agentId") or "unknown"
        per_agent[agent]["total"] += 1
        age_ms = int(session.get("ageMs") or 0)
        if age_ms <= active_window_ms:
            per_agent[agent]["active"] += 1
            active_count += 1
        else:
            idle_count += 1

        provider = session.get("modelProvider") or "unknown"
        model = session.get("model") or "unknown"
        channel = session.get("kind") or "default"
        provider_model_channel[(provider, model, channel)]["input"] += int(session.get("inputTokens") or 0)
        provider_model_channel[(provider, model, channel)]["output"] += int(session.get("outputTokens") or 0)

    gateway_status = run_capture([openclaw_bin, "gateway", "status"])
    gateway_running = "Runtime: running" in gateway_status

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
        },
        "queues": [{"lane_name": "default", "depth": 0}],
        "gateways": {
            "total": 1 if gateway_running else 0,
            "states": {
                "online": 1 if gateway_running else 0,
                "offline": 0 if gateway_running else 1,
            },
        },
        "tokens": token_rows,
    }


def main() -> None:
    print(json.dumps(build_payload()))


if __name__ == "__main__":
    main()
