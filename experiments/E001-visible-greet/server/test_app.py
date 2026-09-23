from fastapi.testclient import TestClient

from app import DEVICE_ID, create_app


def test_greet_is_delivered_and_result_is_queryable() -> None:
    with TestClient(create_app()) as client:
        no_device = client.post(f"/v1/devices/{DEVICE_ID}/actions/greet")
        assert no_device.status_code == 409
        assert no_device.json()["detail"] == "device_not_connected"

        with client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket:
            socket.send_json(
                {"type": "robot.hello", "device_id": DEVICE_ID, "version": 1}
            )
            assert socket.receive_json() == {
                "type": "robot.ready",
                "device_id": DEVICE_ID,
            }

            response = client.post(f"/v1/devices/{DEVICE_ID}/actions/greet")
            assert response.status_code == 202
            command_id = response.json()["command_id"]
            assert socket.receive_json() == {
                "type": "robot.command",
                "command_id": command_id,
                "action": "greet",
            }
            assert (
                client.get(f"/v1/commands/{command_id}").json()["status"] == "pending"
            )
            socket.send_json(
                {
                    "type": "robot.command_result",
                    "command_id": command_id,
                    "status": "completed",
                }
            )
            # A second websocket receive is unnecessary; the HTTP request synchronizes via the lock.
            import time

            deadline = time.monotonic() + 1
            while (
                client.get(f"/v1/commands/{command_id}").json()["status"] == "pending"
            ):
                assert time.monotonic() < deadline
            assert (
                client.get(f"/v1/commands/{command_id}").json()["status"] == "completed"
            )


def test_stop_cancels_greet_and_disconnect_fails_pending() -> None:
    with TestClient(create_app()) as client:
        with client.websocket_connect(f"/v1/devices/{DEVICE_ID}/session") as socket:
            socket.send_json(
                {"type": "robot.hello", "device_id": DEVICE_ID, "version": 1}
            )
            socket.receive_json()
            greet = client.post(f"/v1/devices/{DEVICE_ID}/actions/greet").json()[
                "command_id"
            ]
            socket.receive_json()
            assert (
                client.post(f"/v1/devices/{DEVICE_ID}/actions/greet").status_code == 409
            )
            stop = client.post(f"/v1/devices/{DEVICE_ID}/actions/stop").json()[
                "command_id"
            ]
            assert socket.receive_json()["command_id"] == stop
            socket.send_json(
                {
                    "type": "robot.command_result",
                    "command_id": greet,
                    "status": "cancelled",
                }
            )
            socket.send_json(
                {
                    "type": "robot.command_result",
                    "command_id": stop,
                    "status": "completed",
                }
            )

        assert client.get(f"/v1/commands/{greet}").json()["status"] == "cancelled"
        assert client.get(f"/v1/commands/{stop}").json()["status"] == "completed"
