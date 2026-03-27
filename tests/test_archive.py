from __future__ import annotations

import tempfile
import unittest
from datetime import datetime
from pathlib import Path

from clawobserver.archive import ArchiveStore
from clawobserver.config import AppConfig
from clawobserver.models import (
    AgentSessionSample,
    GatewaySample,
    QueueLaneSample,
    RuntimeSnapshot,
    SessionOverview,
    SessionStateSample,
    SessionTypeSample,
    TokenCounterSample,
)


class ArchiveQuerySemanticsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        base_dir = Path(self.temp_dir.name)
        self.config = AppConfig(
            base_dir=base_dir,
            data_dir=base_dir,
            database_path=base_dir / "archive.sqlite3",
            runtime_json_path=None,
            runtime_command=None,
            host="127.0.0.1",
            port=8420,
            refresh_seconds=15,
            archive_cadence_minutes=30,
        )
        self.store = ArchiveStore(self.config)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_multi_day_history_uses_last_record_per_day(self) -> None:
        self.store.insert_snapshot(self._snapshot("2026-03-25T08:00:00+00:00", active_sessions=8))
        self.store.insert_snapshot(self._snapshot("2026-03-25T23:30:00+00:00", active_sessions=10))
        self.store.insert_snapshot(self._snapshot("2026-03-26T10:00:00+00:00", active_sessions=12))
        self.store.insert_snapshot(self._snapshot("2026-03-26T23:30:00+00:00", active_sessions=16))

        payload = self.store.history_payload("last_7_days")

        self.assertEqual(payload["mode"], "daily_last_record_summary")
        self.assertEqual(len(payload["points"]), 2)
        self.assertEqual(payload["points"][0]["session_overview"]["active_sessions"], 10)
        self.assertEqual(payload["points"][1]["session_overview"]["active_sessions"], 16)

    def test_current_day_history_returns_all_archived_points(self) -> None:
        self.store.insert_snapshot(self._snapshot("2026-03-27T08:00:00+00:00", active_sessions=8))
        self.store.insert_snapshot(self._snapshot("2026-03-27T12:00:00+00:00", active_sessions=10))
        self.store.insert_snapshot(self._snapshot("2026-03-27T18:00:00+00:00", active_sessions=12))

        payload = self.store.history_payload("current_day")

        self.assertEqual(payload["mode"], "intra_day_sampled")
        self.assertEqual(len(payload["points"]), 3)
        self.assertEqual(payload["points"][0]["session_overview"]["active_sessions"], 8)
        self.assertEqual(payload["points"][-1]["session_overview"]["active_sessions"], 12)

    def test_history_preserves_gateway_exit_counts(self) -> None:
        self.store.insert_snapshot(
            self._snapshot(
                "2026-03-27T08:00:00+00:00",
                active_sessions=8,
                gateway_exit_count=1,
            )
        )
        self.store.insert_snapshot(
            self._snapshot(
                "2026-03-27T12:00:00+00:00",
                active_sessions=10,
                gateway_exit_count=3,
            )
        )

        payload = self.store.history_payload("current_day")

        exit_series = [
            next(
                item["gateway_count"]
                for item in point["gateways"]
                if item["gateway_group"] == "exits_today"
            )
            for point in payload["points"]
        ]
        self.assertEqual(exit_series, [1, 3])

    def test_history_preserves_session_type_counts(self) -> None:
        self.store.insert_snapshot(
            self._snapshot(
                "2026-03-27T08:00:00+00:00",
                active_sessions=8,
                persistent_sessions=9,
                one_shot_sessions=4,
            )
        )

        payload = self.store.history_payload("current_day")

        self.assertEqual(
            payload["points"][0]["session_types"],
            [
                {"session_type": "persistent", "session_count": 9},
                {"session_type": "one_shot", "session_count": 4},
            ],
        )

    def test_token_statistics_sum_latest_daily_counters(self) -> None:
        self.store.insert_snapshot(
            self._snapshot(
                "2026-03-25T09:00:00+00:00",
                active_sessions=8,
                token_input=100,
                token_output=40,
                token_cache_read=20,
                token_cache_write=10,
            )
        )
        self.store.insert_snapshot(
            self._snapshot(
                "2026-03-25T23:30:00+00:00",
                active_sessions=9,
                token_input=160,
                token_output=60,
                token_cache_read=40,
                token_cache_write=20,
            )
        )
        self.store.insert_snapshot(
            self._snapshot(
                "2026-03-26T23:30:00+00:00",
                active_sessions=10,
                token_input=200,
                token_output=90,
                token_cache_read=60,
                token_cache_write=30,
            )
        )

        payload = self.store.token_statistics_payload("last_7_days")

        self.assertEqual(payload["total_input_tokens"], 360)
        self.assertEqual(payload["total_output_tokens"], 150)
        self.assertEqual(payload["total_cache_read_tokens"], 100)
        self.assertEqual(payload["total_cache_write_tokens"], 50)
        self.assertAlmostEqual(payload["cache_hit_ratio"], 100 / 510)
        self.assertEqual(len(payload["daily_records"]), 2)
        self.assertTrue(payload["has_channel_data"])
        self.assertTrue(payload["has_cache_data"])

    def test_current_day_token_statistics_use_latest_snapshot_only(self) -> None:
        self.store.insert_snapshot(
            self._snapshot(
                "2026-03-27T08:00:00+00:00",
                active_sessions=8,
                token_input=100,
                token_output=40,
                token_cache_read=25,
                token_cache_write=5,
            )
        )
        self.store.insert_snapshot(
            self._snapshot(
                "2026-03-27T23:30:00+00:00",
                active_sessions=10,
                token_input=180,
                token_output=75,
                token_cache_read=45,
                token_cache_write=15,
            )
        )

        payload = self.store.token_statistics_payload("current_day")

        self.assertEqual(payload["total_input_tokens"], 180)
        self.assertEqual(payload["total_output_tokens"], 75)
        self.assertEqual(payload["total_cache_read_tokens"], 45)
        self.assertEqual(payload["total_cache_write_tokens"], 15)
        self.assertAlmostEqual(payload["cache_hit_ratio"], 45 / 240)
        self.assertEqual(len(payload["daily_records"]), 1)

    def _snapshot(
        self,
        iso_timestamp: str,
        *,
        active_sessions: int,
        token_input: int = 120,
        token_output: int = 55,
        token_cache_read: int = 0,
        token_cache_write: int = 0,
        gateway_exit_count: int = 0,
        persistent_sessions: int | None = None,
        one_shot_sessions: int | None = None,
    ) -> RuntimeSnapshot:
        captured_at = datetime.fromisoformat(iso_timestamp)
        persistent_total = (
            persistent_sessions
            if persistent_sessions is not None
            else active_sessions + 3
        )
        one_shot_total = one_shot_sessions if one_shot_sessions is not None else 2
        return RuntimeSnapshot(
            captured_at=captured_at,
            capture_date=captured_at.date().isoformat(),
            source_version="test",
            capture_status="ok",
            session_overview=SessionOverview(
                total_sessions=active_sessions + 5,
                active_sessions=active_sessions,
                idle_sessions=5,
            ),
            agent_sessions=[
                AgentSessionSample("planner", active_sessions, active_sessions + 3),
            ],
            session_states=[
                SessionStateSample("active", active_sessions),
                SessionStateSample("idle", 5),
            ],
            session_types=[
                SessionTypeSample("persistent", persistent_total),
                SessionTypeSample("one_shot", one_shot_total),
            ],
            queue_lanes=[
                QueueLaneSample("queued_system_events", 2),
            ],
            gateways=[
                GatewaySample("total", 3),
                GatewaySample("exits_today", gateway_exit_count),
                GatewaySample("online", 3),
            ],
            token_counters=[
                TokenCounterSample(
                    day_key=captured_at.date().isoformat(),
                    provider="openai",
                    model="gpt-5.4",
                    channel="default",
                    input_tokens=token_input,
                    output_tokens=token_output,
                    cache_read_tokens=token_cache_read,
                    cache_write_tokens=token_cache_write,
                    cache_metrics_present=True,
                )
            ],
        )


if __name__ == "__main__":
    unittest.main()
