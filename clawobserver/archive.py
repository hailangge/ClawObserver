from __future__ import annotations

import sqlite3
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

from .config import AppConfig
from .models import RuntimeSnapshot

RANGE_DAY_COUNTS = {
    "current_day": 1,
    "last_7_days": 7,
    "last_30_days": 30,
    "last_90_days": 90,
}


def _today() -> date:
    return datetime.now().astimezone().date()


def _range_dates(range_key: str, today: date | None = None) -> tuple[date, date]:
    if range_key not in RANGE_DAY_COUNTS:
        raise ValueError(f"unsupported range: {range_key}")

    end_date = today or _today()
    start_date = end_date - timedelta(days=RANGE_DAY_COUNTS[range_key] - 1)
    return start_date, end_date


class ArchiveStore:
    def __init__(self, config: AppConfig):
        self._config = config
        self._config.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._config.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                PRAGMA journal_mode=WAL;

                CREATE TABLE IF NOT EXISTS archive_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    captured_at TEXT NOT NULL,
                    capture_date TEXT NOT NULL,
                    source_version TEXT NOT NULL,
                    capture_status TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_archive_snapshots_capture_date
                    ON archive_snapshots (capture_date, captured_at);

                CREATE TABLE IF NOT EXISTS session_overview_samples (
                    snapshot_id INTEGER NOT NULL PRIMARY KEY,
                    total_sessions INTEGER NOT NULL,
                    active_sessions INTEGER NOT NULL,
                    idle_sessions INTEGER NOT NULL,
                    FOREIGN KEY (snapshot_id) REFERENCES archive_snapshots (id)
                );

                CREATE TABLE IF NOT EXISTS agent_session_samples (
                    snapshot_id INTEGER NOT NULL,
                    agent_name TEXT NOT NULL,
                    active_sessions INTEGER NOT NULL,
                    total_sessions INTEGER NOT NULL,
                    FOREIGN KEY (snapshot_id) REFERENCES archive_snapshots (id)
                );

                CREATE INDEX IF NOT EXISTS idx_agent_session_samples_snapshot
                    ON agent_session_samples (snapshot_id, agent_name);

                CREATE TABLE IF NOT EXISTS session_state_samples (
                    snapshot_id INTEGER NOT NULL,
                    state_name TEXT NOT NULL,
                    session_count INTEGER NOT NULL,
                    FOREIGN KEY (snapshot_id) REFERENCES archive_snapshots (id)
                );

                CREATE INDEX IF NOT EXISTS idx_session_state_samples_snapshot
                    ON session_state_samples (snapshot_id, state_name);

                CREATE TABLE IF NOT EXISTS queue_lane_samples (
                    snapshot_id INTEGER NOT NULL,
                    lane_name TEXT NOT NULL,
                    depth INTEGER NOT NULL,
                    FOREIGN KEY (snapshot_id) REFERENCES archive_snapshots (id)
                );

                CREATE INDEX IF NOT EXISTS idx_queue_lane_samples_snapshot
                    ON queue_lane_samples (snapshot_id, lane_name);

                CREATE TABLE IF NOT EXISTS token_counter_samples (
                    snapshot_id INTEGER NOT NULL,
                    day_key TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    model TEXT NOT NULL,
                    channel TEXT,
                    input_tokens INTEGER NOT NULL,
                    output_tokens INTEGER NOT NULL,
                    FOREIGN KEY (snapshot_id) REFERENCES archive_snapshots (id)
                );

                CREATE INDEX IF NOT EXISTS idx_token_counter_samples_snapshot
                    ON token_counter_samples (snapshot_id, day_key, provider, model, channel);

                CREATE TABLE IF NOT EXISTS gateway_samples (
                    snapshot_id INTEGER NOT NULL,
                    gateway_group TEXT NOT NULL,
                    gateway_count INTEGER NOT NULL,
                    FOREIGN KEY (snapshot_id) REFERENCES archive_snapshots (id)
                );

                CREATE INDEX IF NOT EXISTS idx_gateway_samples_snapshot
                    ON gateway_samples (snapshot_id, gateway_group);
                """
            )

    def insert_snapshot(self, snapshot: RuntimeSnapshot) -> int:
        with self._connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO archive_snapshots (
                    captured_at,
                    capture_date,
                    source_version,
                    capture_status
                ) VALUES (?, ?, ?, ?)
                """,
                (
                    snapshot.captured_at.isoformat(),
                    snapshot.capture_date,
                    snapshot.source_version,
                    snapshot.capture_status,
                ),
            )
            snapshot_id = int(cursor.lastrowid)

            connection.execute(
                """
                INSERT INTO session_overview_samples (
                    snapshot_id,
                    total_sessions,
                    active_sessions,
                    idle_sessions
                ) VALUES (?, ?, ?, ?)
                """,
                (
                    snapshot_id,
                    snapshot.session_overview.total_sessions,
                    snapshot.session_overview.active_sessions,
                    snapshot.session_overview.idle_sessions,
                ),
            )

            connection.executemany(
                """
                INSERT INTO agent_session_samples (
                    snapshot_id,
                    agent_name,
                    active_sessions,
                    total_sessions
                ) VALUES (?, ?, ?, ?)
                """,
                [
                    (
                        snapshot_id,
                        item.agent_name,
                        item.active_sessions,
                        item.total_sessions,
                    )
                    for item in snapshot.agent_sessions
                ],
            )

            connection.executemany(
                """
                INSERT INTO session_state_samples (
                    snapshot_id,
                    state_name,
                    session_count
                ) VALUES (?, ?, ?)
                """,
                [
                    (
                        snapshot_id,
                        item.state_name,
                        item.session_count,
                    )
                    for item in snapshot.session_states
                ],
            )

            connection.executemany(
                """
                INSERT INTO queue_lane_samples (
                    snapshot_id,
                    lane_name,
                    depth
                ) VALUES (?, ?, ?)
                """,
                [
                    (
                        snapshot_id,
                        item.lane_name,
                        item.depth,
                    )
                    for item in snapshot.queue_lanes
                ],
            )

            connection.executemany(
                """
                INSERT INTO token_counter_samples (
                    snapshot_id,
                    day_key,
                    provider,
                    model,
                    channel,
                    input_tokens,
                    output_tokens
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        snapshot_id,
                        item.day_key,
                        item.provider,
                        item.model,
                        item.channel,
                        item.input_tokens,
                        item.output_tokens,
                    )
                    for item in snapshot.token_counters
                ],
            )

            connection.executemany(
                """
                INSERT INTO gateway_samples (
                    snapshot_id,
                    gateway_group,
                    gateway_count
                ) VALUES (?, ?, ?)
                """,
                [
                    (
                        snapshot_id,
                        item.gateway_group,
                        item.gateway_count,
                    )
                    for item in snapshot.gateways
                ],
            )

            return snapshot_id

    def history_payload(self, range_key: str) -> dict[str, Any]:
        snapshot_rows, mode = self._selected_snapshot_rows(range_key)
        snapshot_ids = [int(row["id"]) for row in snapshot_rows]

        payload = {
            "range_key": range_key,
            "mode": mode,
            "mode_label": (
                "Current day archived samples"
                if mode == "intra_day_sampled"
                else "Daily last-record summary"
            ),
            "cadence_minutes": self._config.archive_cadence_minutes,
            "points": [],
        }
        if not snapshot_ids:
            return payload

        points_by_id: dict[int, dict[str, Any]] = {}
        ordered_ids: list[int] = []
        for row in snapshot_rows:
            snapshot_id = int(row["id"])
            ordered_ids.append(snapshot_id)
            points_by_id[snapshot_id] = {
                "snapshot_id": snapshot_id,
                "captured_at": row["captured_at"],
                "capture_date": row["capture_date"],
                "session_overview": None,
                "agent_sessions": [],
                "session_states": [],
                "queue_lanes": [],
                "gateways": [],
                "token_counters": [],
            }

        with self._connect() as connection:
            self._fill_points(
                connection,
                points_by_id,
                snapshot_ids,
                "session_overview_samples",
                lambda row: {
                    "total_sessions": row["total_sessions"],
                    "active_sessions": row["active_sessions"],
                    "idle_sessions": row["idle_sessions"],
                },
                single_row=True,
            )
            self._fill_points(
                connection,
                points_by_id,
                snapshot_ids,
                "agent_session_samples",
                lambda row: {
                    "agent_name": row["agent_name"],
                    "active_sessions": row["active_sessions"],
                    "total_sessions": row["total_sessions"],
                },
            )
            self._fill_points(
                connection,
                points_by_id,
                snapshot_ids,
                "session_state_samples",
                lambda row: {
                    "state_name": row["state_name"],
                    "session_count": row["session_count"],
                },
            )
            self._fill_points(
                connection,
                points_by_id,
                snapshot_ids,
                "queue_lane_samples",
                lambda row: {
                    "lane_name": row["lane_name"],
                    "depth": row["depth"],
                },
            )
            self._fill_points(
                connection,
                points_by_id,
                snapshot_ids,
                "gateway_samples",
                lambda row: {
                    "gateway_group": row["gateway_group"],
                    "gateway_count": row["gateway_count"],
                },
            )
            self._fill_points(
                connection,
                points_by_id,
                snapshot_ids,
                "token_counter_samples",
                lambda row: {
                    "day_key": row["day_key"],
                    "provider": row["provider"],
                    "model": row["model"],
                    "channel": row["channel"],
                    "input_tokens": row["input_tokens"],
                    "output_tokens": row["output_tokens"],
                },
            )

        payload["points"] = [points_by_id[snapshot_id] for snapshot_id in ordered_ids]
        return payload

    def token_statistics_payload(self, range_key: str) -> dict[str, Any]:
        snapshot_rows, _ = self._selected_snapshot_rows(range_key, day_last_only=True)
        if not snapshot_rows:
            return {
                "range_key": range_key,
                "selection_label": "Latest archived record per day",
                "daily_records": [],
                "total_input_tokens": 0,
                "total_output_tokens": 0,
                "provider_distribution": [],
                "model_distribution": [],
                "channel_distribution": [],
                "has_channel_data": False,
            }

        snapshot_ids = [int(row["id"]) for row in snapshot_rows]
        metadata_by_id = {
            int(row["id"]): {
                "captured_at": row["captured_at"],
                "capture_date": row["capture_date"],
            }
            for row in snapshot_rows
        }

        placeholders = ",".join("?" for _ in snapshot_ids)
        with self._connect() as connection:
            token_rows = connection.execute(
                f"""
                SELECT
                    snapshot_id,
                    day_key,
                    provider,
                    model,
                    channel,
                    input_tokens,
                    output_tokens
                FROM token_counter_samples
                WHERE snapshot_id IN ({placeholders})
                ORDER BY day_key ASC, provider ASC, model ASC, channel ASC
                """,
                snapshot_ids,
            ).fetchall()

        total_input_tokens = 0
        total_output_tokens = 0
        provider_totals: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"name": "", "input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
        )
        model_totals: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"name": "", "input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
        )
        channel_totals: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"name": "", "input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
        )
        daily_records: dict[str, dict[str, Any]] = {}
        has_channel_data = False

        for row in token_rows:
            snapshot_id = int(row["snapshot_id"])
            day_key = str(row["day_key"])
            input_tokens = int(row["input_tokens"])
            output_tokens = int(row["output_tokens"])
            total_tokens = input_tokens + output_tokens

            total_input_tokens += input_tokens
            total_output_tokens += output_tokens

            provider_name = str(row["provider"])
            provider_totals[provider_name]["name"] = provider_name
            provider_totals[provider_name]["input_tokens"] += input_tokens
            provider_totals[provider_name]["output_tokens"] += output_tokens
            provider_totals[provider_name]["total_tokens"] += total_tokens

            model_name = str(row["model"])
            model_totals[model_name]["name"] = model_name
            model_totals[model_name]["input_tokens"] += input_tokens
            model_totals[model_name]["output_tokens"] += output_tokens
            model_totals[model_name]["total_tokens"] += total_tokens

            channel_name = row["channel"]
            if channel_name:
                has_channel_data = True
                channel_key = str(channel_name)
                channel_totals[channel_key]["name"] = channel_key
                channel_totals[channel_key]["input_tokens"] += input_tokens
                channel_totals[channel_key]["output_tokens"] += output_tokens
                channel_totals[channel_key]["total_tokens"] += total_tokens

            if day_key not in daily_records:
                daily_records[day_key] = {
                    "day_key": day_key,
                    "capture_date": metadata_by_id[snapshot_id]["capture_date"],
                    "captured_at": metadata_by_id[snapshot_id]["captured_at"],
                    "input_tokens": 0,
                    "output_tokens": 0,
                }
            daily_records[day_key]["input_tokens"] += input_tokens
            daily_records[day_key]["output_tokens"] += output_tokens

        return {
            "range_key": range_key,
            "selection_label": "Latest archived record per day",
            "daily_records": list(daily_records.values()),
            "total_input_tokens": total_input_tokens,
            "total_output_tokens": total_output_tokens,
            "provider_distribution": self._sorted_totals(provider_totals),
            "model_distribution": self._sorted_totals(model_totals),
            "channel_distribution": self._sorted_totals(channel_totals),
            "has_channel_data": has_channel_data,
        }

    def _selected_snapshot_rows(
        self,
        range_key: str,
        *,
        day_last_only: bool = False,
    ) -> tuple[list[sqlite3.Row], str]:
        start_date, end_date = _range_dates(range_key)
        if range_key == "current_day" and not day_last_only:
            query = """
                SELECT
                    id,
                    captured_at,
                    capture_date
                FROM archive_snapshots
                WHERE capture_date = ?
                ORDER BY captured_at ASC
            """
            parameters = (end_date.isoformat(),)
            mode = "intra_day_sampled"
        else:
            query = """
                SELECT
                    s.id,
                    s.captured_at,
                    s.capture_date
                FROM archive_snapshots AS s
                INNER JOIN (
                    SELECT
                        capture_date,
                        MAX(captured_at) AS max_captured_at
                    FROM archive_snapshots
                    WHERE capture_date BETWEEN ? AND ?
                    GROUP BY capture_date
                ) AS latest
                    ON latest.capture_date = s.capture_date
                   AND latest.max_captured_at = s.captured_at
                ORDER BY s.capture_date ASC
            """
            parameters = (start_date.isoformat(), end_date.isoformat())
            mode = "daily_last_record_summary"

        with self._connect() as connection:
            rows = connection.execute(query, parameters).fetchall()
        return rows, mode

    def _fill_points(
        self,
        connection: sqlite3.Connection,
        points_by_id: dict[int, dict[str, Any]],
        snapshot_ids: list[int],
        table_name: str,
        serializer: Any,
        *,
        single_row: bool = False,
    ) -> None:
        placeholders = ",".join("?" for _ in snapshot_ids)
        rows = connection.execute(
            f"SELECT * FROM {table_name} WHERE snapshot_id IN ({placeholders}) ORDER BY snapshot_id ASC",
            snapshot_ids,
        ).fetchall()
        key_name = {
            "session_overview_samples": "session_overview",
            "agent_session_samples": "agent_sessions",
            "session_state_samples": "session_states",
            "queue_lane_samples": "queue_lanes",
            "gateway_samples": "gateways",
            "token_counter_samples": "token_counters",
        }[table_name]

        for row in rows:
            snapshot_id = int(row["snapshot_id"])
            if single_row:
                points_by_id[snapshot_id][key_name] = serializer(row)
            else:
                points_by_id[snapshot_id][key_name].append(serializer(row))

    def _sorted_totals(self, totals: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
        items = list(totals.values())
        items.sort(key=lambda item: (-int(item["total_tokens"]), str(item["name"])))
        return items
