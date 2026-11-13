"""Run bounded local checks; browser evidence never fills human observations."""
from __future__ import annotations

import argparse
import os
import signal
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def run(command: list[str], cwd: Path, output: Path) -> None:
    with output.open("w") as log:
        process = subprocess.Popen(command, cwd=cwd, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        try:
            code = process.wait(timeout=180)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()
            raise RuntimeError(f"Check watchdog expired: {command}") from None
    if code:
        raise RuntimeError(f"Check failed ({code}): {command}; see {output}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--browser", action="store_true", help="Also use already-running local servers and an existing Playwright module")
    args = parser.parse_args()
    evidence = ROOT / "evidence/checks"
    evidence.mkdir(parents=True, exist_ok=True)
    checks = [
        (["npm", "test"], ROOT / "web", "typescript-tests.txt"),
        (["npm", "run", "build"], ROOT / "web", "typescript-build.txt"),
        ([str(ROOT / "server/.venv/bin/python"), "-m", "pytest", "-q"], ROOT / "server", "server-tests.txt"),
        ([str(ROOT / "server/.venv/bin/ruff"), "check", "app.py", "test_app.py", "../run_experiment.py"], ROOT / "server", "ruff.txt"),
        ([str(ROOT / "server/.venv/bin/pyright"), "app.py"], ROOT / "server", "pyright.txt"),
    ]
    if args.browser:
        checks.append((["node", "scripts/browser-check.mjs"], ROOT / "web", "browser-check.txt"))
    for command, cwd, name in checks:
        print("Checking", name, flush=True)
        run(command, cwd, evidence / name)
    print("Checks finished. Overall experiment remains inconclusive until required human/matrix evidence exists.")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        sys.exit(1)
