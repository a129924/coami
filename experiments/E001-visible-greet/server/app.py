"""In-memory command relay for the E001 browser simulator experiment."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DEVICE_ID = "coami-sim-001"
Action = Literal["greet", "stop"]
Result = Literal["completed", "cancelled", "failed"]


class CommandView(BaseModel):
    command_id: str
    device_id: str
    action: Action
    status: Literal["pending", "completed", "cancelled", "failed"]
    detail: str | None = None


class RobotHello(BaseModel):
    type: Literal["robot.hello"]
    device_id: str
    version: Literal[1]


class RobotCommandResult(BaseModel):
    type: Literal["robot.command_result"]
    command_id: str
    status: Result
    detail: str | None = None


@dataclass
class State:
    sessions: dict[str, WebSocket] = field(default_factory=dict)
    commands: dict[str, CommandView] = field(default_factory=dict)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


def create_app() -> FastAPI:
    app = FastAPI(title="Coami E001 visible greet", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5173"],
        allow_methods=["GET", "POST"],
        allow_headers=[],
    )
    state = State()
    app.state.e001 = state

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    async def queue_command(device_id: str, action: Action) -> CommandView:
        if device_id != DEVICE_ID:
            raise HTTPException(404, detail="unknown_device")
        async with state.lock:
            session = state.sessions.get(device_id)
            if session is None:
                raise HTTPException(409, detail="device_not_connected")
            if action == "greet" and any(
                command.device_id == device_id
                and command.action == "greet"
                and command.status == "pending"
                for command in state.commands.values()
            ):
                raise HTTPException(409, detail="device_busy")
            command = CommandView(
                command_id=str(uuid4()),
                device_id=device_id,
                action=action,
                status="pending",
            )
            state.commands[command.command_id] = command
            try:
                await session.send_json(
                    {"type": "robot.command", "command_id": command.command_id, "action": action}
                )
            except (OSError, RuntimeError, WebSocketDisconnect):
                command.status = "failed"
                command.detail = "delivery_failed"
                if state.sessions.get(device_id) is session:
                    del state.sessions[device_id]
                raise HTTPException(503, detail="delivery_failed") from None
            return command

    @app.post("/v1/devices/{device_id}/actions/greet", response_model=CommandView, status_code=202)
    async def greet(device_id: str) -> CommandView:
        return await queue_command(device_id, "greet")

    @app.post("/v1/devices/{device_id}/actions/stop", response_model=CommandView, status_code=202)
    async def stop(device_id: str) -> CommandView:
        return await queue_command(device_id, "stop")

    @app.get("/v1/commands/{command_id}", response_model=CommandView)
    async def command_result(command_id: str) -> CommandView:
        command = state.commands.get(command_id)
        if command is None:
            raise HTTPException(404, detail="unknown_command")
        return command

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
            await socket.send_json({"type": "robot.ready", "device_id": device_id})

        try:
            while True:
                result = RobotCommandResult.model_validate(await socket.receive_json())
                async with state.lock:
                    command = state.commands.get(result.command_id)
                    if command is None or command.device_id != device_id or command.status != "pending":
                        await socket.close(code=1008, reason="unknown_pending_command")
                        break
                    command.status = result.status
                    command.detail = result.detail
        except (ValueError, WebSocketDisconnect):
            pass
        finally:
            async with state.lock:
                if state.sessions.get(device_id) is socket:
                    del state.sessions[device_id]
                    for command in state.commands.values():
                        if command.device_id == device_id and command.status == "pending":
                            command.status = "failed"
                            command.detail = "device_disconnected"

    return app


app = create_app()
