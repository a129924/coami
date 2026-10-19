"""ASGI-only acceptance cases; gates and observations are test infrastructure."""

from __future__ import annotations

import json
import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from anyio.from_thread import BlockingPortal
from fastapi.testclient import TestClient
from starlette.testclient import WebSocketTestSession

from app import Lab, Mode, Record, create_app


@pytest.fixture
def rig() -> Iterator[tuple[TestClient, Lab]]:
    lab = Lab()
    try:
        with TestClient(create_app(lab)) as client:
            yield client, lab
    finally:
        output = os.environ.get("E025_AUDIT")
        if output:
            Path(output).write_text(
                json.dumps([r.model_dump() for r in lab.records]) + "\n"
            )


def portal(client: TestClient) -> BlockingPortal:
    # Starlette 1.6 annotates this with a removed/deprecated AnyIO alias.
    value: object = getattr(client, "portal", None)
    assert isinstance(value, BlockingPortal)
    return value


def wait(
    rig: tuple[TestClient, Lab],
    action: str,
    robot: str = "A",
    work: str = "",
    role: str = "",
    after: int = 0,
) -> Record:
    client, lab = rig
    return portal(client).call(lab.wait, action, robot, work, role, after)


def release(rig: tuple[TestClient, Lab], key: str) -> None:
    client, lab = rig
    portal(client).call(lab.release, key)


def records(rig: tuple[TestClient, Lab]) -> list[Record]:
    client, lab = rig
    return portal(client).call(lab.snapshot)


def work(
    ws: WebSocketTestSession, name: str, mode: Mode = "blocked", *, child: bool = False
) -> None:
    ws.send_json({"kind": "work", "id": name, "mode": mode, "child": child})


def cancel(ws: WebSocketTestSession) -> None:
    ws.send_json({"kind": "cancel"})


def ping(
    rig: tuple[TestClient, Lab], ws: WebSocketTestSession, robot: str = "A"
) -> None:
    checkpoint = records(rig)[-1].seq
    ws.send_json({"kind": "ping"})
    wait(rig, "sent_pong", robot, after=checkpoint)


def assert_stopped(rig: tuple[TestClient, Lab], names: list[str]) -> None:
    rows = records(rig)
    for name in names:
        started = {
            (r.work, r.role) for r in rows if r.action == "started" and r.work == name
        }
        ended = {
            (r.work, r.role) for r in rows if r.action == "ended" and r.work == name
        }
        cleaned = {
            (r.work, r.role) for r in rows if r.action == "cleaned" and r.work == name
        }
        assert started, f"no observed work for {name}"
        assert started <= ended
        assert started <= cleaned
    assert all(r.detail == "0" for r in rows if r.action == "cancel_complete")
    for completed in (r for r in rows if r.action == "cancel_complete"):
        stopped = [
            r
            for r in rows
            if r.action == "scope_stopped"
            and r.robot == completed.robot
            and r.seq < completed.seq
        ]
        assert stopped and stopped[-1].detail == "0"


def test_complete_cancellation(rig: tuple[TestClient, Lab]) -> None:
    client, _ = rig
    with client.websocket_connect("/ws/A") as a:
        work(a, "old", child=True)
        for role in ("primary", "subscriber", "child"):
            wait(rig, "started", work="old", role=role)
        work(a, "queued1")
        wait(rig, "accepted", work="queued1")
        work(a, "queued2")
        wait(rig, "accepted", work="queued2")
        cancel(a)
        cutoff = wait(rig, "cancel_started")
        wait(rig, "cancel_complete")
        assert_stopped(rig, ["old"])
        assert not any(
            r.action == "started" and r.work.startswith("queued") for r in records(rig)
        )
        assert not any(
            r.action == "send_started_result" and r.seq > cutoff.seq
            for r in records(rig)
        )
        ping(rig, a)
        work(a, "new", "quick")
        wait(rig, "sent_result", work="new")


def test_robot_isolation(rig: tuple[TestClient, Lab]) -> None:
    client, _ = rig
    with client.websocket_connect("/ws/A") as a, client.websocket_connect("/ws/B") as b:
        work(a, "a-long", "cleanup_hold")
        wait(rig, "started", work="a-long")
        work(b, "b-before", "quick")
        before = wait(rig, "sent_result", "B", "b-before")
        cancel(a)
        cutoff = wait(rig, "cancel_started")
        assert before.seq < cutoff.seq
        wait(rig, "cleanup_started", work="a-long")
        work(b, "b-during", "quick")
        during = wait(rig, "sent_result", "B", "b-during")
        assert during.seq > cutoff.seq
        ping(rig, a)
        release(rig, "cleanup:A:a-long")
        wait(rig, "cancel_complete")
        connected = [r for r in records(rig) if r.action == "connected"]
        assert len({r.detail for r in connected}) == 1, "A/B must share one event loop"


