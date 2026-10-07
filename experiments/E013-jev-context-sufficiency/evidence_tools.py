"""Review-gated export and clean-checkout verification of E013 evidence."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import jev_context as e


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
    keys = [(row.get("run_id"), row.get("group"), row.get("case_id")) for row in rows]
    if len(set(keys)) != 75:
        raise e.ContractError("DUPLICATE_ANALYSIS_KEY")
    if any(
        not isinstance(row.get("run_id"), str)
        or not e.CASE_ID.fullmatch(row["run_id"])
        or row.get("group") not in e.GROUPS
        or not isinstance(row.get("case_id"), str)
        or not e.CASE_ID.fullmatch(row["case_id"])
        for row in rows
    ):
        raise e.ContractError("INVALID_ANALYSIS_KEY")
    return rows


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
    if any(row["run_id"] != run_id for row in rows):
        raise e.ContractError("RUN_ID_MISMATCH")
    gaps = []
    for row in rows:
        group, case_id = row["group"], row["case_id"]
        if row.get("status") == "VALID" and row.get("raw_sha256") is None:
            gaps.append(
                {"group": group, "case_id": case_id, "reason": "VALID_BODY_MISSING"}
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
                actual = e.sha(bounded_path(run_dir, locator).read_bytes())
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
    recorded = e.read_object(run_dir / "summary.json")
    recalculated = e.summarize(rows)
    if (
        recorded.get("groups") != recalculated["groups"]
        or recorded.get("complete") != recalculated["complete"]
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
    ):
        raise e.ContractError("PUBLICATION_NOT_APPROVED")
    rows = read_rows(run_dir / "analysis.jsonl")
    if any(row["run_id"] != run_id for row in rows):
        raise e.ContractError("RUN_ID_MISMATCH")
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
    output.mkdir(mode=0o700, parents=True, exist_ok=False)
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
        }
    )
    e.write_exclusive(output / "manifest.json", e.json_bytes(public_manifest))
    e.write_exclusive(
        output / "analysis.jsonl", b"".join(e.json_bytes(row) for row in public_rows)
    )
    e.write_exclusive(output / "summary.json", (run_dir / "summary.json").read_bytes())
    return output


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
        for item in locators
    ):
        raise e.ContractError("INVALID_EVIDENCE_MANIFEST")
    by_key = {(item["group"], item["case_id"]): item for item in locators}
    if len(by_key) != 75 or set(by_key) != {
        (row["group"], row["case_id"]) for row in rows
    }:
        raise e.ContractError("INVALID_EVIDENCE_MANIFEST")
    gaps = []
    full_rows = []
    restricted = None
    if restricted_run is not None:
        restricted = {
            (row["group"], row["case_id"]): row
            for row in read_rows(restricted_run / "analysis.jsonl")
        }
    for row in rows:
        key = (row["group"], row["case_id"])
        item = by_key[key]
        if row.get("status") == "VALID" and item.get("raw_sha256") is None:
            gaps.append(
                {"group": key[0], "case_id": key[1], "reason": "VALID_BODY_MISSING"}
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
        raw_hash = item["raw_sha256"]
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
                actual = e.sha(raw_path.read_bytes())
            except OSError:
                actual = None
            if actual != raw_hash:
                gaps.append(
                    {"group": key[0], "case_id": key[1], "reason": "RAW_HASH_MISMATCH"}
                )
                continue
        full_rows.append(full)
    if not gaps:
        recorded = e.read_object(evidence_run / "summary.json")
        recalculated = e.summarize(full_rows)
        if (
            recorded.get("groups") != recalculated["groups"]
            or recorded.get("complete") != recalculated["complete"]
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
