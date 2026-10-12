from __future__ import annotations

import asyncio
import json
import os
import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager, suppress
from dataclasses import dataclass, field
from pathlib import Path
from typing import Annotated, Literal, Protocol
from uuid import uuid4

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

type Frame = dict[str, object]
type Identifier = Annotated[str, Field(min_length=1, max_length=128, pattern=r"^[A-Za-z0-9._:-]+$")]
MAX_SAFE_INTEGER = 9_007_199_254_740_991


class Clock(Protocol):
    time_mode: Literal["real", "fake"]

    def now_ms(self) -> int: ...

    async def wait_until(self, deadline_ms: int) -> None: ...


class RealClock:
    time_mode: Literal["real", "fake"] = "real"

    def __init__(self) -> None:
        self.anchor_ms = time.time_ns() // 1_000_000
        self.anchor_monotonic = time.monotonic_ns()

    def now_ms(self) -> int:
        return self.anchor_ms + (time.monotonic_ns() - self.anchor_monotonic) // 1_000_000

    async def wait_until(self, deadline_ms: int) -> None:
        while self.now_ms() < deadline_ms:
            await asyncio.sleep((deadline_ms - self.now_ms()) / 1000)


class Journal(Protocol):
    def append(self, event: Frame) -> None: ...


class JsonlJournal:
    def __init__(self, path: Path) -> None:
        self.path = path

    def append(self, event: Frame) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("a", encoding="utf-8") as output:
            output.write(json.dumps(event, ensure_ascii=False) + "\n")
            output.flush()
            os.fsync(output.fileno())


class Socket(Protocol):
    async def accept(self) -> None: ...

    async def receive_text(self) -> str: ...

    async def send_json(self, data: Frame) -> None: ...

    async def close(self, code: int = 1000, reason: str | None = None) -> None: ...


