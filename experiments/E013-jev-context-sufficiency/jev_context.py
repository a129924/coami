"""E013: frozen-case Context Sufficiency observations, with byte-exact evidence."""

from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
from importlib.metadata import version
import json
import logging
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from typing import Any

import httpx2
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

logging.getLogger("typesafe_sdk").disabled = True

MODEL = "jev-1.13.0"
SDK_VERSION = "0.7.2"
GROUPS = ("research", "holdout", "v0")
CHOICES = ("SUFFICIENT", "INSUFFICIENT")
TOPIC = Path(__file__).resolve().parent
ROOT = TOPIC.parents[1]
ORACLE = ROOT / "evaluation/context_sufficiency"
POLICY_HASH = "96709ed6e7f8026dabf825b5eef84a88fe74bd1fdec8b571777bbdcd223ca87f"
V0_HASHES = {
    "README.md": "32471da22cde6410764e319a1eda114d91c6c78b233258239aa6da81108d7b1f",
    "dataset/context_sufficiency_v0.jsonl": "35f8511d30c112eafd3387866d588cd1df3f9a80f2f12029b6298e7a60d8cdb5",
    "validate_dataset.py": "45f0f0d8efe685b2514c2ae27109ea7586db5bc57858d382518cbc078da1db38",
}
V1_FILES = ("README.md", "context_sufficiency_v1.jsonl", "validate_dataset.py")
V1_FREEZE_KEYS = {
    "snapshot_id",
    "freeze_version",
    "frozen_utc",
    "owner_accepted_60",
    "fixture_review_approved",
    "fixture_reviewer",
    "fixture_verdict",
    "frozen",
    "review_sha256",
    "v1_hashes",
}
LOCAL_STORE_ROOT = Path("/Users/andrew/coami-evidence/E013")
HISTORICAL_RUN_ID = "20261008T035450Z-010364d7"
RUNNER_RELATIVE = Path("experiments/E013-jev-context-sufficiency/jev_context.py")
LOCK_RELATIVE = RUNNER_RELATIVE.parent / "uv.lock"
POLICY_RELATIVE = Path(
    "experiments/E013-jev-context-sufficiency/local-store-policy.json"
)
FREEZE_RELATIVE = Path(
    "evaluation/context_sufficiency/versions/v1/freeze-attestation.json"
)
CASE_ID = re.compile(r"[A-Za-z0-9_-]+\Z")
STORE_POLICY_KEYS = {
    "approved_by",
    "store_id",
    "root",
    "storage_mode",
    "versioned_immutable",
    "backup_verified",
    "retention_until",
    "agent_access",
}


class ContractError(ValueError):
    """A fixed, non-sensitive failure code."""

    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def json_bytes(value: object) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, sort_keys=True, allow_nan=False) + "\n"
    ).encode()


def read_object(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_bytes())
    except (OSError, ValueError) as exc:
        raise ContractError("REQUIRED_DOCUMENT_UNAVAILABLE") from exc
    if not isinstance(value, dict):
        raise ContractError("INVALID_DOCUMENT")
    return value


