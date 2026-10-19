"""One process per case/repetition; local evidence, no provider or Robot calls."""

from __future__ import annotations

import argparse
import faulthandler
import hashlib
import importlib.metadata
import json
import os
import platform
import signal
import subprocess
import sys
import tempfile
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

import pytest
from pydantic import BaseModel, Field, TypeAdapter

from app import Record

ROOT = Path(__file__).resolve().parent
PREFIX = "E025_WORKER "
type Status = Literal["success", "failure", "inconclusive"]


class WorkerVerdict(BaseModel):
    status: Status
    reasons: list[str] = Field(default_factory=list)


class Run(BaseModel):
    candidate: str = "bubus==1.5.6"
    node: str
    repetition: int
    status: Status
    exit_code: int | None
    seconds: float
    watchdog: str | None = None
    reasons: list[str] = Field(default_factory=list)
    audit: list[Record] = Field(default_factory=list[Record])


class Options(argparse.Namespace):
    worker: str | None
    repetitions: int
    case_timeout: int
    worker_timeout: int
    deadline: str
    output: Path


class Observations:
    """Classify actual pytest exception evidence, not merely exit status."""

    def __init__(self) -> None:
        self.assertions: list[str] = []
        self.errors: list[str] = []

    def pytest_runtest_makereport(
        self, item: pytest.Item, call: pytest.CallInfo[None]
    ) -> None:
        if call.excinfo is None:
            return
        text = f"{item.nodeid} {call.when}: {call.excinfo.value}"
        if issubclass(call.excinfo.type, AssertionError):
            self.assertions.append(text)
        else:
            self.errors.append(text)


def worker(node: str, seconds: int) -> int:
    def timed_out(signum: int, frame: object) -> None:
        faulthandler.dump_traceback()
        os._exit(124)  # Independent parent still bounds startup and teardown.

    signal.signal(signal.SIGALRM, timed_out)
    signal.alarm(seconds)
    observed = Observations()
    code = pytest.main(
        ["-q", "--tb=short", "--disable-warnings", "-p", "no:cacheprovider", node],
        plugins=[observed],
    )
    signal.alarm(0)
    if code == 0:
        verdict = WorkerVerdict(status="success")
    elif observed.assertions:
        verdict = WorkerVerdict(
            status="failure", reasons=observed.assertions + observed.errors
        )
    else:
        verdict = WorkerVerdict(
            status="inconclusive", reasons=observed.errors or [f"pytest exit {code}"]
        )
    print(PREFIX + verdict.model_dump_json(), flush=True)
    return int(code)


def versions() -> dict[str, str]:
    return {
        name: importlib.metadata.version(name)
        for name in (
            "bubus",
            "fastapi",
            "starlette",
            "anyio",
            "pydantic",
            "pytest",
            "httpx",
            "ruff",
            "pyright",
        )
    }