class RequestFrame(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    v: Literal[1]
    type: Literal["robot.start", "operation.probe", "usage.status"]
    robot_id: Identifier
    connection_id: Identifier
    message_id: Identifier
    grant_id: Identifier | None = None

    @field_validator("v", mode="before")
    @classmethod
    def integer_version(cls, value: object) -> object:
        if type(value) is not int:
            raise ValueError("invalid_version")
        return value

    @field_validator("grant_id", mode="before")
    @classmethod
    def non_null_grant(cls, value: object) -> object:
        if value is None:
            raise ValueError("invalid_grant")
        return value


class ProtocolViolation(Exception):
    pass


@dataclass(frozen=True)
class Grant:
    grant_id: str
    authorized_at_ms: int
    deadline_ms: int


@dataclass(eq=False)
class Session:
    socket: Socket
    robot_id: str | None = None
    connection_id: str | None = None
    send_lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    grant_ready: asyncio.Event = field(default_factory=asyncio.Event)
    expiry_sent: bool = False


def parse_duration(value: str | int) -> int:
    if type(value) not in (str, int) or (isinstance(value, str) and not value.isascii()):
        raise ValueError("invalid_usage_ms")
    if isinstance(value, str) and (not value.isdecimal()):
        raise ValueError("invalid_usage_ms")
    duration = int(value)
    if not 0 < duration <= MAX_SAFE_INTEGER:
        raise ValueError("invalid_usage_ms")
    return duration


class UsageServer:
    def __init__(self, usage_ms: int, clock: Clock, journal: Journal, run_id: str) -> None:
        self.usage_ms = parse_duration(usage_ms)
        self.clock = clock
        self.journal = journal
        self.run_id = run_id
        self.grants: dict[str, Grant] = {}
        self.sessions: dict[str, Session] = {}
        self.state_lock = asyncio.Lock()
        self.connections: set[asyncio.Task[object]] = set()

    def record(self, event: str, session: Session, message: Frame | None = None,
               reason: str | None = None) -> None:
        entry: Frame = {
            "side": "server", "run_id": self.run_id, "event": event,
            "utc_ms": time.time_ns() // 1_000_000,
            "logical_time_ms": self.clock.now_ms(), "time_mode": self.clock.time_mode,
        }
        if session.robot_id is not None:
            entry["robot_id"] = session.robot_id
            entry["connection_id"] = session.connection_id
        if message is not None:
            entry["message"] = message
            entry["message_id"] = message["message_id"]
            if "grant_id" in message:
                entry["grant_id"] = message["grant_id"]
            if "reply_to" in message:
                entry["reply_to"] = message["reply_to"]
        if reason is not None:
            entry["reason"] = reason
        self.journal.append(entry)

    def envelope(self, session: Session, message_type: str) -> Frame:
        return {"v": 1, "type": message_type, "robot_id": session.robot_id,
                "connection_id": session.connection_id, "message_id": str(uuid4())}

    async def send(self, session: Session, message: Frame) -> None:
        async with session.send_lock:
            self.record("send_attempt", session, message)
            try:
                await asyncio.wait_for(session.socket.send_json(message), timeout=2)
            except (OSError, RuntimeError, TimeoutError, WebSocketDisconnect):
                self.record("send_failed", session, message, "transport_failure")
                raise
            self.record("sent", session, message)

    async def dispatch(self, session: Session, request: RequestFrame) -> Frame:
        async with self.state_lock:
            self.bind(session, request)
            grant = self.grants.get(request.robot_id)
            if request.grant_id is not None and (
                grant is None or request.grant_id != grant.grant_id
            ):
                raise ProtocolViolation("grant_mismatch")
            self.record("received", session, request.model_dump(exclude_none=True))
            now = self.clock.now_ms()
            if request.type == "robot.start" and grant is None:
                if now + self.usage_ms > MAX_SAFE_INTEGER:
                    raise ValueError("deadline_overflow")
                grant = Grant(str(uuid4()), now, now + self.usage_ms)
                self.grants[request.robot_id] = grant
            state = "not_started" if grant is None else (
                "active" if now < grant.deadline_ms else "expired"
            )
            response_type = {"robot.start": "robot.start_result",
                             "operation.probe": "operation.result",
                             "usage.status": "usage.state"}[request.type]
            response = self.envelope(session, response_type)
            response["reply_to"] = request.message_id
            response["grant_id"] = None if grant is None else grant.grant_id
            if request.type == "operation.probe":
                response.update(allowed=state == "active",
                                reason="allowed" if state == "active" else state)
            else:
                response.update(
                    authorized_at_ms=None if grant is None else grant.authorized_at_ms,
                    deadline_ms=None if grant is None else grant.deadline_ms,
                    server_now_ms=now,
                    remaining_ms=0 if grant is None else max(0, grant.deadline_ms - now),
                )
                if request.type == "robot.start":
                    response["status"] = "Success" if state == "active" else "Expired"
                else:
                    response["state"] = state
            return response

    def bind(self, session: Session, request: RequestFrame) -> None:
        if session.robot_id is not None:
            if (session.robot_id, session.connection_id) != (
                request.robot_id, request.connection_id
            ):
                raise ProtocolViolation("identity_changed")
            return
        if request.robot_id in self.sessions:
            raise ProtocolViolation("robot_already_connected")
        session.robot_id = request.robot_id
        session.connection_id = request.connection_id
        self.sessions[request.robot_id] = session

    async def reader(self, session: Session) -> None:
        while True:
            try:
                payload = await session.socket.receive_text()
                request = RequestFrame.model_validate_json(payload)
            except (ValidationError, KeyError, UnicodeError) as error:
                raise ProtocolViolation("invalid_frame") from error
            response = await self.dispatch(session, request)
            await self.send(session, response)
            if session.robot_id in self.grants:
                session.grant_ready.set()

    async def notify_expiry(self, session: Session) -> None:
        await session.grant_ready.wait()
        if session.robot_id is None:
            raise RuntimeError("unbound_session")
        grant = self.grants[session.robot_id]
        await self.clock.wait_until(grant.deadline_ms)
        if not session.expiry_sent:
            message = self.envelope(session, "usage.expired")
            message.update(grant_id=grant.grant_id, deadline_ms=grant.deadline_ms,
                           server_now_ms=self.clock.now_ms())
            await self.send(session, message)
            session.expiry_sent = True

    async def serve(self, socket: Socket) -> None:
        session = Session(socket)
        connection_task = asyncio.current_task()
        if connection_task is not None:
            self.connections.add(connection_task)
        tasks: list[asyncio.Task[None]] = []
        try:
            await socket.accept()
            reader = asyncio.create_task(self.reader(session))
            notifier = asyncio.create_task(self.notify_expiry(session))
            tasks = [reader, notifier]
            finished, _pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            if notifier in finished:
                await notifier
            await reader
        except ProtocolViolation as error:
            self.record("protocol_error", session, reason=str(error))
            await asyncio.wait_for(socket.close(code=1008, reason=str(error)), timeout=2)
        except WebSocketDisconnect:
            self.record("disconnected", session, reason="peer_closed")
        except (OSError, RuntimeError, TimeoutError):
            await asyncio.wait_for(socket.close(code=1011, reason="server_failure"), timeout=2)
            raise
        finally:
            for task in tasks:
                if not task.done():
                    task.cancel()
            try:
                outcomes = await asyncio.gather(*tasks, return_exceptions=True)
                for outcome in outcomes:
                    if isinstance(outcome, BaseException) and not isinstance(
                        outcome, (asyncio.CancelledError, ProtocolViolation, WebSocketDisconnect)
                    ):
                        raise outcome
            finally:
                if session.robot_id is not None:
                    async with self.state_lock:
                        if self.sessions.get(session.robot_id) is session:
                            del self.sessions[session.robot_id]
                if connection_task is not None:
                    self.connections.discard(connection_task)

    async def shutdown(self) -> None:
        tasks = list(self.connections)
        for task in tasks:
            task.cancel()
        for task in tasks:
            with suppress(asyncio.CancelledError):
                await task


def create_app(*, usage_ms: int | None = None, clock: Clock | None = None,
               journal: Journal | None = None, run_id: str | None = None) -> FastAPI:
    server = UsageServer(
        parse_duration(os.environ.get("USAGE_MS", "5000")) if usage_ms is None else usage_ms,
        RealClock() if clock is None else clock,
        JsonlJournal(Path(os.environ.get("SERVER_LOG", "evidence/server.jsonl")))
        if journal is None else journal,
        os.environ.get("RUN_ID", "e014-local-run") if run_id is None else run_id,
    )

    @asynccontextmanager
    async def lifespan(_application: FastAPI) -> AsyncGenerator[None]:
        try:
            yield
        finally:
            await server.shutdown()

    application = FastAPI(title="E014 WebSocket usage expiry", lifespan=lifespan)
    application.state.server = server

    @application.websocket("/ws")
    async def websocket_endpoint(socket: WebSocket) -> None:
        await server.serve(socket)

    return application


app = create_app()
