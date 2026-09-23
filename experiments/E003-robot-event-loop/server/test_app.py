from __future__ import annotations

import time
from threading import Event
from typing import Any
from uuid import uuid4

from fastapi.testclient import TestClient
from starlette.testclient import WebSocketTestSession
from starlette.websockets import WebSocket

from app import DEVICE_ID, create_app


def connect(socket: WebSocketTestSession) -> None:
    socket.send_json({"type": "robot.hello", "device_id": DEVICE_ID, "version": 1})
    assert socket.receive_json() == {"type": "robot.ready", "device_id": DEVICE_ID}


def event(event_id: str) -> dict[str, object]:
    return {
        "type": "robot.event",
        "event_id": event_id,
        "event": {"kind": "button", "name": "a", "pressed": True},
    }


def test_event_command_result_and_duplicate() -> None:
    app = create_app()
    with (
        TestClient(app) as client,
        client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket,
    ):
        connect(socket)
        event_id = str(uuid4())
        socket.send_json(event(event_id))
        command = socket.receive_json()
        assert command["type"] == "robot.command"
        assert command["event_id"] == event_id
        assert command["action"] == "greet"
        command_id = command["command_id"]
        assert socket.receive_json() == {
            "type": "robot.event_ack", "event_id": event_id,
            "disposition": "accepted", "command_id": command_id,
        }
        assert client.get(f"/v1/commands/{command_id}").json()["status"] == "pending"
        socket.send_json({
            "type": "robot.command_result",
            "command_id": command_id,
            "status": "completed",
        })
        deadline = time.monotonic() + 1
        while client.get(f"/v1/commands/{command_id}").json()["status"] == "pending":
            assert time.monotonic() < deadline
        view = client.get(f"/v1/commands/{command_id}").json()
        assert (view["event_id"], view["status"]) == (event_id, "completed")
        socket.send_json(event(event_id))
        assert socket.receive_json() == {
            "type": "robot.event_ack", "event_id": event_id,
            "disposition": "duplicate", "command_id": command_id,
        }
        assert len(app.state.e003.commands) == 1


def test_busy_event_can_retry_and_disconnect_keeps_mapping() -> None:
    app = create_app()
    first_id, second_id = str(uuid4()), str(uuid4())
    with TestClient(app) as client:
        with client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket:
            connect(socket)
            socket.send_json(event(first_id))
            first_command = socket.receive_json()["command_id"]
            assert socket.receive_json()["disposition"] == "accepted"
            socket.send_json(event(second_id))
            assert socket.receive_json() == {
                "type": "robot.event_ack", "event_id": second_id,
                "disposition": "busy", "command_id": first_command,
            }
            assert second_id not in app.state.e003.event_commands
            socket.send_json({
                "type": "robot.command_result",
                "command_id": first_command, "status": "completed",
            })
            deadline = time.monotonic() + 1
            while client.get(f"/v1/commands/{first_command}").json()["status"] == "pending":
                assert time.monotonic() < deadline
            socket.send_json(event(second_id))
            second_command = socket.receive_json()["command_id"]
            assert socket.receive_json()["disposition"] == "accepted"
        view = client.get(f"/v1/commands/{second_command}").json()
        assert (view["status"], view["detail"]) == ("failed", "device_disconnected")
        with client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket:
            connect(socket)
            socket.send_json(event(second_id))
            assert socket.receive_json() == {
                "type": "robot.event_ack", "event_id": second_id,
                "disposition": "duplicate", "command_id": second_command,
            }
            assert len(app.state.e003.commands) == 2


def test_delivery_failure_keeps_accepted_event(monkeypatch) -> None:
    app = create_app()
    original_send = WebSocket.send_json

    async def fail_command(self: WebSocket, data: Any, mode: str = "text") -> None:
        if isinstance(data, dict) and data.get("type") == "robot.command":
            raise OSError("simulated delivery failure")
        await original_send(self, data, mode=mode)

    with TestClient(app) as client:
        with monkeypatch.context() as patch:
            patch.setattr(WebSocket, "send_json", fail_command)
            with client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket:
                connect(socket)
                event_id = str(uuid4())
                socket.send_json(event(event_id))
                deadline = time.monotonic() + 1
                while not app.state.e003.commands:
                    assert time.monotonic() < deadline
        command = next(iter(app.state.e003.commands.values()))
        assert (command.event_id, command.status, command.detail) == (
            event_id, "failed", "delivery_failed"
        )
        assert app.state.e003.event_commands[event_id] == command.command_id
        assert client.get(f"/v1/commands/{command.command_id}").json()["status"] == "failed"


def test_ready_delivery_failure_cleans_session(monkeypatch) -> None:
    app = create_app()
    original_send = WebSocket.send_json
    ready_failed = Event()

    async def fail_ready(self: WebSocket, data: Any, mode: str = "text") -> None:
        if isinstance(data, dict) and data.get("type") == "robot.ready":
            ready_failed.set()
            raise OSError("simulated ready delivery failure")
        await original_send(self, data, mode=mode)

    with TestClient(app) as client:
        with monkeypatch.context() as patch:
            patch.setattr(WebSocket, "send_json", fail_ready)
            with client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket:
                socket.send_json({
                    "type": "robot.hello", "device_id": DEVICE_ID, "version": 1,
                })
                assert ready_failed.wait(timeout=1)
                deadline = time.monotonic() + 1
                while app.state.e003.sessions:
                    assert time.monotonic() < deadline

        with client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket:
            connect(socket)
