"""E012 fixed-case experiment. Oracle evaluation never controls model routing."""

from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import hashlib
from importlib.metadata import version
import json
import logging
import math
import os
from pathlib import Path
import subprocess
from typing import Callable, Literal, Protocol
from uuid import uuid4

from typesafe_sdk import (
    Choice,
    RetryPolicy,
    TypeSafeAPIConnectionError,
    TypeSafeAPIError,
    TypeSafeAPIResponseValidationError,
    TypeSafeAPITimeoutError,
    TypeSafeAuthenticationError,
    TypeSafeClient,
    TypeSafeError,
    TypeSafePermissionDeniedError,
)

# Import installs the SDK logger. Disable it before any client factory runs.
logging.getLogger("typesafe_sdk").disabled = True

MODEL = "jev-1.13.0"
SDK_VERSION = "0.7.2"
STAGES = ("input_policy", "context_sufficiency", "output_policy")
OPTIONS = {
    "input_policy": ("COMPANION", "PARENT", "SAFETY", "UNCERTAIN"),
    "context_sufficiency": ("SUFFICIENT", "INSUFFICIENT"),
    "output_policy": ("ALLOW", "BLOCK", "UNCERTAIN"),
}
FROZEN_HASHES = {
    "README.md": "32471da22cde6410764e319a1eda114d91c6c78b233258239aa6da81108d7b1f",
    "dataset/context_sufficiency_v0.jsonl": "35f8511d30c112eafd3387866d588cd1df3f9a80f2f12029b6298e7a60d8cdb5",
    "validate_dataset.py": "45f0f0d8efe685b2514c2ae27109ea7586db5bc57858d382518cbc078da1db38",
}
DIRECTORY = Path(__file__).resolve().parent
ROOT = DIRECTORY.parents[1]
Kind = Literal["ANSWER", "QUESTION"]


class ContractError(ValueError):
    """Carries only a fixed code, never untrusted payload or credentials."""

    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def object_map(value: object) -> dict[str, object]:
    if not isinstance(value, dict) or any(not isinstance(k, str) for k in value):
        raise ContractError("INVALID_OBJECT")
    return value


def text(value: object) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ContractError("INVALID_TEXT")
    return value


def candidate_kind(value: object) -> Kind:
    if value == "ANSWER":
        return "ANSWER"
    if value == "QUESTION":
        return "QUESTION"
    raise ContractError("INVALID_KIND")


@dataclass(frozen=True)
class Turn:
    speaker: str
    text: str


@dataclass(frozen=True)
class VisibleInput:
    background: str
    conversation: tuple[Turn, ...]
    utterance: str

    @classmethod
    def project(cls, source: dict[str, object]) -> VisibleInput:
        conversation = source.get("conversation")
        if not isinstance(conversation, list):
            raise ContractError("INVALID_CONVERSATION")
        turns = []
        for value in conversation:
            turn = object_map(value)
            turns.append(Turn(text(turn.get("speaker")), text(turn.get("text"))))
        return cls(
            text(source.get("background")), tuple(turns), text(source.get("utterance"))
        )

    def state(self) -> dict[str, object]:
        return {
            "background": self.background,
            "conversation": [asdict(turn) for turn in self.conversation],
            "utterance": self.utterance,
        }


@dataclass(frozen=True)
class Candidate:
    text: str
    kind: Kind


@dataclass(frozen=True)
class Case:
    """Evaluator-owned record. Never passed to adapter or router."""

    id: str
    suite: str
    visible: VisibleInput
    candidate: Candidate
    expected: dict[str, str]
    groups: dict[str, str]


@dataclass(frozen=True)
class Question:
    instructions: str
    criteria: dict[str, str]


@dataclass(frozen=True)
class StageResult:
    status: str
    choice: str | None = None
    confidence: float | None = None
    probabilities: dict[str, float] | None = None
    error_code: str | None = None
    http_status: int | None = None
    skip_reason: str | None = None
    request: dict[str, object] | None = None


@dataclass(frozen=True)
class Decision:
    stages: dict[str, StageResult]
    proposed_action: str | None
    kind_compatible: bool | None
    action: str
    delivery: str | None
    reason: str


class RawResponse(Protocol):
    def json(self) -> object: ...


class Response(Protocol):
    @property
    def raw_http_response(self) -> RawResponse: ...


class Client(Protocol):
    def system_one(
        self, *, state: dict[str, object], questions: dict[str, Choice]
    ) -> Response: ...


def read_json(path: Path) -> object:
    try:
        return json.loads(path.read_bytes())
    except (OSError, ValueError) as exc:
        raise ContractError("SOURCE_UNAVAILABLE") from exc


