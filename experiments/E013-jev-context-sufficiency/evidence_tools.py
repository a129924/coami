"""Review-gated export and clean-checkout verification of E013 evidence."""

from __future__ import annotations

import json
from pathlib import Path
import re
import tempfile
from typing import Any

import jev_context as e

HASH = re.compile(r"[0-9a-f]{64}\Z")
STATUSES = {"VALID", "INVALID", "ERROR", "UNKNOWN", "NOT_RUN"}
PRE_RECORD_RUN_ID = "20261008T035450Z-010364d7"


def bounded_path(root: Path, locator: str) -> Path:
    relative = Path(locator)
    if relative.is_absolute() or any(part in ("..", ".") for part in relative.parts):
        raise e.ContractError("INVALID_EVIDENCE_LOCATOR")
    result = root / relative
    if not result.resolve().is_relative_to(root.resolve()):
        raise e.ContractError("INVALID_EVIDENCE_LOCATOR")
    return result


def read_rows(path: Path) -> list[dict[str, Any]]:
    try:
        rows = [json.loads(line) for line in path.read_bytes().splitlines()]
    except (OSError, ValueError) as exc:
        raise e.ContractError("ANALYSIS_UNAVAILABLE") from exc
    if len(rows) != 75 or any(not isinstance(row, dict) for row in rows):
        raise e.ContractError("INVALID_ANALYSIS")
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
    for row in rows:
        status = row.get("status")
        if status not in STATUSES:
            raise e.ContractError("INVALID_ANALYSIS_STATUS")
        if row.get("analysis_restricted") is True:
            continue
        if any(
            row.get(field) is not None
            and (not isinstance(row[field], str) or not HASH.fullmatch(row[field]))
            for field in ("request_sha256", "raw_sha256")
        ):
            raise e.ContractError("INVALID_ANALYSIS_HASH")
        if status == "VALID" and (
            row.get("choice") not in e.CHOICES
            or not isinstance(row.get("probabilities"), dict)
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
        if status in ("INVALID", "ERROR", "UNKNOWN") and not isinstance(
            row.get("error_code"), str
        ):
            raise e.ContractError("INVALID_ANALYSIS_STATUS_FIELDS")
        if status == "NOT_RUN" and row.get("error_code") is not None:
            raise e.ContractError("INVALID_ANALYSIS_STATUS_FIELDS")
    return rows


def summary_bytes(run_dir: Path) -> bytes:
    """Reject extra metadata and require exact, reviewable summary content."""
    data = (run_dir / "summary.json").read_bytes()
    try:
        summary = json.loads(data)
    except (ValueError, UnicodeDecodeError) as exc:
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
    return data


def metadata_gaps(manifest: dict[str, Any]) -> list[dict[str, str]]:
    """Check the honest local-store claims against the tracked approval."""
    try:
        policy = e.read_object(e.TOPIC / "local-store-policy.json")
        store = manifest["store"]
        if not isinstance(store, dict):
            raise ValueError
        if any(
            store.get(name) != policy.get(name)
            for name in ("approved_by", "store_id", "agent_access")
        ):
            raise ValueError
        if any(
            (
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
    except (OSError, KeyError, ValueError, e.ContractError):
        return [{"reason": "STORE_POLICY_MISMATCH"}]
    return []


def summary_identity_gap(summary: dict[str, Any], run_id: str) -> bool:
    return (
        summary.get("run_id") != run_id
        or summary.get("evidence_status") != "local-unbacked-until-reviewed-git-export"
        or summary.get("threshold_selected") is not False
    )


def authorization_gap(root: Path, manifest: dict[str, Any]) -> str | None:
    """The pre-record-gate historical run has no authorization snapshot."""
    expected_hash = manifest.get("live_authorization_sha256")
    if expected_hash is None:
        return (
            None
            if manifest.get("run_id") == PRE_RECORD_RUN_ID
            else "AUTHORIZATION_MISSING"
        )
    if manifest.get("live_authorization_path") != "authorization.json":
        return "AUTHORIZATION_MISSING"
    try:
        data = (root / "authorization.json").read_bytes()
        document = json.loads(data)
        if e.sha(data) != expected_hash:
            return "AUTHORIZATION_HASH_MISMATCH"
        if not isinstance(document, dict) or set(document) != {
            "run_id",
            "authorized_by",
            "scope",
            "model",
            "freeze_attestation_sha256",
            "store_policy_sha256",
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
                != e.sha((e.TOPIC / "local-store-policy.json").read_bytes()),
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
        or manifest.get("conditions")
        != {"timeout_seconds": 30, "retries": 0, "order": list(e.GROUPS)}
    ):
        return [{"reason": "RUN_CONTRACT_MISMATCH"}]
    try:
        freeze = manifest["freeze_hashes"]
        v0 = manifest["v0_hashes"]
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
                "probabilities",
                "confidence",
                "error_code",
            )
        ):
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


def verify_local_run(run_dir: Path) -> dict[str, Any]:
    """Verify current local bytes; this does not establish backup or immutability."""
    manifest = e.read_object(run_dir / "manifest.json")
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
    gaps = inventory_gaps(manifest, rows) + metadata_gaps(manifest)
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
            elif field == "raw_sha256" and row.get("status") in ("VALID", "INVALID"):
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
                mismatch = request_gap(body, cases[(group, case_id)], question)
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
        recorded.get("groups") != recalculated["groups"]
        or recorded.get("complete") != recalculated["complete"]
        or summary_identity_gap(recorded, run_id)
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
    if verify_local_run(run_dir)["gaps"]:
        raise e.ContractError("LOCAL_EVIDENCE_UNVERIFIED")
    manifest = e.read_object(run_dir / "manifest.json")
    approval = e.read_object(approval_path)
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
        key: value for key, value in manifest.items() if key != "store_root"
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
    manifest = e.read_object(evidence_run / "manifest.json")
    rows = read_rows(evidence_run / "analysis.jsonl")
    if any(row["run_id"] != manifest.get("run_id") for row in rows):
        raise e.ContractError("RUN_ID_MISMATCH")
    if restricted_run is not None and restricted_run.name != manifest.get("run_id"):
        raise e.ContractError("RESTRICTED_VERSION_MISMATCH")
    locators = manifest.get("cases")
    if not isinstance(locators, list) or len(locators) != 75:
        raise e.ContractError("INVALID_EVIDENCE_MANIFEST")
    if any(
        not isinstance(item, dict)
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
        for item in locators
    ):
        raise e.ContractError("INVALID_EVIDENCE_MANIFEST")
    by_key = {(item["group"], item["case_id"]): item for item in locators}
    if len(by_key) != 75 or set(by_key) != {
        (row["group"], row["case_id"]) for row in rows
    }:
        raise e.ContractError("INVALID_EVIDENCE_MANIFEST")
    gaps = metadata_gaps(manifest)
    if issue := authorization_gap(evidence_run, manifest):
        gaps.append({"reason": issue})
    try:
        runner = bounded_path(evidence_run, manifest["runner_public_path"]).read_bytes()
        if e.sha(runner) != manifest.get("runner_sha256"):
            gaps.append({"reason": "RUNNER_SOURCE_MISMATCH"})
    except (KeyError, OSError, TypeError, e.ContractError):
        gaps.append({"reason": "RUNNER_SOURCE_MISSING"})
    try:
        review_bytes = (evidence_run / "review.json").read_bytes()
        review = e.read_object(evidence_run / "review.json")
        if e.sha(review_bytes) != manifest.get("review_sha256"):
            gaps.append({"reason": "REVIEW_HASH_MISMATCH"})
        decisions = review.get("cases")
        if (
            review.get("run_id") != manifest.get("run_id")
            or review.get("summary_public") is not True
            or review.get("summary_safety_checked") is not True
            or review.get("summary_sha256") != manifest.get("summary_sha256")
            or not isinstance(decisions, list)
            or len(decisions) != 75
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
        if row.get("status") in ("VALID", "INVALID") and item.get("raw_sha256") is None:
            gaps.append(
                {"group": key[0], "case_id": key[1], "reason": "CAPTURED_BODY_MISSING"}
            )
            continue
        if (
            row.get("analysis_restricted")
            and restricted is not None
            and key not in restricted
        ):
            gaps.append(
                {
                    "group": key[0],
                    "case_id": key[1],
                    "reason": "RESTRICTED_ANALYSIS_MISSING",
                }
            )
            continue
        full = (
            restricted[key]
            if row.get("analysis_restricted") and restricted is not None
            else row
        )
        if row.get("analysis_restricted") and restricted is None:
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
        if (
            full.get("status") in ("VALID", "INVALID")
            and full.get("request_sha256") is None
        ):
            gaps.append(
                {"group": key[0], "case_id": key[1], "reason": "REQUEST_BODY_MISSING"}
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
                recorded.get("groups") != recalculated["groups"]
                or recorded.get("complete") != recalculated["complete"]
                or summary_identity_gap(recorded, manifest.get("run_id"))
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
