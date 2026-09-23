"""In-memory Robot event to greet relay for the E003 simulator experiment."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Literal
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DEVICE_ID = "coami-sim-001"
Result = Literal["completed", "cancelled", "failed"]


class CommandView(BaseModel):
    command_id: str
    event_id: str
    device_id: str
    action: Literal["greet"] = "greet"
    status: Literal["pending", "completed", "cancelled", "failed"] = "pending"
    detail: str | None = None


class RobotHello(BaseModel):
    type: Literal["robot.hello"]
    device_id: str
    version: Literal[1]


class ButtonEvent(BaseModel):
    kind: Literal["button"]
    name: Literal["a"]
    pressed: Literal[True]


class RobotEvent(BaseModel):
    type: Literal["robot.event"]
    event_id: UUID
    event: ButtonEvent


class RobotCommandResult(BaseModel):
    type: Literal["robot.command_result"]
    command_id: str
    status: Result
    detail: str | None = None


@dataclass
class State:
    sessions: dict[str, WebSocket] = field(default_factory=dict)
    commands: dict[str, CommandView] = field(default_factory=dict)
    event_commands: dict[str, str] = field(default_factory=dict)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


async def process_event(state: State, socket: WebSocket, message: RobotEvent) -> bool:
    """Record an accepted event before delivery; return False if delivery failed."""
    event_id = str(message.event_id)
    async with state.lock:
        prior_id = state.event_commands.get(event_id)
        if prior_id is not None:
            acknowledgement = {
                "type": "robot.event_ack",
                "event_id": event_id,
                "disposition": "duplicate",
                "command_id": prior_id,
            }
        else:
            pending = next(
                (
                    command
                    for command in state.commands.values()
                    if command.status == "pending"
                ),
                None,
            )
            if pending is not None:
                acknowledgement = {
                    "type": "robot.event_ack",
                    "event_id": event_id,
                    "disposition": "busy",
                    "command_id": pending.command_id,
                }
            else:
                command = CommandView(
                    command_id=str(uuid4()), event_id=event_id, device_id=DEVICE_ID
                )
                state.commands[command.command_id] = command
                state.event_commands[event_id] = command.command_id
                try:
                    await socket.send_json(
                        {
                            "type": "robot.command",
                            "command_id": command.command_id,
                            "event_id": event_id,
                            "action": "greet",
                        }
                    )
                except (OSError, RuntimeError, WebSocketDisconnect):
                    command.status = "failed"
                    command.detail = "delivery_failed"
                    if state.sessions.get(DEVICE_ID) is socket:
                        del state.sessions[DEVICE_ID]
                    return False
                acknowledgement = {
                    "type": "robot.event_ack",
                    "event_id": event_id,
                    "disposition": "accepted",
                    "command_id": command.command_id,
                }
        try:
            await socket.send_json(acknowledgement)
        except (OSError, RuntimeError, WebSocketDisconnect):
            return False
    return True


def create_app() -> FastAPI:
    app = FastAPI(title="Coami E003 Robot event loop", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5173"],
        allow_methods=["GET"],
        allow_headers=[],
    )
    state = State()
    app.state.e003 = state

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/v1/commands/{command_id}", response_model=CommandView)
    async def command_result(command_id: str) -> CommandView:
        async with state.lock:
            command = state.commands.get(command_id)
            if command is None:
                raise HTTPException(404, detail="unknown_command")
            return command.model_copy()

    @app.websocket("/v1/devices/{device_id}/session")
    async def session(socket: WebSocket, device_id: str) -> None:
        await socket.accept()
        if device_id != DEVICE_ID:
            await socket.close(code=1008, reason="unknown_device")
            return
        try:
            hello = RobotHello.model_validate(await socket.receive_json())
            if hello.device_id != device_id:
                await socket.close(code=1008, reason="device_id_mismatch")
                return
        except (ValueError, WebSocketDisconnect):
            await socket.close(code=1008, reason="invalid_hello")
            return

        async with state.lock:
            if device_id in state.sessions:
                await socket.close(code=1008, reason="device_already_connected")
                return
            state.sessions[device_id] = socket

        try:
            await socket.send_json({"type": "robot.ready", "device_id": device_id})
            while True:
                data = await socket.receive_json()
                if not isinstance(data, dict):
                    await socket.close(code=1008, reason="invalid_message")
                    break
                if data.get("type") == "robot.event":
                    event = RobotEvent.model_validate(data)
                    if not await process_event(state, socket, event):
                        break
                elif data.get("type") == "robot.command_result":
                    result = RobotCommandResult.model_validate(data)
                    async with state.lock:
                        command = state.commands.get(result.command_id)
                        if (
                            command is None
                            or command.device_id != device_id
                            or command.status != "pending"
                        ):
                            await socket.close(
                                code=1008, reason="unknown_pending_command"
                            )
                            break
                        command.status = result.status
                        command.detail = result.detail
                else:
                    await socket.close(code=1008, reason="invalid_message")
                    break
        except (OSError, RuntimeError, ValueError, WebSocketDisconnect):
            pass
        finally:
            async with state.lock:
                if state.sessions.get(device_id) is socket:
                    del state.sessions[device_id]
                    for command in state.commands.values():
                        if (
                            command.device_id == device_id
                            and command.status == "pending"
                        ):
                            command.status = "failed"
                            command.detail = "device_disconnected"

    return app


app = create_app()
