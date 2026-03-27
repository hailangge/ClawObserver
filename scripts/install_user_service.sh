#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYSTEMD_DIR="${HOME}/.config/systemd/user"
CONFIG_DIR="${HOME}/.config/clawobserver"
STATE_DIR="${HOME}/.local/state/clawobserver"

mkdir -p "$SYSTEMD_DIR" "$CONFIG_DIR" "$STATE_DIR"

render() {
  local src="$1"
  local dst="$2"
  sed -e "s|__REPO_ROOT__|$REPO_ROOT|g" -e "s|__HOME__|$HOME|g" "$src" > "$dst"
}

render "$REPO_ROOT/deploy/systemd/clawobserver.service" "$SYSTEMD_DIR/clawobserver.service"
render "$REPO_ROOT/deploy/systemd/clawobserver-capture.service" "$SYSTEMD_DIR/clawobserver-capture.service"
cp "$REPO_ROOT/deploy/systemd/clawobserver-capture.timer" "$SYSTEMD_DIR/clawobserver-capture.timer"

ENV_FILE="$CONFIG_DIR/clawobserver.env"
render "$REPO_ROOT/deploy/systemd/clawobserver.env.example" "$ENV_FILE"

chmod +x "$REPO_ROOT/scripts/openclaw_runtime_adapter.py"
systemctl --user daemon-reload
systemctl --user enable --now clawobserver.service
systemctl --user enable --now clawobserver-capture.timer

echo "Installed user services:"
echo "  - clawobserver.service"
echo "  - clawobserver-capture.timer"
echo "Env file: $ENV_FILE"
echo "State dir: $STATE_DIR"
