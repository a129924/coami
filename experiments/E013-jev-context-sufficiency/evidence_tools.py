"""Review-gated export and clean-checkout verification of E013 evidence."""

from __future__ import annotations

from contextlib import contextmanager
import json
from datetime import datetime
from pathlib import Path
import re
import subprocess
import tempfile
from typing import Any

import jev_context as e

HASH = re.compile(r"[0-9a-f]{64}\Z")
STATUSES = {"VALID", "INVALID", "ERROR", "UNKNOWN", "NOT_RUN"}
ERROR_CODES = {
    "IO_TIMEOUT",
    "AUTH_FAILED",
    "ACCESS_DENIED",
    "CONNECTION_FAILED",
    "SDK_RESPONSE_INVALID",
    "HTTP_FAILED",
    "SDK_FAILED",
    "INTERNAL_ERROR",
}
UNKNOWN_CODES = {"CAPTURE_OR_RUNTIME_FAILED"}
TRANSPORT_ERROR_CODES = {
    "IO_TIMEOUT",
    "AUTH_FAILED",
    "ACCESS_DENIED",
    "CONNECTION_FAILED",
    "HTTP_FAILED",
}
PRE_RECORD_RUN_ID = "20261008T035450Z-010364d7"
PRE_RECORD_RUNNER_REVISION = "ad4e692d72ee9661c02697594cfd4aa93cf380a6"
PRE_RECORD_POLICY_HASH = (
    "ec532b9bf729a59074b63d57ce22cc4cbf04ffe6be8dcf52527f6b00b492a2ea"
)
REVISION = re.compile(r"[0-9a-f]{40}\Z")
LOCAL_MANIFEST_KEYS = {
    "run_id",
    "created_utc",
    "model",
    "sdk_version",
    "freeze_hashes",
    "v0_hashes",
    "rubric_sha256",
    "runner_sha256",
    "store",
    "store_root",
    "conditions",
    "publication",
    "runner_source_path",
    "live_authorization_sha256",
    "live_authorization_path",
    "store_policy_sha256",
    "store_policy_path",
    "uv_lock_sha256",
    "uv_lock_path",
}
LOCAL_REQUIRED_KEYS = LOCAL_MANIFEST_KEYS - {
    "runner_source_path",
    "live_authorization_sha256",
    "live_authorization_path",
    "store_policy_sha256",
    "store_policy_path",
    "uv_lock_sha256",
    "uv_lock_path",
}
PUBLIC_MANIFEST_KEYS = (LOCAL_MANIFEST_KEYS - {"store_root"}) | {
    "cases",
    "reviewed_by",
    "restricted_store_id",
    "restricted_access",
    "restricted_retention_until",
    "summary_sha256",
    "review_sha256",
    "runner_public_path",
    "runner_revision",
    "events_sha256",
}
LOCATOR_KEYS = {
    "group",
    "case_id",
    "raw_sha256",
    "raw_public_path",
    "raw_restricted_path",
    "analysis_sha256",
    "analysis_restricted",
    "restricted_run_version",
}
FULL_ANALYSIS_KEYS = {
    "run_id",
    "ordinal",
    "group",
    "case_id",
    "expected",
    "model",
    "rubric_sha256",
    "case_version",
    "runner_sha256",
    "status",
    "choice",
    "probabilities",
    "confidence",
    "error_code",
    "request_sha256",
    "raw_sha256",
    "raw_locator",
    "started_utc",
    "ended_utc",
}
PUBLIC_STUB_KEYS = {
    "run_id",
    "group",
    "case_id",
    "status",
    "raw_sha256",
    "analysis_restricted",
    "analysis_sha256",
}
PUBLIC_EVIDENCE_FILES = {
    "manifest.json",
    "analysis.jsonl",
    "summary.json",
    "review.json",
    "runner.py",
    "store-policy.json",
}
REVIEW_KEYS = {
    "run_id",
    "approved_by",
    "summary_public",
    "summary_safety_checked",
    "summary_sha256",
    "cases",
}
REVIEW_DECISION_KEYS = {
    "group",
    "case_id",
    "safety_checked",
    "analysis_public",
    "raw_public",
    "analysis_sha256",
    "raw_sha256",
}
HISTORICAL_REVIEW_METHOD = (
    "Checked each exact body and analysis row for known schema, SHA-256, parsed "
    "equality, credential echo, and sensitive markers; request bytes remain local."
)
HISTORICAL_REVIEW_CHECKS = [
    "exact_body_hash",
    "request_hash",
    "credential_absent",
    "sensitive_markers_absent",
    "known_json_shape",
    "parsed_row_matches",
]


def unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result = {}
    for key, value in pairs:
        if key in result:
            raise e.ContractError("DUPLICATE_ANALYSIS_FIELD")
        result[key] = value
    return result


def invalid_constant(value: str) -> None:
    raise e.ContractError("INVALID_ANALYSIS_NUMBER")