def load_questions(path: Path) -> dict[str, Question]:
    config = object_map(read_json(path))
    if set(config) != set(STAGES):
        raise ContractError("INVALID_POLICY_CONFIG")
    result = {}
    for stage in STAGES:
        row = object_map(config[stage])
        criteria = object_map(row.get("criteria"))
        if set(criteria) != set(OPTIONS[stage]):
            raise ContractError("INVALID_CRITERIA")
        result[stage] = Question(
            text(row.get("instructions")),
            {key: text(value) for key, value in criteria.items()},
        )
    return result


def load_cases(root: Path = ROOT, directory: Path = DIRECTORY) -> list[Case]:
    config = object_map(read_json(directory / "cases.json"))
    if config.get("oracle_hashes") != FROZEN_HASHES:
        raise ContractError("INVALID_FREEZE_REFERENCE")
    snapshots = {}
    for name, expected_hash in FROZEN_HASHES.items():
        try:
            data = (root / "evaluation/context_sufficiency" / name).read_bytes()
        except OSError as exc:
            raise ContractError("ORACLE_UNAVAILABLE") from exc
        if hashlib.sha256(data).hexdigest() != expected_hash:
            raise ContractError("ORACLE_HASH_MISMATCH")
        snapshots[name] = data
    fixtures = [
        object_map(json.loads(line))
        for line in snapshots["dataset/context_sufficiency_v0.jsonl"].splitlines()
    ]
    inventory = object_map(config.get("oracle_inventory"))
    if len(fixtures) != 15 or set(inventory) != {row["id"] for row in fixtures}:
        raise ContractError("INVALID_INVENTORY")
    rows = config.get("policy8")
    if not isinstance(rows, list) or len(rows) != 8:
        raise ContractError("INVALID_POLICY_SUITE")
    cases = []
    for value in rows:
        row = object_map(value)
        expected = object_map(row.get("expected"))
        if set(expected) != {*STAGES, "action"}:
            raise ContractError("INVALID_EXPECTED")
        cases.append(
            Case(
                text(row.get("id")),
                "policy8",
                VisibleInput.project(row),
                Candidate(
                    text(row.get("candidate_text")), candidate_kind(row.get("kind"))
                ),
                {k: text(v) for k, v in expected.items()},
                {},
            )
        )
    for row in fixtures:
        case_id = text(row.get("id"))
        expected = {
            "input_policy": text(row.get("expected_input_policy")),
            "context_sufficiency": text(row.get("expected")),
            "output_policy": text(row.get("expected_output_policy")),
            "action": text(row.get("expected_action")),
        }
        cases.append(
            Case(
                case_id,
                "oracle15",
                VisibleInput.project(row),
                Candidate(
                    text(row.get("candidate_text")), candidate_kind(inventory[case_id])
                ),
                expected,
                {k: text(row.get(k)) for k in ("topic", "context_type")},
            )
        )
    if len({case.id for case in cases}) != 23:
        raise ContractError("DUPLICATE_CASE")
    return cases


def probability(value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, (float, int)):
        raise ContractError("INVALID_NUMBER")
    if not math.isfinite(value) or not 0 <= value <= 1:
        raise ContractError("INVALID_NUMBER")
    return float(value)


def validate_answer(payload: object, stage: str) -> StageResult:
    data = object_map(payload)
    if data.get("model") != MODEL:
        raise ContractError("INVALID_MODEL")
    answers = object_map(data.get("answers"))
    if set(answers) != {stage}:
        raise ContractError("INVALID_ANSWER_ID")
    answer = object_map(answers[stage])
    choice = answer.get("choice")
    if answer.get("type") != "choice" or choice not in OPTIONS[stage]:
        raise ContractError("INVALID_CHOICE")
    distribution = object_map(answer.get("probabilities"))
    if set(distribution) != set(OPTIONS[stage]):
        raise ContractError("INVALID_PROBABILITY_OPTIONS")
    probabilities = {key: probability(value) for key, value in distribution.items()}
    if abs(sum(probabilities.values()) - 1) > 1e-6:
        raise ContractError("INVALID_PROBABILITY_SUM")
    selected = text(choice)
    if probabilities[selected] != max(probabilities.values()):
        raise ContractError("CHOICE_NOT_ARGMAX")
    return StageResult(
        "VALID", selected, probability(answer.get("confidence")), probabilities
    )


