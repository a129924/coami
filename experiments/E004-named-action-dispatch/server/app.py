"""In-memory named Action dispatch and E003 event loop for one simulator Robot."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Mapping
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Literal
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

DEVICE_ID = "coami-sim-001"
logger = logging.getLogger(__name__)
Result = Literal["completed", "cancelled", "failed"]
Status = Literal["pending", "completed", "cancelled", "failed"]


class Action(StrEnum):
    GREET = "greet"


class CommandView(BaseModel):
    command_id: str
    event_id: str | None
    device_id: str
    action: Action = Action.GREET
    status: Status = "pending"
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
    delivered: set[str] = field(default_factory=set)
    deadlines: dict[str, float] = field(default_factory=dict)
    timeout_tasks: dict[str, asyncio.Task[None]] = field(default_factory=dict)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


def terminate(state: State, command: CommandView, detail: str | None, status: Status = "failed") -> None:
    """Set a terminal result once. Call while holding state.lock."""
    if command.status != "pending":
        return
    command.status = status
    command.detail = detail
    task = state.timeout_tasks.pop(command.command_id, None)
    if task is not None and task is not asyncio.current_task():
        task.cancel()


async def send_bounded(socket: WebSocket, payload: Mapping[str, object], timeout: float) -> None:
    await asyncio.wait_for(socket.send_json(payload), timeout=timeout)


async def close_bounded(socket: WebSocket, reason: str) -> None:
    try:
        await asyncio.wait_for(socket.close(code=1008, reason=reason), timeout=2.0)
    except (OSError, RuntimeError, TimeoutError, WebSocketDisconnect) as exc:
        logger.debug("WebSocket close failed (%s): %s", reason, exc)


async def expire_direct(state: State, command_id: str) -> None:
    deadline = state.deadlines[command_id]
    await asyncio.sleep(max(0.0, deadline - asyncio.get_running_loop().time()))
    async with state.lock:
        command = state.commands[command_id]
        detail = "result_timeout" if command_id in state.delivered else "delivery_failed"
        terminate(state, command, detail)


async def process_event(state: State, socket: WebSocket, message: RobotEvent, send_timeout: float) -> bool:
    """Preserve E003 event mapping and ack behavior with bounded sends."""
    event_id = str(message.event_id)
    async with state.lock:
        if state.sessions.get(DEVICE_ID) is not socket:
            return False
        prior_id = state.event_commands.get(event_id)
        if prior_id is not None:
            acknowledgement = {
                "type": "robot.event_ack", "event_id": event_id,
                "disposition": "duplicate", "command_id": prior_id,
            }
        else:
            pending = next((item for item in state.commands.values() if item.status == "pending"), None)
            if pending is not None:
                acknowledgement = {
                    "type": "robot.event_ack", "event_id": event_id,
                    "disposition": "busy", "command_id": pending.command_id,
                }
            else:
                command = CommandView(
                    command_id=str(uuid4()), event_id=event_id, device_id=DEVICE_ID
                )
                state.commands[command.command_id] = command
                state.event_commands[event_id] = command.command_id
                try:
                    await send_bounded(socket, {
                        "type": "robot.command", "command_id": command.command_id,
                        "event_id": event_id, "action": Action.GREET.value,
                    }, send_timeout)
                except (OSError, RuntimeError, TimeoutError, WebSocketDisconnect):
                    terminate(state, command, "delivery_failed")
                    if state.sessions.get(DEVICE_ID) is socket:
                        del state.sessions[DEVICE_ID]
                    return False
                acknowledgement = {
                    "type": "robot.event_ack", "event_id": event_id,
                    "disposition": "accepted", "command_id": command.command_id,
                }
        try:
            await send_bounded(socket, acknowledgement, send_timeout)
        except (OSError, RuntimeError, TimeoutError, WebSocketDisconnect):
            return False
    return True


def create_app(command_timeout: float = 10.0, send_timeout: float = 2.0) -> FastAPI:
    app = FastAPI(title="Coami E004 named Action dispatch", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5173"],
        allow_methods=["GET"],
        allow_headers=[],
    )
    state = State()
    app.state.e004 = state

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, exc: RequestValidationError) -> JSONResponse:
        if any(tuple(error.get("loc", ())) == ("path", "action") for error in exc.errors()):
            return JSONResponse(status_code=422, content={"detail": "unsupported_action"})
        return await request_validation_exception_handler(request, exc)

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

    @app.post(
        "/v1/devices/{device_id}/actions/{action}",
        response_model=CommandView,
        status_code=202,
    )
    async def request_action(device_id: str, action: Action) -> CommandView:
        if device_id != DEVICE_ID:
            raise HTTPException(404, detail="unknown_device")
        close_after: WebSocket | None = None
        async with state.lock:
            socket = state.sessions.get(device_id)
            if socket is None:
                raise HTTPException(409, detail="device_offline")
            if any(item.status == "pending" for item in state.commands.values()):
                raise HTTPException(409, detail="device_busy")
            command = CommandView(command_id=str(uuid4()), event_id=None, device_id=device_id, action=action)
            state.commands[command.command_id] = command
            deadline = asyncio.get_running_loop().time() + command_timeout
            state.deadlines[command.command_id] = deadline
            try:
                await send_bounded(socket, {
                    "type": "robot.command", "command_id": command.command_id,
                    "action": action.value,
                }, max(0.001, deadline - asyncio.get_running_loop().time()))
            except (OSError, RuntimeError, TimeoutError, WebSocketDisconnect):
                terminate(state, command, "delivery_failed")
                if state.sessions.get(device_id) is socket:
                    del state.sessions[device_id]
                close_after = socket
            else:
                state.delivered.add(command.command_id)
                state.timeout_tasks[command.command_id] = asyncio.create_task(
                    expire_direct(state, command.command_id)
                )
            view = command.model_copy()
        if close_after is not None:
            await close_bounded(close_after, "delivery_failed")
        return view

    @app.websocket("/v1/devices/{device_id}/session")
    async def session(socket: WebSocket, device_id: str) -> None:
        await socket.accept()
        if device_id != DEVICE_ID:
            await close_bounded(socket, "unknown_device")
            return
        try:
            hello = RobotHello.model_validate(await socket.receive_json())
            if hello.device_id != device_id:
                await close_bounded(socket, "device_id_mismatch")
                return
        except (ValueError, WebSocketDisconnect):
            await close_bounded(socket, "invalid_hello")
            return

        registered = False
        async with state.lock:
            if device_id not in state.sessions:
                try:
                    await send_bounded(
                        socket, {"type": "robot.ready", "device_id": device_id}, send_timeout
                    )
                except (OSError, RuntimeError, TimeoutError, WebSocketDisconnect) as exc:
                    logger.debug("robot.ready delivery failed for %s: %s", device_id, exc)
                else:
                    state.sessions[device_id] = socket
                    registered = True
        if not registered:
            await close_bounded(socket, "device_already_connected_or_ready_failed")
            return

        try:
            while True:
                data = await socket.receive_json()
                if not isinstance(data, dict):
                    await close_bounded(socket, "invalid_message")
                    break
                if data.get("type") == "robot.event":
                    event = RobotEvent.model_validate(data)
                    if not await process_event(state, socket, event, send_timeout):
                        await close_bounded(socket, "session_unavailable")
                        break
                elif data.get("type") == "robot.command_result":
                    result = RobotCommandResult.model_validate(data)
                    invalid = False
                    async with state.lock:
                        command = state.commands.get(result.command_id)
                        if state.sessions.get(device_id) is not socket or command is None or command.device_id != device_id:
                            invalid = True
                        elif command.status != "pending":
                            if command.event_id is not None:
                                invalid = True
                        elif command.event_id is None and asyncio.get_running_loop().time() >= state.deadlines[command.command_id]:
                            terminate(state, command, "result_timeout")
                        elif command.event_id is None and result.status == "cancelled":
                            terminate(state, command, "local_interrupted")
                        else:
                            detail = result.detail if result.status == "failed" else None
                            terminate(state, command, detail, result.status)
                    if invalid:
                        await close_bounded(socket, "unknown_pending_command")
                        break
                else:
                    await close_bounded(socket, "invalid_message")
                    break
        except (OSError, RuntimeError, ValueError, WebSocketDisconnect) as exc:
            logger.debug("Robot session ended for %s: %s", device_id, exc)
        finally:
            async with state.lock:
                if state.sessions.get(device_id) is socket:
                    del state.sessions[device_id]
                    for command in state.commands.values():
                        if command.device_id == device_id:
                            terminate(state, command, "device_disconnected")

    return app


app = create_app()
