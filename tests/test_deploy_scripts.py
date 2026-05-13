from __future__ import annotations

import os
import subprocess
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
INSTALL_SCRIPT = REPO_ROOT / "scripts" / "install.sh"
UNINSTALL_SCRIPT = REPO_ROOT / "scripts" / "uninstall.sh"


class DeployScriptsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.home_dir = Path(self.temp_dir.name)
        self.bin_dir = self.home_dir / "bin"
        self.bin_dir.mkdir()
        self.systemctl_log = self.home_dir / "systemctl.log"
        self._write_systemctl_stub()

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def _base_env(self) -> dict[str, str]:
        env = os.environ.copy()
        env["HOME"] = str(self.home_dir)
        env["PATH"] = f"{self.bin_dir}:{env['PATH']}"
        env["SYSTEMCTL_LOG"] = str(self.systemctl_log)
        return env

    def _run_script(self, script: Path, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["bash", str(script), *args],
            cwd=REPO_ROOT,
            env=self._base_env(),
            text=True,
            capture_output=True,
            check=True,
        )

    def _write_systemctl_stub(self) -> None:
        stub = self.bin_dir / "systemctl"
        stub.write_text(
            "#!/usr/bin/env bash\n"
            "set -euo pipefail\n"
            "printf '%s\\n' \"$*\" >> \"${SYSTEMCTL_LOG}\"\n",
            encoding="utf-8",
        )
        stub.chmod(0o755)

    def test_install_renders_units_and_env_and_enables_services(self) -> None:
        result = self._run_script(INSTALL_SCRIPT)

        systemd_dir = self.home_dir / ".config" / "systemd" / "user"
        config_dir = self.home_dir / ".config" / "clawobserver"
        state_dir = self.home_dir / ".local" / "state" / "clawobserver"

        service_text = (systemd_dir / "clawobserver.service").read_text(encoding="utf-8")
        env_text = (config_dir / "clawobserver.env").read_text(encoding="utf-8")

        self.assertIn(f"WorkingDirectory={REPO_ROOT}", service_text)
        self.assertIn("EnvironmentFile=%h/.config/clawobserver/clawobserver.env", service_text)
        self.assertIn(f"CLAWOBSERVER_DATA_DIR={self.home_dir}/.local/state/clawobserver", env_text)
        self.assertIn(
            f"CLAWOBSERVER_RUNTIME_COMMAND=/usr/bin/env python3 {REPO_ROOT}/scripts/openclaw_runtime_adapter.py",
            env_text,
        )
        self.assertTrue(state_dir.exists())
        self.assertIn("Local access URL: http://127.0.0.1:8420/", result.stdout)

        systemctl_calls = self.systemctl_log.read_text(encoding="utf-8")
        self.assertIn("--user show-environment", systemctl_calls)
        self.assertIn("--user daemon-reload", systemctl_calls)
        self.assertIn("--user enable --now clawobserver.service", systemctl_calls)
        self.assertIn("--user enable --now clawobserver-capture.timer", systemctl_calls)

    def test_install_preserves_existing_env_file(self) -> None:
        self._run_script(INSTALL_SCRIPT)
        env_file = self.home_dir / ".config" / "clawobserver" / "clawobserver.env"
        custom_env = env_file.read_text(encoding="utf-8") + "\nCLAWOBSERVER_PORT=9999\n"
        env_file.write_text(custom_env, encoding="utf-8")

        result = self._run_script(INSTALL_SCRIPT)

        self.assertEqual(env_file.read_text(encoding="utf-8"), custom_env)
        self.assertIn("Preserving existing env file", result.stdout)

    def test_uninstall_removes_units_but_preserves_config_and_state_by_default(self) -> None:
        self._run_script(INSTALL_SCRIPT)
        env_file = self.home_dir / ".config" / "clawobserver" / "clawobserver.env"
        database_path = self.home_dir / ".local" / "state" / "clawobserver" / "clawobserver.sqlite3"
        database_path.write_text("sqlite-placeholder", encoding="utf-8")

        result = self._run_script(UNINSTALL_SCRIPT)

        systemd_dir = self.home_dir / ".config" / "systemd" / "user"
        self.assertFalse((systemd_dir / "clawobserver.service").exists())
        self.assertFalse((systemd_dir / "clawobserver-capture.service").exists())
        self.assertFalse((systemd_dir / "clawobserver-capture.timer").exists())
        self.assertTrue(env_file.exists())
        self.assertTrue(database_path.exists())
        self.assertIn("Config preserved", result.stdout)
        self.assertIn("State preserved", result.stdout)

        systemctl_calls = self.systemctl_log.read_text(encoding="utf-8")
        self.assertIn("--user stop clawobserver-capture.timer", systemctl_calls)
        self.assertIn("--user disable clawobserver-capture.timer", systemctl_calls)
        self.assertIn("--user stop clawobserver.service", systemctl_calls)
        self.assertIn("--user disable clawobserver.service", systemctl_calls)
        self.assertIn("--user daemon-reload", systemctl_calls)
        self.assertIn("--user reset-failed", systemctl_calls)

    def test_uninstall_can_purge_config_and_state(self) -> None:
        self._run_script(INSTALL_SCRIPT)
        state_dir = self.home_dir / ".local" / "state" / "clawobserver"
        (state_dir / "clawobserver.sqlite3").write_text("sqlite-placeholder", encoding="utf-8")

        result = self._run_script(UNINSTALL_SCRIPT, "--purge-all")

        self.assertFalse((self.home_dir / ".config" / "clawobserver" / "clawobserver.env").exists())
        self.assertFalse(state_dir.exists())
        self.assertIn("Config removed", result.stdout)
        self.assertIn("State removed", result.stdout)


if __name__ == "__main__":
    unittest.main()
