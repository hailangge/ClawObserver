from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class AppConfig:
    base_dir: Path
    data_dir: Path
    database_path: Path
    runtime_json_path: Path | None
    runtime_command: str | None
    host: str
    port: int
    refresh_seconds: int
    archive_cadence_minutes: int


def load_config() -> AppConfig:
    base_dir = Path(__file__).resolve().parent.parent
    data_dir = Path(os.getenv("CLAWOBSERVER_DATA_DIR", base_dir / "data"))
    database_path = Path(
        os.getenv("CLAWOBSERVER_DATABASE_PATH", data_dir / "clawobserver.sqlite3")
    )
    runtime_json_value = os.getenv("CLAWOBSERVER_RUNTIME_JSON")
    runtime_json_path = Path(runtime_json_value) if runtime_json_value else None
    runtime_command = os.getenv("CLAWOBSERVER_RUNTIME_COMMAND")
    host = os.getenv("CLAWOBSERVER_HOST", "127.0.0.1")
    port = int(os.getenv("CLAWOBSERVER_PORT", "8420"))
    refresh_seconds = int(os.getenv("CLAWOBSERVER_REFRESH_SECONDS", "15"))
    archive_cadence_minutes = int(os.getenv("CLAWOBSERVER_ARCHIVE_CADENCE_MINUTES", "30"))

    data_dir.mkdir(parents=True, exist_ok=True)

    return AppConfig(
        base_dir=base_dir,
        data_dir=data_dir,
        database_path=database_path,
        runtime_json_path=runtime_json_path,
        runtime_command=runtime_command,
        host=host,
        port=port,
        refresh_seconds=refresh_seconds,
        archive_cadence_minutes=archive_cadence_minutes,
    )

