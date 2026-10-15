"""Loopback-only experimental transport. Run on 127.0.0.1:8230."""

import asyncio
import json
import re

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from calculator import ObservationError, Session, record

app = FastAPI()
ALLOWED_ORIGINS = {"http://127.0.0.1:5203", "http://localhost:5203"}


@app.websocket("/observe")
async def observe(websocket: WebSocket) -> None:
    if websocket.headers.get("origin") not in ALLOWED_ORIGINS:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    session: Session | None = None
    try:
        while True:
            text = await asyncio.wait_for(websocket.receive_text(), timeout=30)
            if len(text) > 16384:
                await websocket.close(code=1009)
                return
            try:
                value: object = json.loads(text)
                data = record(value)
                if session is None:
                    run = data.get("run_id")
                    if (
                        data.get("kind") != "hello"
                        or not isinstance(run, str)
                        or not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", run)
                    ):
                        raise ObservationError("hello_required")
                    session = Session(run)
                    reply: dict[str, object] = {"kind": "hello", "run_id": run}
                elif data.get("kind") == "completed":
                    accepted = session.finish(data.get("command_id"))
                    reply = {
                        "kind": "completed" if accepted else "rejected",
                        "command_id": data.get("command_id"),
                    }
                elif data.get("kind") == "observation":
                    reply = session.receive(data)
                else:
                    reply = {"kind": "rejected", "reason": "invalid_message"}
            except (ObservationError, json.JSONDecodeError):
                reply = {"kind": "rejected", "reason": "invalid_message"}
            await websocket.send_json(reply)
    except (TimeoutError, WebSocketDisconnect):
        return
