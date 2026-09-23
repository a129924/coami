from __future__ import annotations

import asyncio
import time
from threading import Event
from typing import Any
from uuid import uuid4

from fastapi.testclient import TestClient
from starlette.testclient import WebSocketTestSession
from starlette.websockets import WebSocket

from app import DEVICE_ID, Action, create_app


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
        assert len(app.state.e004.commands) == 1


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
            assert second_id not in app.state.e004.event_commands
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
            assert len(app.state.e004.commands) == 2


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
                while not app.state.e004.commands:
                    assert time.monotonic() < deadline
        command = next(iter(app.state.e004.commands.values()))
        assert (command.event_id, command.status, command.detail) == (
            event_id, "failed", "delivery_failed"
        )
        assert app.state.e004.event_commands[event_id] == command.command_id
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
                while app.state.e004.sessions:
                    assert time.monotonic() < deadline

        with client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket:
            connect(socket)


def test_direct_greet_is_enum_command_and_completes() -> None:
    app = create_app()
    with (
        TestClient(app) as client,
        client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket,
    ):
        connect(socket)
        response = client.post(f"/v1/devices/{DEVICE_ID}/actions/greet")
        assert response.status_code == 202
        view = response.json()
        assert view["action"] == Action.GREET.value
        assert view["event_id"] is None
        command = socket.receive_json()
        assert command == {
            "type": "robot.command",
            "command_id": view["command_id"],
            "action": Action.GREET.value,
        }
        socket.send_json({
            "type": "robot.command_result",
            "command_id": view["command_id"],
            "status": "completed",
        })
        deadline = time.monotonic() + 1
        while client.get(f"/v1/commands/{view['command_id']}").json()["status"] == "pending":
            assert time.monotonic() < deadline
        assert client.get(f"/v1/commands/{view['command_id']}").json()["status"] == "completed"


def test_direct_rejections_leave_no_command() -> None:
    app = create_app()
    with TestClient(app) as client:
        assert client.post(f"/v1/devices/{DEVICE_ID}/actions/nope").status_code == 422
        assert client.post("/v1/devices/unknown/actions/greet").status_code == 404
        assert client.post(f"/v1/devices/{DEVICE_ID}/actions/greet").status_code == 409
        assert not app.state.e004.commands
        with client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket:
            connect(socket)
            first = client.post(f"/v1/devices/{DEVICE_ID}/actions/greet")
            assert first.status_code == 202
            assert client.post(f"/v1/devices/{DEVICE_ID}/actions/greet").status_code == 409
            assert len(app.state.e004.commands) == 1
            assert socket.receive_json()["command_id"] == first.json()["command_id"]


def wait_for_view(client: TestClient, command_id: str, status: str) -> dict[str, Any]:
    deadline = time.monotonic() + 1
    while True:
        view = client.get(f"/v1/commands/{command_id}").json()
        if view["status"] == status:
            return view
        assert time.monotonic() < deadline, view


def test_direct_delivery_and_execution_failures_are_distinct(monkeypatch) -> None:
    app = create_app()
    original_send = WebSocket.send_json

    async def fail_command(self: WebSocket, data: Any, mode: str = "text") -> None:
        if isinstance(data, dict) and data.get("type") == "robot.command":
            raise OSError("send failed")
        await original_send(self, data, mode=mode)

    with TestClient(app) as client:
        with monkeypatch.context() as patch:
            patch.setattr(WebSocket, "send_json", fail_command)
            with client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket:
                connect(socket)
                response = client.post(f"/v1/devices/{DEVICE_ID}/actions/greet")
                assert response.status_code == 202
                assert response.json()["detail"] == "delivery_failed"
                assert wait_for_view(client, response.json()["command_id"], "failed")["detail"] == "delivery_failed"

        with client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket:
            connect(socket)
            response = client.post(f"/v1/devices/{DEVICE_ID}/actions/greet")
            command_id = response.json()["command_id"]
            assert socket.receive_json()["command_id"] == command_id
            socket.send_json({
                "type": "robot.command_result", "command_id": command_id,
                "status": "failed", "detail": "motion_failed",
            })
            assert wait_for_view(client, command_id, "failed")["detail"] == "motion_failed"