def classify(
    client: Client, stage: str, state: dict[str, object], question: Question
) -> StageResult:
    """Only whitelisted values leave this SDK/raw JSON boundary."""
    request = {
        "state": state,
        "model": MODEL,
        "questions": {
            stage: {
                "type": "choice",
                "instructions": question.instructions,
                "criteria": question.criteria,
            }
        },
    }
    try:
        response = client.system_one(
            state=state,
            questions={
                stage: Choice(
                    instructions=question.instructions, criteria=question.criteria
                )
            },
        )
        result = validate_answer(response.raw_http_response.json(), stage)
    except TypeSafeAPIResponseValidationError:
        result = StageResult("INVALID", error_code="SDK_RESPONSE_INVALID")
    except TypeSafeAPITimeoutError:
        result = StageResult("ERROR", error_code="IO_TIMEOUT")
    except TypeSafeAuthenticationError:
        result = StageResult("ERROR", error_code="AUTH_FAILED", http_status=401)
    except TypeSafePermissionDeniedError:
        result = StageResult("ERROR", error_code="ACCESS_DENIED", http_status=403)
    except TypeSafeAPIConnectionError:
        result = StageResult("ERROR", error_code="CONNECTION_FAILED")
    except TypeSafeAPIError as exc:
        status = (
            exc.status if type(exc.status) is int and 100 <= exc.status <= 599 else None
        )
        result = StageResult("ERROR", error_code="HTTP_FAILED", http_status=status)
    except TypeSafeError:
        result = StageResult("ERROR", error_code="SDK_FAILED")
    except ContractError as exc:
        result = StageResult("INVALID", error_code=exc.code)
    except (ValueError, TypeError, KeyError, OverflowError):
        result = StageResult("INVALID", error_code="INVALID_RESPONSE")
    return StageResult(**{**asdict(result), "request": request})


def route(
    visible: VisibleInput,
    candidate: Candidate,
    use_context: bool,
    client: Client,
    questions: dict[str, Question],
) -> Decision:
    """No oracle expectations or fixture metadata are accepted here."""
    stages = {
        stage: StageResult("SKIPPED", skip_reason="UPSTREAM_STOP") for stage in STAGES
    }
    if not use_context:
        stages["context_sufficiency"] = StageResult(
            "NOT_APPLICABLE", skip_reason="POLICY8_PATH"
        )

    def finish(
        action: str,
        reason: str,
        proposed: str | None = None,
        compatible: bool | None = None,
    ) -> Decision:
        delivery = (
            candidate.text if action in ("DELIVER_ANSWER", "DELIVER_QUESTION") else None
        )
        return Decision(stages, proposed, compatible, action, delivery, reason)

    # A malformed local candidate is never routed or evaluated by the SDK.
    try:
        candidate_kind(candidate.kind)
        text(candidate.text)
    except ContractError:
        return finish("BLOCK", "INVALID_CANDIDATE")
    state = visible.state()
    stages["input_policy"] = classify(
        client, "input_policy", state, questions["input_policy"]
    )
    ip = stages["input_policy"]
    if ip.status != "VALID":
        return finish("BLOCK", "INPUT_INVALID_OR_FAILED")
    if ip.choice == "PARENT":
        return finish("HANDOFF_PARENT", "PARENT_REQUIRED")
    if ip.choice == "SAFETY":
        return finish("HANDOFF_SAFETY", "SAFETY_REQUIRED")
    if ip.choice != "COMPANION":
        return finish("BLOCK", "INPUT_UNCERTAIN")
    proposed_kind = candidate.kind
    if use_context:
        stages["context_sufficiency"] = classify(
            client,
            "context_sufficiency",
            visible.state(),
            questions["context_sufficiency"],
        )
        suff = stages["context_sufficiency"]
        if suff.status != "VALID":
            return finish("BLOCK", "CONTEXT_INVALID_OR_FAILED")
        proposed_kind = "ANSWER" if suff.choice == "SUFFICIENT" else "QUESTION"
    proposed = "DELIVER_" + proposed_kind
    compatible = proposed_kind == candidate.kind
    stages["output_policy"] = classify(
        client,
        "output_policy",
        {**visible.state(), "candidate_text": candidate.text},
        questions["output_policy"],
    )
    op = stages["output_policy"]
    if op.status != "VALID" or op.choice != "ALLOW":
        return finish("BLOCK", "OUTPUT_NOT_ALLOWED", proposed, compatible)
    if not compatible:
        return finish("BLOCK", "CANDIDATE_KIND_MISMATCH", proposed, False)
    return finish(proposed, "OUTPUT_ALLOWED", proposed, True)


