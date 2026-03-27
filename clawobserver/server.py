from __future__ import annotations

import json
import mimetypes
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .app import ClawObserverApp

STATIC_DIR = Path(__file__).resolve().parent / "static"


def make_handler(app: ClawObserverApp) -> type[BaseHTTPRequestHandler]:
    class ClawObserverHandler(BaseHTTPRequestHandler):
        server_version = "ClawObserver/0.1"

        def do_GET(self) -> None:
            parsed = urlparse(self.path)
            try:
                if parsed.path == "/api/health":
                    self._write_json(HTTPStatus.OK, {"status": "ok"})
                    return

                if parsed.path == "/api/live/overview":
                    self._write_json(HTTPStatus.OK, app.live_overview_payload())
                    return

                if parsed.path == "/api/history/overview":
                    range_key = self._query_value(parsed.query, "range", "current_day")
                    self._write_json(HTTPStatus.OK, app.history_payload(range_key))
                    return

                if parsed.path == "/api/history/tokens":
                    range_key = self._query_value(parsed.query, "range", "current_day")
                    self._write_json(HTTPStatus.OK, app.token_statistics_payload(range_key))
                    return

                if parsed.path == "/" or parsed.path.startswith("/assets/"):
                    target = "index.html" if parsed.path == "/" else parsed.path.removeprefix("/assets/")
                    self._write_static(target)
                    return

                self._write_json(HTTPStatus.NOT_FOUND, {"error": "not found"})
            except ValueError as error:
                self._write_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})

        def do_POST(self) -> None:
            parsed = urlparse(self.path)
            if parsed.path == "/api/archive/capture":
                self._write_json(HTTPStatus.CREATED, app.capture_archive_snapshot())
                return

            self._write_json(HTTPStatus.NOT_FOUND, {"error": "not found"})

        def log_message(self, format: str, *args: object) -> None:
            return

        def _query_value(self, query_string: str, name: str, default: str) -> str:
            values = parse_qs(query_string).get(name)
            return values[0] if values else default

        def _write_static(self, relative_path: str) -> None:
            safe_path = Path(relative_path).as_posix().lstrip("/")
            candidate = STATIC_DIR / safe_path
            if not candidate.exists() or not candidate.is_file():
                self._write_json(HTTPStatus.NOT_FOUND, {"error": "static file not found"})
                return
            content_type, _ = mimetypes.guess_type(candidate.name)
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", content_type or "application/octet-stream")
            self.end_headers()
            self.wfile.write(candidate.read_bytes())

        def _write_json(self, status: HTTPStatus, payload: dict) -> None:
            body = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    return ClawObserverHandler


def serve(app: ClawObserverApp) -> None:
    server = ThreadingHTTPServer((app.config.host, app.config.port), make_handler(app))
    print(f"ClawObserver listening on http://{app.config.host}:{app.config.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nClawObserver stopped")
    finally:
        server.server_close()