def test_direct_timeout_ignores_late_result_and_releases_server_busy() -> None:
    app = create_app(command_timeout=0.04)
    with (
        TestClient(app) as client,
        client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket,
    ):
        connect(socket)
        first = client.post(f"/v1/devices/{DEVICE_ID}/actions/greet").json()["command_id"]
        assert socket.receive_json()["command_id"] == first
        assert wait_for_view(client, first, "failed")["detail"] == "result_timeout"
        socket.send_json({
            "type": "robot.command_result", "command_id": first, "status": "completed",
        })
        assert client.get(f"/v1/commands/{first}").json()["detail"] == "result_timeout"
        second = client.post(f"/v1/devices/{DEVICE_ID}/actions/greet")
        assert second.status_code == 202
        assert socket.receive_json()["command_id"] == second.json()["command_id"]
        socket.send_json({
            "type": "robot.command_result", "command_id": second.json()["command_id"],
            "status": "failed", "detail": "bridge_busy",
        })
        assert wait_for_view(client, second.json()["command_id"], "failed")["detail"] == "bridge_busy"


def test_direct_and_event_requests_share_busy_slot() -> None:
    app = create_app()
    with (
        TestClient(app) as client,
        client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket,
    ):
        connect(socket)
        command_id = client.post(f"/v1/devices/{DEVICE_ID}/actions/greet").json()["command_id"]
        assert socket.receive_json()["command_id"] == command_id
        event_id = str(uuid4())
        socket.send_json(event(event_id))
        assert socket.receive_json() == {
            "type": "robot.event_ack", "event_id": event_id,
            "disposition": "busy", "command_id": command_id,
        }
        assert event_id not in app.state.e004.event_commands
        socket.send_json({
            "type": "robot.command_result", "command_id": command_id, "status": "completed",
        })
        wait_for_view(client, command_id, "completed")
        socket.send_json(event(event_id))
        assert socket.receive_json()["event_id"] == event_id
        assert socket.receive_json()["disposition"] == "accepted"


def test_direct_b_interruption_is_terminal_failed() -> None:
    app = create_app()
    with (
        TestClient(app) as client,
        client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket,
    ):
        connect(socket)
        command_id = client.post(f"/v1/devices/{DEVICE_ID}/actions/greet").json()["command_id"]
        assert socket.receive_json()["command_id"] == command_id
        socket.send_json({
            "type": "robot.command_result", "command_id": command_id,
            "status": "cancelled",
        })
        view = wait_for_view(client, command_id, "failed")
        assert (view["detail"], view["event_id"]) == ("local_interrupted", None)


def test_direct_disconnect_terminates_command_and_allows_reconnect() -> None:
    app = create_app()
    with TestClient(app) as client:
        with client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket:
            connect(socket)
            command_id = client.post(f"/v1/devices/{DEVICE_ID}/actions/greet").json()["command_id"]
            assert socket.receive_json()["command_id"] == command_id
        assert wait_for_view(client, command_id, "failed")["detail"] == "device_disconnected"
        with client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket:
            connect(socket)
            second = client.post(f"/v1/devices/{DEVICE_ID}/actions/greet")
            assert second.status_code == 202
            assert socket.receive_json()["command_id"] == second.json()["command_id"]


def test_stalled_direct_command_send_is_delivery_failure(monkeypatch) -> None:
    app = create_app(command_timeout=0.03)
    original_send = WebSocket.send_json

    async def stall_command(self: WebSocket, data: Any, mode: str = "text") -> None:
        if isinstance(data, dict) and data.get("type") == "robot.command":
            await asyncio.sleep(0.1)
        else:
            await original_send(self, data, mode=mode)

    with TestClient(app) as client, monkeypatch.context() as patch:
        patch.setattr(WebSocket, "send_json", stall_command)
        with client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket:
            connect(socket)
            response = client.post(f"/v1/devices/{DEVICE_ID}/actions/greet")
            assert response.status_code == 202
            command_id = response.json()["command_id"]
            assert response.json()["detail"] == "delivery_failed"
            assert wait_for_view(client, command_id, "failed")["detail"] == "delivery_failed"
            assert not app.state.e004.sessions


def test_stalled_ready_send_never_publishes_session(monkeypatch) -> None:
    app = create_app(send_timeout=0.01)
    original_send = WebSocket.send_json
    ready_started = Event()

    async def stall_ready(self: WebSocket, data: Any, mode: str = "text") -> None:
        if isinstance(data, dict) and data.get("type") == "robot.ready":
            ready_started.set()
            await asyncio.sleep(0.1)
        else:
            await original_send(self, data, mode=mode)

    with TestClient(app) as client, monkeypatch.context() as patch:
        patch.setattr(WebSocket, "send_json", stall_ready)
        with client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket:
            socket.send_json({
                "type": "robot.hello", "device_id": DEVICE_ID, "version": 1,
            })
            assert ready_started.wait(timeout=1)
            time.sleep(0.03)
            assert not app.state.e004.sessions
            assert client.post(f"/v1/devices/{DEVICE_ID}/actions/greet").status_code == 409
            assert not app.state.e004.commands