def evaluate(case: Case, decision: Decision, run_id: str) -> dict[str, object]:
    stages = {}
    differences = []
    failed = decision.reason == "INVALID_CANDIDATE"
    incomplete = False
    for stage in STAGES:
        actual = decision.stages[stage]
        expected = case.expected[stage]
        if actual.status == "VALID":
            match: bool | None = actual.choice == expected
            if not match:
                differences.append(stage)
                failed = True
        elif actual.status == "INVALID":
            match = False
            differences.append(stage)
            failed = True
        else:
            match = (
                None  # SKIPPED / ERROR / NOT_APPLICABLE is never a passed prediction.
            )
            incomplete |= actual.status == "ERROR"
            if (
                actual.status == "SKIPPED"
                and expected != "SKIPPED"
                and not any(s.status == "ERROR" for s in decision.stages.values())
            ):
                differences.append(stage + ":unexpected_skip")
                failed = True
        stages[stage] = {**asdict(actual), "expected": expected, "matches": match}
    action_matches = decision.action == case.expected["action"]
    if not action_matches and not incomplete:
        failed = True
        differences.append("action")
    return {
        "run_id": run_id,
        "suite": case.suite,
        "id": case.id,
        "groups": {
            **case.groups,
            **(
                {"expected_label": case.expected["context_sufficiency"]}
                if case.suite == "oracle15"
                else {}
            ),
        },
        "stages": stages,
        "candidate_kind": case.candidate.kind,
        "proposed_action": decision.proposed_action,
        "kind_compatible": decision.kind_compatible,
        "expected_action": case.expected["action"],
        "action": decision.action,
        "action_matches": action_matches,
        "delivery": decision.delivery,
        "reason": decision.reason,
        "differences": differences,
        "has_failures": failed,
        "incomplete": incomplete,
        "verdict": "FAIL" if failed else "BLOCKED" if incomplete else "PASS",
    }


def summarize(
    records: list[dict[str, object]],
    run_id: str,
    *,
    interrupted: bool = False,
    blocked_code: str | None = None,
) -> dict[str, object]:
    suites = {}
    for suite, total in (("policy8", 8), ("oracle15", 15)):
        rows = [row for row in records if row["suite"] == suite]
        stage_counts = {}
        for stage in STAGES:
            results = [object_map(object_map(row["stages"])[stage]) for row in rows]
            stage_counts[stage] = {
                "statuses": dict(Counter(text(r["status"]) for r in results)),
                "matches": sum(r["matches"] is True for r in results),
            }
        suites[suite] = {
            "total": total,
            "completed": len(rows),
            "case_verdicts": dict(Counter(text(row["verdict"]) for row in rows)),
            "stages": stage_counts,
        }
    oracle = [row for row in records if row["suite"] == "oracle15"]
    valid = [
        object_map(object_map(row["stages"])["context_sufficiency"]) for row in oracle
    ]
    valid = [stage for stage in valid if stage["status"] == "VALID"]
    correct = sum(stage["matches"] is True for stage in valid)
    confusion = {
        expected: {actual: 0 for actual in OPTIONS["context_sufficiency"]}
        for expected in OPTIONS["context_sufficiency"]
    }
    for stage in valid:
        confusion[text(stage["expected"])][text(stage["choice"])] += 1
    groups = {}
    for field in ("topic", "context_type", "expected_label"):
        groups[field] = {}
        for row in oracle:
            group = text(object_map(row["groups"])[field])
            counts = groups[field].setdefault(
                group, {"observed": 0, "valid": 0, "correct": 0}
            )
            counts["observed"] += 1
            stage = object_map(object_map(row["stages"])["context_sufficiency"])
            counts["valid"] += stage["status"] == "VALID"
            counts["correct"] += stage["matches"] is True
    failures = any(row["has_failures"] for row in records)
    incomplete = (
        bool(blocked_code)
        or interrupted
        or len(records) != 23
        or any(row["incomplete"] for row in records)
    )
    verdict = "FAIL" if failures else "BLOCKED" if incomplete else "PASS"
    return {
        "run_id": run_id,
        "automatic_verdict": verdict,
        "has_failures": failures,
        "incomplete": incomplete,
        "interrupted": interrupted,
        "blocked_code": blocked_code,
        "human_review": "human-check",
        "final_verdict": verdict if verdict != "PASS" else "human-check",
        "suites": suites,
        "context_sufficiency": {
            "correct": correct,
            "valid_predictions": len(valid),
            "total": 15,
            "accuracy": correct / len(valid) if valid else None,
            "coverage": len(valid) / 15,
            "correct_over_total": correct / 15,
            "confusion_matrix": confusion,
            "groups": groups,
            "contrastive_topics": {
                topic: groups["topic"].get(
                    topic, {"observed": 0, "valid": 0, "correct": 0}
                )
                for topic in ("toy_car", "water", "ball")
            },
            "contrastive_cases": {
                topic: [
                    {
                        "id": row["id"],
                        "context_type": object_map(row["groups"])["context_type"],
                        "sufficiency": object_map(row["stages"])["context_sufficiency"],
                        "action": row["action"],
                        "expected_action": row["expected_action"],
                        "verdict": row["verdict"],
                    }
                    for row in oracle
                    if object_map(row["groups"])["topic"] == topic
                ]
                for topic in ("toy_car", "water", "ball")
            },
        },
    }


