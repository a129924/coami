"""Validate v1 structure and coverage; never infer labels or write files."""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
import re
import sys


DEFAULT_DATASET = Path(__file__).resolve().with_name("context_sufficiency_v1.jsonl")
CASE_COUNT = 60
TOPICS = (
    "toy_car",
    "water",
    "ball",
    "hug",
    "food",
    "sleep",
    "parent",
    "book",
    "outside",
    "clothing",
    "drawing",
    "blocks",
)
CATEGORY_MATRIX = {
    "explicit_reference": {"research": 7, "holdout": 3},
    "multiple_meanings": {"research": 7, "holdout": 3},
    "irrelevant_background": {"research": 7, "holdout": 3},
    "keyword_misdirection": {"research": 7, "holdout": 3},
    "meaning_without_keyword": {"research": 6, "holdout": 4},
    "conflicting_context": {"research": 6, "holdout": 4},
}
ACTIONS = {"SUFFICIENT": "DELIVER_ANSWER", "INSUFFICIENT": "DELIVER_QUESTION"}
ENUMS = {
    "topic": TOPICS,
    "context_type": ("clear", "ambiguous", "irrelevant"),
    "coverage_category": tuple(CATEGORY_MATRIX),
    "split": ("research", "holdout"),
    "expected": tuple(ACTIONS),
    "expected_input_policy": ("COMPANION",),
    "expected_output_policy": ("ALLOW",),
    "expected_action": tuple(ACTIONS.values()),
}
STRING_FIELDS = (
    "id",
    "topic",
    "context_type",
    "coverage_category",
    "split",
    "group_id",
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
VISIBLE_FIELDS = ("background", "conversation", "utterance")


def validate_conversation(conversation: object) -> list[str]:
    if not isinstance(conversation, list):
        return ["conversation must be a list"]
    issues: list[str] = []
    if not 2 <= len(conversation) <= 5:
        issues.append("conversation must have 2–5 turns")
    for index, turn in enumerate(conversation, start=1):
        if not isinstance(turn, dict):
            issues.append(f"conversation turn {index} must be an object")
            continue
        unexpected = turn.keys() - {"speaker", "text"}
        if unexpected:
            issues.append(
                f"conversation turn {index}: unexpected fields {sorted(unexpected)}; "
                "only speaker and text are model-visible"
            )
        speaker, text = turn.get("speaker"), turn.get("text")
        if not isinstance(speaker, str) or speaker not in ("parent", "child", "robot"):
            issues.append(f"conversation turn {index}: invalid speaker")
        if not isinstance(text, str) or not text.strip():
            issues.append(f"conversation turn {index}: text must be a non-empty string")
    return issues


def validate_case(case: dict[str, object], line: int) -> list[str]:
    issues = [
        f"missing field: {field}" for field in REQUIRED_FIELDS if field not in case
    ]
    unexpected = case.keys() - set(REQUIRED_FIELDS)
    if unexpected:
        issues.append(
            f"unexpected fields: {sorted(unexpected)}; only schema fields allowed"
        )
    for field in STRING_FIELDS:
        if field in case:
            value = case[field]
            if not isinstance(value, str) or not value.strip():
                issues.append(f"{field} must be a non-empty string")
    for field, choices in ENUMS.items():
        if field in case:
            value = case[field]
            if not isinstance(value, str) or value not in choices:
                issues.append(f"{field} must be one of {choices}")
    identifier = case.get("id")
    if (
        isinstance(identifier, str)
        and re.fullmatch(r"cs_v1_[0-9]{3}", identifier) is None
    ):
        issues.append("id must match cs_v1_NNN")
    if "conversation" in case:
        issues.extend(validate_conversation(case["conversation"]))
    label = case.get("expected")
    if isinstance(label, str) and label in ACTIONS:
        if "expected_action" in case and case["expected_action"] != ACTIONS[label]:
            issues.append(f"expected_action for {label} must be {ACTIONS[label]}")
        if "interpretation" in case:
            interpretation = case["interpretation"]
            if label == "SUFFICIENT":
                if not isinstance(interpretation, str) or not interpretation.strip():
                    issues.append("SUFFICIENT requires a non-empty interpretation")
            elif interpretation is not None:
                issues.append("INSUFFICIENT requires interpretation = null")
    location = f"line {line} (id={identifier!r})"
    return [f"{location}: {issue}" for issue in issues]


def counts(cases: list[dict[str, object]], field: str) -> Counter[str]:
    return Counter(value for case in cases if isinstance(value := case.get(field), str))


def visible_signature(case: dict[str, object]) -> str:
    return json.dumps([case.get(field) for field in VISIBLE_FIELDS], sort_keys=True)


def validate_uniqueness(cases: list[dict[str, object]]) -> list[str]:
    issues: list[str] = []
    for identifier, count in counts(cases, "id").items():
        if count > 1:
            issues.append(f"dataset: duplicate id {identifier!r} ({count} occurrences)")
    inputs: dict[str, object] = {}
    for case in cases:
        signature = visible_signature(case)
        if signature in inputs:
            issues.append(
                f"dataset: duplicate visible input {inputs[signature]!r} / {case.get('id')!r}"
            )
        else:
            inputs[signature] = case.get("id")
    return issues


def validate_coverage(cases: list[dict[str, object]]) -> list[str]:
    issues: list[str] = []
    if len(cases) != CASE_COUNT:
        issues.append(f"dataset: expected {CASE_COUNT} cases, got {len(cases)}")
    for topic in TOPICS:
        if counts(cases, "topic")[topic] == 0:
            issues.append(f"dataset: missing topic {topic}")
    for category, required in CATEGORY_MATRIX.items():
        members = [case for case in cases if case.get("coverage_category") == category]
        actual = counts(members, "split")
        for split, count in required.items():
            if actual[split] != count:
                issues.append(
                    f"dataset: {category}/{split} requires {count}, got {actual[split]}"
                )
        if len(counts(members, "topic")) < 2:
            issues.append(f"dataset: {category} requires at least two topics")
    return issues


def group_cases(cases: list[dict[str, object]]) -> dict[str, list[dict[str, object]]]:
    groups: dict[str, list[dict[str, object]]] = defaultdict(list)
    for case in cases:
        group = case.get("group_id")
        if isinstance(group, str):
            groups[group].append(case)
    return dict(groups)


def contrast_topics(cases: list[dict[str, object]]) -> dict[str, set[str]]:
    """Recognize structural contrasts; human review still judges their meaning."""
    result: dict[str, set[str]] = {"research": set(), "holdout": set()}
    for group in group_cases(cases).values():
        partitions: dict[tuple[str, str, str], list[dict[str, object]]] = defaultdict(
            list
        )
        for case in group:
            topic, utterance, split = (
                case.get("topic"),
                case.get("utterance"),
                case.get("split"),
            )
            if (
                isinstance(topic, str)
                and isinstance(utterance, str)
                and isinstance(split, str)
                and split in result
            ):
                partitions[(topic, utterance, str(split))].append(case)
        for (topic, _, split), members in partitions.items():
            contexts = {
                json.dumps(
                    [case.get("background"), case.get("conversation")], sort_keys=True
                )
                for case in members
            }
            if len(contexts) >= 2 and set(counts(members, "expected")) == set(ACTIONS):
                result[split].add(topic)
    return result


def validate_groups(cases: list[dict[str, object]]) -> list[str]:
    issues: list[str] = []
    for identifier, members in group_cases(cases).items():
        if len(counts(members, "split")) > 1:
            issues.append(f"dataset: group {identifier!r} crosses splits")
    contrasts = contrast_topics(cases)
    if len(contrasts["research"]) < 2:
        issues.append(
            "dataset: research requires contrast groups in at least two topics"
        )
    if len(contrasts["holdout"]) < 1:
        issues.append("dataset: holdout requires contrast groups in at least one topic")
    if len(contrasts["research"] | contrasts["holdout"]) < 3:
        issues.append(
            "dataset: requires contrast groups in at least three distinct topics"
        )
    return issues


def reject_constant(value: str) -> None:
    raise ValueError(f"{value} is not a JSON value")


def unique_object(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key {key!r}")
        result[key] = value
    return result


def load_dataset(path: Path) -> tuple[list[dict[str, object]], list[str]]:
    cases: list[dict[str, object]] = []
    issues: list[str] = []
    try:
        # Iterate physical file lines, preserving legal Unicode separators in JSON strings.
        with path.open(encoding="utf-8") as source:
            lines = source.readlines()
    except (OSError, UnicodeError) as error:
        return cases, [f"{path}: cannot read UTF-8 dataset: {error}"]
    for line_number, line in enumerate(lines, start=1):
        try:
            case = json.loads(
                line, parse_constant=reject_constant, object_pairs_hook=unique_object
            )
        except (ValueError, RecursionError) as error:
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
    issues.extend(validate_uniqueness(cases))
    issues.extend(validate_coverage(cases))
    issues.extend(validate_groups(cases))
    if issues:
        for issue in issues:
            print(issue, file=sys.stderr)
        return 1
    print("validation: PASS (structure and coverage only; not oracle approval)")
    print(f"total cases: {len(cases)}")
    print(f"labels: {dict(sorted(counts(cases, 'expected').items()))}")
    print(f"topics: {len(counts(cases, 'topic'))}; groups: {len(group_cases(cases))}")
    for category in CATEGORY_MATRIX:
        members = [case for case in cases if case["coverage_category"] == category]
        print(f"{category}: {dict(sorted(counts(members, 'split').items()))}")
    for split, topics in contrast_topics(cases).items():
        print(f"{split} contrast topics: {', '.join(sorted(topics))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
