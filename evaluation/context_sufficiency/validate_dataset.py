"""Validate the local v0 fixtures; never infer labels or change files."""

from __future__ import annotations

import argparse
from collections import Counter
import json
from pathlib import Path
import re
import sys


DEFAULT_DATASET = Path(__file__).parent / "dataset" / "context_sufficiency_v0.jsonl"
LABELS = ("SUFFICIENT", "INSUFFICIENT")
CONTEXT_TYPES = ("clear", "ambiguous", "irrelevant")
SPEAKERS = ("parent", "child", "robot")
ACTIONS = {"SUFFICIENT": "DELIVER_ANSWER", "INSUFFICIENT": "DELIVER_QUESTION"}
UTTERANCES = {
    "toy_car": "寶寶 車車",
    "water": "水水",
    "ball": "球球",
    "hug": "抱抱",
    "food": "還要",
    "sleep": "不要",
    "parent": "媽媽",
    "book": "書書",
    "outside": "外面",
}
LAYOUT = {
    "toy_car": CONTEXT_TYPES,
    "water": CONTEXT_TYPES,
    "ball": CONTEXT_TYPES,
    "hug": ("clear",),
    "food": ("clear",),
    "sleep": ("ambiguous",),
    "parent": ("ambiguous",),
    "book": ("irrelevant",),
    "outside": ("irrelevant",),
}
TRIPLET_TOPICS = ("toy_car", "water", "ball")
STRING_FIELDS = (
    "id",
    "topic",
    "context_type",
    "background",
    "utterance",
    "expected",
    "candidate_text",
    "expected_input_policy",
    "expected_output_policy",
    "expected_action",
    "rationale",
)
REQUIRED_FIELDS = (*STRING_FIELDS, "conversation", "interpretation")


def validate_case(case: dict[str, object], line: int) -> list[str]:
    """Check structure and v0 values, without judging natural language."""
    location = f"line {line} (id={case.get('id')!r})"
    issues: list[str] = []

    def error(message: str) -> None:
        issues.append(f"{location}: {message}")

    for field in REQUIRED_FIELDS:
        if field not in case:
            error(f"missing field: {field}")
    for field in STRING_FIELDS:
        if field in case:
            value = case[field]
            if not isinstance(value, str) or not value.strip():
                error(f"{field} must be a non-empty string")

    enums = {
        "topic": tuple(LAYOUT),
        "context_type": CONTEXT_TYPES,
        "expected": LABELS,
        "expected_input_policy": ("COMPANION",),
        "expected_output_policy": ("ALLOW",),
        "expected_action": tuple(ACTIONS.values()),
    }
    for field, choices in enums.items():
        if field in case:
            value = case[field]
            if not isinstance(value, str) or value not in choices:
                error(f"{field} must be one of {choices}")

    identifier, topic, context_type = (
        case.get("id"),
        case.get("topic"),
        case.get("context_type"),
    )
    if all(isinstance(value, str) for value in (identifier, topic, context_type)):
        pattern = rf"{re.escape(str(topic))}_{re.escape(str(context_type))}_[0-9]{{3}}"
        if re.fullmatch(pattern, str(identifier)) is None:
            error("id must match {topic}_{context_type}_{NNN}")
    if isinstance(topic, str) and topic in UTTERANCES:
        if case.get("utterance") != UTTERANCES[topic]:
            error(f"utterance for {topic} must be {UTTERANCES[topic]!r}")

    conversation = case.get("conversation")
    if "conversation" in case:
        if not isinstance(conversation, list):
            error("conversation must be a list")
        else:
            if not 2 <= len(conversation) <= 5:
                error("conversation must have 2–5 turns")
            for index, turn in enumerate(conversation, start=1):
                if not isinstance(turn, dict):
                    error(f"conversation turn {index} must be an object")
                    continue
                speaker, text = turn.get("speaker"), turn.get("text")
                if not isinstance(speaker, str) or speaker not in SPEAKERS:
                    error(f"conversation turn {index}: invalid speaker")
                if not isinstance(text, str) or not text.strip():
                    error(f"conversation turn {index}: text must be a non-empty string")

    label = case.get("expected")
    if isinstance(label, str) and label in ACTIONS:
        if "expected_action" in case and case["expected_action"] != ACTIONS[label]:
            error(f"expected_action for {label} must be {ACTIONS[label]}")
        if "interpretation" in case:
            interpretation = case["interpretation"]
            if label == "SUFFICIENT":
                if not isinstance(interpretation, str) or not interpretation.strip():
                    error("SUFFICIENT requires a non-empty interpretation")
            elif interpretation is not None:
                error("INSUFFICIENT requires interpretation = null")
    return issues


