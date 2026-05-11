from __future__ import annotations

import json
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

from clawobserver.app import ClawObserverApp
from clawobserver.config import AppConfig
from clawobserver.server import make_handler


class ServerLiveFailureTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        base_dir = Path(self.temp_dir.name)
        config = AppConfig(
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
        self.app = ClawObserverApp(config)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_live_overview_runtime_exception_returns_controlled_json(self) -> None:
        handler_class = make_handler(self.app)
        payloads: list[tuple[int, dict]] = []

        def fake_write_json(instance, status, payload):
            payloads.append((int(status), payload))

        handler = handler_class.__new__(handler_class)
        handler.path = "/api/live/overview"
        handler._write_json = fake_write_json.__get__(handler, handler_class)
        handler._write_static = lambda relative_path: None
        handler.wfile = None

        self.app.live_overview_payload = lambda: (_ for _ in ()).throw(RuntimeError("boom"))

        handler.do_GET()

        self.assertEqual(len(payloads), 1)
        status, payload = payloads[0]
        self.assertEqual(status, 503)
        self.assertEqual(payload["error"], "live runtime unavailable")
        self.assertEqual(payload["detail"], "boom")
        self.assertEqual(payload["capture_status"], "waiting")
        self.assertIn("captured_at", payload)

    def test_live_overview_null_sessions_payload_stays_200_waiting_json(self) -> None:
        runtime_path = self.app.config.base_dir / "runtime.json"
        runtime_path.write_text(
            json.dumps(
                {
                    "captured_at": "2026-05-08T12:00:00+00:00",
                    "source_version": "repro-null-sessions",
                    "capture_status": "ok",
                    "sessions": None,
                    "queues": [],
                    "gateways": {"total": 0, "states": {}},
                    "tokens": [],
                }
            ),
            encoding="utf-8",
        )
        self.app.config.runtime_json_path = runtime_path

        handler_class = make_handler(self.app)
        payloads: list[tuple[int, dict]] = []

        def fake_write_json(instance, status, payload):
            payloads.append((int(status), payload))

        handler = handler_class.__new__(handler_class)
        handler.path = "/api/live/overview"
        handler._write_json = fake_write_json.__get__(handler, handler_class)
        handler._write_static = lambda relative_path: None
        handler.wfile = None

        handler.do_GET()

        self.assertEqual(len(payloads), 1)
        status, payload = payloads[0]
        self.assertEqual(status, 200)
        self.assertEqual(payload["capture_status"], "waiting")
        self.assertEqual(payload["source_version"], "repro-null-sessions")
        self.assertEqual(payload["session_overview"]["total_sessions"], 0)
        self.assertEqual(payload["session_overview"]["active_sessions"], 0)
        self.assertEqual(payload["agent_sessions"], [])

    def test_live_overview_non_object_runtime_payload_stays_200_waiting_json(self) -> None:
        runtime_path = self.app.config.base_dir / "runtime.json"
        runtime_path.write_text(json.dumps(["unexpected", "payload"]), encoding="utf-8")
        self.app.config.runtime_json_path = runtime_path

        handler_class = make_handler(self.app)
        payloads: list[tuple[int, dict]] = []

        def fake_write_json(instance, status, payload):
            payloads.append((int(status), payload))

        handler = handler_class.__new__(handler_class)
        handler.path = "/api/live/overview"
        handler._write_json = fake_write_json.__get__(handler, handler_class)
        handler._write_static = lambda relative_path: None
        handler.wfile = None

        handler.do_GET()

        self.assertEqual(len(payloads), 1)
        status, payload = payloads[0]
        self.assertEqual(status, 200)
        self.assertEqual(payload["capture_status"], "waiting")
        self.assertEqual(payload["session_overview"]["total_sessions"], 0)
        self.assertEqual(payload["gateways"], [{"gateway_group": "total", "gateway_count": 0}])

    def test_live_overview_invalid_timestamp_payload_uses_fallback_and_stays_200(self) -> None:
        runtime_path = self.app.config.base_dir / "runtime.json"
        runtime_path.write_text(
            json.dumps(
                {
                    "captured_at": "not-a-date",
                    "source_version": "invalid-timestamp-runtime",
                    "capture_status": "ok",
                    "sessions": None,
                    "queues": [],
                    "gateways": {"total": 0, "states": {}},
                    "tokens": [],
                }
            ),
            encoding="utf-8",
        )
        self.app.config.runtime_json_path = runtime_path

        handler_class = make_handler(self.app)
        payloads: list[tuple[int, dict]] = []

        def fake_write_json(instance, status, payload):
            payloads.append((int(status), payload))

        handler = handler_class.__new__(handler_class)
        handler.path = "/api/live/overview"
        handler._write_json = fake_write_json.__get__(handler, handler_class)
        handler._write_static = lambda relative_path: None
        handler.wfile = None

        handler.do_GET()

        self.assertEqual(len(payloads), 1)
        status, payload = payloads[0]
        self.assertEqual(status, 200)
        self.assertEqual(payload["capture_status"], "waiting")
        self.assertEqual(payload["source_version"], "invalid-timestamp-runtime")
        self.assertIn("captured_at", payload)

    def test_live_overview_returns_runtime_status_reason_from_degraded_payload(self) -> None:
        self.app.live_adapter.collect_snapshot = lambda: self.app.live_adapter._normalize_payload(
            {
                "captured_at": "2026-05-08T12:00:00+00:00",
                "source_version": "openclaw-local-store-runtime",
                "capture_status": "degraded",
                "runtime_status_reason": "gateway call status timed out",
                "sessions": {
                    "total": 1,
                    "active": 1,
                    "by_agent": [
                        {
                            "agent_name": "main",
                            "active_sessions": 1,
                            "total_sessions": 1,
                        }
                    ],
                    "by_state": [
                        {"state_name": "active", "session_count": 1},
                        {"state_name": "idle", "session_count": 0},
                    ],
                    "by_type": [],
                },
                "queues": [],
                "gateways": {"total": 0, "states": {"offline": 1}},
                "tokens": [],
            },
            datetime.fromisoformat("2026-05-08T12:00:00+00:00"),
        )

        handler_class = make_handler(self.app)
        payloads: list[tuple[int, dict]] = []

        def fake_write_json(instance, status, payload):
            payloads.append((int(status), payload))

        handler = handler_class.__new__(handler_class)
        handler.path = "/api/live/overview"
        handler._write_json = fake_write_json.__get__(handler, handler_class)
        handler._write_static = lambda relative_path: None
        handler.wfile = None

        handler.do_GET()

        self.assertEqual(len(payloads), 1)
        status, payload = payloads[0]
        self.assertEqual(status, 200)
        self.assertEqual(payload["capture_status"], "degraded")
        self.assertEqual(payload["runtime_status_reason"], "gateway call status timed out")
        self.assertEqual(payload["session_overview"]["total_sessions"], 1)

    def test_live_prototype_payload_returns_narrowed_agent_payload(self) -> None:
        handler_class = make_handler(self.app)
        payloads: list[tuple[int, dict]] = []

        def fake_write_json(instance, status, payload):
            payloads.append((int(status), payload))

        handler = handler_class.__new__(handler_class)
        handler.path = "/api/live/prototype"
        handler._write_json = fake_write_json.__get__(handler, handler_class)
        handler._write_static = lambda relative_path: None
        handler.wfile = None

        self.app.prototype_live_payload = lambda: {
            "captured_at": "2026-05-10T09:30:00+00:00",
            "source_version": "demo-runtime",
            "capture_status": "ok",
            "runtime_status_reason": None,
            "agent_sessions": [{"agent_name": "planner", "active_sessions": 2, "total_sessions": 3}],
        }

        handler.do_GET()

        self.assertEqual(len(payloads), 1)
        status, payload = payloads[0]
        self.assertEqual(status, 200)
        self.assertEqual(payload["capture_status"], "ok")
        self.assertEqual(payload["agent_sessions"][0]["agent_name"], "planner")

    def test_prototype_route_serves_prototype_index(self) -> None:
        handler_class = make_handler(self.app)
        served_paths: list[str] = []

        handler = handler_class.__new__(handler_class)
        handler.path = "/prototype"
        handler._write_json = lambda status, payload: None
        handler._write_static = lambda relative_path: served_paths.append(relative_path)
        handler.wfile = None

        handler.do_GET()

        self.assertEqual(served_paths, ["prototype/index.html"])

    def test_root_route_serves_dashboard_index(self) -> None:
        handler_class = make_handler(self.app)
        served_paths: list[str] = []

        handler = handler_class.__new__(handler_class)
        handler.path = "/"
        handler._write_json = lambda status, payload: None
        handler._write_static = lambda relative_path: served_paths.append(relative_path)
        handler.wfile = None

        handler.do_GET()

        self.assertEqual(served_paths, ["index.html"])

    def test_realtime_scene_embed_asset_route_serves_static_file(self) -> None:
        handler_class = make_handler(self.app)
        served_paths: list[str] = []

        handler = handler_class.__new__(handler_class)
        handler.path = "/assets/prototype/assets/realtime-scene-embed.js"
        handler._write_json = lambda status, payload: None
        handler._write_static = lambda relative_path: served_paths.append(relative_path)
        handler.wfile = None

        handler.do_GET()

        self.assertEqual(served_paths, ["prototype/assets/realtime-scene-embed.js"])

    def test_static_write_rejects_parent_escape(self) -> None:
        handler_class = make_handler(self.app)
        payloads: list[tuple[int, dict]] = []

        def fake_write_json(instance, status, payload):
            payloads.append((int(status), payload))

        handler = handler_class.__new__(handler_class)
        handler._write_json = fake_write_json.__get__(handler, handler_class)
        handler.send_response = lambda status: None
        handler.send_header = lambda key, value: None
        handler.end_headers = lambda: None
        handler.wfile = type("Writer", (), {"write": lambda self, data: None})()

        handler._write_static("../README.md")

        self.assertEqual(len(payloads), 1)
        status, payload = payloads[0]
        self.assertEqual(status, 404)
        self.assertEqual(payload["error"], "static file not found")


if __name__ == "__main__":
    unittest.main()
