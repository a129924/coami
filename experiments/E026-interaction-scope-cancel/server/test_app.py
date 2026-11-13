import pytest
from fastapi.testclient import TestClient

from app import create_app


def until(socket, kind):
    for _ in range(30):
        row = socket.receive_json()
        if row["kind"] == kind:
            return row
    raise AssertionError(f"Missing {kind}")


@pytest.mark.parametrize("repeat", range(3))
def test_cancel_correlates_and_new_scope_rejects_old_token(repeat):
    with TestClient(create_app()) as client, client.websocket_connect("/ws/A") as a, client.websocket_connect("/ws/B") as b:
        token = {"runEpoch": f"run-{repeat}", "robotId": "A", "scopeId": "old"}
        a.send_json({"kind": "open", "token": token}); assert until(a, "opened")["token"] == token
        a.send_json({"kind": "work", "token": token, "id": "running"}); until(a, "accepted")
        a.send_json({"kind": "work", "token": token, "id": "queued"}); until(a, "accepted")
        op = {**token, "cancelId": "cancel"}
        a.send_json({"kind": "cancel", "operation": op})
        a.send_json({"kind": "cancel", "operation": op})
        a.send_json({"kind": "ping"}); b.send_json({"kind": "ping"})
        ack = until(a, "server-cleaned"); assert ack["operation"] == op and ack["okay"]
        assert until(b, "pong")["kind"] == "pong"
        new = {**token, "scopeId": "new"}
        a.send_json({"kind": "open", "token": new}); until(a, "opened")
        a.send_json({"kind": "work", "token": token, "id": "stale"})
        assert until(a, "rejected")["detail"] == "stale-scope"
        a.send_json({"kind": "work", "token": new, "id": "fresh", "mode": "quick"})
        assert until(a, "result")["token"] == new


@pytest.mark.parametrize("mode", ["cleanup_error", "cleanup_timeout"])
@pytest.mark.parametrize("repeat", range(3))
def test_failed_cleanup_never_opens_new_scope(mode, repeat):
    with TestClient(create_app()) as client, client.websocket_connect("/ws/A") as a:
        token = {"runEpoch": "run", "robotId": "A", "scopeId": "old"}
        a.send_json({"kind": "open", "token": token}); until(a, "opened")
        a.send_json({"kind": "work", "token": token, "id": "bad", "mode": mode}); until(a, "accepted")
        # A fixture gate confirms the managed primary task started before cancellation.
        for _ in range(200):
            rows = client.get("/fixture/records").json()
            if any(r["action"] == "started" and r["work"] == "bad" for r in rows):
                break
        else:
            raise AssertionError("Work did not start")
        a.send_json({"kind": "cancel", "operation": {**token, "cancelId": "cancel"}})
        assert until(a, "server-cleaned")["okay"] is False
        a.send_json({"kind": "open", "token": {**token, "scopeId": "new"}})
        assert until(a, "rejected")["detail"] == "scope-not-openable"


def test_open_without_work_still_requires_cancel_before_replacement():
    with TestClient(create_app()) as client, client.websocket_connect("/ws/A") as a:
        old = {"runEpoch": "run", "robotId": "A", "scopeId": "old"}
        fresh = {**old, "scopeId": "fresh"}
        a.send_json({"kind": "open", "token": old}); until(a, "opened")
        a.send_json({"kind": "open", "token": fresh})
        assert a.receive_json()["kind"] == "rejected"
        a.send_json({"kind": "cancel", "operation": {**old, "cancelId": "cancel"}})
        assert until(a, "server-cleaned")["okay"] is True
        a.send_json({"kind": "open", "token": fresh}); assert until(a, "opened")["token"] == fresh


@pytest.mark.parametrize("repeat", range(3))
@pytest.mark.parametrize("invalid_id", [None, ""])
def test_malformed_work_id_is_rejected_without_closing_or_cancelling_session(invalid_id, repeat):
    with TestClient(create_app()) as client, client.websocket_connect("/ws/A") as a, client.websocket_connect("/ws/B") as b:
        token = {"runEpoch": f"run-{repeat}", "robotId": "A", "scopeId": "old"}
        a.send_json({"kind": "open", "token": token}); until(a, "opened")
        a.send_json({"kind": "work", "token": token, "id": "running"}); until(a, "accepted")
        invalid = {"kind": "work", "token": token}
        if invalid_id is not None:
            invalid["id"] = invalid_id
        a.send_json(invalid)
        assert until(a, "rejected")["detail"] == "invalid-envelope"
        a.send_json({"kind": "ping"}); assert until(a, "pong")["kind"] == "pong"
        b.send_json({"kind": "ping"}); assert until(b, "pong")["kind"] == "pong"
        rows = client.get("/fixture/records").json()
        assert not any(r["action"] == "cancel_started" and r["robot"] == "A" for r in rows)
        a.send_json({"kind": "work", "token": token, "id": "valid-after-invalid"})
        assert until(a, "accepted")["id"] == "valid-after-invalid"
        a.send_json({"kind": "cancel", "operation": {**token, "cancelId": "cancel"}})
        assert until(a, "server-cleaned")["okay"] is True
        fresh = {**token, "scopeId": "new"}
        a.send_json({"kind": "open", "token": fresh}); until(a, "opened")
        a.send_json({"kind": "work", "token": fresh, "id": "fresh", "mode": "quick"})
        assert until(a, "result")["token"] == fresh