def counts(cases: list[dict[str, object]], field: str) -> Counter[str]:
    return Counter(value for case in cases if isinstance(value := case.get(field), str))


def validate_collection(cases: list[dict[str, object]]) -> list[str]:
    issues: list[str] = []
    if len(cases) != 15:
        issues.append(f"dataset: expected 15 cases, got {len(cases)}")
    for identifier, count in counts(cases, "id").items():
        if count > 1:
            issues.append(f"dataset: duplicate id {identifier!r} ({count} occurrences)")
    for field, required_counts in (
        ("expected", {"SUFFICIENT": 5, "INSUFFICIENT": 10}),
        ("context_type", dict.fromkeys(CONTEXT_TYPES, 5)),
    ):
        actual = counts(cases, field)
        for value, required in required_counts.items():
            if actual[value] != required:
                issues.append(
                    f"dataset: {value} count must be {required}, got {actual[value]}"
                )

    pairs = Counter(
        (case["topic"], case["context_type"])
        for case in cases
        if isinstance(case.get("topic"), str)
        and isinstance(case.get("context_type"), str)
    )
    required_pairs = {
        (topic, kind) for topic, kinds in LAYOUT.items() for kind in kinds
    }
    for topic, kind in sorted(required_pairs):
        if pairs[(topic, kind)] != 1:
            issues.append(f"dataset: requires exactly one {topic}/{kind} case")
    for topic, kind in sorted(pairs.keys() - required_pairs):
        issues.append(f"dataset: unexpected topic/context_type pair {topic}/{kind}")

    for topic in TRIPLET_TOPICS:
        group = [case for case in cases if case.get("topic") == topic]
        if set(counts(group, "expected")) != set(LABELS):
            issues.append(f"dataset: {topic} triplet must contain both expected labels")
    return issues


def reject_constant(value: str) -> None:
    raise ValueError(f"{value} is not a JSON value")


def load_dataset(path: Path) -> tuple[list[dict[str, object]], list[str]]:
    cases: list[dict[str, object]] = []
    issues: list[str] = []
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeError) as error:
        return cases, [f"{path}: cannot read UTF-8 dataset: {error}"]
    for line_number, line in enumerate(lines, start=1):
        try:
            case = json.loads(line, parse_constant=reject_constant)
        except ValueError as error:
            issues.append(f"line {line_number}: invalid JSON: {error}")
            continue
        if not isinstance(case, dict):
            issues.append(f"line {line_number}: each case must be a JSON object")
            continue
        cases.append(case)
        issues.extend(validate_case(case, line_number))
    return cases, issues


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", nargs="?", type=Path, default=DEFAULT_DATASET)
    args = parser.parse_args(argv)
    cases, issues = load_dataset(args.dataset)
    issues.extend(validate_collection(cases))
    if issues:
        for issue in issues:
            print(issue, file=sys.stderr)
        return 1

    print("validation: PASS (structure and fixture constraints only)")
    print(f"total cases: {len(cases)}")
    for field in ("expected", "context_type", "expected_action"):
        for value, count in sorted(counts(cases, field).items()):
            print(f"{value}: {count}")
    print(f"topics: {len(counts(cases, 'topic'))}")
    print(f"contrastive utterance groups: {len(TRIPLET_TOPICS)}")
    for topic in TRIPLET_TOPICS:
        print(f"  {UTTERANCES[topic]!r}: clear / ambiguous / irrelevant, both labels")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
