"""E023 ideal pinhole model and per-connection, single-flight control policy."""

import math
import re
from dataclasses import dataclass
from typing import cast


class ObservationError(ValueError):
    pass


def number(value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ObservationError("invalid_number")
    try:
        result = float(value)
    except OverflowError as exc:
        raise ObservationError("invalid_number") from exc
    if not math.isfinite(result):
        raise ObservationError("invalid_number")
    return result


def record(value: object) -> dict[str, object]:
    if not isinstance(value, dict) or not all(
        isinstance(k, str) for k in cast(dict[object, object], value)
    ):
        raise ObservationError("invalid_record")
    return cast(dict[str, object], value)


def vector(value: object, length: int) -> tuple[float, ...]:
    if not isinstance(value, list) or len(cast(list[object], value)) != length:
        raise ObservationError("invalid_vector")
    return tuple(number(v) for v in cast(list[object], value))


@dataclass(frozen=True)
class Observation:
    run_id: str
    seq: int
    offset: tuple[float, ...] | None
    rotation: tuple[tuple[float, ...], ...]


def parse_observation(value: object) -> Observation:
    data = record(value)
    run = data.get("run_id")
    seq = data.get("observation_seq")
    if not isinstance(run, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", run):
        raise ObservationError("invalid_run")
    if isinstance(seq, bool) or not isinstance(seq, int) or not 1 <= seq <= 2000:
        raise ObservationError("invalid_sequence")
    age = number(data.get("age_ms"))
    if not 0 <= age <= 1000:
        raise ObservationError("expired_observation")
    offset = None if data.get("offset") is None else vector(data["offset"], 2)
    if offset is not None and any(abs(v) > 1 for v in offset):
        raise ObservationError("outside_view")
    raw = data.get("rotation")
    if not isinstance(raw, list) or len(cast(list[object], raw)) != 3:
        raise ObservationError("invalid_rotation")
    rows = tuple(vector(row, 3) for row in cast(list[object], raw))
    for i in range(3):
        for j in range(3):
            if abs(sum(a * b for a, b in zip(rows[i], rows[j])) - int(i == j)) > 1e-6:
                raise ObservationError("invalid_rotation")
    a, b, c = rows
    determinant = (
        a[0] * (b[1] * c[2] - b[2] * c[1])
        - a[1] * (b[0] * c[2] - b[2] * c[0])
        + a[2] * (b[0] * c[1] - b[1] * c[0])
    )
    if abs(determinant - 1) > 1e-6:
        raise ObservationError("invalid_rotation")
    return Observation(run, seq, offset, rows)


def calculate(observation: Observation) -> list[float] | None:
    if observation.offset is None or all(abs(v) <= 0.1 for v in observation.offset):
        return None
    u, v = observation.offset
    scale = math.sqrt(1 + u * u + v * v)
    ray = (1 / scale, -u / scale, -v / scale)
    return [sum(a * b for a, b in zip(row, ray)) for row in observation.rotation]


class Session:
    def __init__(self, run_id: str):
        self.run_id = run_id
        self.last_seq = 0
        self.pending: str | None = None
        self.controls = 0

    def receive(self, value: object) -> dict[str, object]:
        try:
            observation = parse_observation(value)
        except ObservationError as exc:
            return {"kind": "rejected", "reason": str(exc)}
        if observation.run_id != self.run_id:
            return {"kind": "rejected", "reason": "wrong_run"}
        if self.pending is not None:
            return {"kind": "rejected", "reason": "pending"}
        if observation.seq <= self.last_seq:
            return {"kind": "rejected", "reason": "duplicate_or_out_of_order"}
        self.last_seq = observation.seq
        target = calculate(observation)
        base: dict[str, object] = {
            "run_id": self.run_id,
            "observation_seq": observation.seq,
        }
        if target is None:
            return {
                **base,
                "kind": "lost" if observation.offset is None else "centered",
            }
        if self.controls >= 20:
            return {**base, "kind": "rejected", "reason": "iteration_limit"}
        self.controls += 1
        self.pending = f"{self.run_id}:{observation.seq}"
        return {
            **base,
            "kind": "command",
            "command_id": self.pending,
            "target": target,
            "valid_for_ms": 1000,
        }

    def finish(self, command_id: object) -> bool:
        if self.pending is None or command_id != self.pending:
            return False
        self.pending = None
        return True