def read_review(path: Path) -> dict[str, Any]:
    """Reject ambiguous approval and retained review documents."""

    def unique(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        document = {}
        for key, value in pairs:
            if key in document:
                raise e.ContractError("INVALID_PUBLICATION_REVIEW")
            document[key] = value
        return document

    def invalid_number(value: str) -> None:
        raise e.ContractError("INVALID_PUBLICATION_REVIEW")

    try:
        review = json.loads(
            path.read_bytes(),
            object_pairs_hook=unique,
            parse_constant=invalid_number,
        )
    except (OSError, ValueError, UnicodeDecodeError) as exc:
        if isinstance(exc, e.ContractError):
            raise
        raise e.ContractError("INVALID_PUBLICATION_REVIEW") from exc
    if not isinstance(review, dict):
        raise e.ContractError("INVALID_PUBLICATION_REVIEW")
    historical = review.get("run_id") == PRE_RECORD_RUN_ID
    if historical:
        try:
            timestamp = datetime.fromisoformat(review["reviewed_utc"])
        except (KeyError, TypeError, ValueError) as exc:
            raise e.ContractError("INVALID_PUBLICATION_REVIEW") from exc
        if (
            set(review) != REVIEW_KEYS | {"method", "reviewed_utc"}
            or review["method"] != HISTORICAL_REVIEW_METHOD
            or timestamp.tzinfo is None
            or timestamp.utcoffset() is None
        ):
            raise e.ContractError("INVALID_PUBLICATION_REVIEW")
    elif set(review) != REVIEW_KEYS:
        raise e.ContractError("INVALID_PUBLICATION_REVIEW")
    decisions = review.get("cases")
    if not isinstance(decisions, list) or any(
        not isinstance(item, dict)
        or set(item)
        != (REVIEW_DECISION_KEYS | {"checks"} if historical else REVIEW_DECISION_KEYS)
        or (historical and item["checks"] != HISTORICAL_REVIEW_CHECKS)
        for item in decisions
    ):
        raise e.ContractError("INVALID_PUBLICATION_REVIEW")
    return review


def read_manifest(path: Path) -> dict[str, Any]:
    """Read one unambiguous, byte-canonical run manifest."""

    def unique(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        document = {}
        for key, value in pairs:
            if key in document:
                raise e.ContractError("INVALID_EVIDENCE_MANIFEST")
            document[key] = value
        return document

    try:
        data = path.read_bytes()
        manifest = json.loads(data, object_pairs_hook=unique)
        if not isinstance(manifest, dict) or e.json_bytes(manifest) != data:
            raise e.ContractError("INVALID_EVIDENCE_MANIFEST")
    except (OSError, ValueError, TypeError, UnicodeDecodeError) as exc:
        if isinstance(exc, e.ContractError):
            raise
        raise e.ContractError("INVALID_EVIDENCE_MANIFEST") from exc
    return manifest


def bounded_path(root: Path, locator: str) -> Path:
    relative = Path(locator)
    if relative.is_absolute() or any(part in ("..", ".") for part in relative.parts):
        raise e.ContractError("INVALID_EVIDENCE_LOCATOR")
    result = root / relative
    if not result.resolve().is_relative_to(root.resolve()):
        raise e.ContractError("INVALID_EVIDENCE_LOCATOR")
    return result


def read_rows(path: Path, *, allow_stubs: bool = False) -> list[dict[str, Any]]:
    try:
        data = path.read_bytes()
        lines = data.splitlines()
        rows = [
            json.loads(
                line,
                object_pairs_hook=unique_object,
                parse_constant=invalid_constant,
            )
            for line in lines
        ]
    except e.ContractError:
        raise
    except (OSError, ValueError) as exc:
        raise e.ContractError("ANALYSIS_UNAVAILABLE") from exc
    if len(rows) != 75 or any(not isinstance(row, dict) for row in rows):
        raise e.ContractError("INVALID_ANALYSIS")
    try:
        canonical = [e.json_bytes(row) for row in rows]
    except (TypeError, ValueError) as exc:
        raise e.ContractError("INVALID_ANALYSIS") from exc
    if data != b"".join(canonical):
        raise e.ContractError("NONCANONICAL_ANALYSIS")
    if any(
        not isinstance(row.get("run_id"), str)
        or not e.CASE_ID.fullmatch(row["run_id"])
        or row.get("group") not in e.GROUPS
        or not isinstance(row.get("case_id"), str)
        or not e.CASE_ID.fullmatch(row["case_id"])
        for row in rows
    ):
        raise e.ContractError("INVALID_ANALYSIS_KEY")
    keys = [(row["run_id"], row["group"], row["case_id"]) for row in rows]
    if len(set(keys)) != 75:
        raise e.ContractError("DUPLICATE_ANALYSIS_KEY")
    previous_end: datetime | None = None
    previous_row: dict[str, Any] | None = None
    not_run_started = False
    stopped = False
    for row in rows:
        if row.get("analysis_restricted") is True and allow_stubs:
            if set(row) != PUBLIC_STUB_KEYS:
                raise e.ContractError("INVALID_RESTRICTED_ANALYSIS")
        elif set(row) != FULL_ANALYSIS_KEYS:
            raise e.ContractError("UNREVIEWED_ANALYSIS_FIELD")
        status = row.get("status")
        if not isinstance(status, str) or status not in STATUSES:
            raise e.ContractError("INVALID_ANALYSIS_STATUS")
        if stopped and status != "NOT_RUN":
            raise e.ContractError("INVALID_ANALYSIS_SEQUENCE")
        if row.get("analysis_restricted") is not True and (
            not isinstance(row.get("expected"), str) or row["expected"] not in e.CHOICES
        ):
            raise e.ContractError("INVALID_ANALYSIS_EXPECTED")
        if status == "NOT_RUN":
            if previous_row is None or (
                not_run_started is False
                and not (
                    previous_row["status"] == "UNKNOWN"
                    or (
                        previous_row["status"] == "ERROR"
                        and (
                            previous_row.get("error_code") == "INTERNAL_ERROR"
                            or previous_row.get("analysis_restricted") is True
                        )
                    )
                )
            ):
                raise e.ContractError("INVALID_ANALYSIS_SEQUENCE")
            not_run_started = True
        elif not_run_started:
            raise e.ContractError("INVALID_ANALYSIS_SEQUENCE")
        previous_row = row
        if status == "UNKNOWN" or (
            status == "ERROR"
            and row.get("error_code") == "INTERNAL_ERROR"
            and row.get("analysis_restricted") is not True
        ):
            stopped = True
        if row.get("analysis_restricted") is not None and not allow_stubs:
            raise e.ContractError("INVALID_RESTRICTED_ANALYSIS")
        if row.get("analysis_restricted") is True:
            continue
        if type(row.get("ordinal")) is not int or row["ordinal"] < 1:
            raise e.ContractError("INVALID_ANALYSIS_ORDINAL")
        started = row.get("started_utc")
        ended = row.get("ended_utc")
        if status == "NOT_RUN":
            if started is not None or ended is not None:
                raise e.ContractError("INVALID_ANALYSIS_TIME")
        else:
            try:
                if not isinstance(started, str) or not isinstance(ended, str):
                    raise ValueError
                started_at = datetime.fromisoformat(started)
                ended_at = datetime.fromisoformat(ended)
                if (
                    started_at.tzinfo is None
                    or ended_at.tzinfo is None
                    or ended_at < started_at
                    or (previous_end is not None and started_at < previous_end)
                ):
                    raise ValueError
            except ValueError as exc:
                raise e.ContractError("INVALID_ANALYSIS_TIME") from exc
            previous_end = ended_at
        if any(
            row.get(field) is not None
            and (not isinstance(row[field], str) or not HASH.fullmatch(row[field]))
            for field in ("request_sha256", "raw_sha256")
        ):
            raise e.ContractError("INVALID_ANALYSIS_HASH")
        if status == "VALID" and (
            row.get("choice") not in e.CHOICES
            or not isinstance(row.get("probabilities"), dict)
            or set(row["probabilities"]) != set(e.CHOICES)
            or any(
                type(value) not in (int, float)
                for value in row["probabilities"].values()
            )
            or type(row.get("confidence")) not in (int, float)
            or row.get("error_code") is not None
        ):
            raise e.ContractError("INVALID_ANALYSIS_STATUS_FIELDS")
        if status != "VALID" and any(
            row.get(field) is not None
            for field in ("choice", "probabilities", "confidence")
        ):
            raise e.ContractError("INVALID_ANALYSIS_STATUS_FIELDS")
        if status == "NOT_RUN" and any(
            row.get(field) is not None for field in ("request_sha256", "raw_sha256")
        ):
            raise e.ContractError("INVALID_ANALYSIS_STATUS_FIELDS")
        if status == "INVALID" and not isinstance(row.get("error_code"), str):
            raise e.ContractError("INVALID_ANALYSIS_STATUS_FIELDS")
        if status == "ERROR" and (
            not isinstance(row.get("error_code"), str)
            or row["error_code"] not in ERROR_CODES
        ):
            raise e.ContractError("INVALID_ANALYSIS_STATUS_FIELDS")
        if status == "UNKNOWN" and (
            not isinstance(row.get("error_code"), str)
            or row["error_code"] not in UNKNOWN_CODES
        ):
            raise e.ContractError("INVALID_ANALYSIS_STATUS_FIELDS")
        if status == "NOT_RUN" and row.get("error_code") is not None:
            raise e.ContractError("INVALID_ANALYSIS_STATUS_FIELDS")
        if row.get("raw_locator") != (
            f"responses/{row['group']}/{row['case_id']}.body"
            if row.get("raw_sha256") is not None
            else None
        ):
            raise e.ContractError("INVALID_RAW_LOCATOR_STATE")
    return rows


def summary_bytes(run_dir: Path) -> bytes:
    """Reject extra metadata and require exact, reviewable summary content."""
    data = (run_dir / "summary.json").read_bytes()
    try:
        summary = json.loads(
            data,
            object_pairs_hook=unique_object,
            parse_constant=invalid_constant,
        )
        if e.json_bytes(summary) != data:
            raise e.ContractError("INVALID_SUMMARY")
    except (ValueError, TypeError, UnicodeDecodeError) as exc:
        raise e.ContractError("INVALID_SUMMARY") from exc
    if (
        not isinstance(summary, dict)
        or set(summary)
        != {
            "run_id",
            "generated_utc",
            "evidence_status",
            "groups",
            "complete",
            "threshold_selected",
        }
        or summary.get("threshold_selected") is not False
    ):
        raise e.ContractError("INVALID_SUMMARY")
    try:
        generated = summary["generated_utc"]
        if not isinstance(generated, str):
            raise ValueError
        timestamp = datetime.fromisoformat(generated)
        if timestamp.tzinfo is None or timestamp.utcoffset() is None:
            raise ValueError
    except (ValueError, TypeError) as exc:
        raise e.ContractError("INVALID_SUMMARY") from exc
    return data


def policy_snapshot(root: Path, manifest: dict[str, Any]) -> bytes:
    """Use run-bound policy bytes; the pre-record run uses its tracked amendment."""
    path = manifest.get("store_policy_path")
    digest = manifest.get("store_policy_sha256")
    if (
        path == "store-policy.json"
        and isinstance(digest, str)
        and HASH.fullmatch(digest)
    ):
        data = bounded_path(root, path).read_bytes()
        if e.sha(data) == digest:
            return data
    elif (
        manifest.get("run_id") == PRE_RECORD_RUN_ID and path is None and digest is None
    ):
        data = (
            e.TOPIC / "evidence/runs" / PRE_RECORD_RUN_ID / "store-policy.json"
        ).read_bytes()
        if e.sha(data) == PRE_RECORD_POLICY_HASH:
            return data
    raise e.ContractError("STORE_POLICY_MISMATCH")


def metadata_gaps(
    root: Path, manifest: dict[str, Any], *, published: bool = False
) -> list[dict[str, str]]:
    """Check local-store claims against the run's retained approval policy."""
    try:
        policy = e.parse_gate_document(
            policy_snapshot(root, manifest), "STORE_POLICY_MISMATCH"
        )
        if not isinstance(policy, dict) or set(policy) != e.STORE_POLICY_KEYS:
            raise ValueError
        store = manifest["store"]
        if not isinstance(store, dict) or set(store) != {
            "approved_by",
            "store_id",
            "agent_access",
            "storage_mode",
            "versioned_immutable",
            "backup_verified",
            "retention_until",
        }:
            raise ValueError
        if any(
            store.get(name) != policy.get(name)
            for name in ("approved_by", "store_id", "agent_access")
        ):
            raise ValueError
        if any(
            not isinstance(policy.get(name), str) or not policy[name].strip()
            for name in ("approved_by", "store_id", "agent_access")
        ):
            raise ValueError
        if any(
            (
                published
                and not {
                    "restricted_store_id",
                    "restricted_access",
                    "restricted_retention_until",
                }.issubset(manifest),
                policy.get("root") != str(e.LOCAL_STORE_ROOT),
                store.get("storage_mode") != "local_staging",
                store.get("versioned_immutable") is not False,
                store.get("backup_verified") is not False,
                store.get("retention_until") is not None,
                manifest.get("restricted_store_id", store["store_id"])
                != store["store_id"],
                manifest.get("restricted_access", store["agent_access"])
                != store["agent_access"],
                manifest.get("restricted_retention_until", None) is not None,
            )
        ):
            raise ValueError
    except (OSError, KeyError, TypeError, ValueError, e.ContractError):
        return [{"reason": "STORE_POLICY_MISMATCH"}]
    return []


def manifest_identity_gap(manifest: dict[str, Any], *, published: bool) -> bool:
    try:
        created = datetime.fromisoformat(manifest["created_utc"])
    except (KeyError, TypeError, ValueError):
        return True
    return (
        created.tzinfo is None
        or manifest.get("publication")
        != (
            "owner-reviewed"
            if published
            else "local-unbacked-until-reviewed-git-export"
        )
        or (not published and manifest.get("store_root") != str(e.LOCAL_STORE_ROOT))
    )


def manifest_chronology_gap(
    manifest: dict[str, Any], rows: list[dict[str, Any]]
) -> bool:
    try:
        created = datetime.fromisoformat(manifest["created_utc"])
        first_start = min(
            datetime.fromisoformat(row["started_utc"])
            for row in rows
            if row.get("started_utc") is not None
        )
        return created > first_start
    except (KeyError, TypeError, ValueError):
        return True


def summary_identity_gap(
    summary: dict[str, Any], run_id: str, rows: list[dict[str, Any]]
) -> bool:
    try:
        generated = datetime.fromisoformat(summary["generated_utc"])
        last_end = max(
            datetime.fromisoformat(row["ended_utc"])
            for row in rows
            if row.get("ended_utc") is not None
        )
        if generated < last_end:
            return True
    except (KeyError, TypeError, ValueError):
        return True
    return (
        summary.get("run_id") != run_id
        or summary.get("evidence_status") != "local-unbacked-until-reviewed-git-export"
        or summary.get("threshold_selected") is not False
    )


def event_log_bytes(rows: list[dict[str, Any]]) -> bytes:
    return b"".join(
        e.json_bytes(
            {
                "run_id": row["run_id"],
                "group": row["group"],
                "case_id": row["case_id"],
                "event": "START",
                "utc": row["started_utc"],
            }
        )
        for row in rows
        if row["status"] != "NOT_RUN"
    )


def event_log_gap(
    root: Path, rows: list[dict[str, Any]], expected_hash: str | None
) -> bool:
    try:
        actual = (root / "events.jsonl").read_bytes()
    except OSError:
        return True
    return actual != event_log_bytes(rows) or (
        expected_hash is not None and e.sha(actual) != expected_hash
    )


def same_json_value(recorded: Any, recalculated: Any) -> bool:
    """Compare summary values without Python's bool/int numeric equivalence."""
    if type(recorded) is not type(recalculated):
        return False
    if isinstance(recorded, dict):
        return set(recorded) == set(recalculated) and all(
            same_json_value(recorded[key], recalculated[key]) for key in recorded
        )
    if isinstance(recorded, list):
        return len(recorded) == len(recalculated) and all(
            same_json_value(left, right) for left, right in zip(recorded, recalculated)
        )
    return recorded == recalculated


def authorization_gap(root: Path, manifest: dict[str, Any]) -> str | None:
    """The pre-record-gate historical run has no authorization snapshot."""
    expected_hash = manifest.get("live_authorization_sha256")
    if manifest.get("run_id") == PRE_RECORD_RUN_ID:
        if any(
            manifest.get(field) is not None
            for field in (
                "live_authorization_sha256",
                "live_authorization_path",
                "uv_lock_sha256",
                "uv_lock_path",
            )
        ):
            return "AUTHORIZATION_MISMATCH"
        return None
    if expected_hash is None:
        return "AUTHORIZATION_MISSING"
    if manifest.get("live_authorization_path") != "authorization.json":
        return "AUTHORIZATION_MISSING"
    try:
        data = (root / "authorization.json").read_bytes()
        if e.sha(data) != expected_hash:
            return "AUTHORIZATION_HASH_MISMATCH"
        document = e.parse_live_authorization(data)
        if not isinstance(document, dict) or set(document) != {
            "run_id",
            "authorized_by",
            "scope",
            "model",
            "freeze_attestation_sha256",
            "store_policy_sha256",
            "runner_sha256",
            "uv_lock_sha256",
        }:
            return "AUTHORIZATION_MISMATCH"
        if any(
            (
                document["run_id"] != manifest.get("run_id"),
                document["authorized_by"] != "Owner",
                document["scope"] != "one E013 75-case Context Sufficiency run",
                document["model"] != e.MODEL,
                document["freeze_attestation_sha256"]
                != e.sha(
                    (e.ORACLE / "versions/v1/freeze-attestation.json").read_bytes()
                ),
                document["store_policy_sha256"]
                != e.sha(policy_snapshot(root, manifest)),
                document["runner_sha256"] != e.sha((root / "runner.py").read_bytes()),
                manifest.get("uv_lock_path") != "uv.lock",
                manifest.get("uv_lock_sha256")
                != e.sha((root / "uv.lock").read_bytes()),
                document["uv_lock_sha256"] != manifest.get("uv_lock_sha256"),
            )
        ):
            return "AUTHORIZATION_MISMATCH"
    except (OSError, ValueError, UnicodeDecodeError):
        return "AUTHORIZATION_MISSING"
    return None


def inventory_gaps(
    manifest: dict[str, Any], rows: list[dict[str, Any]]
) -> list[dict[str, str]]:
    """Bind public observations to the frozen repository oracle and run contract."""
    gaps: list[dict[str, str]] = []
    if (
        manifest.get("model") != e.MODEL
        or manifest.get("rubric_sha256") != e.POLICY_HASH
        or manifest.get("sdk_version") != e.SDK_VERSION
        or not same_json_value(
            manifest.get("conditions"),
            {"timeout_seconds": 30, "retries": 0, "order": list(e.GROUPS)},
        )
    ):
        return [{"reason": "RUN_CONTRACT_MISMATCH"}]
    try:
        freeze = manifest["freeze_hashes"]
        v0 = manifest["v0_hashes"]
        try:
            accepted_freeze = e.load_freeze(
                e.ORACLE / "versions/v1/freeze-attestation.json"
            )
        except (OSError, ValueError, e.ContractError):
            return [{"reason": "FREEZE_DECISION_MISMATCH"}]
        if not same_json_value(freeze, accepted_freeze):
            return [{"reason": "FREEZE_DECISION_MISMATCH"}]
        if set(freeze) != set(e.V1_FILES) or set(v0) != set(e.V0_HASHES):
            raise e.ContractError("CASE_VERSION_MISMATCH")
        for name in e.V1_FILES:
            if freeze[name] != e.sha((e.ORACLE / "versions/v1" / name).read_bytes()):
                raise e.ContractError("CASE_VERSION_MISMATCH")
        for name in e.V0_HASHES:
            if v0[name] != e.V0_HASHES[name] or v0[name] != e.sha(
                (e.ORACLE / name).read_bytes()
            ):
                raise e.ContractError("CASE_VERSION_MISMATCH")
        cases = e.load_cases()
    except (KeyError, TypeError, OSError, e.ContractError):
        return [{"reason": "CASE_VERSION_MISMATCH"}]
    if len(rows) != len(cases):
        return [{"reason": "CASE_INVENTORY_MISMATCH"}]
    for ordinal, (row, case) in enumerate(zip(rows, cases), 1):
        if any(
            (
                row.get("ordinal") != ordinal,
                row.get("group") != case["group"],
                row.get("case_id") != case["case_id"],
                row.get("expected") != case["expected"],
                row.get("case_version") != (v0 if case["group"] == "v0" else freeze),
                row.get("model") != manifest.get("model"),
                row.get("rubric_sha256") != manifest.get("rubric_sha256"),
                row.get("runner_sha256") != manifest.get("runner_sha256"),
            )
        ):
            gaps.append(
                {
                    "group": case["group"],
                    "case_id": case["case_id"],
                    "reason": "CASE_INVENTORY_MISMATCH",
                }
            )
    return gaps


def sdk_rejects(raw: bytes, case: dict[str, Any], question: dict[str, Any]) -> bool:
    """Replay captured bytes through the pinned SDK without network access."""
    if e.version("typesafe-sdk") != e.SDK_VERSION:
        raise e.ContractError("SDK_VERSION_MISMATCH")
    transport = e.httpx2.MockTransport(
        lambda request: e.httpx2.Response(200, content=raw)
    )
    try:
        with e.TypeSafeClient(
            api_key="offline-verification",
            model=e.MODEL,
            base_url="https://example.invalid",
            retry=e.RetryPolicy(max_retries=0),
            http_client=e.httpx2.Client(transport=transport),
        ) as client:
            client.system_one(
                state=case["state"],
                questions={"context_sufficiency": e.Choice(**question)},
            )
    except e.TypeSafeError:
        return True
    return False


def verify_replay_sdk() -> None:
    """Authenticate the installed replay code before using its classifications."""
    e.verify_sdk_imports((e.ROOT / e.LOCK_RELATIVE).read_bytes())


def response_gap(
    row: dict[str, Any], raw: bytes, case: dict[str, Any], question: dict[str, Any]
) -> str | None:
    parsed = e.parse_answer(raw)
    if row["status"] == "VALID":
        if any(
            row.get(field) != parsed[field]
            for field in (
                "status",
                "choice",
                "confidence",
                "error_code",
            )
        ) or not same_json_value(row.get("probabilities"), parsed["probabilities"]):
            return "RAW_ANALYSIS_MISMATCH"
    elif row["status"] == "INVALID":
        if any(
            row.get(field) is not None
            for field in ("choice", "probabilities", "confidence")
        ):
            return "RAW_ANALYSIS_MISMATCH"
        if row.get("error_code") == "SDK_RESPONSE_INVALID":
            if not sdk_rejects(raw, case, question):
                return "RAW_ANALYSIS_MISMATCH"
        elif (
            parsed["status"] != "INVALID"
            or row.get("error_code") != parsed["error_code"]
            or sdk_rejects(raw, case, question)
        ):
            return "RAW_ANALYSIS_MISMATCH"
        try:
            body = json.loads(raw)
        except (ValueError, UnicodeDecodeError):
            body = None
        if (
            isinstance(body, dict)
            and body.get("model") is not None
            and body["model"] != row.get("model")
        ):
            return "RAW_ANALYSIS_MISMATCH"
    elif row["status"] == "UNKNOWN" and row.get("raw_sha256") is not None:
        if row.get("request_sha256") is None:
            return "REQUEST_BODY_MISSING"
    else:
        return "UNEXPECTED_CAPTURED_BODY"
    return None


def request_gap(
    body: bytes, case: dict[str, Any], question: dict[str, Any]
) -> str | None:
    try:
        actual = json.loads(body)
    except (ValueError, UnicodeDecodeError):
        return "REQUEST_CONTENT_MISMATCH"
    expected = {
        "model": e.MODEL,
        "state": case["state"],
        "questions": {"context_sufficiency": {"type": "choice", **question}},
    }
    if actual != expected:
        return "REQUEST_CONTENT_MISMATCH"
    return None


def emitted_request(case: dict[str, Any], question: dict[str, Any]) -> bytes:
    """Recreate the pinned SDK's exact request bytes without network access."""
    if e.version("typesafe-sdk") != e.SDK_VERSION:
        raise e.ContractError("SDK_VERSION_MISMATCH")
    captured: list[bytes] = []

    def capture(request: e.httpx2.Request) -> e.httpx2.Response:
        captured.append(request.content)
        return e.httpx2.Response(200, content=b"{}")

    with e.TypeSafeClient(
        api_key="offline-verification",
        model=e.MODEL,
        base_url="https://example.invalid",
        retry=e.RetryPolicy(max_retries=0),
        http_client=e.httpx2.Client(transport=e.httpx2.MockTransport(capture)),
    ) as client:
        try:
            client.system_one(
                state=case["state"],
                questions={"context_sufficiency": e.Choice(**question)},
            )
        except e.TypeSafeError:
            pass
    if len(captured) != 1 or request_gap(captured[0], case, question):
        raise e.ContractError("REQUEST_RECONSTRUCTION_FAILED")
    return captured[0]


def verify_local_run(
    run_dir: Path, manifest: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Verify current local bytes; this does not establish backup or immutability."""
    verify_replay_sdk()
    if manifest is None:
        manifest = read_manifest(run_dir / "manifest.json")
    if not set(manifest).issubset(LOCAL_MANIFEST_KEYS):
        raise e.ContractError("UNREVIEWED_MANIFEST_FIELD")
    if not LOCAL_REQUIRED_KEYS.issubset(manifest):
        raise e.ContractError("INVALID_LOCAL_MANIFEST")
    if manifest_identity_gap(manifest, published=False):
        raise e.ContractError("INVALID_LOCAL_MANIFEST")
    run_id = manifest.get("run_id")
    store = manifest.get("store")
    if (
        run_dir.name != run_id
        or not isinstance(store, dict)
        or store.get("storage_mode") != "local_staging"
    ):
        raise e.ContractError("LOCAL_RUN_MISMATCH")
    rows = read_rows(run_dir / "analysis.jsonl")
    if any(row.get("analysis_restricted") is True for row in rows):
        raise e.ContractError("LOCAL_ANALYSIS_RESTRICTED")
    if any(row["run_id"] != run_id for row in rows):
        raise e.ContractError("RUN_ID_MISMATCH")
    gaps = inventory_gaps(manifest, rows) + metadata_gaps(run_dir, manifest)
    if manifest_chronology_gap(manifest, rows):
        gaps.append({"reason": "MANIFEST_CHRONOLOGY_MISMATCH"})
    if run_id != PRE_RECORD_RUN_ID and event_log_gap(run_dir, rows, None):
        gaps.append({"reason": "EVENT_LOG_MISMATCH"})
    if issue := authorization_gap(run_dir, manifest):
        gaps.append({"reason": issue})
    cases = {(case["group"], case["case_id"]): case for case in e.load_cases()}
    question = e.load_question()
    source_locator = manifest.get("runner_source_path")
    if source_locator is not None:
        try:
            source_hash = e.sha(bounded_path(run_dir, source_locator).read_bytes())
        except (OSError, TypeError, e.ContractError):
            source_hash = None
        if source_hash != manifest.get("runner_sha256"):
            gaps.append({"reason": "RUNNER_SOURCE_MISMATCH"})
    for row in rows:
        group, case_id = row["group"], row["case_id"]
        if (
            row.get("status") in ("VALID", "INVALID")
            or row.get("error_code") in TRANSPORT_ERROR_CODES
        ) and row.get("request_sha256") is None:
            gaps.append(
                {"group": group, "case_id": case_id, "reason": "REQUEST_BODY_MISSING"}
            )
        if (
            row.get("status") == "UNKNOWN"
            and row.get("raw_sha256") is not None
            and row.get("request_sha256") is None
        ):
            gaps.append(
                {"group": group, "case_id": case_id, "reason": "REQUEST_BODY_MISSING"}
            )
        if row.get("status") in ("VALID", "INVALID") and row.get("raw_sha256") is None:
            gaps.append(
                {"group": group, "case_id": case_id, "reason": "CAPTURED_BODY_MISSING"}
            )
        for field, locator in (
            ("request_sha256", f"requests/{group}/{case_id}.body"),
            ("raw_sha256", f"responses/{group}/{case_id}.body"),
        ):
            expected = row.get(field)
            if expected is None:
                continue
            if field == "raw_sha256" and row.get("raw_locator") != locator:
                gaps.append(
                    {
                        "group": group,
                        "case_id": case_id,
                        "reason": "RAW_LOCATOR_MISMATCH",
                    }
                )
                continue
            try:
                body = bounded_path(run_dir, locator).read_bytes()
                actual = e.sha(body)
            except OSError:
                actual = None
            if actual != expected:
                gaps.append(
                    {
                        "group": group,
                        "case_id": case_id,
                        "reason": f"{field.upper()}_MISMATCH",
                    }
                )
            elif field == "raw_sha256":
                case = cases.get((group, case_id))
                mismatch = (
                    response_gap(row, body, case, question)
                    if case
                    else "CASE_INVENTORY_MISMATCH"
                )
                if mismatch:
                    gaps.append(
                        {"group": group, "case_id": case_id, "reason": mismatch}
                    )
            elif field == "request_sha256" and (group, case_id) in cases:
                try:
                    expected_body = emitted_request(cases[(group, case_id)], question)
                except (e.ContractError, e.TypeSafeError, OSError, ValueError):
                    expected_body = None
                mismatch = "REQUEST_CONTENT_MISMATCH" if body != expected_body else None
                if mismatch:
                    gaps.append(
                        {"group": group, "case_id": case_id, "reason": mismatch}
                    )
    try:
        summary_bytes(run_dir)
        recorded = e.read_object(run_dir / "summary.json")
    except (OSError, e.ContractError):
        recorded = {}
    recalculated = e.summarize(rows)
    if (
        not same_json_value(recorded.get("groups"), recalculated["groups"])
        or not same_json_value(recorded.get("complete"), recalculated["complete"])
        or summary_identity_gap(recorded, run_id, rows)
    ):
        gaps.append({"reason": "SUMMARY_MISMATCH"})
    return {
        "run_id": run_id,
        "verified_cases": 75 if not gaps else None,
        "gaps": gaps,
        "evidence_status": "local-unbacked",
    }


def publish_reviewed(run_dir: Path, approval_path: Path, evidence_root: Path) -> Path:
    """Export only reviewed rows and byte-identical approved raw bodies."""
    with snapshot_run(run_dir) as snapshot:
        return _publish_snapshot(snapshot, approval_path, evidence_root)


@contextmanager
def snapshot_run(run_dir: Path):
    """Keep verification and publication on one private byte snapshot."""
    with tempfile.TemporaryDirectory(
        prefix=".e013-review-", dir=run_dir.parent
    ) as temp:
        snapshot = Path(temp) / run_dir.name
        snapshot.mkdir(mode=0o700)
        files = [
            "manifest.json",
            "analysis.jsonl",
            "summary.json",
            "events.jsonl",
            "runner.py",
            "authorization.json",
            "store-policy.json",
            "uv.lock",
        ]
        for case in e.load_cases():
            for kind in ("requests", "responses"):
                files.append(f"{kind}/{case['group']}/{case['case_id']}.body")
        for locator in files:
            source = bounded_path(run_dir, locator)
            try:
                data = source.read_bytes()
            except FileNotFoundError:
                continue
            e.write_exclusive(snapshot / locator, data)
        yield snapshot


def _publish_snapshot(run_dir: Path, approval_path: Path, evidence_root: Path) -> Path:
    manifest = read_manifest(run_dir / "manifest.json")
    if verify_local_run(run_dir, manifest)["gaps"]:
        raise e.ContractError("LOCAL_EVIDENCE_UNVERIFIED")
    approval = read_review(approval_path)
    run_id = manifest.get("run_id")
    if (
        not isinstance(run_id, str)
        or not e.CASE_ID.fullmatch(run_id)
        or approval.get("run_id") != run_id
        or not isinstance(approval.get("approved_by"), str)
        or not approval["approved_by"].strip()
        or approval.get("summary_public") is not True
        or approval.get("summary_safety_checked") is not True
        or approval.get("summary_sha256") != e.sha(summary_bytes(run_dir))
    ):
        raise e.ContractError("PUBLICATION_NOT_APPROVED")
    rows = read_rows(run_dir / "analysis.jsonl")
    if any(row["run_id"] != run_id for row in rows):
        raise e.ContractError("RUN_ID_MISMATCH")
    if inventory_gaps(manifest, rows):
        raise e.ContractError("CASE_INVENTORY_MISMATCH")
    decisions = approval.get("cases")
    if not isinstance(decisions, list) or len(decisions) != 75:
        raise e.ContractError("PUBLICATION_REVIEW_INCOMPLETE")
    review = {}
    for decision in decisions:
        if not isinstance(decision, dict):
            raise e.ContractError("INVALID_PUBLICATION_REVIEW")
        if (
            decision.get("group") not in e.GROUPS
            or not isinstance(decision.get("case_id"), str)
            or not e.CASE_ID.fullmatch(decision["case_id"])
        ):
            raise e.ContractError("INVALID_PUBLICATION_REVIEW")
        key = (decision.get("group"), decision.get("case_id"))
        if (
            key in review
            or decision.get("safety_checked") is not True
            or any(
                type(decision.get(name)) is not bool
                for name in ("analysis_public", "raw_public")
            )
        ):
            raise e.ContractError("INVALID_PUBLICATION_REVIEW")
        review[key] = decision
    if set(review) != {(row["group"], row["case_id"]) for row in rows}:
        raise e.ContractError("PUBLICATION_REVIEW_INCOMPLETE")
    # Validate the entire approval before creating any Git-visible output.
    for row in rows:
        decision = review[(row["group"], row["case_id"])]
        if (
            decision.get("analysis_sha256") != e.sha(e.json_bytes(row))
            or decision.get("raw_sha256") != row["raw_sha256"]
        ):
            raise e.ContractError("PUBLICATION_HASH_MISMATCH")
        if decision["raw_public"]:
            if row["raw_sha256"] is None:
                raise e.ContractError("PUBLICATION_BODY_MISSING")
            raw = bounded_path(run_dir, row["raw_locator"]).read_bytes()
            if e.sha(raw) != row["raw_sha256"]:
                raise e.ContractError("PUBLICATION_HASH_MISMATCH")
    output = evidence_root / "runs" / run_id
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        raise e.ContractError("PUBLICATION_EXISTS")
    with tempfile.TemporaryDirectory(
        prefix=f".{run_id}-", dir=output.parent
    ) as temporary:
        staging = Path(temporary) / "run"
        staging.mkdir(mode=0o700)
        _write_publication(staging, run_dir, manifest, approval, rows, review)
        if output.exists():
            raise e.ContractError("PUBLICATION_EXISTS")
        staging.rename(output)
    return output


def _write_publication(
    output: Path,
    run_dir: Path,
    manifest: dict[str, Any],
    approval: dict[str, Any],
    rows: list[dict[str, Any]],
    review: dict[tuple[str, str], dict[str, Any]],
) -> None:
    run_id = manifest["run_id"]
    runner_path = manifest.get("runner_source_path")
    if runner_path != "runner.py":
        raise e.ContractError("RUNNER_SOURCE_MISSING")
    runner_source = bounded_path(run_dir, runner_path).read_bytes()
    if e.sha(runner_source) != manifest.get("runner_sha256"):
        raise e.ContractError("RUNNER_SOURCE_MISMATCH")
    e.write_exclusive(output / "runner.py", runner_source)
    if manifest.get("live_authorization_sha256") is not None:
        if authorization_gap(run_dir, manifest):
            raise e.ContractError("AUTHORIZATION_UNVERIFIED")
        e.write_exclusive(
            output / "authorization.json", (run_dir / "authorization.json").read_bytes()
        )
    e.write_exclusive(output / "store-policy.json", policy_snapshot(run_dir, manifest))
    if manifest.get("live_authorization_sha256") is not None:
        e.write_exclusive(output / "uv.lock", (run_dir / "uv.lock").read_bytes())
    public_review = {
        "run_id": run_id,
        "approved_by": approval["approved_by"],
        "summary_public": True,
        "summary_safety_checked": True,
        "summary_sha256": approval["summary_sha256"],
        "cases": [
            {
                field: decision[field]
                for field in (
                    "group",
                    "case_id",
                    "safety_checked",
                    "analysis_public",
                    "raw_public",
                    "analysis_sha256",
                    "raw_sha256",
                )
            }
            for decision in approval["cases"]
        ],
    }
    review_bytes = e.json_bytes(public_review)
    e.write_exclusive(output / "review.json", review_bytes)
    public_rows = []
    locators = []
    for row in rows:
        group, case_id = row["group"], row["case_id"]
        decision = review[(group, case_id)]
        row_hash = e.sha(e.json_bytes(row))
        if (
            decision.get("analysis_sha256") != row_hash
            or decision.get("raw_sha256") != row["raw_sha256"]
        ):
            raise e.ContractError("PUBLICATION_HASH_MISMATCH")
        analysis_public = decision["analysis_public"]
        raw_public = decision["raw_public"]
        if raw_public and row["raw_sha256"] is None:
            raise e.ContractError("PUBLICATION_BODY_MISSING")
        if raw_public:
            raw = bounded_path(run_dir, row["raw_locator"]).read_bytes()
            if e.sha(raw) != row["raw_sha256"]:
                raise e.ContractError("PUBLICATION_HASH_MISMATCH")
            public_path = Path("raw") / group / f"{case_id}.body"
            e.write_exclusive(output / public_path, raw)
        else:
            public_path = None
        if analysis_public:
            public_rows.append(row)
        else:
            public_rows.append(
                {
                    "run_id": run_id,
                    "group": group,
                    "case_id": case_id,
                    "status": row["status"],
                    "raw_sha256": row["raw_sha256"],
                    "analysis_restricted": True,
                    "analysis_sha256": row_hash,
                }
            )
        locators.append(
            {
                "group": group,
                "case_id": case_id,
                "raw_sha256": row["raw_sha256"],
                "raw_public_path": str(public_path) if public_path else None,
                "raw_restricted_path": row["raw_locator"]
                if public_path is None
                else None,
                "analysis_sha256": row_hash,
                "analysis_restricted": not analysis_public,
                "restricted_run_version": run_id,
            }
        )
    public_manifest = {
        key: manifest[key]
        for key in LOCAL_MANIFEST_KEYS - {"store_root"}
        if key in manifest
    }
    public_manifest.update(
        {
            "publication": "owner-reviewed",
            "reviewed_by": approval["approved_by"],
            "cases": locators,
            "restricted_store_id": manifest["store"]["store_id"],
            "restricted_access": manifest["store"]["agent_access"],
            "restricted_retention_until": manifest["store"]["retention_until"],
            "summary_sha256": approval["summary_sha256"],
            "review_sha256": e.sha(review_bytes),
            "runner_public_path": "runner.py",
        }
    )
    if run_id != PRE_RECORD_RUN_ID:
        events = (run_dir / "events.jsonl").read_bytes()
        if events != event_log_bytes(rows):
            raise e.ContractError("EVENT_LOG_MISMATCH")
        e.write_exclusive(output / "events.jsonl", events)
        public_manifest["events_sha256"] = e.sha(events)
    e.write_exclusive(output / "manifest.json", e.json_bytes(public_manifest))
    e.write_exclusive(
        output / "analysis.jsonl", b"".join(e.json_bytes(row) for row in public_rows)
    )
    approved_summary = summary_bytes(run_dir)
    if e.sha(approved_summary) != approval["summary_sha256"]:
        raise e.ContractError("PUBLICATION_HASH_MISMATCH")
    e.write_exclusive(output / "summary.json", approved_summary)


def verify_evidence(
    evidence_run: Path,
    restricted_run: Path | None = None,
    candidate_threshold: float | None = None,
) -> dict[str, Any]:
    """Check exact objects and recompute statistics from a clean checkout."""
    verify_replay_sdk()
    manifest = read_manifest(evidence_run / "manifest.json")
    if evidence_run.name != manifest.get("run_id"):
        raise e.ContractError("EVIDENCE_RUN_MISMATCH")
    if not set(manifest).issubset(PUBLIC_MANIFEST_KEYS):
        raise e.ContractError("UNREVIEWED_MANIFEST_FIELD")
    if manifest_identity_gap(manifest, published=True):
        raise e.ContractError("INVALID_EVIDENCE_MANIFEST")
    rows = read_rows(evidence_run / "analysis.jsonl", allow_stubs=True)
    if any(row["run_id"] != manifest.get("run_id") for row in rows):
        raise e.ContractError("RUN_ID_MISMATCH")
    if restricted_run is not None and restricted_run.name != manifest.get("run_id"):
        raise e.ContractError("RESTRICTED_VERSION_MISMATCH")
    locators = manifest.get("cases")
    if not isinstance(locators, list) or len(locators) != 75:
        raise e.ContractError("INVALID_EVIDENCE_MANIFEST")
    if any(
        not isinstance(item, dict)
        or set(item) != LOCATOR_KEYS
        or item.get("group") not in e.GROUPS
        or not isinstance(item.get("case_id"), str)
        or not e.CASE_ID.fullmatch(item["case_id"])
        or not isinstance(item.get("analysis_sha256"), str)
        or not HASH.fullmatch(item["analysis_sha256"])
        or (
            item.get("raw_sha256") is not None
            and (
                not isinstance(item["raw_sha256"], str)
                or not HASH.fullmatch(item["raw_sha256"])
            )
        )
        or type(item.get("analysis_restricted")) is not bool
        or item.get("restricted_run_version") != manifest.get("run_id")
        or not all(
            field in item for field in ("raw_public_path", "raw_restricted_path")
        )
        or any(
            value is not None and not isinstance(value, str)
            for value in (item["raw_public_path"], item["raw_restricted_path"])
        )
        or (
            item.get("raw_sha256") is None
            and (
                item["raw_public_path"] is not None
                or item["raw_restricted_path"] is not None
            )
        )
        or (
            item.get("raw_sha256") is not None
            and (
                (item["raw_public_path"] is None)
                == (item["raw_restricted_path"] is None)
            )
        )
        or (
            item.get("raw_public_path") is not None
            and item["raw_public_path"] != f"raw/{item['group']}/{item['case_id']}.body"
        )
        or (
            item.get("raw_restricted_path") is not None
            and item["raw_restricted_path"]
            != f"responses/{item['group']}/{item['case_id']}.body"
        )
        for item in locators
    ):
        raise e.ContractError("INVALID_EVIDENCE_MANIFEST")
    by_key = {(item["group"], item["case_id"]): item for item in locators}
    if len(by_key) != 75 or set(by_key) != {
        (row["group"], row["case_id"]) for row in rows
    }:
        raise e.ContractError("INVALID_EVIDENCE_MANIFEST")
    gaps = metadata_gaps(evidence_run, manifest, published=True)
    allowed_files = PUBLIC_EVIDENCE_FILES | {
        item["raw_public_path"]
        for item in locators
        if item["raw_public_path"] is not None
    }
    if manifest.get("live_authorization_sha256") is not None:
        allowed_files |= {"authorization.json", "uv.lock", "events.jsonl"}
    for path in evidence_run.rglob("*"):
        if path.is_symlink() or (
            path.is_file()
            and path.relative_to(evidence_run).as_posix() not in allowed_files
        ):
            gaps.append(
                {
                    "reason": "UNREVIEWED_EVIDENCE_FILE",
                    "path": path.relative_to(evidence_run).as_posix(),
                }
            )
    if issue := authorization_gap(evidence_run, manifest):
        gaps.append({"reason": issue})
    source_path = manifest.get("runner_source_path")
    historical_without_source = (
        manifest.get("run_id") == PRE_RECORD_RUN_ID and source_path is None
    )
    if manifest.get("runner_public_path") != "runner.py" or (
        source_path != "runner.py" and not historical_without_source
    ):
        gaps.append({"reason": "RUNNER_SOURCE_MISMATCH"})
    try:
        runner = bounded_path(evidence_run, manifest["runner_public_path"]).read_bytes()
        if e.sha(runner) != manifest.get("runner_sha256"):
            gaps.append({"reason": "RUNNER_SOURCE_MISMATCH"})
        revision = manifest.get("runner_revision")
        if (
            manifest.get("run_id") == PRE_RECORD_RUN_ID
            and revision != PRE_RECORD_RUNNER_REVISION
        ):
            gaps.append({"reason": "RUNNER_REVISION_MISMATCH"})
        if revision is not None:
            if not isinstance(revision, str) or not REVISION.fullmatch(revision):
                gaps.append({"reason": "RUNNER_REVISION_MISMATCH"})
            else:
                committed = subprocess.run(
                    ["git", "show", f"{revision}:{e.RUNNER_RELATIVE.as_posix()}"],
                    cwd=e.ROOT,
                    capture_output=True,
                    check=False,
                )
                if committed.returncode != 0 or committed.stdout != runner:
                    gaps.append({"reason": "RUNNER_REVISION_MISMATCH"})
    except (KeyError, OSError, TypeError, e.ContractError):
        gaps.append({"reason": "RUNNER_SOURCE_MISSING"})
    try:
        review_bytes = (evidence_run / "review.json").read_bytes()
        review = read_review(evidence_run / "review.json")
        if e.sha(review_bytes) != manifest.get("review_sha256"):
            gaps.append({"reason": "REVIEW_HASH_MISMATCH"})
        decisions = review.get("cases")
        if (
            review.get("run_id") != manifest.get("run_id")
            or not isinstance(review.get("approved_by"), str)
            or not review["approved_by"].strip()
            or manifest.get("reviewed_by") != review["approved_by"]
            or review.get("summary_public") is not True
            or review.get("summary_safety_checked") is not True
            or review.get("summary_sha256") != manifest.get("summary_sha256")
            or not isinstance(decisions, list)
            or len(decisions) != 75
            or any(
                not isinstance(decision, dict)
                or decision.get("group") not in e.GROUPS
                or not isinstance(decision.get("case_id"), str)
                or not e.CASE_ID.fullmatch(decision["case_id"])
                for decision in decisions
            )
        ):
            gaps.append({"reason": "REVIEW_MISMATCH"})
        else:
            approved = {
                (decision.get("group"), decision.get("case_id")): decision
                for decision in decisions
                if isinstance(decision, dict)
            }
            if len(approved) != 75 or any(
                (key := (item["group"], item["case_id"])) not in approved
                or approved[key].get("safety_checked") is not True
                or approved[key].get("analysis_sha256") != item["analysis_sha256"]
                or approved[key].get("raw_sha256") != item["raw_sha256"]
                or approved[key].get("analysis_public")
                is not (not item["analysis_restricted"])
                or approved[key].get("raw_public")
                is not (item["raw_public_path"] is not None)
                for item in locators
            ):
                gaps.append({"reason": "REVIEW_MISMATCH"})
    except (OSError, e.ContractError):
        gaps.append({"reason": "REVIEW_MISSING"})
    full_rows = []
    cases = {(case["group"], case["case_id"]): case for case in e.load_cases()}
    question = e.load_question()
    restricted = None
    if restricted_run is not None:
        try:
            restricted = {
                (row["group"], row["case_id"]): row
                for row in read_rows(restricted_run / "analysis.jsonl")
            }
        except e.ContractError:
            restricted = {}
            gaps.append({"reason": "RESTRICTED_ANALYSIS_INVALID"})
    for row in rows:
        key = (row["group"], row["case_id"])
        item = by_key[key]
        restricted_analysis = item["analysis_restricted"]
        if restricted_analysis:
            if (
                set(row)
                != {
                    "run_id",
                    "group",
                    "case_id",
                    "status",
                    "raw_sha256",
                    "analysis_restricted",
                    "analysis_sha256",
                }
                or row["analysis_restricted"] is not True
                or row["analysis_sha256"] != item["analysis_sha256"]
            ):
                gaps.append(
                    {
                        "group": key[0],
                        "case_id": key[1],
                        "reason": "ANALYSIS_VISIBILITY_MISMATCH",
                    }
                )
                continue
        elif row.get("analysis_restricted") is not None:
            gaps.append(
                {
                    "group": key[0],
                    "case_id": key[1],
                    "reason": "ANALYSIS_VISIBILITY_MISMATCH",
                }
            )
            continue
        if row.get("status") in ("VALID", "INVALID") and item.get("raw_sha256") is None:
            gaps.append(
                {"group": key[0], "case_id": key[1], "reason": "CAPTURED_BODY_MISSING"}
            )
            continue
        if restricted_analysis and restricted is not None and key not in restricted:
            gaps.append(
                {
                    "group": key[0],
                    "case_id": key[1],
                    "reason": "RESTRICTED_ANALYSIS_MISSING",
                }
            )
            continue
        full = (
            restricted[key] if restricted_analysis and restricted is not None else row
        )
        if restricted_analysis and restricted is None:
            gaps.append(
                {
                    "group": key[0],
                    "case_id": key[1],
                    "reason": "ANALYSIS_ACCESS_REQUIRED",
                }
            )
            continue
        if e.sha(e.json_bytes(full)) != item["analysis_sha256"]:
            gaps.append(
                {"group": key[0], "case_id": key[1], "reason": "ANALYSIS_HASH_MISMATCH"}
            )
            continue
        if full.get("run_id") != manifest.get("run_id"):
            gaps.append(
                {"group": key[0], "case_id": key[1], "reason": "RUN_ID_MISMATCH"}
            )
            continue
        if restricted_analysis and full.get("status") != row.get("status"):
            gaps.append(
                {
                    "group": key[0],
                    "case_id": key[1],
                    "reason": "ANALYSIS_STATUS_MISMATCH",
                }
            )
            continue
        if (
            full.get("status") in ("VALID", "INVALID")
            or full.get("error_code") in TRANSPORT_ERROR_CODES
        ) and full.get("request_sha256") is None:
            gaps.append(
                {"group": key[0], "case_id": key[1], "reason": "REQUEST_BODY_MISSING"}
            )
            continue
        if (
            full.get("status") == "UNKNOWN"
            and full.get("raw_sha256") is not None
            and full.get("request_sha256") is None
        ):
            gaps.append(
                {"group": key[0], "case_id": key[1], "reason": "REQUEST_BODY_MISSING"}
            )
            continue
        request_hash = full.get("request_sha256")
        if request_hash is not None:
            case = cases.get(key)
            try:
                reconstructed = emitted_request(case, question) if case else None
            except (e.ContractError, e.TypeSafeError, OSError, ValueError):
                reconstructed = None
            if reconstructed is None or e.sha(reconstructed) != request_hash:
                gaps.append(
                    {
                        "group": key[0],
                        "case_id": key[1],
                        "reason": "REQUEST_HASH_MISMATCH",
                    }
                )
                continue
            if restricted_run is not None:
                try:
                    retained = bounded_path(
                        restricted_run, f"requests/{key[0]}/{key[1]}.body"
                    ).read_bytes()
                except (OSError, e.ContractError):
                    retained = None
                if retained != reconstructed:
                    gaps.append(
                        {
                            "group": key[0],
                            "case_id": key[1],
                            "reason": "REQUEST_BODY_MISMATCH",
                        }
                    )
                    continue
        raw_hash = item["raw_sha256"]
        if full.get("raw_sha256") != raw_hash or row.get("raw_sha256") != raw_hash:
            gaps.append(
                {
                    "group": key[0],
                    "case_id": key[1],
                    "reason": "RAW_ANALYSIS_HASH_MISMATCH",
                }
            )
            continue
        if raw_hash is not None:
            if item["raw_public_path"] is not None:
                raw_path = bounded_path(evidence_run, item["raw_public_path"])
            elif restricted_run is not None:
                raw_path = bounded_path(restricted_run, item["raw_restricted_path"])
            else:
                gaps.append(
                    {
                        "group": key[0],
                        "case_id": key[1],
                        "reason": "RAW_ACCESS_REQUIRED",
                    }
                )
                continue
            try:
                raw = raw_path.read_bytes()
                actual = e.sha(raw)
            except OSError:
                actual = None
            if actual != raw_hash:
                gaps.append(
                    {"group": key[0], "case_id": key[1], "reason": "RAW_HASH_MISMATCH"}
                )
                continue
            case = cases.get(key)
            mismatch = (
                response_gap(full, raw, case, question)
                if case
                else "CASE_INVENTORY_MISMATCH"
            )
            if mismatch:
                gaps.append({"group": key[0], "case_id": key[1], "reason": mismatch})
                continue
        full_rows.append(full)
    if len(full_rows) == 75:
        gaps.extend(inventory_gaps(manifest, full_rows))
        if manifest_chronology_gap(manifest, full_rows):
            gaps.append({"reason": "MANIFEST_CHRONOLOGY_MISMATCH"})
        if manifest.get("run_id") == PRE_RECORD_RUN_ID:
            if manifest.get("events_sha256") is not None:
                gaps.append({"reason": "EVENT_LOG_MISMATCH"})
        elif (
            not isinstance(manifest.get("events_sha256"), str)
            or not HASH.fullmatch(manifest["events_sha256"])
            or event_log_gap(evidence_run, full_rows, manifest["events_sha256"])
        ):
            gaps.append({"reason": "EVENT_LOG_MISMATCH"})
    if not gaps:
        try:
            summary = summary_bytes(evidence_run)
        except (OSError, e.ContractError):
            summary = b""
        if e.sha(summary) != manifest.get("summary_sha256"):
            gaps.append({"reason": "SUMMARY_HASH_MISMATCH"})
        if summary:
            recorded = e.read_object(evidence_run / "summary.json")
            recalculated = e.summarize(full_rows)
            if (
                not same_json_value(recorded.get("groups"), recalculated["groups"])
                or not same_json_value(
                    recorded.get("complete"), recalculated["complete"]
                )
                or summary_identity_gap(recorded, manifest.get("run_id"), full_rows)
            ):
                gaps.append({"reason": "SUMMARY_MISMATCH"})
    result = {
        "run_id": manifest.get("run_id"),
        "verified_cases": len(full_rows),
        "gaps": gaps,
        "summary": e.summarize(full_rows) if not gaps else None,
    }
    if candidate_threshold is not None:
        result["candidate_threshold_errors"] = (
            e.candidate_errors(full_rows, candidate_threshold) if not gaps else None
        )
    return result
