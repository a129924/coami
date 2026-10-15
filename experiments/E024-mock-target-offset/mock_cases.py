"""Independent Mock snapshots and hand-specified expected results; no formula reuse."""

from dataclasses import dataclass

from calculator import (
    MAX_PIXEL,
    Box,
    DetectionObservation,
    NoTarget,
    OffsetResult,
    Rejected,
    Target,
    TargetOffset,
)


@dataclass(frozen=True)
class MockCase:
    name: str
    observation: DetectionObservation
    expected: OffsetResult


def _target_case(
    name: str,
    box: Box,
    horizontal: float,
    vertical: float,
    frame_width: int = 640,
    frame_height: int = 480,
) -> MockCase:
    return MockCase(
        name,
        DetectionObservation(name, frame_width, frame_height, (box,)),
        Target(name, TargetOffset(horizontal, vertical)),
    )


COMMON_CASES: tuple[MockCase, ...] = (
    _target_case("center", Box(280, 200, 80, 80), 0.0, 0.0),
    _target_case("left", Box(120, 200, 80, 80), -0.5, 0.0),
    _target_case("right", Box(440, 200, 80, 80), 0.5, 0.0),
    _target_case("up", Box(280, 80, 80, 80), 0.0, -0.5),
    _target_case("down", Box(280, 320, 80, 80), 0.0, 0.5),
    _target_case("upper-right", Box(440, 80, 80, 80), 0.5, -0.5),
    _target_case("draft-example", Box(400, 200, 80, 80), 0.375, 0.0),
    _target_case("same-center-smaller", Box(420, 220, 40, 40), 0.375, 0.0),
    _target_case("fractional-box", Box(400.5, 200, 79, 80), 0.375, 0.0),
    _target_case("top-left-edge", Box(0, 0, 80, 80), -0.875, -5 / 6),
    _target_case("bottom-right-edge", Box(560, 400, 80, 80), 0.875, 5 / 6),
    _target_case("full-frame", Box(0, 0, 640, 480), 0.0, 0.0),
    _target_case("double-resolution", Box(800, 400, 160, 160), 0.375, 0.0, 1280, 960),
    _target_case(
        "max-int", Box(0, 0, MAX_PIXEL, MAX_PIXEL), 0.0, 0.0, MAX_PIXEL, MAX_PIXEL
    ),
    _target_case(
        "max-float",
        Box(0.0, 0.0, float(MAX_PIXEL), float(MAX_PIXEL)),
        0.0,
        0.0,
        MAX_PIXEL,
        MAX_PIXEL,
    ),
    MockCase(
        "no-target",
        DetectionObservation("no-target", 640, 480, ()),
        NoTarget("no-target"),
    ),
    MockCase(
        "multiple-targets",
        DetectionObservation(
            "multiple-targets", 640, 480, (Box(0, 0, 40, 40), Box(80, 80, 40, 40))
        ),
        Rejected("multiple-targets", "multiple_targets"),
    ),
    MockCase(
        "invalid-frame",
        DetectionObservation("invalid-frame", 0, 480, ()),
        Rejected("invalid-frame", "invalid_frame"),
    ),
    MockCase(
        "out-of-bounds",
        DetectionObservation("out-of-bounds", 640, 480, (Box(600, 200, 80, 80),)),
        Rejected("out-of-bounds", "invalid_box"),
    ),
)
