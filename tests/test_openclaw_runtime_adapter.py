from __future__ import annotations

import importlib.util
import tempfile
import unittest
from datetime import datetime
from pathlib import Path


def _load_adapter_module():
    script_path = (
        Path(__file__).resolve().parents[1] / "scripts" / "openclaw_runtime_adapter.py"
    )
    spec = importlib.util.spec_from_file_location("openclaw_runtime_adapter", script_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("failed to load openclaw runtime adapter module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


adapter = _load_adapter_module()


class OpenClawRuntimeAdapterTests(unittest.TestCase):
    def test_build_payload_prefers_delivery_queue_depth_from_disk(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            delivery_queue_dir = Path(temp_dir) / "delivery-queue"
            delivery_queue_dir.mkdir(parents=True)
            (delivery_queue_dir / "failed").mkdir()
            (delivery_queue_dir / "pending-a.json").write_text("{}", encoding="utf-8")
            (delivery_queue_dir / "pending-b.json").write_text("{}", encoding="utf-8")
            (delivery_queue_dir / "failed" / "failed-a.json").write_text(
                "{}",
                encoding="utf-8",
            )

            payload = adapter.build_payload_from_sources(
                sessions_obj={
                    "stores": [],
                    "sessions": [
                        {
                            "key": "agent:main:main",
                            "agentId": "main",
                            "ageMs": 500,
                            "modelProvider": "openai",
                            "model": "gpt-5.4",
                            "kind": "direct",
                            "inputTokens": 100,
                            "outputTokens": 40,
                        },
                        {
                            "key": "agent:main:cron:abc:run:def",
                            "agentId": "main",
                            "ageMs": 3 * 60 * 60 * 1000,
                            "modelProvider": "openai",
                            "model": "gpt-5.4",
                            "kind": "direct",
                            "inputTokens": 50,
                            "outputTokens": 10,
                        },
                    ],
                },
                gateway_call_status={"queuedSystemEvents": [{"id": 1}, {"id": 2}]},
                gateway_status={"service": {"runtime": {"status": "running"}}},
                now=datetime.fromisoformat("2026-03-27T12:00:00+00:00"),
                store_entries={
                    "agent:main:main": {"cacheRead": 30, "cacheWrite": 10},
                    "agent:main:cron:abc:run:def": {"cacheRead": 5, "cacheWrite": 0},
                },
                delivery_queue_dir=delivery_queue_dir,
            )

        self.assertEqual(
            payload["queues"],
            [
                {"lane_name": "delivery_queue_pending", "depth": 2},
                {"lane_name": "delivery_queue_failed", "depth": 1},
            ],
        )
        self.assertEqual(
            payload["sessions"]["by_type"],
            [
                {"session_type": "persistent", "session_count": 1},
                {"session_type": "one_shot", "session_count": 1},
            ],
        )
        self.assertEqual(payload["tokens"][0]["cache_read_tokens"], 35)
        self.assertEqual(payload["tokens"][0]["cache_write_tokens"], 10)
        self.assertTrue(payload["tokens"][0]["cache_metrics_present"])

    def test_build_payload_falls_back_to_runtime_backlog_when_delivery_queue_missing(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            payload = adapter.build_payload_from_sources(
                sessions_obj={
                    "stores": [],
                    "sessions": [
                        {
                            "key": "agent:main:main",
                            "agentId": "main",
                            "ageMs": 500,
                            "modelProvider": "openai",
                            "model": "gpt-5.4",
                            "kind": "direct",
                            "inputTokens": 100,
                            "outputTokens": 40,
                        },
                        {
                            "key": "agent:main:cron:abc:run:def",
                            "agentId": "main",
                            "ageMs": 3 * 60 * 60 * 1000,
                            "modelProvider": "openai",
                            "model": "gpt-5.4",
                            "kind": "direct",
                            "inputTokens": 50,
                            "outputTokens": 10,
                        },
                    ],
                },
                gateway_call_status={"queuedSystemEvents": [{"id": 1}, {"id": 2}]},
                gateway_status={"service": {"runtime": {"status": "running"}}},
                now=datetime.fromisoformat("2026-03-27T12:00:00+00:00"),
                store_entries={
                    "agent:main:main": {"cacheRead": 30, "cacheWrite": 10},
                    "agent:main:cron:abc:run:def": {"cacheRead": 5, "cacheWrite": 0},
                },
                delivery_queue_dir=Path(temp_dir) / "missing-delivery-queue",
            )

        self.assertEqual(
            payload["queues"],
            [{"lane_name": "queued_system_events", "depth": 2}],
        )
        self.assertEqual(
            payload["sessions"]["by_type"],
            [
                {"session_type": "persistent", "session_count": 1},
                {"session_type": "one_shot", "session_count": 1},
            ],
        )
        self.assertEqual(payload["tokens"][0]["cache_read_tokens"], 35)
        self.assertEqual(payload["tokens"][0]["cache_write_tokens"], 10)
        self.assertTrue(payload["tokens"][0]["cache_metrics_present"])

    def test_extract_queue_rows_uses_structured_lane_data_when_available(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            rows = adapter.extract_queue_rows(
                {"queueDepthByLane": {"nested": 2, "main": {"depth": 5}}},
                delivery_queue_dir=Path(temp_dir) / "missing-delivery-queue",
            )

        self.assertEqual(
            rows,
            [
                {"lane_name": "main", "depth": 5},
                {"lane_name": "nested", "depth": 2},
            ],
        )

    def test_token_rollup_ignores_sessions_not_updated_today(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            payload = adapter.build_payload_from_sources(
                sessions_obj={
                    "stores": [],
                    "sessions": [
                        {
                            "key": "agent:main:main",
                            "agentId": "main",
                            "ageMs": 500,
                            "updatedAt": "2026-03-27T12:00:00+00:00",
                            "modelProvider": "openai",
                            "model": "gpt-5.4",
                            "kind": "direct",
                            "inputTokens": 100,
                            "outputTokens": 40,
                        },
                        {
                            "key": "agent:se-codex:subagent:legacy",
                            "agentId": "se-codex",
                            "ageMs": 49 * 60 * 60 * 1000,
                            "updatedAt": "2026-03-25T12:00:00+00:00",
                            "modelProvider": "openai",
                            "model": "gpt-5.3-codex",
                            "kind": "direct",
                            "inputTokens": 999,
                            "outputTokens": 111,
                        },
                    ],
                },
                gateway_call_status={"queuedSystemEvents": []},
                gateway_status={"service": {"runtime": {"status": "running"}}},
                now=datetime.fromisoformat("2026-03-27T18:00:00+00:00"),
                store_entries={},
                delivery_queue_dir=Path(temp_dir) / "missing-delivery-queue",
            )

        self.assertEqual([item["model"] for item in payload["tokens"]], ["gpt-5.4"])


if __name__ == "__main__":
    unittest.main()
