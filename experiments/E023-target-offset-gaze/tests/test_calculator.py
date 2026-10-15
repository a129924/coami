import math
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))
from calculator import ObservationError, Session, calculate, parse_observation

IDENTITY = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]


def observation(offset=(0.8, 0), seq=1, **changes):
    return {
        "run_id": "test",
        "observation_seq": seq,
        "offset": list(offset) if offset is not None else None,
        "rotation": IDENTITY,
        "age_ms": 0,
        **changes,
    }


@pytest.mark.parametrize(
    "u,v",
    [
        (0.8, 0),
        (-0.8, 0),
        (0, 0.8),
        (0, -0.8),
        (0.8, -0.8),
        (0.8, 0.8),
        (-0.8, 0.8),
        (-0.8, -0.8),
        (0.11, 0),
    ],
)
def test_calculate_independent_geometry(u, v):
    target = calculate(parse_observation(observation((u, v))))
    assert target is not None
    assert target == pytest.approx(
        [
            1 / math.sqrt(1 + u * u + v * v),
            -u / math.sqrt(1 + u * u + v * v),
            -v / math.sqrt(1 + u * u + v * v),
        ]
    )


def test_rotation_changes_base_coordinates():
    target = calculate(
        parse_observation(observation(rotation=[[0, -1, 0], [1, 0, 0], [0, 0, 1]]))
    )
    assert target == pytest.approx([0.8 / math.sqrt(1.64), 1 / math.sqrt(1.64), 0])


@pytest.mark.parametrize("offset", [None, (0, 0), (0.1, -0.1)])
def test_no_correction(offset):
    assert calculate(parse_observation(observation(offset))) is None


@pytest.mark.parametrize(
    "changes",
    [
        {"offset": [float("nan"), 0]},
        {"offset": [float("inf"), 0]},
        {"offset": [1.1, 0]},
        {"rotation": [[1, 0, 0], [0, 2, 0], [0, 0, 1]]},
        {"rotation": [[1, 0, 0], [0, 1, 0], [0, 0, -1]]},
        {"rotation": [[1, 0, 0], [0.1, 1, 0], [0, 0, 1]]},
        {"observation_seq": True},
        {"age_ms": 1001},
        {"run_id": ""},
        {"offset": [True, 0]},
    ],
)
def test_invalid(changes):
    with pytest.raises(ObservationError):
        parse_observation(observation(**changes))


def test_session_pending_duplicate_and_wrong_run():
    session = Session("test")
    first = session.receive(observation())
    assert first["kind"] == "command"
    assert session.receive(observation(seq=2))["reason"] == "pending"
    assert not session.finish("wrong")
    assert session.finish(first["command_id"])
    assert session.receive(observation())["reason"] == "duplicate_or_out_of_order"
    assert session.receive(observation(seq=2, run_id="other"))["reason"] == "wrong_run"
    assert session.receive(observation(seq=2))["kind"] == "command"


def test_session_center_and_budget():
    session = Session("test")
    assert session.receive(observation((0, 0)))["kind"] == "centered"
    for seq in range(2, 22):
        command = session.receive(observation(seq=seq))
        assert command["kind"] == "command"
        assert session.finish(command["command_id"])
    assert session.receive(observation(seq=22))["reason"] == "iteration_limit"
