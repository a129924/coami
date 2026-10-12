from __future__ import annotations

import asyncio
import json
from typing import Literal

import pytest
from fastapi import WebSocketDisconnect

from app import Frame, RequestFrame, Session, UsageServer, create_app, parse_duration


class FakeClock:
    time_mode: Literal["real", "fake"] = "fake"

    def __init__(self, now: int = 1000) -> None:
        self.now = now
        self.changed = asyncio.Event()

    def now_ms(self) -> int:
        return self.now

    def advance(self, now: int) -> None:
        self.now = now
        self.changed.set()

    async def wait_until(self, deadline_ms: int) -> None:
        while self.now < deadline_ms:
            self.changed.clear()
            await self.changed.wait()


class MemoryJournal:
    def __init__(self, fail_event: str | None = None) -> None:
        self.entries: list[Frame] = []
        self.fail_event = fail_event

    def append(self, event: Frame) -> None:
        if event["event"] == self.fail_event:
            raise OSError("journal_unavailable")
        self.entries.append(event)


class FakeSocket:
    def __init__(self, fail_send: bool = False) -> None:
        self.incoming: asyncio.Queue[str | Exception] = asyncio.Queue()
        self.outgoing: asyncio.Queue[Frame] = asyncio.Queue()
        self.sent: list[Frame] = []
        self.closed: tuple[int, str | None] | None = None
        self.fail_send = fail_send
        self.accepted = False

    async def accept(self) -> None:
        self.accepted = True

    async def receive_text(self) -> str:
        message = await self.incoming.get()
        if isinstance(message, Exception):
            raise message
        return message

    async def send_json(self, data: Frame) -> None:
        if self.fail_send:
            raise OSError("transport_unavailable")
        self.sent.append(data)
        self.outgoing.put_nowait(data)

    async def close(self, code: int = 1000, reason: str | None = None) -> None:
        self.closed = (code, reason)

    def request(self, message_type: str, *, connection: str = "conn", **extra: object) -> None:
        self.incoming.put_nowait(json.dumps(frame(message_type, connection=connection, **extra)))

    async def response(self) -> Frame:
        return await asyncio.wait_for(self.outgoing.get(), timeout=2)

    def disconnect(self) -> None:
        self.incoming.put_nowait(WebSocketDisconnect())


def frame(message_type: str, *, connection: str = "conn", **extra: object) -> Frame:
    return {"v": 1, "type": message_type, "robot_id": "robot",
            "connection_id": connection, "message_id": "request", **extra}


def make_server() -> tuple[UsageServer, FakeClock, MemoryJournal]:
    clock = FakeClock()
    journal = MemoryJournal()
    return UsageServer(5000, clock, journal, "test-run"), clock, journal


@pytest.mark.parametrize(("offset", "allowed"), [(-1, True), (0, False), (1, False)])
def test_deadline_boundary(offset: int, allowed: bool) -> None:
    async def scenario() -> None:
        server, clock, _journal = make_server()
        session = Session(FakeSocket())
        start = await server.dispatch(session, RequestFrame.model_validate(frame("robot.start")))
        clock.advance(6000 + offset)
        result = await server.dispatch(session, RequestFrame.model_validate(frame("operation.probe")))
        assert result["allowed"] is allowed
        assert result["reason"] == ("allowed" if allowed else "expired")
        assert result["grant_id"] == start["grant_id"]
    asyncio.run(scenario())


def test_probe_and_status_do_not_grant() -> None:
    async def scenario() -> None:
        server, _clock, _journal = make_server()
        session = Session(FakeSocket())
        probe = await server.dispatch(session, RequestFrame.model_validate(frame("operation.probe")))
        status = await server.dispatch(session, RequestFrame.model_validate(frame("usage.status")))
        assert probe["reason"] == status["state"] == "not_started"
        assert probe["grant_id"] is None
        assert status["remaining_ms"] == 0
        assert server.grants == {}
    asyncio.run(scenario())


def test_repeated_start_preserves_grant() -> None:
    async def scenario() -> None:
        server, clock, _journal = make_server()
        session = Session(FakeSocket())
        request = RequestFrame.model_validate(frame("robot.start"))
        original = await server.dispatch(session, request)
        clock.advance(2000)
        repeated = await server.dispatch(session, request)
        clock.advance(6000)
        expired = await server.dispatch(session, request)
        assert original["grant_id"] == repeated["grant_id"] == expired["grant_id"]
        assert original["deadline_ms"] == repeated["deadline_ms"] == expired["deadline_ms"] == 6000
        assert expired["status"] == "Expired"
        assert repeated["remaining_ms"] == 4000
    asyncio.run(scenario())


