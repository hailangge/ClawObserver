from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from .archive import ArchiveStore
from .config import AppConfig
from .runtime import LiveRuntimeAdapter, build_demo_payload


class ClawObserverApp:
    def __init__(self, config: AppConfig):
        self.config = config
        self.archive = ArchiveStore(config)
        self.live_adapter = LiveRuntimeAdapter(config)

    def live_overview_payload(self) -> dict[str, Any]:
        snapshot = self.live_adapter.collect_snapshot()
        return {
            "captured_at": snapshot.captured_at.isoformat(),
            "source_version": snapshot.source_version,
            "capture_status": snapshot.capture_status,
            "refresh_seconds": self.config.refresh_seconds,
            "cadence_minutes": self.config.archive_cadence_minutes,
            "session_overview": {
                "total_sessions": snapshot.session_overview.total_sessions,
                "active_sessions": snapshot.session_overview.active_sessions,
                "idle_sessions": snapshot.session_overview.idle_sessions,
            },
            "agent_sessions": [
                {
                    "agent_name": item.agent_name,
                    "active_sessions": item.active_sessions,
                    "total_sessions": item.total_sessions,
                }
                for item in snapshot.agent_sessions
            ],
            "session_states": [
                {
                    "state_name": item.state_name,
                    "session_count": item.session_count,
                }
                for item in snapshot.session_states
            ],
            "session_types": [
                {
                    "session_type": item.session_type,
                    "session_count": item.session_count,
                }
                for item in snapshot.session_types
            ],
            "queue_lanes": [
                {
                    "lane_name": item.lane_name,
                    "depth": item.depth,
                }
                for item in snapshot.queue_lanes
            ],
            "gateways": [
                {
                    "gateway_group": item.gateway_group,
                    "gateway_count": item.gateway_count,
                }
                for item in snapshot.gateways
            ],
        }

    def history_payload(self, range_key: str) -> dict[str, Any]:
        return self.archive.history_payload(range_key)

    def token_statistics_payload(self, range_key: str) -> dict[str, Any]:
        return self.archive.token_statistics_payload(range_key)

    def capture_archive_snapshot(self) -> dict[str, Any]:
        snapshot = self.live_adapter.collect_snapshot()
        snapshot_id = self.archive.insert_snapshot(snapshot)
        return {
            "snapshot_id": snapshot_id,
            "captured_at": snapshot.captured_at.isoformat(),
            "capture_status": snapshot.capture_status,
        }

    def seed_demo_history(self, days: int, interval_minutes: int | None = None) -> int:
        interval = interval_minutes or self.config.archive_cadence_minutes
        now = datetime.now().astimezone().replace(second=0, microsecond=0)
        start_time = (now - timedelta(days=max(days - 1, 0))).replace(
            hour=0,
            minute=0,
        )
        inserted = 0
        current_time = start_time
        while current_time <= now:
            payload = build_demo_payload(at_time=current_time)
            snapshot = self.live_adapter._normalize_payload(payload, fallback_time=current_time)
            self.archive.insert_snapshot(snapshot)
            inserted += 1
            current_time += timedelta(minutes=interval)
        return inserted
