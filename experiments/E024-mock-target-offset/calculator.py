"""Pure transformation of one current frame snapshot into a center offset.

No images, detector/tracker state, motor direction, pose or control-loop policy
belongs here. The caller supplies self-owned VO and keeps observation correlation.
"""

from dataclasses import dataclass
from typing import Literal, TypeAlias

MAX_PIXEL = 2**31 - 1
RejectionReason: TypeAlias = Literal["invalid_frame", "multiple_targets", "invalid_box"]


@dataclass(frozen=True)
class Box:
    x: int | float
    y: int | float
    width: int | float
    height: int | float


@dataclass(frozen=True)
class DetectionObservation:
    """One frame's snapshot; observation_id is not cross-frame target identity."""

    observation_id: str
    frame_width: int
    frame_height: int
    boxes: tuple[Box, ...]


@dataclass(frozen=True)
class TargetOffset:
    """Current center relative to frame center: left/up negative, right/down positive."""

    horizontal: float
    vertical: float


@dataclass(frozen=True)
class Target:
    observation_id: str
    offset: TargetOffset


@dataclass(frozen=True)
class NoTarget:
    observation_id: str


@dataclass(frozen=True)
class Rejected:
    observation_id: str
    reason: RejectionReason


OffsetResult: TypeAlias = Target | NoTarget | Rejected


def _valid_frame_dimension(value: int) -> bool:
    return type(value) is int and 1 <= value <= MAX_PIXEL


def _valid_pixel_value(value: float) -> bool:
    # Bound original values first: float()/isfinite() on huge ints can overflow.
    # Chained comparisons also reject NaN and either infinity without conversion.
    return type(value) in (int, float) and -MAX_PIXEL <= value <= MAX_PIXEL


def _valid_box(box: Box, frame_width: int, frame_height: int) -> bool:
    if not all(
        _valid_pixel_value(value) for value in (box.x, box.y, box.width, box.height)
    ):
        return False
    return (
        box.width > 0
        and box.height > 0
        and box.x >= 0
        and box.y >= 0
        and box.x + box.width <= frame_width
        and box.y + box.height <= frame_height
    )


def calculate_offset(observation: DetectionObservation) -> OffsetResult:
    """Classify and normalize one snapshot, without mutation, history or I/O.

    Numeric validation is performed here rather than in VO constructors. Arbitrary
    malformed Python objects and JSON parsing are outside this typed boundary.
    """
    identity = observation.observation_id
    width, height = observation.frame_width, observation.frame_height
    if not (_valid_frame_dimension(width) and _valid_frame_dimension(height)):
        return Rejected(identity, "invalid_frame")
    count = len(observation.boxes)
    if count == 0:
        return NoTarget(identity)
    if count > 1:
        return Rejected(identity, "multiple_targets")
    box = observation.boxes[0]
    if not _valid_box(box, width, height):
        return Rejected(identity, "invalid_box")
    center_x = box.x + box.width / 2
    center_y = box.y + box.height / 2
    return Target(
        identity,
        TargetOffset(
            horizontal=(center_x - width / 2) / (width / 2),
            vertical=(center_y - height / 2) / (height / 2),
        ),
    )
