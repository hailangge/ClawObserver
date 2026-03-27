from __future__ import annotations

import tempfile
import unittest
from datetime import datetime
from pathlib import Path

from clawobserver.config import AppConfig
from clawobserver.runtime import LiveRuntimeAdapter, build_demo_payload


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


if __name__ == "__main__":
    unittest.main()