def metadata(directory: Path, root: Path) -> dict[str, object]:
    hashes = {}
    for name in ("uv.lock", "cases.json", "policies.json"):
        try:
            hashes[name] = hashlib.sha256((directory / name).read_bytes()).hexdigest()
        except OSError:
            hashes[name] = None
    head = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    ).stdout.strip()
    import platform

    return {
        "utc": datetime.now(timezone.utc).isoformat(),
        "head": head,
        "python": platform.python_version(),
        "sdk": version("typesafe-sdk"),
        "model": MODEL,
        "oracle_hashes": FROZEN_HASHES,
        "artifact_hashes": hashes,
    }


def save_summary(path: Path, summary: dict[str, object]) -> None:
    # Preserve each run's conclusion, including blocked and interrupted runs.
    document = object_map(read_json(path)) if path.exists() else {"runs": []}
    runs = document.get("runs")
    if not isinstance(runs, list):
        raise ContractError("INVALID_SUMMARY_HISTORY")
    runs.append(summary)
    document["latest_run_id"] = summary["run_id"]
    temporary = path.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(document, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def run_live(
    directory: Path = DIRECTORY,
    root: Path = ROOT,
    factory: Callable[..., TypeSafeClient] = TypeSafeClient,
) -> int:
    logging.getLogger("typesafe_sdk").disabled = True
    run_id = (
        datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid4().hex[:8]
    )
    records: list[dict[str, object]] = []
    interrupted = False
    blocked_code = None
    evidence = directory / "evidence"
    evidence.mkdir(exist_ok=True)
    try:
        if not os.environ.get("TYPESAFE_API_KEY", "").strip():
            raise ContractError("MISSING_KEY")
        if version("typesafe-sdk") != SDK_VERSION:
            raise ContractError("SDK_VERSION_MISMATCH")
        cases = load_cases(root, directory)
        questions = load_questions(directory / "policies.json")
        with factory(
            model=MODEL,
            base_url="https://api.typesafe.ai",
            timeout=30.0,
            retry=RetryPolicy(max_retries=0),
        ) as client:
            with (evidence / "live-results.jsonl").open(
                "a", encoding="utf-8"
            ) as output:
                for case in cases:
                    decision = route(
                        case.visible,
                        case.candidate,
                        case.suite == "oracle15",
                        client,
                        questions,
                    )
                    record = evaluate(case, decision, run_id)
                    output.write(
                        json.dumps(record, ensure_ascii=False, allow_nan=False) + "\n"
                    )
                    output.flush()
                    records.append(record)
                    print(
                        f"{case.suite}/{case.id}: {decision.action} {record['verdict']}",
                        flush=True,
                    )
    except ContractError as exc:
        blocked_code = exc.code
    except KeyboardInterrupt:
        interrupted = True
    except TypeSafeError:
        blocked_code = "CLIENT_FAILED"
    except OSError:
        blocked_code = "IO_FAILED"
    except Exception:
        # Never emit an SDK body, environment, or credential-bearing traceback.
        blocked_code = "INTERNAL_ERROR"
        print("E012 INTERNAL_ERROR: details withheld", flush=True)
    summary = {
        **summarize(
            records, run_id, interrupted=interrupted, blocked_code=blocked_code
        ),
        "metadata": metadata(directory, root),
    }
    save_summary(evidence / "run-summary.json", summary)
    print(
        f"E012 {run_id}: {summary['automatic_verdict']} human-check={summary['human_review']} code={blocked_code}"
    )
    if interrupted:
        return 130
    return {"PASS": 0, "FAIL": 1, "BLOCKED": 2}[text(summary["automatic_verdict"])]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--live", action="store_true", help="Run all 23 real Jev cases; no mock mode"
    )
    args = parser.parse_args()
    if not args.live:
        parser.print_help()
        return 0
    try:
        return run_live()
    except (OSError, ContractError, ValueError):
        print("E012 BLOCKED: EVIDENCE_WRITE_FAILED; no raw diagnostic emitted")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
