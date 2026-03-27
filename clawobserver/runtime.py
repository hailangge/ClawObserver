from __future__ import annotations

import json
import math
import shlex
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from .config import AppConfig
from .models import (
    AgentSessionSample,
    GatewaySample,
    QueueLaneSample,
    RuntimeSnapshot,
    SessionOverview,
    SessionStateSample,
    TokenCounterSample,
)


def _now() -> datetime:
    return datetime.now().astimezone()


def _parse_timestamp(raw_value: str | None, fallback: datetime) -> datetime:
    if not raw_value:
        return fallback
    parsed = datetime.fromisoformat(raw_value)
    if parsed.tzinfo is None:
        return parsed.astimezone()
    return parsed.astimezone()


def _to_int(value: Any, default: int = 0) -> int:
    try:
        return max(int(value), 0)
    except (TypeError, ValueError):
        return default


def build_demo_payload(at_time: datetime | None = None) -> dict[str, Any]:
    captured_at = at_time or _now()
    minute_index = captured_at.hour * 2 + captured_at.minute // 30
    drift = minute_index / 48

    planner_active = 11 + int(4 * math.sin(drift * math.pi * 2))
    researcher_active = 7 + int(3 * math.cos(drift * math.pi * 2))
    operator_active = 5 + int(2 * math.sin((drift + 0.15) * math.pi * 2))
    reviewer_active = 3 + int(2 * math.cos((drift + 0.35) * math.pi * 2))
    total_active = planner_active + researcher_active + operator_active + reviewer_active
    total_sessions = total_active + 26

    provider_tokens = [
        {
            "provider": "openai",
            "model": "gpt-5.4",
            "channel": "default",
            "input_tokens": 390_000 + minute_index * 2_200,
            "output_tokens": 146_000 + minute_index * 1_180,
        },
        {
            "provider": "openai",
            "model": "gpt-5.4-coder",
            "channel": "gateway-a",
            "input_tokens": 210_000 + minute_index * 1_300,
            "output_tokens": 96_000 + minute_index * 720,
        },
    ]

    return {
        "captured_at": captured_at.isoformat(),
        "source_version": "demo-runtime",
        "capture_status": "ok",
        "sessions": {
            "total": total_sessions,
            "active": total_active,
            "by_agent": [
                {
                    "agent_name": "planner",
                    "active_sessions": planner_active,
                    "total_sessions": planner_active + 8,
                },
                {
                    "agent_name": "researcher",
                    "active_sessions": researcher_active,
                    "total_sessions": researcher_active + 7,
                },
                {
                    "agent_name": "operator",
                    "active_sessions": operator_active,
                    "total_sessions": operator_active + 6,
                },
                {
                    "agent_name": "reviewer",
                    "active_sessions": reviewer_active,
                    "total_sessions": reviewer_active + 5,
                },
            ],
            "by_state": [
                {"state_name": "active", "session_count": total_active},
                {"state_name": "idle", "session_count": total_sessions - total_active},
                {"state_name": "waiting", "session_count": 9 + minute_index % 5},
            ],
        },
        "queues": [
            {"lane_name": "dispatch", "depth": 4 + minute_index % 4},
            {"lane_name": "evaluation", "depth": 2 + (minute_index + 1) % 3},
            {"lane_name": "retry", "depth": 1 + minute_index % 2},
        ],
        "gateways": {
            "total": 8,
            "exits_today": max(minute_index // 10, 0),
            "states": {
                "online": 6 + minute_index % 2,
                "offline": 1,
                "degraded": 1 - minute_index % 2,
            },
        },
        "tokens": [
            {
                "day_key": captured_at.date().isoformat(),
                **entry,
            }
            for entry in provider_tokens
        ],
    }


class LiveRuntimeAdapter:
    def __init__(self, config: AppConfig):
        self._config = config

    def collect_snapshot(self, at_time: datetime | None = None) -> RuntimeSnapshot:
        payload = self._load_payload(at_time=at_time)
        return self._normalize_payload(payload, fallback_time=at_time or _now())

    def _load_payload(self, at_time: datetime | None = None) -> dict[str, Any]:
        if self._config.runtime_command:
            result = subprocess.run(
                shlex.split(self._config.runtime_command),
                check=True,
                capture_output=True,
                text=True,
            )
            return json.loads(result.stdout)

        if self._config.runtime_json_path and self._config.runtime_json_path.exists():
            return json.loads(self._config.runtime_json_path.read_text(encoding="utf-8"))

        return build_demo_payload(at_time=at_time)

    def _normalize_payload(
        self,
        payload: dict[str, Any],
        fallback_time: datetime,
    ) -> RuntimeSnapshot:
        captured_at = _parse_timestamp(payload.get("captured_at"), fallback_time)
        source_version = str(payload.get("source_version", "unknown-runtime"))
        capture_status = str(payload.get("capture_status", "ok"))

        sessions = payload.get("sessions", {})
        total_sessions = _to_int(sessions.get("total"))
        active_sessions = _to_int(sessions.get("active"))
        idle_sessions = max(total_sessions - active_sessions, 0)

        by_agent = []
        for item in sessions.get("by_agent", []):
            by_agent.append(
                AgentSessionSample(
                    agent_name=str(item.get("agent_name", "unknown")),
                    active_sessions=_to_int(item.get("active_sessions")),
                    total_sessions=_to_int(item.get("total_sessions")),
                )
            )
        by_agent.sort(key=lambda item: (-item.active_sessions, item.agent_name))

        by_state = []
        for item in sessions.get("by_state", []):
            by_state.append(
                SessionStateSample(
                    state_name=str(item.get("state_name", "unknown")),
                    session_count=_to_int(item.get("session_count")),
                )
            )
        if not by_state:
            by_state = [
                SessionStateSample("active", active_sessions),
                SessionStateSample("idle", idle_sessions),
            ]

        queue_lanes = []
        for item in payload.get("queues", []):
            queue_lanes.append(
                QueueLaneSample(
                    lane_name=str(item.get("lane_name", "unknown")),
                    depth=_to_int(item.get("depth")),
                )
            )
        queue_lanes.sort(key=lambda item: (-item.depth, item.lane_name))

        gateways = self._normalize_gateways(payload.get("gateways", {}))

        token_counters = []
        for item in payload.get("tokens", []):
            token_counters.append(
                TokenCounterSample(
                    day_key=str(item.get("day_key", captured_at.date().isoformat())),
                    provider=str(item.get("provider", "unknown")),
                    model=str(item.get("model", "unknown")),
                    channel=(
                        str(item["channel"])
                        if item.get("channel") not in (None, "")
                        else None
                    ),
                    input_tokens=_to_int(item.get("input_tokens")),
                    output_tokens=_to_int(item.get("output_tokens")),
                )
            )

        return RuntimeSnapshot(
            captured_at=captured_at,
            capture_date=captured_at.date().isoformat(),
            source_version=source_version,
            capture_status=capture_status,
            session_overview=SessionOverview(
                total_sessions=total_sessions,
                active_sessions=active_sessions,
                idle_sessions=idle_sessions,
            ),
            agent_sessions=by_agent,
            session_states=by_state,
            queue_lanes=queue_lanes,
            gateways=gateways,
            token_counters=token_counters,
        )

    def _normalize_gateways(self, raw_gateways: Any) -> list[GatewaySample]:
        if not isinstance(raw_gateways, dict):
            return [GatewaySample(gateway_group="total", gateway_count=0)]

        samples_by_group: dict[str, int] = {}

        states = raw_gateways.get("states", {})
        for name, value in states.items() if isinstance(states, dict) else []:
            samples_by_group[str(name)] = _to_int(value)

        for name, value in raw_gateways.items():
            if name in {"total", "states"}:
                continue
            if isinstance(value, dict):
                continue
            samples_by_group[str(name)] = _to_int(value)

        state_samples = [
            GatewaySample(gateway_group=name, gateway_count=count)
            for name, count in sorted(samples_by_group.items())
        ]

        total = _to_int(raw_gateways.get("total"))
        if total == 0 and state_samples:
            total = sum(item.gateway_count for item in state_samples)

        return [GatewaySample(gateway_group="total", gateway_count=total), *state_samples]