def test_queue_full_and_repeated_cancel(rig: tuple[TestClient, Lab]) -> None:
    client, _ = rig
    with client.websocket_connect("/ws/A") as a:
        work(a, "held", "cleanup_hold")
        wait(rig, "started", work="held")
        for name in ("q1", "q2"):
            work(a, name)
            wait(rig, "accepted", work=name)
        work(a, "overflow")
        assert wait(rig, "rejected", work="overflow").detail == "full"
        cancel(a)
        wait(rig, "cleanup_started", work="held")
        cancel(a)
        wait(rig, "cancel_merged")
        work(a, "during-cleanup", "quick")
        assert wait(rig, "rejected", work="during-cleanup").detail == "cancelling"
        ping(rig, a)
        release(rig, "cleanup:A:held")
        wait(rig, "cancel_complete")
        assert len([r for r in records(rig) if r.action == "cancel_started"]) == 1
        assert not any(
            r.action == "started"
            and r.work in {"q1", "q2", "overflow", "during-cleanup"}
            for r in records(rig)
        )


@pytest.mark.parametrize(
    "order", ["complete-first", "cancel-first", "bus-pending", "writer-pending"]
)
def test_races_and_restart(rig: tuple[TestClient, Lab], order: str) -> None:
    client, lab = rig
    with client.websocket_connect("/ws/A") as a:
        if order == "bus-pending":
            portal(client).call(lab.block_bus)
        if order == "writer-pending":
            portal(client).call(lab.block_results)
        work(
            a,
            "race",
            "quick" if order in {"complete-first", "writer-pending"} else "blocked",
        )
        if order == "bus-pending":
            wait(rig, "bus_enqueued", work="race")
        elif order == "writer-pending":
            wait(rig, "result_queued", work="race")
        elif order == "complete-first":
            wait(rig, "sent_result", work="race")
        else:
            wait(rig, "started", work="race")
        cancel(a)
        cutoff = wait(rig, "cancel_started")
        wait(rig, "cancel_complete")
        release(rig, "bus")
        release(rig, "writer")
        if order == "bus-pending":
            wait(rig, "stale_event", work="race")
            assert not any(
                r.action == "started" and r.work == "race" for r in records(rig)
            )
        if order == "writer-pending":
            wait(rig, "stale_result", work="race")
        ping(rig, a)
        assert not any(
            r.action == "send_started_result"
            and r.work == "race"
            and r.seq > cutoff.seq
            for r in records(rig)
        )
        work(a, "restart", "quick")
        wait(rig, "sent_result", work="restart")


def test_disconnect_and_reconnect(rig: tuple[TestClient, Lab]) -> None:
    client, _ = rig
    with client.websocket_connect("/ws/A") as a:
        original = wait(rig, "connected")
        work(a, "disconnected", "cleanup_hold", child=True)
        wait(rig, "started", work="disconnected", role="child")
        work(a, "disconnect-queued")
        wait(rig, "accepted", work="disconnect-queued")
    wait(rig, "cleanup_started", work="disconnected")
    with client.websocket_connect("/ws/A") as again:
        work(again, "too-early", "quick")
        assert wait(rig, "rejected", work="too-early").detail == "cancelling"
        release(rig, "cleanup:A:disconnected")
        wait(rig, "cancel_complete")
        assert_stopped(rig, ["disconnected"])
        work(again, "reconnected", "quick")
        result = wait(rig, "sent_result", work="reconnected")
        assert result.session != original.session
        assert not any(
            r.action == "sent_result" and r.work == "disconnected" for r in records(rig)
        )
        assert not any(
            r.action == "started" and r.work == "disconnect-queued"
            for r in records(rig)
        )


@pytest.mark.parametrize(
    "mode", ["cleanup_timeout", "cleanup_error", "child_error", "subscriber_error"]
)
def test_failure_quarantine(rig: tuple[TestClient, Lab], mode: Mode) -> None:
    client, _ = rig
    with client.websocket_connect("/ws/B") as b:
        with client.websocket_connect("/ws/A") as a:
            work(a, "broken", mode, child=True)
            if mode.startswith("cleanup"):
                wait(rig, "started", work="broken")
                cancel(a)
            wait(rig, "cancel_failed")
            work(a, "after-failure", "quick")
            assert wait(rig, "rejected", work="after-failure").detail == "quarantined"
            ping(rig, a)
            work(b, "b-survives", "quick")
            wait(rig, "sent_result", "B", "b-survives")
        with client.websocket_connect("/ws/A") as again:
            work(again, "reconnect-bypass", "quick")
            assert (
                wait(rig, "rejected", work="reconnect-bypass").detail == "quarantined"
            )
            ping(rig, again)
        assert not any(
            r.action == "cancel_complete" and r.robot == "A" for r in records(rig)
        )


def test_invalid_input_keeps_control(rig: tuple[TestClient, Lab]) -> None:
    client, _ = rig
    with client.websocket_connect("/ws/A") as a:
        a.send_json({"kind": "work", "mode": "unknown"})
        wait(rig, "invalid")
        ping(rig, a)
