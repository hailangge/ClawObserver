#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYSTEMD_DIR="${HOME}/.config/systemd/user"
CONFIG_DIR="${HOME}/.config/clawobserver"
STATE_DIR="${HOME}/.local/state/clawobserver"
ENV_TEMPLATE="$REPO_ROOT/deploy/systemd/clawobserver.env.example"
ENV_FILE="$CONFIG_DIR/clawobserver.env"

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    printf 'Error: required command not found: %s\n' "$name" >&2
    exit 1
  fi
}

render() {
  local src="$1"
  local dst="$2"
  sed \
    -e "s|__REPO_ROOT__|$REPO_ROOT|g" \
    -e "s|__HOME__|$HOME|g" \
    "$src" > "$dst"
}

read_env_value() {
  local name="$1"
  local value

  value="$(awk -F= -v key="$name" '$1 == key { value = $2 } END { print value }' "$ENV_FILE")"
  if [[ -n "$value" ]]; then
    printf '%s\n' "$value"
    return
  fi

  case "$name" in
    CLAWOBSERVER_HOST) printf '127.0.0.1\n' ;;
    CLAWOBSERVER_PORT) printf '8420\n' ;;
    *) printf '\n' ;;
  esac
}

print_summary() {
  local host
  local port
  local local_url

  host="$(read_env_value CLAWOBSERVER_HOST)"
  port="$(read_env_value CLAWOBSERVER_PORT)"
  local_url="http://${host}:${port}/"
  if [[ "$host" == "0.0.0.0" ]]; then
    local_url="http://127.0.0.1:${port}/"
  fi

  printf '\nClawObserver deployment complete.\n'
  printf 'Repo root: %s\n' "$REPO_ROOT"
  printf 'Env file: %s\n' "$ENV_FILE"
  printf 'State dir: %s\n' "$STATE_DIR"
  printf 'Local access URL: %s\n' "$local_url"
  printf '\nStatus commands:\n'
  printf '  systemctl --user status clawobserver.service\n'
  printf '  systemctl --user status clawobserver-capture.timer\n'
  printf '  journalctl --user -u clawobserver.service -n 100 --no-pager\n'
  printf '  journalctl --user -u clawobserver-capture.service -n 100 --no-pager\n'
  printf '\nManagement commands:\n'
  printf '  systemctl --user restart clawobserver.service\n'
  printf '  systemctl --user start clawobserver-capture.service\n'
  printf '\nThese are user-level systemd units. They run while your user session is active unless linger is enabled separately.\n'
}

main() {
  require_command python3
  require_command systemctl

  if ! systemctl --user show-environment >/dev/null 2>&1; then
    printf 'Error: systemd user manager is not reachable. Run this from a login session with systemd --user available.\n' >&2
    exit 1
  fi

  mkdir -p "$SYSTEMD_DIR" "$CONFIG_DIR" "$STATE_DIR"

  render "$REPO_ROOT/deploy/systemd/clawobserver.service" "$SYSTEMD_DIR/clawobserver.service"
  render "$REPO_ROOT/deploy/systemd/clawobserver-capture.service" "$SYSTEMD_DIR/clawobserver-capture.service"
  cp "$REPO_ROOT/deploy/systemd/clawobserver-capture.timer" "$SYSTEMD_DIR/clawobserver-capture.timer"

  if [[ -f "$ENV_FILE" ]]; then
    printf 'Preserving existing env file: %s\n' "$ENV_FILE"
  else
    render "$ENV_TEMPLATE" "$ENV_FILE"
    printf 'Created env file: %s\n' "$ENV_FILE"
  fi

  chmod +x "$REPO_ROOT/scripts/openclaw_runtime_adapter.py"

  systemctl --user daemon-reload
  systemctl --user enable --now clawobserver.service
  systemctl --user enable --now clawobserver-capture.timer

  print_summary
}

main "$@"
