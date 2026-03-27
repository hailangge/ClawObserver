from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class SessionOverview:
    total_sessions: int
    active_sessions: int
    idle_sessions: int


@dataclass(slots=True)
class AgentSessionSample:
    agent_name: str
    active_sessions: int
    total_sessions: int


@dataclass(slots=True)
class SessionStateSample:
    state_name: str
    session_count: int


@dataclass(slots=True)
class QueueLaneSample:
    lane_name: str
    depth: int


@dataclass(slots=True)
class SessionTypeSample:
    session_type: str
    session_count: int


@dataclass(slots=True)
class GatewaySample:
    gateway_group: str
    gateway_count: int


@dataclass(slots=True)
class TokenCounterSample:
    day_key: str
    provider: str
    model: str
    channel: str | None
    input_tokens: int
    output_tokens: int
    cache_read_tokens: int
    cache_write_tokens: int
    cache_metrics_present: bool


@dataclass(slots=True)
class RuntimeSnapshot:
    captured_at: datetime
    capture_date: str
    source_version: str
    capture_status: str
    session_overview: SessionOverview
    agent_sessions: list[AgentSessionSample]
    session_states: list[SessionStateSample]
    session_types: list[SessionTypeSample]
    queue_lanes: list[QueueLaneSample]
    gateways: list[GatewaySample]
    token_counters: list[TokenCounterSample]
