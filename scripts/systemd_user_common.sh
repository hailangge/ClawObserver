#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SYSTEMCTL_BIN="${SYSTEMCTL_BIN:-systemctl}"

SYSTEMD_DIR="${HOME}/.config/systemd/user"
CONFIG_DIR="${HOME}/.config/clawobserver"
STATE_DIR="${HOME}/.local/state/clawobserver"

ENV_TEMPLATE="${REPO_ROOT}/deploy/systemd/clawobserver.env.example"
ENV_FILE="${CONFIG_DIR}/clawobserver.env"
SERVICE_TEMPLATE="${REPO_ROOT}/deploy/systemd/clawobserver.service"
CAPTURE_SERVICE_TEMPLATE="${REPO_ROOT}/deploy/systemd/clawobserver-capture.service"
CAPTURE_TIMER_TEMPLATE="${REPO_ROOT}/deploy/systemd/clawobserver-capture.timer"

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    printf 'Error: required command not found: %s\n' "$name" >&2
    exit 1
  fi
}

ensure_user_systemd() {
  if ! "${SYSTEMCTL_BIN}" --user show-environment >/dev/null 2>&1; then
    printf 'Error: systemd user manager is not reachable. Run this from a login session with systemd --user available.\n' >&2
    exit 1
  fi
}

render_template() {
  local src="$1"
  local dst="$2"

  python3 - "$src" "$dst" "$REPO_ROOT" "$HOME" <<'PY'
from pathlib import Path
import sys

src = Path(sys.argv[1])
dst = Path(sys.argv[2])
repo_root = sys.argv[3]
home = sys.argv[4]

text = src.read_text(encoding="utf-8")
text = text.replace("__REPO_ROOT__", repo_root)
text = text.replace("__HOME__", home)
dst.write_text(text, encoding="utf-8")
PY
}

install_file_if_changed() {
  local src="$1"
  local dst="$2"

  mkdir -p "$(dirname "$dst")"
  if [[ -f "$dst" ]] && cmp -s "$src" "$dst"; then
    printf 'Unchanged: %s\n' "$dst"
    return
  fi

  cp "$src" "$dst"
  printf 'Installed: %s\n' "$dst"
}

install_rendered_template() {
  local src="$1"
  local dst="$2"
  local tmp

  tmp="$(mktemp)"
  render_template "$src" "$tmp"
  install_file_if_changed "$tmp" "$dst"
  rm -f "$tmp"
}

read_env_value() {
  local name="$1"
  local value

  if [[ -f "$ENV_FILE" ]]; then
    value="$(awk -F= -v key="$name" '$1 == key { value = $2 } END { print value }' "$ENV_FILE")"
    if [[ -n "$value" ]]; then
      printf '%s\n' "$value"
      return
    fi
  fi

  case "$name" in
    CLAWOBSERVER_HOST) printf '127.0.0.1\n' ;;
    CLAWOBSERVER_PORT) printf '8420\n' ;;
    *) printf '\n' ;;
  esac
}

local_access_url() {
  local host
  local port

  host="$(read_env_value CLAWOBSERVER_HOST)"
  port="$(read_env_value CLAWOBSERVER_PORT)"
  if [[ "$host" == "0.0.0.0" || "$host" == "::" || "$host" == "[::]" ]]; then
    host="127.0.0.1"
  fi
  printf 'http://%s:%s/\n' "$host" "$port"
}

systemctl_try() {
  if ! "${SYSTEMCTL_BIN}" "$@"; then
    printf 'Warning: command failed but uninstall will continue: %s %s\n' "${SYSTEMCTL_BIN}" "$*" >&2
  fi
}

remove_if_present() {
  local path="$1"
  if [[ -e "$path" ]]; then
    rm -f "$path"
    printf 'Removed: %s\n' "$path"
  else
    printf 'Absent: %s\n' "$path"
  fi
}

cleanup_dir_if_empty() {
  local path="$1"
  if [[ -d "$path" ]] && [[ -z "$(ls -A "$path")" ]]; then
    rmdir "$path"
    printf 'Removed empty directory: %s\n' "$path"
  fi
}
