"""E026 experiment-local WebSocket envelope around the unchanged E025 owner."""
from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from e025_core import Frame, Lab, Robot, Work


class Token(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    runEpoch: str = Field(min_length=1, max_length=80)
    robotId: str = Field(min_length=1, max_length=80)
    scopeId: str = Field(min_length=1, max_length=80)


class Operation(Token):
    cancelId: str = Field(min_length=1, max_length=80)


class Message(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["open", "work", "cancel", "ping", "release"]
    token: Token | None = None
    operation: Operation | None = None
    id: str = Field(default="", max_length=64)
    mode: Literal["blocked", "quick", "cleanup_hold", "cleanup_timeout", "cleanup_error"] = "blocked"
    key: str = Field(default="", max_length=200)


class ScopedRobot(Robot):
    def __init__(self, lab: Lab, robot_id: str) -> None:
        super().__init__(lab, robot_id)
        self.token: Token | None = None
        self.operation: Operation | None = None
        self.used: set[Token] = set()
        self.outbox: asyncio.Queue[dict[str, object]] = asyncio.Queue()
        self.socket_active = False

    def emit(self, frame: Frame) -> None:
        if frame.kind in {"cancel_complete", "cancel_failed"}:
            if self.operation is not None:
                self.outbox.put_nowait({"kind": "server-cleaned", "operation": self.operation.model_dump(), "okay": frame.kind == "cancel_complete"})
            else:
                self.outbox.put_nowait({"kind": "server-failure", "detail": frame.kind})
            return
        self.outbox.put_nowait({"kind": frame.kind, "token": self.token.model_dump() if self.token else None, "id": frame.id,
                               "generation": frame.generation, "session": frame.session, "detail": frame.detail})


def create_app(lab: Lab | None = None) -> FastAPI:
    owner = lab or Lab()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncGenerator[None]:
        yield
        await owner.close()

    app = FastAPI(lifespan=lifespan)
    app.state.lab = owner
    robots: dict[str, ScopedRobot] = {}

    @app.websocket("/ws/{robot_id}")
    async def socket_route(socket: WebSocket, robot_id: str) -> None:
        await socket.accept()
        robot = robots.setdefault(robot_id, ScopedRobot(owner, robot_id))
        owner.robots[robot_id] = robot
        if robot.socket_active:
            await socket.close(code=1008, reason="Already connected")
            return
        robot.socket_active = True
        owner.session_number += 1
        session = owner.session_number

        async def writer() -> None:
            while True:
                row = await robot.outbox.get()
                if row["kind"] == "result":
                    scope = robot.scope
                    if scope is None or not scope.valid or row.get("generation") != scope.number or row.get("session") != session:
                        owner.mark("stale_result", robot_id, str(row["id"]))
                        continue
                await socket.send_json(row)

        output = asyncio.create_task(writer())
        try:
            while True:
                try:
                    message = Message.model_validate_json(await socket.receive_text())
                except ValidationError:
                    robot.outbox.put_nowait({"kind": "rejected", "detail": "invalid-envelope"})
                    continue
                if message.kind == "ping":
                    robot.outbox.put_nowait({"kind": "pong"})
                elif message.kind == "release":
                    await owner.release(message.key)
                    robot.outbox.put_nowait({"kind": "released", "key": message.key})
                elif message.kind == "open":
                    token = message.token
                    if (token is None or token.robotId != robot_id or token in robot.used
                        or robot.state != "idle" or robot.scope is not None
                        or (robot.token is not None and robot.operation is None)):
                        robot.outbox.put_nowait({"kind": "rejected", "detail": "scope-not-openable"})
                        continue
                    robot.token = token
                    robot.used.add(token)
                    robot.operation = None
                    robot.outbox.put_nowait({"kind": "opened", "token": token.model_dump()})
                elif message.kind == "work":
                    if message.token != robot.token or robot.operation is not None or robot.token is None:
                        robot.outbox.put_nowait({"kind": "rejected", "detail": "stale-scope"})
                        continue
                    await robot.submit(Work(kind="work", id=message.id, mode=message.mode), session)
                else:
                    operation = message.operation
                    if operation is None or robot.token is None or Token.model_validate(operation.model_dump(exclude={"cancelId"})) != robot.token:
                        robot.outbox.put_nowait({"kind": "rejected", "detail": "stale-cancel"})
                        continue
                    if robot.operation is not None:
                        if robot.operation != operation:
                            robot.outbox.put_nowait({"kind": "rejected", "detail": "cancel-id-mismatch"})
                        elif robot.state == "idle":
                            robot.emit(Frame(kind="cancel_complete"))
                        elif robot.state == "quarantined":
                            robot.emit(Frame(kind="cancel_failed"))
                        continue
                    robot.operation = operation
                    robot.begin_cancel()
        except WebSocketDisconnect:
            pass
        finally:
            robot.socket_active = False
            robot.begin_cancel()
            output.cancel()
            await asyncio.gather(output, return_exceptions=True)

    @app.get("/fixture/records")
    async def records() -> list[dict[str, object]]:
        return [row.model_dump() for row in owner.records]

    return app


app = create_app()
