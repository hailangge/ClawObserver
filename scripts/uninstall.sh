#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/systemd_user_common.sh"

purge_config=0
purge_state=0

usage() {
  cat <<'EOF'
Usage: scripts/uninstall.sh [--purge-config] [--purge-state] [--purge-all]

Uninstall ClawObserver user-level systemd units for the current user.
EOF
}

print_summary() {
  printf '\nClawObserver uninstall complete.\n'
  printf 'Units dir: %s\n' "$SYSTEMD_DIR"
  if [[ $purge_config -eq 1 ]]; then
    printf 'Config removed: %s\n' "$CONFIG_DIR"
  else
    printf 'Config preserved: %s\n' "$ENV_FILE"
  fi
  if [[ $purge_state -eq 1 ]]; then
    printf 'State removed: %s\n' "$STATE_DIR"
  else
    printf 'State preserved: %s\n' "$STATE_DIR"
  fi
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --purge-config)
        purge_config=1
        ;;
      --purge-state)
        purge_state=1
        ;;
      --purge-all)
        purge_config=1
        purge_state=1
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        printf 'Error: unknown argument: %s\n' "$1" >&2
        usage >&2
        exit 1
        ;;
    esac
    shift
  done
}

main() {
  parse_args "$@"

  require_command "${SYSTEMCTL_BIN}"
  ensure_user_systemd

  systemctl_try --user stop clawobserver-capture.timer
  systemctl_try --user disable clawobserver-capture.timer
  systemctl_try --user stop clawobserver.service
  systemctl_try --user disable clawobserver.service
  systemctl_try --user stop clawobserver-capture.service

  remove_if_present "$SYSTEMD_DIR/clawobserver.service"
  remove_if_present "$SYSTEMD_DIR/clawobserver-capture.service"
  remove_if_present "$SYSTEMD_DIR/clawobserver-capture.timer"

  "${SYSTEMCTL_BIN}" --user daemon-reload
  systemctl_try --user reset-failed

  if [[ $purge_config -eq 1 ]]; then
    remove_if_present "$ENV_FILE"
    cleanup_dir_if_empty "$CONFIG_DIR"
  fi

  if [[ $purge_state -eq 1 ]]; then
    if [[ -d "$STATE_DIR" ]]; then
      rm -rf "$STATE_DIR"
      printf 'Removed state directory: %s\n' "$STATE_DIR"
    else
      printf 'Absent: %s\n' "$STATE_DIR"
    fi
  fi

  cleanup_dir_if_empty "$SYSTEMD_DIR"
  print_summary
}

main "$@"
