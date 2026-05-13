#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/systemd_user_common.sh"

usage() {
  cat <<'EOF'
Usage: scripts/install.sh

Install ClawObserver as user-level systemd units for the current user.
EOF
}

print_summary() {
  printf '\nClawObserver install complete.\n'
  printf 'Repo root: %s\n' "$REPO_ROOT"
  printf 'Units dir: %s\n' "$SYSTEMD_DIR"
  printf 'Env file: %s\n' "$ENV_FILE"
  printf 'State dir: %s\n' "$STATE_DIR"
  printf 'Local access URL: %s\n' "$(local_access_url)"
  printf '\nStatus commands:\n'
  printf '  systemctl --user status clawobserver.service\n'
  printf '  systemctl --user status clawobserver-capture.timer\n'
  printf '  systemctl --user list-timers clawobserver-capture.timer\n'
  printf '  journalctl --user -u clawobserver.service -n 100 --no-pager\n'
  printf '  journalctl --user -u clawobserver-capture.service -n 100 --no-pager\n'
  printf '\nManagement commands:\n'
  printf '  systemctl --user restart clawobserver.service\n'
  printf '  systemctl --user start clawobserver-capture.service\n'
  printf '  systemctl --user stop clawobserver-capture.timer\n'
  printf '  systemctl --user start clawobserver-capture.timer\n'
  printf '\nThese are user-level systemd units. They run while your user session is active unless linger is enabled separately.\n'
}

main() {
  if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    usage
    exit 0
  fi
  if [[ $# -ne 0 ]]; then
    printf 'Error: unknown arguments: %s\n' "$*" >&2
    usage >&2
    exit 1
  fi

  require_command python3
  require_command "${SYSTEMCTL_BIN}"
  ensure_user_systemd

  mkdir -p "$SYSTEMD_DIR" "$CONFIG_DIR" "$STATE_DIR"

  install_rendered_template "$SERVICE_TEMPLATE" "$SYSTEMD_DIR/clawobserver.service"
  install_rendered_template "$CAPTURE_SERVICE_TEMPLATE" "$SYSTEMD_DIR/clawobserver-capture.service"
  install_file_if_changed "$CAPTURE_TIMER_TEMPLATE" "$SYSTEMD_DIR/clawobserver-capture.timer"

  if [[ -f "$ENV_FILE" ]]; then
    printf 'Preserving existing env file: %s\n' "$ENV_FILE"
  else
    install_rendered_template "$ENV_TEMPLATE" "$ENV_FILE"
  fi

  chmod +x "${REPO_ROOT}/scripts/openclaw_runtime_adapter.py"

  "${SYSTEMCTL_BIN}" --user daemon-reload
  "${SYSTEMCTL_BIN}" --user enable --now clawobserver.service
  "${SYSTEMCTL_BIN}" --user enable --now clawobserver-capture.timer

  print_summary
}

main "$@"
