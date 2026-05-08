from __future__ import annotations

import tempfile
import subprocess
import unittest
import time
from datetime import datetime
from pathlib import Path
from unittest import mock

from clawobserver.config import AppConfig
from clawobserver.runtime import (
    LiveRuntimeAdapter,
    RUNTIME_COMMAND_TIMEOUT_SECONDS,
    build_demo_payload,
)
from clawobserver.app import ClawObserverApp


class RuntimeAdapterGatewayTests(unittest.TestCase):
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
        self.adapter = LiveRuntimeAdapter(self.config)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_normalize_gateways_accepts_direct_gateway_metrics(self) -> None:
        snapshot = self.adapter._normalize_payload(
            {
                "captured_at": "2026-03-27T12:00:00+00:00",
                "source_version": "test",
                "capture_status": "ok",
                "sessions": {
                    "total": 4,
                    "active": 2,
                    "by_type": [
                        {"session_type": "persistent", "session_count": 3},
                        {"session_type": "one_shot", "session_count": 1},
                    ],
                },
                "queues": [],
                "gateways": {
                    "total": 1,
                    "exits_today": 3,
                    "states": {"online": 1, "offline": 0},
                },
                "tokens": [
                    {
                        "day_key": "2026-03-27",
                        "provider": "openai",
                        "model": "gpt-5.4",
                        "channel": "direct",
                        "input_tokens": 100,
                        "output_tokens": 40,
                        "cache_read_tokens": 60,
                        "cache_write_tokens": 15,
                        "cache_metrics_present": True,
                    }
                ],
            },
            fallback_time=datetime.fromisoformat("2026-03-27T12:00:00+00:00"),
        )

        gateway_counts = {
            item.gateway_group: item.gateway_count
            for item in snapshot.gateways
        }
        self.assertEqual(gateway_counts["total"], 1)
        self.assertEqual(gateway_counts["online"], 1)
        self.assertEqual(gateway_counts["offline"], 0)
        self.assertEqual(gateway_counts["exits_today"], 3)
        self.assertEqual(snapshot.session_types[0].session_type, "persistent")
        self.assertEqual(snapshot.session_types[0].session_count, 3)
        self.assertEqual(snapshot.token_counters[0].cache_read_tokens, 60)
        self.assertEqual(snapshot.token_counters[0].cache_write_tokens, 15)
        self.assertTrue(snapshot.token_counters[0].cache_metrics_present)

    def test_demo_payload_includes_gateway_exit_counts(self) -> None:
        payload = build_demo_payload(
            at_time=datetime.fromisoformat("2026-03-27T18:00:00+00:00")
        )

        self.assertIn("exits_today", payload["gateways"])
        self.assertGreaterEqual(payload["gateways"]["exits_today"], 0)
        self.assertIn("by_type", payload["sessions"])
        self.assertEqual(payload["queues"][0]["lane_name"], "delivery_queue_pending")
        self.assertEqual(payload["queues"][1]["lane_name"], "delivery_queue_failed")
        self.assertIn("cache_read_tokens", payload["tokens"][0])

    def test_normalize_payload_preserves_optional_agent_scene_fields(self) -> None:
        snapshot = self.adapter._normalize_payload(
            {
                "captured_at": "2026-03-27T12:00:00+00:00",
                "source_version": "test",
                "capture_status": "ok",
                "sessions": {
                    "total": 2,
                    "active": 1,
                    "by_agent": [
                        {
                            "agent_name": "planner",
                            "active_sessions": 1,
                            "total_sessions": 2,
                            "role_style_key": "planner",
                            "thinking_level": "Deep",
                            "latest_user_input": "Investigate rollout latency",
                            "latest_user_input_timestamp": "2026-03-27T11:58:00+00:00",
                            "session_model": "gpt-5.4",
                            "task_details": [
                                "Investigate rollout latency",
                                "Validate live hover metadata",
                            ],
                        }
                    ],
                    "by_type": [
                        {"session_type": "persistent", "session_count": 2},
                    ],
                },
                "queues": [],
                "gateways": {"total": 1, "states": {"online": 1}},
                "tokens": [],
            },
            fallback_time=datetime.fromisoformat("2026-03-27T12:00:00+00:00"),
        )

        self.assertEqual(snapshot.agent_sessions[0].role_style_key, "planner")
        self.assertEqual(snapshot.agent_sessions[0].thinking_level, "Deep")
        self.assertEqual(snapshot.agent_sessions[0].latest_user_input, "Investigate rollout latency")
        self.assertEqual(snapshot.agent_sessions[0].latest_user_input_timestamp, "2026-03-27T11:58:00+00:00")
        self.assertEqual(snapshot.agent_sessions[0].session_model, "gpt-5.4")
        self.assertEqual(
            snapshot.agent_sessions[0].task_details,
            [
                "Investigate rollout latency",
                "Validate live hover metadata",
            ],
        )

    def test_live_overview_payload_includes_agent_task_details(self) -> None:
        app = ClawObserverApp(self.config)
        payload = app.live_overview_payload()

        self.assertIn("agent_sessions", payload)
        self.assertGreater(len(payload["agent_sessions"]), 0)
        first_agent = payload["agent_sessions"][0]
        self.assertIn("task_details", first_agent)
        self.assertTrue(
            first_agent["task_details"] is None or isinstance(first_agent["task_details"], list)
        )

    def test_runtime_command_timeout_returns_waiting_snapshot(self) -> None:
        self.config.runtime_command = "mock-runtime"
        with mock.patch(
            "clawobserver.runtime.subprocess.run",
            side_effect=subprocess.TimeoutExpired(
                cmd="mock-runtime",
                timeout=RUNTIME_COMMAND_TIMEOUT_SECONDS,
            ),
        ):
            snapshot = self.adapter.collect_snapshot(
                at_time=datetime.fromisoformat("2026-05-08T12:00:00+00:00")
            )

        self.assertEqual(snapshot.capture_status, "waiting")
        self.assertEqual(snapshot.source_version, "runtime-command-timeout")
        self.assertEqual(snapshot.session_overview.total_sessions, 0)
        self.assertEqual(snapshot.session_overview.active_sessions, 0)
        gateway_counts = {
            item.gateway_group: item.gateway_count
            for item in snapshot.gateways
        }
        self.assertEqual(gateway_counts["total"], 0)
        self.assertNotIn("offline", gateway_counts)

    def test_runtime_command_nonzero_exit_returns_waiting_snapshot(self) -> None:
        self.config.runtime_command = "mock-runtime"
        with mock.patch(
            "clawobserver.runtime.subprocess.run",
            side_effect=subprocess.CalledProcessError(2, ["mock-runtime"]),
        ):
            snapshot = self.adapter.collect_snapshot(
                at_time=datetime.fromisoformat("2026-05-08T12:00:00+00:00")
            )

        self.assertEqual(snapshot.capture_status, "waiting")
        self.assertEqual(snapshot.source_version, "runtime-command-failed")
        self.assertEqual(snapshot.session_overview.total_sessions, 0)

    def test_runtime_command_invalid_json_returns_waiting_snapshot(self) -> None:
        self.config.runtime_command = "mock-runtime"
        completed = subprocess.CompletedProcess(
            args=["mock-runtime"],
            returncode=0,
            stdout="not-json",
            stderr="",
        )
        with mock.patch("clawobserver.runtime.subprocess.run", return_value=completed):
            snapshot = self.adapter.collect_snapshot(
                at_time=datetime.fromisoformat("2026-05-08T12:00:00+00:00")
            )

        self.assertEqual(snapshot.capture_status, "waiting")
        self.assertEqual(snapshot.source_version, "runtime-command-invalid-json")
        self.assertEqual(snapshot.session_overview.total_sessions, 0)

    def test_runtime_command_timeout_budget_stays_below_frontend_live_fetch_timeout(self) -> None:
        self.assertLess(RUNTIME_COMMAND_TIMEOUT_SECONDS, 4)

    def test_runtime_command_slow_process_returns_waiting_before_frontend_timeout(self) -> None:
        self.config.runtime_command = (
            "python3 -c \"import time; time.sleep(10)\""
        )

        started_at = time.perf_counter()
        snapshot = self.adapter.collect_snapshot(
            at_time=datetime.fromisoformat("2026-05-08T12:00:00+00:00")
        )
        elapsed = time.perf_counter() - started_at

        self.assertEqual(snapshot.capture_status, "waiting")
        self.assertEqual(snapshot.source_version, "runtime-command-timeout")
        self.assertLess(elapsed, 4.0)

    def test_normalize_payload_degrades_null_sessions_to_waiting_snapshot(self) -> None:
        snapshot = self.adapter._normalize_payload(
            {
                "captured_at": "2026-05-08T12:00:00+00:00",
                "source_version": "repro-null-sessions",
                "capture_status": "ok",
                "sessions": None,
                "queues": [],
                "gateways": {"total": 0, "states": {}},
                "tokens": [],
            },
            fallback_time=datetime.fromisoformat("2026-05-08T12:00:00+00:00"),
        )

        self.assertEqual(snapshot.capture_status, "waiting")
        self.assertEqual(snapshot.source_version, "repro-null-sessions")
        self.assertEqual(snapshot.session_overview.total_sessions, 0)
        self.assertEqual(snapshot.session_overview.active_sessions, 0)
        self.assertEqual(snapshot.session_overview.idle_sessions, 0)
        self.assertEqual(snapshot.agent_sessions, [])
        self.assertEqual(
            [(item.state_name, item.session_count) for item in snapshot.session_states],
            [("active", 0), ("idle", 0)],
        )

    def test_normalize_payload_preserves_runtime_status_reason(self) -> None:
        snapshot = self.adapter._normalize_payload(
            {
                "captured_at": "2026-05-08T12:00:00+00:00",
                "source_version": "openclaw-local-store-runtime",
                "capture_status": "degraded",
                "runtime_status_reason": "gateway call status timed out",
                "sessions": {
                    "total": 2,
                    "active": 2,
                    "by_agent": [
                        {
                            "agent_name": "main",
                            "active_sessions": 2,
                            "total_sessions": 2,
                        }
                    ],
                    "by_state": [
                        {"state_name": "active", "session_count": 2},
                        {"state_name": "idle", "session_count": 0},
                    ],
                    "by_type": [
                        {"session_type": "persistent", "session_count": 2},
                    ],
                },
                "queues": [],
                "gateways": {"total": 0, "states": {"offline": 1}},
                "tokens": [],
            },
            fallback_time=datetime.fromisoformat("2026-05-08T12:00:00+00:00"),
        )

        self.assertEqual(snapshot.capture_status, "degraded")
        self.assertEqual(snapshot.runtime_status_reason, "gateway call status timed out")
        self.assertEqual(snapshot.session_overview.total_sessions, 2)

    def test_normalize_payload_degrades_non_object_top_level_payload_to_waiting_snapshot(self) -> None:
        snapshot = self.adapter._normalize_payload(
            ["unexpected", "payload"],
            fallback_time=datetime.fromisoformat("2026-05-08T12:00:00+00:00"),
        )

        self.assertEqual(snapshot.capture_status, "waiting")
        self.assertEqual(snapshot.source_version, "unknown-runtime")
        self.assertEqual(snapshot.session_overview.total_sessions, 0)
        self.assertEqual(snapshot.session_overview.active_sessions, 0)
        self.assertEqual(snapshot.queue_lanes, [])
        self.assertEqual(
            [(item.gateway_group, item.gateway_count) for item in snapshot.gateways],
            [("total", 0)],
        )

    def test_normalize_payload_invalid_timestamp_uses_fallback_time(self) -> None:
        fallback_time = datetime.fromisoformat("2026-05-08T12:00:00+00:00")
        snapshot = self.adapter._normalize_payload(
            {
                "captured_at": "not-a-date",
                "source_version": "invalid-timestamp-runtime",
                "capture_status": "ok",
                "sessions": None,
                "queues": [],
                "gateways": {"total": 0, "states": {}},
                "tokens": [],
            },
            fallback_time=fallback_time,
        )

        self.assertEqual(snapshot.capture_status, "waiting")
        self.assertEqual(snapshot.captured_at, fallback_time)
        self.assertEqual(snapshot.source_version, "invalid-timestamp-runtime")


if __name__ == "__main__":
    unittest.main()