def test_reconnect_expiry_notification_and_live_status() -> None:
    async def scenario() -> None:
        server, clock, journal = make_server()
        original: Frame | None = None
        for connection, now in [("first", 1000), ("restart", 2000), ("expired", 6000)]:
            clock.advance(now)
            socket = FakeSocket()
            task = asyncio.create_task(server.serve(socket))
            socket.request("robot.start", connection=connection)
            response = await socket.response()
            if original is None:
                original = response
            assert response["grant_id"] == original["grant_id"]
            assert response["deadline_ms"] == original["deadline_ms"]
            if connection == "restart":
                clock.advance(6000)
            if connection != "first":
                notification = await socket.response()
                assert notification["type"] == "usage.expired"
                assert "reply_to" not in notification
                assert socket.closed is None
                socket.request("usage.status", connection=connection)
                assert (await socket.response())["state"] == "expired"
                socket.request("operation.probe", connection=connection)
                assert (await socket.response())["reason"] == "expired"
                assert sum(item["type"] == "usage.expired" for item in socket.sent) == 1
            socket.disconnect()
            await asyncio.wait_for(task, timeout=2)
            assert not server.sessions
            assert not server.connections
        assert journal.entries
        assert all(entry["time_mode"] == "fake" for entry in journal.entries)
        assert len(server.grants) == 1
    asyncio.run(scenario())


@pytest.mark.parametrize("invalid", ["0", "-1", "1.5", "", " 5", "５", "true", 0, -1, True])
def test_invalid_duration(invalid: str | int) -> None:
    with pytest.raises(ValueError, match="invalid_usage_ms"):
        parse_duration(invalid)


@pytest.mark.parametrize("payload", [
    "not-json", "[]", json.dumps(frame("unknown")),
    json.dumps(frame("robot.start", v=True)),
    json.dumps(frame("robot.start", v=1.0)),
    json.dumps(frame("robot.start", robot_id="")),
    json.dumps(frame("robot.start", connection_id="c" * 129)),
    json.dumps(frame("robot.start", message_id="secret?token=abc")),
    json.dumps(frame("robot.start", grant_id=None)),
    json.dumps(frame("robot.start", grant_id="forged")),
    json.dumps(frame("robot.start", headers={"authorization": "secret"})),
])
def test_invalid_input_closes_without_success_or_raw_logging(payload: str) -> None:
    async def scenario() -> None:
        server, _clock, journal = make_server()
        socket = FakeSocket()
        socket.incoming.put_nowait(payload)
        await asyncio.wait_for(server.serve(socket), timeout=2)
        assert socket.closed is not None and socket.closed[0] == 1008
        assert not socket.sent
        assert not server.grants
        assert "secret" not in json.dumps(journal.entries)
        assert journal.entries[-1]["event"] == "protocol_error"
    asyncio.run(scenario())


def test_identity_change_and_concurrent_robot_are_rejected() -> None:
    async def scenario() -> None:
        server, _clock, _journal = make_server()
        first = FakeSocket()
        running = asyncio.create_task(server.serve(first))
        first.request("robot.start")
        await first.response()
        second = FakeSocket()
        second.request("robot.start", connection="another")
        await asyncio.wait_for(server.serve(second), timeout=2)
        assert second.closed == (1008, "robot_already_connected")
        assert server.sessions["robot"].socket is first
        first.request("usage.status", connection="changed")
        await asyncio.wait_for(running, timeout=2)
        assert first.closed == (1008, "identity_changed")
        assert not server.sessions
    asyncio.run(scenario())


@pytest.mark.parametrize("fail_event", ["received", "send_attempt", "sent"])
def test_journal_failure_is_not_success(fail_event: str) -> None:
    async def scenario() -> None:
        clock = FakeClock()
        journal = MemoryJournal(fail_event)
        server = UsageServer(5000, clock, journal, "test")
        socket = FakeSocket()
        socket.request("robot.start")
        with pytest.raises(OSError, match="journal_unavailable"):
            await asyncio.wait_for(server.serve(socket), timeout=2)
        assert socket.closed == (1011, "server_failure")
        assert not server.sessions
        assert not any(entry["event"] == "sent" for entry in journal.entries)
    asyncio.run(scenario())


def test_failed_delivery_does_not_reset_grant() -> None:
    async def scenario() -> None:
        server, clock, journal = make_server()
        socket = FakeSocket(fail_send=True)
        socket.request("robot.start")
        with pytest.raises(OSError, match="transport_unavailable"):
            await server.serve(socket)
        grant = server.grants["robot"]
        assert any(entry["event"] == "send_failed" for entry in journal.entries)
        clock.advance(3000)
        next_socket = FakeSocket()
        running = asyncio.create_task(server.serve(next_socket))
        next_socket.request("robot.start", connection="retry")
        response = await next_socket.response()
        assert response["grant_id"] == grant.grant_id
        assert response["deadline_ms"] == grant.deadline_ms
        next_socket.disconnect()
        await running
    asyncio.run(scenario())


