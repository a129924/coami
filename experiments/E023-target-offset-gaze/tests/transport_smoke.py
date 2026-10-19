"""Real loopback Python WebSocket test; synthetic observations, no WASM/Robot."""

import asyncio
import json
import subprocess
import sys
import time
from pathlib import Path

from websockets.asyncio.client import connect

SERVER = Path(__file__).resolve().parents[1] / "server"
IDENTITY = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]


async def smoke(process):
    deadline = time.monotonic() + 5
    while True:
        if process.poll() is not None:
            raise RuntimeError(
                process.stdout.read() if process.stdout else "server exited"
            )
        try:
            websocket = await connect(
                "ws://127.0.0.1:8230/observe", origin="http://127.0.0.1:5203"
            )
            break
        except OSError:
            if time.monotonic() >= deadline:
                raise
            await asyncio.sleep(0.05)
    async with websocket:

        async def exchange(value):
            await websocket.send(json.dumps(value))
            return json.loads(await asyncio.wait_for(websocket.recv(), 2))

        assert (await exchange({"kind": "hello", "run_id": "smoke"}))["kind"] == "hello"
        value = {
            "kind": "observation",
            "run_id": "smoke",
            "observation_seq": 1,
            "offset": [0.8, 0],
            "rotation": IDENTITY,
            "age_ms": 0,
        }
        command = await exchange(value)
        assert command["kind"] == "command" and command["target"][1] < 0
        assert (await exchange({**value, "observation_seq": 2}))["reason"] == "pending"
        assert (await exchange({"kind": "completed", "command_id": "wrong"}))[
            "kind"
        ] == "rejected"
        assert (
            await exchange({"kind": "completed", "command_id": command["command_id"]})
        )["kind"] == "completed"
        assert (await exchange(value))["reason"] == "duplicate_or_out_of_order"
        assert (await exchange({**value, "observation_seq": 2, "age_ms": 1001}))[
            "reason"
        ] == "expired_observation"
        assert (await exchange({**value, "observation_seq": 2, "offset": [0, 0]}))[
            "kind"
        ] == "centered"
        assert (await exchange({**value, "observation_seq": 3, "offset": None}))[
            "kind"
        ] == "lost"
        await websocket.send("not-json")
        assert json.loads(await websocket.recv())["kind"] == "rejected"
    print(
        "PASS: actual loopback WS hello, calculator, pending, correlation, replay, expiry, centered, lost, malformed; NOT WASM convergence"
    )


def main():
    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8230",
        ],
        cwd=SERVER,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        asyncio.run(smoke(process))
    finally:
        process.terminate()
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=3)


main()