def execute(
    node: str, repetition: int, options: Options, deadline: datetime
) -> tuple[Run, str]:
    start = time.monotonic()
    remaining = (deadline - datetime.now(UTC)).total_seconds()
    timeout = min(options.worker_timeout, remaining)
    with tempfile.TemporaryDirectory(prefix="coami-e025-") as scratch:
        audit_path = Path(scratch) / "audit.json"
        env = dict(
            os.environ,
            E025_AUDIT=str(audit_path),
            PYTEST_DISABLE_PLUGIN_AUTOLOAD="1",
            PYTHONHASHSEED="0",
        )
        command = [
            sys.executable,
            str(Path(__file__).resolve()),
            "--worker",
            node,
            "--case-timeout",
            str(options.case_timeout),
        ]
        run = Run(
            node=node,
            repetition=repetition,
            status="inconclusive",
            exit_code=None,
            seconds=0,
        )
        try:
            process = subprocess.run(
                command,
                cwd=ROOT,
                env=env,
                capture_output=True,
                text=True,
                timeout=max(timeout, 0.01),
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            run.watchdog = "outer_process_or_budget"
            run.reasons = [
                "No complete worker verdict before process/deadline boundary"
            ]
            output = str(exc.stdout or "") + str(exc.stderr or "")
        else:
            run.exit_code = process.returncode
            output = process.stdout + process.stderr
            lines = [
                line[len(PREFIX) :]
                for line in process.stdout.splitlines()
                if line.startswith(PREFIX)
            ]
            if lines:
                verdict = WorkerVerdict.model_validate_json(lines[-1])
                run.status = verdict.status
                run.reasons = verdict.reasons
            else:
                run.reasons = [f"No complete worker verdict, exit {process.returncode}"]
            if process.returncode == 124:
                run.watchdog = "case"
        if audit_path.exists():
            run.audit = TypeAdapter(list[Record]).validate_json(audit_path.read_text())
        if run.status == "success" and (
            not run.audit
            or run.audit[-1].action != "teardown"
            or run.audit[-1].detail != "0"
        ):
            run.status = "inconclusive"
            run.reasons.append("Missing zero-business-task teardown evidence")
        run.seconds = round(time.monotonic() - start, 6)
        return run, output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--worker")
    parser.add_argument("--repetitions", type=int, default=20)
    parser.add_argument("--case-timeout", type=int, default=10)
    parser.add_argument("--worker-timeout", type=int, default=30)
    parser.add_argument("--deadline", default="2026-10-19T05:52:30Z")
    parser.add_argument("--output", type=Path, default=ROOT / "evidence")
    options = parser.parse_args(namespace=Options())
    if options.worker is not None:
        return worker(options.worker, options.case_timeout)
    if min(options.repetitions, options.case_timeout, options.worker_timeout) <= 0:
        parser.error("counts and watchdogs must be positive")
    deadline = datetime.fromisoformat(options.deadline)
    if deadline.tzinfo is None:
        parser.error("deadline must include a UTC offset")
    output = options.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    if (output / "summary.json").exists():
        parser.error("evidence already exists; choose a new --output directory")
    collect = subprocess.run(
        [sys.executable, "-m", "pytest", "--collect-only", "-q", "test_app.py"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    if collect.returncode:
        print(collect.stdout + collect.stderr, file=sys.stderr)
        return 2
    nodes = [
        line
        for line in collect.stdout.splitlines()
        if line.startswith("test_app.py::")
        and "test_invalid_input_keeps_control" not in line
    ]
    if len(nodes) != 12:
        parser.error(f"expected 12 main nodes, got {len(nodes)}")
    hashes = {
        name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
        for name in (
            "app.py",
            "test_app.py",
            "run_experiment.py",
            "pyproject.toml",
            "uv.lock",
        )
    }
    git_head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    toolchain = {
        "python": sys.version,
        "platform": platform.platform(),
        "packages": versions(),
        "source_git_head": git_head,
        "source_files_sha256": hashes,
        "command": sys.argv,
    }
    (output / "toolchain.txt").write_text(json.dumps(toolchain, indent=2) + "\n")
    started = datetime.now(UTC)
    results: list[Run] = []
    with (
        (output / "runs.jsonl").open("w") as runs,
        (output / "workers.log").open("w") as transcript,
    ):
        for repetition in range(1, options.repetitions + 1):
            for node in nodes:
                if datetime.now(UTC) >= deadline:
                    break
                result, text = execute(node, repetition, options, deadline)
                results.append(result)
                runs.write(result.model_dump_json() + "\n")
                runs.flush()
                transcript.write(f"\n### {node} repetition {repetition}\n{text}\n")
                transcript.flush()
                if result.status != "success":
                    print(
                        f"{node} rep {repetition}: {result.status}: {result.reasons}",
                        flush=True,
                    )
            print(
                f"repetition {repetition}: {len(results)}/{len(nodes) * options.repetitions} workers",
                flush=True,
            )
            if datetime.now(UTC) >= deadline:
                break
    counts = {
        key: sum(r.status == key for r in results)
        for key in ("success", "failure", "inconclusive")
    }
    expected = len(nodes) * options.repetitions
    status = (
        "failure"
        if counts["failure"]
        else "success"
        if len(results) == expected and counts["success"] == expected
        else "inconclusive"
    )
    summary = {
        "candidate": "bubus==1.5.6",
        "status": status,
        "expected": expected,
        "completed": len(results),
        "counts": counts,
        "nodes": nodes,
        "repetitions": options.repetitions,
        "started": started.isoformat(),
        "ended": datetime.now(UTC).isoformat(),
        "deadline": deadline.isoformat(),
        "case_watchdog_seconds": options.case_timeout,
        "worker_watchdog_seconds": options.worker_timeout,
        "source_git_head": git_head,
        "source_files_sha256": hashes,
    }
    (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(
        json.dumps(
            {key: summary[key] for key in ("status", "completed", "expected", "counts")}
        )
    )
    return 0 if status == "success" else 1


if __name__ == "__main__":
    raise SystemExit(main())