def parse_gate_document(data: bytes, code: str) -> dict[str, Any]:
    """Accept the frozen, two-space JSON format without ambiguous fields."""

    def unique(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        document = {}
        for key, value in pairs:
            if key in document:
                raise ContractError(code)
            document[key] = value
        return document

    def invalid_number(value: str) -> None:
        raise ContractError(code)

    try:
        document = json.loads(
            data, object_pairs_hook=unique, parse_constant=invalid_number
        )
        canonical = (
            json.dumps(document, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
        ).encode()
        if not isinstance(document, dict) or data != canonical:
            raise ContractError(code)
    except (ValueError, TypeError, UnicodeDecodeError) as exc:
        if isinstance(exc, ContractError):
            raise
        raise ContractError(code) from exc
    return document


def read_gate_document(path: Path, code: str) -> dict[str, Any]:
    try:
        return parse_gate_document(path.read_bytes(), code)
    except OSError as exc:
        raise ContractError(code) from exc


def parse_live_authorization(data: bytes) -> dict[str, Any]:
    """Require one unambiguous, canonical Owner authorization document."""

    def unique(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        document = {}
        for key, value in pairs:
            if key in document:
                raise ContractError("LIVE_AUTHORIZATION_UNVERIFIED")
            document[key] = value
        return document

    try:
        document = json.loads(data, object_pairs_hook=unique)
        if not isinstance(document, dict) or json_bytes(document) != data:
            raise ContractError("LIVE_AUTHORIZATION_UNVERIFIED")
    except (ValueError, TypeError, UnicodeDecodeError) as exc:
        if isinstance(exc, ContractError):
            raise
        raise ContractError("LIVE_AUTHORIZATION_UNVERIFIED") from exc
    return document


def write_exclusive(path: Path, data: bytes) -> None:
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    with path.open("xb") as output:
        os.chmod(path, 0o600)
        output.write(data)
        output.flush()
        os.fsync(output.fileno())


def append_line(path: Path, value: object) -> None:
    with path.open("ab") as output:
        output.write(json_bytes(value))
        output.flush()
        os.fsync(output.fileno())


def seal_run(run_dir: Path) -> None:
    """Make a completed local snapshot read-only; hashes detect later changes."""
    for path in run_dir.rglob("*"):
        if path.is_file():
            os.chmod(path, 0o400)
    for path in sorted(
        (item for item in run_dir.rglob("*") if item.is_dir()),
        key=lambda item: len(item.parts),
        reverse=True,
    ):
        os.chmod(path, 0o500)
    os.chmod(run_dir, 0o500)


def load_freeze(attestation: Path, root: Path = ROOT) -> dict[str, str]:
    """Match a separately accepted freeze record to exact on-disk bytes."""
    document = read_gate_document(attestation, "INVALID_FREEZE_ATTESTATION")
    if (
        set(document) != V1_FREEZE_KEYS
        or document.get("snapshot_id") != "v1-draft-004"
        or document.get("freeze_version") != "context_sufficiency_v1"
        or document.get("frozen_utc") != "2026-10-08T03:33:27Z"
        or document.get("fixture_reviewer") != "/root/v1_fixture_reviewer"
        or document.get("fixture_verdict") != "approved"
    ):
        raise ContractError("INVALID_FREEZE_ATTESTATION")
    if any(
        document.get(field) is not True
        for field in ("owner_accepted_60", "fixture_review_approved", "frozen")
    ):
        raise ContractError("V1_NOT_FROZEN")
    review = root / "evaluation/context_sufficiency/versions/v1/review.md"
    review_bytes = review.read_bytes()
    current_status = b"\n".join(review_bytes.splitlines()[:3])
    if (
        document.get("review_sha256") != sha(review_bytes)
        or b"NOT FROZEN" in current_status
    ):
        raise ContractError("V1_NOT_FROZEN")
    hashes = document.get("v1_hashes")
    if not isinstance(hashes, dict) or set(hashes) != set(V1_FILES):
        raise ContractError("INVALID_FREEZE_REFERENCE")
    for name in V1_FILES:
        actual = sha(
            (root / "evaluation/context_sufficiency/versions/v1" / name).read_bytes()
        )
        if hashes[name] != actual:
            raise ContractError("V1_HASH_MISMATCH")
    for name, expected in V0_HASHES.items():
        if (
            sha((root / "evaluation/context_sufficiency" / name).read_bytes())
            != expected
        ):
            raise ContractError("V0_HASH_MISMATCH")
    return {str(name): str(value) for name, value in hashes.items()}


def load_store_policy(path: Path, store: Path, root: Path = ROOT) -> dict[str, Any]:
    policy = read_gate_document(path, "STORE_APPROVAL_MISMATCH")
    if set(policy) != STORE_POLICY_KEYS:
        raise ContractError("STORE_APPROVAL_MISMATCH")
    required = ("approved_by", "store_id", "agent_access")
    if any(
        not isinstance(policy.get(key), str) or not policy[key].strip()
        for key in required
    ):
        raise ContractError("STORE_APPROVAL_MISSING")
    if (
        policy.get("storage_mode") != "local_staging"
        or policy.get("versioned_immutable") is not False
        or policy.get("backup_verified") is not False
        or policy.get("retention_until") is not None
        or policy.get("root") != str(LOCAL_STORE_ROOT)
        or store != LOCAL_STORE_ROOT
        or store.resolve() != store
    ):
        raise ContractError("STORE_APPROVAL_MISMATCH")
    resolved = store.resolve()
    if (
        not store.is_absolute()
        or resolved.is_relative_to(root.resolve())
        or any(
            resolved.is_relative_to(Path(temp).resolve())
            for temp in ("/private/tmp", "/tmp", "/var/tmp", tempfile.gettempdir())
        )
    ):
        raise ContractError("STORE_NOT_DURABLE")
    if not resolved.is_dir() or not os.access(resolved, os.W_OK):
        raise ContractError("STORE_UNAVAILABLE")
    return {
        **{key: str(policy[key]) for key in required},
        "storage_mode": "local_staging",
        "versioned_immutable": False,
        "backup_verified": False,
        "retention_until": None,
    }


def load_live_authorization(
    path: Path,
    attestation: Path,
    store_policy: Path,
    root: Path = ROOT,
    runner_path: Path | None = None,
) -> tuple[str, str]:
    """Require a committed, run-specific Owner record before any network call.

    The record is auditable, but a Git commit is not proof of the signer's identity.
    """
    try:
        runner = runner_path or Path(__file__)
        if (
            attestation.resolve() != (root / FREEZE_RELATIVE).resolve()
            or store_policy.resolve() != (root / POLICY_RELATIVE).resolve()
            or runner.resolve() != (root / RUNNER_RELATIVE).resolve()
        ):
            raise ContractError("LIVE_AUTHORIZATION_UNVERIFIED")
        current = path.read_bytes()
        document = parse_live_authorization(current)
        for dependency in (
            path,
            attestation,
            store_policy,
            runner,
            root / LOCK_RELATIVE,
        ):
            dependency_relative = dependency.resolve().relative_to(root.resolve())
            committed = subprocess.run(
                ["git", "show", f"HEAD:{dependency_relative.as_posix()}"],
                cwd=root,
                capture_output=True,
                check=True,
            ).stdout
            if committed != dependency.read_bytes():
                raise ContractError("LIVE_AUTHORIZATION_UNVERIFIED")
        if set(document) != {
            "run_id",
            "authorized_by",
            "scope",
            "model",
            "freeze_attestation_sha256",
            "store_policy_sha256",
            "runner_sha256",
            "uv_lock_sha256",
        }:
            raise ContractError("LIVE_AUTHORIZATION_MISMATCH")
        run_id = document.get("run_id")
        if (
            not isinstance(run_id, str)
            or not CASE_ID.fullmatch(run_id)
            or document.get("authorized_by") != "Owner"
            or document.get("scope") != "one E013 75-case Context Sufficiency run"
            or document.get("model") != MODEL
            or document.get("freeze_attestation_sha256")
            != sha(attestation.read_bytes())
            or document.get("store_policy_sha256") != sha(store_policy.read_bytes())
            or document.get("runner_sha256") != sha(runner.read_bytes())
            or document.get("uv_lock_sha256")
            != sha((root / LOCK_RELATIVE).read_bytes())
        ):
            raise ContractError("LIVE_AUTHORIZATION_MISMATCH")
        return run_id, sha(current)
    except (OSError, ValueError, subprocess.CalledProcessError) as exc:
        if isinstance(exc, ContractError):
            raise
        raise ContractError("LIVE_AUTHORIZATION_UNVERIFIED") from exc


def load_cases(
    root: Path = ROOT, source_bytes: dict[str, bytes] | None = None
) -> list[dict[str, Any]]:
    result = []
    paths = (
        (
            "research",
            root
            / "evaluation/context_sufficiency/versions/v1/context_sufficiency_v1.jsonl",
        ),
        (
            "v0",
            root
            / "evaluation/context_sufficiency/dataset/context_sufficiency_v0.jsonl",
        ),
    )
    for source, path in paths:
        data = source_bytes[source] if source_bytes is not None else path.read_bytes()
        for line in data.decode("utf-8").splitlines():
            row = json.loads(line)
            group = row["split"] if source == "research" else "v0"
            case_id = row["id"]
            if (
                group not in GROUPS
                or not isinstance(case_id, str)
                or not CASE_ID.fullmatch(case_id)
            ):
                raise ContractError("INVALID_CASE_ID")
            if row["expected"] not in CHOICES:
                raise ContractError("INVALID_ORACLE")
            turns = row["conversation"]
            if not isinstance(turns, list) or any(
                not isinstance(turn, dict) or set(turn) != {"speaker", "text"}
                for turn in turns
            ):
                raise ContractError("INVALID_VISIBLE_INPUT")
            result.append(
                {
                    "group": group,
                    "case_id": case_id,
                    "expected": row["expected"],
                    "state": {
                        "background": row["background"],
                        "conversation": [
                            {"speaker": turn["speaker"], "text": turn["text"]}
                            for turn in turns
                        ],
                        "utterance": row["utterance"],
                    },
                }
            )
    result.sort(key=lambda row: (GROUPS.index(row["group"]), row["case_id"]))
    keys = [(row["group"], row["case_id"]) for row in result]
    if (
        len(result) != 75
        or len(set(keys)) != 75
        or Counter(row["group"] for row in result)
        != {"research": 40, "holdout": 20, "v0": 15}
    ):
        raise ContractError("INVALID_CASE_INVENTORY")
    return result


def read_frozen_case_sources(
    root: Path, freeze_hashes: dict[str, str]
) -> dict[str, bytes]:
    """Read each case file once and bind the bytes used for the live requests."""
    sources = {
        "research": (
            root
            / "evaluation/context_sufficiency/versions/v1/context_sufficiency_v1.jsonl"
        ).read_bytes(),
        "v0": (
            root / "evaluation/context_sufficiency/dataset/context_sufficiency_v0.jsonl"
        ).read_bytes(),
    }
    if (
        sha(sources["research"]) != freeze_hashes["context_sufficiency_v1.jsonl"]
        or sha(sources["v0"]) != V0_HASHES["dataset/context_sufficiency_v0.jsonl"]
    ):
        raise ContractError("CASE_SOURCE_MISMATCH")
    return sources


def load_question(root: Path = ROOT) -> dict[str, Any]:
    policy_path = root / "experiments/E012-jev-text-policy/policies.json"
    data = policy_path.read_bytes()
    if sha(data) != POLICY_HASH:
        raise ContractError("POLICY_HASH_MISMATCH")
    policy = json.loads(data)
    row = policy.get("context_sufficiency") if isinstance(policy, dict) else None
    if not isinstance(row, dict) or set(row) != {"instructions", "criteria"}:
        raise ContractError("INVALID_POLICY")
    if not isinstance(row["criteria"], dict) or set(row["criteria"]) != set(CHOICES):
        raise ContractError("INVALID_POLICY")
    return row


def validate_oracles(root: Path = ROOT) -> None:
    for relative in (
        "evaluation/context_sufficiency/validate_dataset.py",
        "evaluation/context_sufficiency/versions/v1/validate_dataset.py",
    ):
        result = subprocess.run(
            [sys.executable, str(root / relative)],
            cwd=root,
            capture_output=True,
            check=False,
        )
        if result.returncode != 0:
            raise ContractError("ORACLE_VALIDATION_FAILED")


def parse_answer(raw: bytes) -> dict[str, Any]:
    def unique(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        result = {}
        for key, value in pairs:
            if key in result:
                raise ContractError("DUPLICATE_RESPONSE_FIELD")
            result[key] = value
        return result

    try:
        value = json.loads(raw, object_pairs_hook=unique)
        if not isinstance(value, dict) or value.get("model") != MODEL:
            raise ContractError("INVALID_MODEL")
        answers = value.get("answers")
        if not isinstance(answers, dict) or set(answers) != {"context_sufficiency"}:
            raise ContractError("INVALID_ANSWER_ID")
        answer = answers["context_sufficiency"]
        if (
            not isinstance(answer, dict)
            or answer.get("type") != "choice"
            or answer.get("choice") not in CHOICES
        ):
            raise ContractError("INVALID_CHOICE")
        probs = answer.get("probabilities")
        if not isinstance(probs, dict) or set(probs) != set(CHOICES):
            raise ContractError("INVALID_PROBABILITIES")
        if any(
            type(item) not in (int, float)
            or not math.isfinite(item)
            or not 0 <= item <= 1
            for item in probs.values()
        ):
            raise ContractError("INVALID_PROBABILITIES")
        if abs(sum(probs.values()) - 1) > 1e-6 or probs[answer["choice"]] != max(
            probs.values()
        ):
            raise ContractError("INVALID_PROBABILITIES")
        confidence = answer.get("confidence")
        if (
            type(confidence) not in (int, float)
            or not math.isfinite(confidence)
            or not 0 <= confidence <= 1
        ):
            raise ContractError("INVALID_CONFIDENCE")
        return {
            "status": "VALID",
            "choice": answer["choice"],
            "probabilities": probs,
            "confidence": confidence,
            "error_code": None,
        }
    except (ValueError, TypeError, KeyError, UnicodeDecodeError) as exc:
        if isinstance(exc, ContractError):
            code = exc.code
        else:
            code = "INVALID_RESPONSE"
        return {
            "status": "INVALID",
            "choice": None,
            "probabilities": None,
            "confidence": None,
            "error_code": code,
        }


class CaptureClient(httpx2.Client):
    """Persist request and successful response bytes before SDK decoding."""

    def __init__(
        self,
        run_dir: Path,
        case: dict[str, Any],
        question: dict[str, Any],
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self.run_dir = run_dir
        self.case = case
        self.question = question
        self.request_sha: str | None = None
        self.raw_sha: str | None = None
        self.raw_path: str | None = None

    def request(
        self, method: str, url: str | httpx2.URL, **kwargs: Any
    ) -> httpx2.Response:
        content = kwargs.get("content")
        if not isinstance(content, bytes):
            raise ContractError("REQUEST_BODY_UNAVAILABLE")
        try:
            emitted = json.loads(content)
        except ValueError as exc:
            raise ContractError("INVALID_REQUEST_BODY") from exc
        expected = {
            "model": MODEL,
            "state": self.case["state"],
            "questions": {"context_sufficiency": {"type": "choice", **self.question}},
        }
        if emitted != expected:
            raise ContractError("REQUEST_BOUNDARY_MISMATCH")
        relative = Path(self.case["group"]) / f"{self.case['case_id']}.body"
        write_exclusive(self.run_dir / "requests" / relative, content)
        self.request_sha = sha(content)
        response = super().request(method, url, **kwargs)
        if 200 <= response.status_code < 300:
            raw = response.content
            write_exclusive(self.run_dir / "responses" / relative, raw)
            self.raw_sha = sha(raw)
            self.raw_path = str(Path("responses") / relative)
        return response


def error_result(exc: Exception, captured: bool) -> dict[str, Any]:
    if captured:
        return {
            "status": "INVALID",
            "choice": None,
            "probabilities": None,
            "confidence": None,
            "error_code": "SDK_RESPONSE_INVALID",
        }
    if isinstance(exc, TypeSafeAPITimeoutError):
        code = "IO_TIMEOUT"
    elif isinstance(exc, TypeSafeAuthenticationError):
        code = "AUTH_FAILED"
    elif isinstance(exc, TypeSafePermissionDeniedError):
        code = "ACCESS_DENIED"
    elif isinstance(exc, TypeSafeAPIConnectionError):
        code = "CONNECTION_FAILED"
    elif isinstance(exc, TypeSafeAPIResponseValidationError):
        code = "SDK_RESPONSE_INVALID"
    elif isinstance(exc, TypeSafeAPIError):
        code = "HTTP_FAILED"
    elif isinstance(exc, TypeSafeError):
        code = "SDK_FAILED"
    else:
        code = "INTERNAL_ERROR"
    return {
        "status": "ERROR",
        "choice": None,
        "probabilities": None,
        "confidence": None,
        "error_code": code,
    }


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {
        "groups": {},
        "complete": True,
        "threshold_selected": False,
    }
    for group in GROUPS:
        members = [row for row in rows if row["group"] == group]
        counts = Counter(row["status"] for row in members)
        valid = [row for row in members if row["status"] == "VALID"]
        correct = sum(row["choice"] == row["expected"] for row in valid)
        confusion = {
            expected: {choice: 0 for choice in CHOICES} for expected in CHOICES
        }
        for row in valid:
            confusion[row["expected"]][row["choice"]] += 1
        result["groups"][group] = {
            "planned": len(members),
            "attempted": sum(row["status"] != "NOT_RUN" for row in members),
            "valid": counts["VALID"],
            "invalid": counts["INVALID"],
            "error": counts["ERROR"],
            "unknown": counts["UNKNOWN"],
            "not_run": counts["NOT_RUN"],
            "correct": correct,
            "correct_per_valid": correct / len(valid) if valid else None,
            "correct_per_planned": correct / len(members) if members else None,
            "confusion": confusion,
            "insufficient_to_sufficient": [
                row["case_id"]
                for row in valid
                if row["expected"] == "INSUFFICIENT" and row["choice"] == "SUFFICIENT"
            ],
            "sufficient_to_insufficient": [
                row["case_id"]
                for row in valid
                if row["expected"] == "SUFFICIENT" and row["choice"] == "INSUFFICIENT"
            ],
        }
        if (
            len(members) != {"research": 40, "holdout": 20, "v0": 15}[group]
            or counts["UNKNOWN"]
            or counts["NOT_RUN"]
            or counts["ERROR"]
        ):
            result["complete"] = False
    return result


def candidate_errors(
    rows: list[dict[str, Any]], threshold: float
) -> dict[str, dict[str, int]]:
    """Recompute arbitrary offline candidate counts; never select a threshold."""
    if (
        type(threshold) not in (int, float)
        or not math.isfinite(threshold)
        or not 0 <= threshold <= 1
    ):
        raise ContractError("INVALID_CANDIDATE_THRESHOLD")
    result = {}
    for group in GROUPS:
        eligible = [
            row
            for row in rows
            if row["group"] == group
            and row["status"] == "VALID"
            and row["probabilities"][row["choice"]] >= threshold
        ]
        result[group] = {
            "eligible": len(eligible),
            "insufficient_to_sufficient": sum(
                row["expected"] == "INSUFFICIENT" and row["choice"] == "SUFFICIENT"
                for row in eligible
            ),
            "sufficient_to_insufficient": sum(
                row["expected"] == "SUFFICIENT" and row["choice"] == "INSUFFICIENT"
                for row in eligible
            ),
        }
    return result


def run_live(
    attestation: Path,
    store_policy: Path,
    store: Path,
    authorization: Path | None = None,
    root: Path = ROOT,
) -> int:
    """A live run is unavailable until the exact freeze and store are approved."""
    logging.getLogger("typesafe_sdk").disabled = True
    try:
        if sys.version_info[:2] != (3, 12):
            raise ContractError("PYTHON_VERSION_MISMATCH")
        freeze_hashes = load_freeze(attestation, root)
        policy_metadata = load_store_policy(store_policy, store, root)
        if authorization is None:
            raise ContractError("MISSING_LIVE_AUTHORIZATION")
        run_id, authorization_sha256 = load_live_authorization(
            authorization, attestation, store_policy, root
        )
        authorization_bytes = authorization.read_bytes()
        if sha(authorization_bytes) != authorization_sha256:
            raise ContractError("LIVE_AUTHORIZATION_UNVERIFIED")
        use_marker = store / "authorization-uses" / f"{run_id}.json"
        published = (
            root / "experiments/E013-jev-context-sufficiency/evidence/runs" / run_id
        )
        if (
            run_id == HISTORICAL_RUN_ID
            or published.exists()
            or use_marker.exists()
            or (store / "runs" / run_id).exists()
        ):
            raise ContractError("LIVE_AUTHORIZATION_ALREADY_USED")
        tracked_manifest = (
            RUNNER_RELATIVE.parent / "evidence/runs" / run_id / "manifest.json"
        )
        try:
            tracked = subprocess.run(
                [
                    "git",
                    "ls-tree",
                    "--name-only",
                    "HEAD",
                    "--",
                    tracked_manifest.as_posix(),
                ],
                cwd=root,
                capture_output=True,
                check=True,
            ).stdout
        except subprocess.CalledProcessError as exc:
            raise ContractError("LIVE_AUTHORIZATION_UNVERIFIED") from exc
        if tracked.strip():
            raise ContractError("LIVE_AUTHORIZATION_ALREADY_USED")
        if not os.environ.get("TYPESAFE_API_KEY", "").strip():
            raise ContractError("MISSING_KEY")
        if version("typesafe-sdk") != SDK_VERSION:
            raise ContractError("SDK_VERSION_MISMATCH")
        validate_oracles(root)
        case_sources = read_frozen_case_sources(root, freeze_hashes)
        cases = load_cases(root, case_sources)
        question = load_question(root)
        runner_source = Path(__file__).read_bytes()
        runner_hash = sha(runner_source)
        if (
            runner_hash
            != parse_live_authorization(authorization_bytes)["runner_sha256"]
        ):
            raise ContractError("LIVE_AUTHORIZATION_UNVERIFIED")
        store_policy_bytes = store_policy.read_bytes()
        if (
            sha(store_policy_bytes)
            != parse_live_authorization(authorization_bytes)["store_policy_sha256"]
        ):
            raise ContractError("LIVE_AUTHORIZATION_UNVERIFIED")
        lock_bytes = (root / LOCK_RELATIVE).read_bytes()
        if (
            sha(lock_bytes)
            != parse_live_authorization(authorization_bytes)["uv_lock_sha256"]
        ):
            raise ContractError("LIVE_AUTHORIZATION_UNVERIFIED")
        policy_hash = POLICY_HASH
    except (ContractError, OSError, ValueError) as exc:
        code = exc.code if isinstance(exc, ContractError) else "PREFLIGHT_FAILED"
        print(f"E013 BLOCKED {code}", flush=True)
        return 2
    # This marker survives removal of the mutable runs/<run_id> directory.
    # It is still owner-mutable local state, not an immutable authorization log.
    write_exclusive(
        use_marker,
        json_bytes(
            {
                "run_id": run_id,
                "authorization_sha256": authorization_sha256,
                "used_utc": utc(),
            }
        ),
    )
    run_dir = store / "runs" / run_id
    run_dir.mkdir(mode=0o700, parents=True, exist_ok=False)
    manifest = {
        "run_id": run_id,
        "created_utc": utc(),
        "model": MODEL,
        "sdk_version": SDK_VERSION,
        "freeze_hashes": freeze_hashes,
        "v0_hashes": V0_HASHES,
        "rubric_sha256": policy_hash,
        "runner_sha256": runner_hash,
        "runner_source_path": "runner.py",
        "live_authorization_sha256": authorization_sha256,
        "live_authorization_path": "authorization.json",
        "store_policy_sha256": sha(store_policy_bytes),
        "store_policy_path": "store-policy.json",
        "uv_lock_sha256": sha(lock_bytes),
        "uv_lock_path": "uv.lock",
        "store": policy_metadata,
        "store_root": str(store.resolve()),
        "conditions": {"timeout_seconds": 30, "retries": 0, "order": list(GROUPS)},
        "publication": "local-unbacked-until-reviewed-git-export",
    }
    write_exclusive(run_dir / "manifest.json", json_bytes(manifest))
    write_exclusive(run_dir / "runner.py", runner_source)
    write_exclusive(run_dir / "authorization.json", authorization_bytes)
    write_exclusive(run_dir / "store-policy.json", store_policy_bytes)
    write_exclusive(run_dir / "uv.lock", lock_bytes)
    rows: list[dict[str, Any]] = []
    stopped = False
    for index, case in enumerate(cases):
        base = {
            "run_id": run_id,
            "ordinal": index + 1,
            "group": case["group"],
            "case_id": case["case_id"],
            "expected": case["expected"],
            "model": MODEL,
            "rubric_sha256": policy_hash,
            "case_version": freeze_hashes if case["group"] != "v0" else V0_HASHES,
            "runner_sha256": runner_hash,
            "status": "NOT_RUN",
            "choice": None,
            "probabilities": None,
            "confidence": None,
            "error_code": None,
            "request_sha256": None,
            "raw_sha256": None,
            "raw_locator": None,
            "started_utc": None,
            "ended_utc": None,
        }
        if not stopped:
            base["started_utc"] = utc()
            append_line(
                run_dir / "events.jsonl",
                {
                    "run_id": run_id,
                    "group": case["group"],
                    "case_id": case["case_id"],
                    "event": "START",
                    "utc": base["started_utc"],
                },
            )
            capture: CaptureClient | None = None
            try:
                capture = CaptureClient(run_dir, case, question, timeout=30.0)
                with TypeSafeClient(
                    model=MODEL,
                    base_url="https://api.typesafe.ai",
                    timeout=30.0,
                    retry=RetryPolicy(max_retries=0),
                    http_client=capture,
                ) as client:
                    client.system_one(
                        state=case["state"],
                        questions={
                            "context_sufficiency": Choice(
                                instructions=question["instructions"],
                                criteria=question["criteria"],
                            )
                        },
                    )
                if capture.raw_path is None:
                    raise ContractError("RAW_BODY_UNAVAILABLE")
                base.update(parse_answer((run_dir / capture.raw_path).read_bytes()))
            except (TypeSafeError, ContractError) as exc:
                base.update(
                    error_result(
                        exc, capture is not None and capture.raw_path is not None
                    )
                )
                if isinstance(exc, ContractError):
                    stopped = True
            except (OSError, KeyboardInterrupt, Exception):
                base.update(
                    {"status": "UNKNOWN", "error_code": "CAPTURE_OR_RUNTIME_FAILED"}
                )
                stopped = True
            if capture is not None:
                base["request_sha256"] = capture.request_sha
                base["raw_sha256"] = capture.raw_sha
                base["raw_locator"] = capture.raw_path
            base["ended_utc"] = utc()
        append_line(run_dir / "analysis.jsonl", base)
        rows.append(base)
    summary = summarize(rows)
    summary.update(
        {
            "run_id": run_id,
            "generated_utc": utc(),
            "evidence_status": "local-unbacked-until-reviewed-git-export",
        }
    )
    write_exclusive(run_dir / "summary.json", json_bytes(summary))
    seal_run(run_dir)
    print(
        f"E013 {run_id}: captured={sum(row['raw_sha256'] is not None for row in rows)} complete={summary['complete']} review=pending",
        flush=True,
    )
    return 0 if summary["complete"] else 2


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--live", action="store_true")
    modes.add_argument("--publish-reviewed", action="store_true")
    modes.add_argument("--verify-evidence", action="store_true")
    modes.add_argument("--verify-local-run", action="store_true")
    parser.add_argument("--freeze-attestation", type=Path)
    parser.add_argument("--store-policy", type=Path)
    parser.add_argument("--live-authorization", type=Path)
    parser.add_argument("--store-root", type=Path)
    parser.add_argument("--run-dir", type=Path)
    parser.add_argument("--approval", type=Path)
    parser.add_argument("--evidence-root", type=Path, default=TOPIC / "evidence")
    parser.add_argument("--evidence-run", type=Path)
    parser.add_argument("--restricted-run", type=Path)
    parser.add_argument("--candidate-threshold", type=float)
    args = parser.parse_args()
    if args.publish_reviewed or args.verify_evidence or args.verify_local_run:
        from evidence_tools import publish_reviewed, verify_evidence, verify_local_run

        try:
            if args.publish_reviewed:
                if args.run_dir is None or args.approval is None:
                    raise ContractError("MISSING_PUBLICATION_INPUT")
                output = publish_reviewed(
                    args.run_dir, args.approval, args.evidence_root
                )
                print(f"E013 reviewed evidence: {output}")
                return 0
            if args.verify_local_run:
                if args.run_dir is None:
                    raise ContractError("MISSING_LOCAL_RUN")
                result = verify_local_run(args.run_dir)
                print(json.dumps(result, ensure_ascii=False, allow_nan=False))
                return 0 if not result["gaps"] else 2
            if args.evidence_run is None:
                raise ContractError("MISSING_EVIDENCE_RUN")
            result = verify_evidence(
                args.evidence_run, args.restricted_run, args.candidate_threshold
            )
            print(json.dumps(result, ensure_ascii=False, allow_nan=False))
            return 0 if not result["gaps"] else 2
        except (ContractError, OSError, ValueError):
            print("E013 BLOCKED EVIDENCE_OPERATION_FAILED", flush=True)
            return 2
    if not args.live:
        parser.print_help()
        return 0
    if (
        args.freeze_attestation is None
        or args.store_policy is None
        or args.store_root is None
        or args.live_authorization is None
    ):
        print("E013 BLOCKED MISSING_PREFLIGHT_INPUT", flush=True)
        return 2
    try:
        return run_live(
            args.freeze_attestation,
            args.store_policy,
            args.store_root,
            args.live_authorization,
        )
    except (ContractError, OSError, ValueError):
        print("E013 BLOCKED EVIDENCE_WRITE_FAILED", flush=True)
        return 2


if __name__ == "__main__":
    sys.exit(main())
