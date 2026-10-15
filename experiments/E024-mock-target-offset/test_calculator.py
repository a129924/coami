"""Behavior tests for one-frame observations; no camera, files or Robot I/O."""

import math
import unittest
from dataclasses import FrozenInstanceError, replace
from typing import cast

from calculator import (
    MAX_PIXEL,
    Box,
    DetectionObservation,
    NoTarget,
    Rejected,
    RejectionReason,
    Target,
    TargetOffset,
    calculate_offset,
)
from mock_cases import COMMON_CASES


class CalculatorTests(unittest.TestCase):
    def assert_rejected(
        self, observation: DetectionObservation, reason: RejectionReason
    ) -> None:
        self.assertEqual(
            calculate_offset(observation), Rejected(observation.observation_id, reason)
        )

    def test_common_vectors_and_all_result_identities(self) -> None:
        for case in COMMON_CASES:
            with self.subTest(case=case.name):
                actual = calculate_offset(case.observation)
                self.assertEqual(actual.observation_id, case.observation.observation_id)
                if isinstance(case.expected, Target):
                    self.assertIsInstance(actual, Target)
                    assert isinstance(actual, Target)
                    for observed, expected in (
                        (actual.offset.horizontal, case.expected.offset.horizontal),
                        (actual.offset.vertical, case.expected.offset.vertical),
                    ):
                        self.assertTrue(
                            math.isclose(observed, expected, rel_tol=0, abs_tol=1e-12)
                        )
                        self.assertGreaterEqual(observed, -1)
                        self.assertLessEqual(observed, 1)
                else:
                    self.assertEqual(actual, case.expected)

    def test_no_target_is_distinct_from_center_and_has_no_offset(self) -> None:
        empty = calculate_offset(DetectionObservation("empty", 640, 480, ()))
        centered = calculate_offset(
            DetectionObservation("centered", 640, 480, (Box(0, 0, 640, 480),))
        )
        self.assertEqual(empty, NoTarget("empty"))
        self.assertIsInstance(centered, Target)
        self.assertFalse(hasattr(empty, "offset"))
        self.assertFalse(hasattr(empty, "reason"))

    def test_multiple_targets_rejected_without_selection(self) -> None:
        for count in (2, 3):
            with self.subTest(count=count):
                self.assert_rejected(
                    DetectionObservation(
                        "many", 640, 480, (Box(0, 0, 40, 40),) * count
                    ),
                    "multiple_targets",
                )

    def test_invalid_frame_fields_rejected_before_count(self) -> None:
        invalid_values: tuple[object, ...] = (
            0,
            -1,
            640.0,
            0.5,
            True,
            False,
            float("nan"),
            float("inf"),
            -float("inf"),
            MAX_PIXEL + 1,
            10**1000,
            "640",
            None,
        )
        for field in ("frame_width", "frame_height"):
            for index, value in enumerate(invalid_values):
                for count in (0, 1, 2):
                    with self.subTest(field=field, value_index=index, count=count):
                        # Deliberately violate the static VO annotation to test numeric guards.
                        width = cast(int, value) if field == "frame_width" else 640
                        height = cast(int, value) if field == "frame_height" else 480
                        self.assert_rejected(
                            DetectionObservation(
                                "invalid-frame-id",
                                width,
                                height,
                                (Box(0, 0, 40, 40),) * count,
                            ),
                            "invalid_frame",
                        )

    def test_nonnumeric_nonfinite_bool_and_oversized_box_fields(self) -> None:
        invalid_values: tuple[object, ...] = (
            True,
            False,
            float("nan"),
            float("inf"),
            -float("inf"),
            MAX_PIXEL + 1,
            float(MAX_PIXEL + 1),
            10**1000,
            -(10**1000),
            "0",
            None,
        )
        for field in ("x", "y", "width", "height"):
            for index, value in enumerate(invalid_values):
                with self.subTest(field=field, value_index=index):
                    # Malformed-value fixture only: production VO stays fully typed.
                    malformed = cast(int | float, value)
                    original = Box(10, 10, 20, 20)
                    if field == "x":
                        box = replace(original, x=malformed)
                    elif field == "y":
                        box = replace(original, y=malformed)
                    elif field == "width":
                        box = replace(original, width=malformed)
                    else:
                        box = replace(original, height=malformed)
                    self.assert_rejected(
                        DetectionObservation("invalid-box-id", 640, 480, (box,)),
                        "invalid_box",
                    )

    def test_zero_negative_and_subpixel_overflow_box_sizes(self) -> None:
        for size in (0, 0.0, -1, -0.5):
            for box in (Box(0, 0, size, 20), Box(0, 0, 20, size)):
                with self.subTest(box=box):
                    self.assert_rejected(
                        DetectionObservation("size", 640, 480, (box,)), "invalid_box"
                    )

    def test_each_outside_edge_rejected_without_clipping(self) -> None:
        boxes = (
            Box(-0.5, 0, 80, 80),
            Box(0, -0.5, 80, 80),
            Box(560.5, 0, 80, 80),
            Box(0, 400.5, 80, 80),
            Box(0, 0, 641, 480),
            Box(0, 0, 640, 481),
        )
        for box in boxes:
            with self.subTest(box=box):
                self.assert_rejected(
                    DetectionObservation("outside", 640, 480, (box,)), "invalid_box"
                )

    def test_smallest_positive_frame_is_valid(self) -> None:
        self.assertEqual(
            calculate_offset(DetectionObservation("one", 1, 1, (Box(0, 0, 1, 1),))),
            Target("one", TargetOffset(0.0, 0.0)),
        )

    def test_same_snapshot_repeated_and_interleaved_is_unchanged(self) -> None:
        observation = DetectionObservation("repeat", 640, 480, (Box(400, 200, 80, 80),))
        expected = Target("repeat", TargetOffset(0.375, 0.0))
        before = observation
        for _ in range(5):
            self.assertEqual(calculate_offset(observation), expected)
            calculate_offset(
                DetectionObservation("other", 640, 480, (Box(120, 80, 80, 80),))
            )
        self.assertEqual(observation, before)
        self.assertEqual(observation.boxes, (Box(400, 200, 80, 80),))

    def test_observation_id_is_opaque_and_not_target_identity(self) -> None:
        for identity in ("", "same-id", "觀測/任意字串"):
            for box in (Box(400, 200, 80, 80), Box(120, 200, 80, 80)):
                with self.subTest(identity=identity, box=box):
                    result = calculate_offset(
                        DetectionObservation(identity, 640, 480, (box,))
                    )
                    self.assertEqual(result.observation_id, identity)

    def test_snapshot_and_result_value_objects_are_frozen(self) -> None:
        box = Box(400, 200, 80, 80)
        observation = DetectionObservation("immutable", 640, 480, (box,))
        offset = TargetOffset(0.375, 0.0)
        values = (
            (box, "x"),
            (observation, "frame_width"),
            (offset, "horizontal"),
            (Target("immutable", offset), "observation_id"),
            (NoTarget("immutable"), "observation_id"),
            (Rejected("immutable", "invalid_box"), "reason"),
        )
        for value, field in values:
            with (
                self.subTest(type=type(value).__name__),
                self.assertRaises(FrozenInstanceError),
            ):
                setattr(value, field, 123)
        self.assertIsInstance(observation.boxes, tuple)

    def test_exclusive_result_shapes(self) -> None:
        target = Target("id", TargetOffset(0.0, 0.0))
        rejected = Rejected("id", "invalid_box")
        self.assertFalse(hasattr(target, "reason"))
        self.assertFalse(hasattr(rejected, "offset"))
        self.assertEqual(rejected.reason, "invalid_box")


if __name__ == "__main__":
    unittest.main()
