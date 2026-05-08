from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest import mock


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
    def test_build_store_session_sources_reads_real_local_store_shape(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            home_dir = Path(temp_dir)
            agents_dir = home_dir / ".openclaw" / "agents"
            main_store = agents_dir / "main" / "sessions" / "sessions.json"
            main_store.parent.mkdir(parents=True)
            main_store.write_text(
                json.dumps(
                    {
                        "agent:main:main": {
                            "updatedAt": "2026-05-08T11:59:00+00:00",
                            "lastInteractionAt": "2026-05-08T11:57:00+00:00",
                            "inputTokens": 120,
                            "outputTokens": 40,
                            "cacheRead": 9,
                            "cacheWrite": 2,
                            "model": "gpt-5.4",
                            "modelProvider": "openai",
                            "lastChannel": "feishu",
                            "chatType": "direct",
                        }
                    }
                ),
                encoding="utf-8",
            )

            with mock.patch.object(adapter.Path, "home", return_value=home_dir):
                payload = adapter.build_store_session_sources(
                    datetime.fromisoformat("2026-05-08T12:00:00+00:00")
                )

        self.assertEqual(len(payload["stores"]), 1)
        self.assertEqual(len(payload["sessions"]), 1)
        self.assertEqual(payload["sessions"][0]["agentId"], "main")
        self.assertEqual(payload["sessions"][0]["model"], "gpt-5.4")
        self.assertEqual(payload["sessions"][0]["kind"], "direct")
        self.assertLess(payload["sessions"][0]["ageMs"], adapter.ACTIVE_WINDOW_MS)

    def test_build_payload_prefers_store_sessions_when_gateway_calls_fail(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            home_dir = Path(temp_dir)
            agents_dir = home_dir / ".openclaw" / "agents"
            main_store = agents_dir / "main" / "sessions" / "sessions.json"
            se_codex_store = agents_dir / "se-codex" / "sessions" / "sessions.json"
            main_store.parent.mkdir(parents=True)
            se_codex_store.parent.mkdir(parents=True)
            main_store.write_text(
                json.dumps(
                    {
                        "agent:main:main": {
                            "sessionId": "main-session",
                            "updatedAt": "2026-05-08T11:59:00+00:00",
                            "startedAt": "2026-05-08T11:30:00+00:00",
                            "inputTokens": 120,
                            "outputTokens": 40,
                            "cacheRead": 9,
                            "cacheWrite": 2,
                            "model": "gpt-5.4",
                            "modelProvider": "openai",
                            "lastChannel": "feishu",
                            "thinkingLevel": "high",
                            "status": "done",
                        }
                    }
                ),
                encoding="utf-8",
            )
            se_codex_store.write_text(
                json.dumps(
                    {
                        "agent:se-codex:subagent:123": {
                            "sessionId": "se-codex-session",
                            "updatedAt": "2026-05-08T11:15:00+00:00",
                            "startedAt": "2026-05-08T10:50:00+00:00",
                            "inputTokens": 70,
                            "outputTokens": 21,
                            "cacheRead": 5,
                            "cacheWrite": 0,
                            "model": "gpt-5.5",
                            "modelProvider": "openai",
                            "channel": "feishu",
                            "thinkingLevel": "medium",
                        }
                    }
                ),
                encoding="utf-8",
            )

            def fake_capture_json_command(cmd, *, required, timeout_seconds):
                if cmd[1:] == ["gateway", "status", "--json"]:
                    return None, "openclaw gateway status --json timed out after 0.4s"
                if cmd[1:] == ["gateway", "call", "status", "--json"]:
                    return None, "openclaw gateway call status --json exited with status 1"
                raise AssertionError(f"unexpected command: {cmd}")

            with mock.patch.object(adapter, "resolve_openclaw_bin", return_value="/usr/bin/openclaw"):
                with mock.patch.object(adapter.Path, "home", return_value=home_dir):
                    with mock.patch.object(
                        adapter,
                        "capture_json_command",
                        side_effect=fake_capture_json_command,
                    ):
                        with mock.patch.object(
                            adapter,
                            "datetime",
                            wraps=adapter.datetime,
                        ) as fake_datetime:
                            fake_datetime.now.return_value = datetime.fromisoformat(
                                "2026-05-08T12:00:00+00:00"
                            )
                            payload = adapter.build_payload()

        self.assertEqual(payload["source_version"], "openclaw-local-store-runtime")
        self.assertEqual(payload["capture_status"], "degraded")
        self.assertEqual(payload["sessions"]["total"], 2)
        self.assertEqual(payload["sessions"]["active"], 2)
        by_agent = {
            item["agent_name"]: item for item in payload["sessions"]["by_agent"]
        }
        self.assertEqual(sorted(by_agent), ["main", "se-codex"])
        self.assertEqual(by_agent["main"]["active_sessions"], 1)
        self.assertEqual(by_agent["se-codex"]["session_model"], "gpt-5.5")
        self.assertEqual(
            payload["sessions"]["by_type"],
            [
                {"session_type": "persistent", "session_count": 1},
                {"session_type": "one_shot", "session_count": 1},
            ],
        )
        self.assertEqual(payload["queues"], [])
        self.assertEqual(payload["gateways"]["total"], 0)
        self.assertIn("gateway status", payload["runtime_status_reason"])
        self.assertIn("gateway call status", payload["runtime_status_reason"])

    def test_build_payload_degrades_gateway_call_timeout_into_waiting_payload(self) -> None:
        now = datetime.fromisoformat("2026-05-08T12:00:00+00:00")
        sessions_payload = {
            "stores": [],
            "sessions": [
                {
                    "key": "agent:planner:main",
                    "agentId": "planner",
                    "ageMs": 500,
                    "modelProvider": "openai",
                    "model": "gpt-5.4",
                    "kind": "default",
                    "inputTokens": 10,
                    "outputTokens": 4,
                }
            ],
        }
        gateway_status_payload = {
            "service": {
                "runtime": {
                    "status": "running",
                }
            }
        }

        def fake_capture_json_command(cmd, *, required, timeout_seconds):
            if cmd[1:] == ["sessions", "--all-agents", "--json"]:
                return sessions_payload, None
            if cmd[1:] == ["sessions", "--json", "--limit", "200"]:
                return {"stores": [], "sessions": []}, None
            if cmd[1:] == ["gateway", "status", "--json"]:
                return gateway_status_payload, None
            if cmd[1:] == ["gateway", "call", "status", "--json"]:
                return None, "openclaw gateway call status --json timed out after 0.4s"
            raise AssertionError(f"unexpected command: {cmd}")

        with mock.patch.object(adapter, "resolve_openclaw_bin", return_value="/usr/bin/openclaw"):
            with mock.patch.object(adapter, "capture_json_command", side_effect=fake_capture_json_command):
                with mock.patch.object(adapter, "load_store_entries", return_value={}):
                    with mock.patch.object(
                        adapter,
                        "extract_queue_rows",
                        return_value=[],
                    ):
                        with mock.patch.object(
                            adapter,
                            "build_store_session_sources",
                            return_value=sessions_payload,
                        ):
                            with mock.patch.object(adapter, "datetime") as fake_datetime:
                                fake_datetime.now.return_value = now
                                payload = adapter.build_payload()

        self.assertEqual(payload["capture_status"], "degraded")
        self.assertEqual(payload["sessions"]["total"], 1)
        self.assertEqual(payload["sessions"]["active"], 1)
        self.assertEqual(payload["gateways"]["total"], 1)
        self.assertEqual(payload["queues"], [])
        self.assertIn("gateway call status --json timed out", payload["runtime_status_reason"])

    def test_build_payload_treats_waiting_gateway_shapes_as_recoverable(self) -> None:
        waiting_cases = [
            {
                "gateway_call_status": {"sessions": None},
                "gateway_status": {"service": {"runtime": {"status": "running"}}},
                "expected_capture_status": "waiting",
            },
            {
                "gateway_call_status": {"sessions": []},
                "gateway_status": {"service": {"runtime": {"status": "running"}}},
                "expected_capture_status": "waiting",
            },
            {
                "gateway_call_status": {"sessions": {"recent": None}},
                "gateway_status": {"service": {"runtime": {"status": "running"}}},
                "expected_capture_status": "waiting",
            },
            {
                "gateway_call_status": {},
                "gateway_status": {"service": None},
                "expected_capture_status": "waiting",
            },
        ]

        with tempfile.TemporaryDirectory() as temp_dir:
            delivery_queue_dir = Path(temp_dir) / "missing-delivery-queue"
            for case in waiting_cases:
                expected = case.pop("expected_capture_status")
                payload = adapter.build_payload_from_sources(
                    sessions_obj={"stores": [], "sessions": []},
                    now=datetime.fromisoformat("2026-05-08T12:00:00+00:00"),
                    store_entries={},
                    delivery_queue_dir=delivery_queue_dir,
                    **case,
                )

                self.assertEqual(payload["capture_status"], expected)
                self.assertEqual(payload["sessions"]["total"], 0)
                self.assertEqual(payload["sessions"]["active"], 0)
                self.assertEqual(payload["sessions"]["by_agent"], [])
                self.assertEqual(
                    payload["sessions"]["by_state"],
                    [
                        {"state_name": "active", "session_count": 0},
                        {"state_name": "idle", "session_count": 0},
                    ],
                )
                self.assertEqual(payload["tokens"], [])

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
                            "thinkingLevel": "High",
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
                    "agent:main:main": {
                        "cacheRead": 30,
                        "cacheWrite": 10,
                        "roleStyleKey": "operator",
                        "messages": [
                            {
                                "role": "user",
                                "content": "Check whether the delivery queue is draining normally.",
                                "timestamp": "2026-03-27T11:57:00+00:00",
                            }
                        ],
                    },
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
        self.assertEqual(payload["sessions"]["by_agent"][0]["role_style_key"], "operator")
        self.assertEqual(payload["sessions"]["by_agent"][0]["thinking_level"], "High")
        self.assertEqual(
            payload["sessions"]["by_agent"][0]["latest_user_input"],
            "Check whether the delivery queue is draining normally.",
        )
        self.assertEqual(
            payload["sessions"]["by_agent"][0]["latest_user_input_timestamp"],
            adapter.isoformat_or_none("2026-03-27T11:57:00+00:00"),
        )
        self.assertEqual(payload["sessions"]["by_agent"][0]["session_model"], "gpt-5.4")

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

    def test_build_payload_preserves_sessions_while_gateway_service_is_waiting(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            payload = adapter.build_payload_from_sources(
                sessions_obj={
                    "stores": [],
                    "sessions": [
                        {
                            "key": "agent:planner:main",
                            "agentId": "planner",
                            "ageMs": 500,
                            "modelProvider": "openai",
                            "model": "gpt-5.4",
                            "kind": "default",
                            "inputTokens": 100,
                            "outputTokens": 40,
                        }
                    ],
                },
                gateway_call_status={"sessions": None},
                gateway_status={"service": None},
                now=datetime.fromisoformat("2026-05-08T12:00:00+00:00"),
                store_entries={},
                delivery_queue_dir=Path(temp_dir) / "missing-delivery-queue",
            )

        self.assertEqual(payload["capture_status"], "degraded")
        self.assertEqual(payload["sessions"]["total"], 1)
        self.assertEqual(payload["sessions"]["active"], 1)
        self.assertEqual(payload["sessions"]["by_agent"][0]["agent_name"], "planner")
        self.assertEqual(payload["gateways"]["total"], 0)
        self.assertEqual(payload["gateways"]["states"]["offline"], 1)
        self.assertIn("gateway sessions payload unavailable", payload["runtime_status_reason"])
        self.assertIn("gateway service payload unavailable", payload["runtime_status_reason"])


if __name__ == "__main__":
    unittest.main()