def test_expiry_send_failure_interrupts_reader_and_cleans_up() -> None:
    async def scenario() -> None:
        server, clock, _journal = make_server()
        socket = FakeSocket()
        running = asyncio.create_task(server.serve(socket))
        socket.request("robot.start")
        await socket.response()
        socket.fail_send = True
        clock.advance(6000)
        with pytest.raises(OSError, match="transport_unavailable"):
            await asyncio.wait_for(running, timeout=2)
        assert not server.connections
        assert not server.sessions
    asyncio.run(scenario())


def test_shutdown_cancels_reader_and_expiry_but_keeps_grant() -> None:
    async def scenario() -> None:
        server, clock, _journal = make_server()
        socket = FakeSocket()
        running = asyncio.create_task(server.serve(socket))
        socket.request("robot.start")
        await socket.response()
        await server.shutdown()
        clock.advance(6000)
        assert running.cancelled()
        assert not server.connections
        assert not server.sessions
        assert len(server.grants) == 1
        assert not any(item["type"] == "usage.expired" for item in socket.sent)
        assert asyncio.all_tasks() == {asyncio.current_task()}
    asyncio.run(scenario())


def test_create_app_accepts_pure_dependencies() -> None:
    application = create_app(usage_ms=5000, clock=FakeClock(), journal=MemoryJournal(), run_id="unit")
    assert any(getattr(route, "path", None) == "/ws" for route in application.routes)


def test_expiry_and_status_race_never_closes_or_grants() -> None:
    async def scenario() -> None:
        server, clock, _journal = make_server()
        socket = FakeSocket()
        running = asyncio.create_task(server.serve(socket))
        socket.request("robot.start")
        start = await socket.response()
        clock.advance(6000)
        socket.request("usage.status", message_id="status-at-deadline")
        responses = [await socket.response(), await socket.response()]
        assert {response["type"] for response in responses} == {"usage.expired", "usage.state"}
        status = next(response for response in responses if response["type"] == "usage.state")
        assert status["state"] == "expired"
        assert status["remaining_ms"] == 0
        assert status["reply_to"] == "status-at-deadline"
        assert status["grant_id"] == start["grant_id"]
        assert socket.closed is None
        socket.disconnect()
        await asyncio.wait_for(running, timeout=2)
        assert not server.sessions
        assert asyncio.all_tasks() == {asyncio.current_task()}
    asyncio.run(scenario())


def test_grant_mismatch_after_start_is_rejected() -> None:
    async def scenario() -> None:
        server, _clock, journal = make_server()
        socket = FakeSocket()
        running = asyncio.create_task(server.serve(socket))
        socket.request("robot.start")
        start = await socket.response()
        socket.request("operation.probe", grant_id="wrong-grant")
        await asyncio.wait_for(running, timeout=2)
        assert socket.closed == (1008, "grant_mismatch")
        assert server.grants["robot"].grant_id == start["grant_id"]
        assert not any(entry.get("grant_id") == "wrong-grant" for entry in journal.entries)
    asyncio.run(scenario())


def test_parallel_server_sends_are_serialized() -> None:
    class YieldingSocket(FakeSocket):
        def __init__(self) -> None:
            super().__init__()
            self.active = 0
            self.maximum_active = 0

        async def send_json(self, data: Frame) -> None:
            self.active += 1
            self.maximum_active = max(self.maximum_active, self.active)
            await asyncio.sleep(0)
            await super().send_json(data)
            self.active -= 1

    async def scenario() -> None:
        server, _clock, journal = make_server()
        socket = YieldingSocket()
        session = Session(socket, robot_id="robot", connection_id="connection")
        first = server.envelope(session, "usage.expired")
        second = server.envelope(session, "usage.state")
        await asyncio.gather(server.send(session, first), server.send(session, second))
        assert socket.maximum_active == 1
        assert len(socket.sent) == 2
        assert [entry["event"] for entry in journal.entries] == [
            "send_attempt", "sent", "send_attempt", "sent",
        ]
    asyncio.run(scenario())


def test_factory_rejects_invalid_environment_duration(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("USAGE_MS", "-5000")
    with pytest.raises(ValueError, match="invalid_usage_ms"):
        create_app(clock=FakeClock(), journal=MemoryJournal())
