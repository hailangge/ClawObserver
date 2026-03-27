from __future__ import annotations

import argparse

from .app import ClawObserverApp
from .config import load_config
from .server import serve


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="ClawObserver")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("serve", help="Run the local ClawObserver web server")
    subparsers.add_parser("capture", help="Capture one archive snapshot from the live source")

    seed_demo = subparsers.add_parser(
        "seed-demo",
        help="Insert demo archive history using the built-in runtime payload generator",
    )
    seed_demo.add_argument("--days", type=int, default=7)
    seed_demo.add_argument("--interval-minutes", type=int, default=30)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    app = ClawObserverApp(load_config())

    if args.command == "serve":
        serve(app)
        return

    if args.command == "capture":
        result = app.capture_archive_snapshot()
        print(
            f"Captured snapshot {result['snapshot_id']} at {result['captured_at']}"
        )
        return

    if args.command == "seed-demo":
        inserted = app.seed_demo_history(
            days=max(args.days, 1),
            interval_minutes=max(args.interval_minutes, 1),
        )
        print(f"Inserted {inserted} demo snapshots")
        return

    parser.error("unsupported command")


if __name__ == "__main__":
    main()

