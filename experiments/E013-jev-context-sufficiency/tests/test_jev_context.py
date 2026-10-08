"""Offline contract checks; no real Jev call or credential file is read."""

from __future__ import annotations

from copy import deepcopy
import json
import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import httpx2
from typesafe_sdk import (
    Choice,
    RetryPolicy,
    TypeSafeClient,
)

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import jev_context as e
import evidence_tools as evidence


def response(*, extra: bool = False) -> bytes:
    value = {
        "model": e.MODEL,
        "usage": {"input_tokens": 10, "output_tokens": 2},
        "answers": {
            "context_sufficiency": {
                "type": "choice",
                "choice": "SUFFICIENT",
                "confidence": 0.7,
                "probabilities": {"SUFFICIENT": 0.8, "INSUFFICIENT": 0.2},
            }
        },
    }
    if extra:
        value["unknown_field"] = {"new": [1, 2, 3]}
    return json.dumps(value, separators=(",", ":")).encode()


class E013Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.cases = e.load_cases()
        cls.question = e.load_question()

    def test_inventory_has_75_unique_group_case_keys_and_visible_projection(
        self,
    ) -> None:
        self.assertEqual(len(self.cases), 75)
        self.assertEqual(
            len({(case["group"], case["case_id"]) for case in self.cases}), 75
        )
        self.assertEqual([case["group"] for case in self.cases].count("research"), 40)
        self.assertEqual([case["group"] for case in self.cases].count("holdout"), 20)
        self.assertEqual([case["group"] for case in self.cases].count("v0"), 15)
        for case in self.cases:
            self.assertEqual(
                set(case["state"]), {"background", "conversation", "utterance"}
            )
            self.assertTrue(
                all(
                    set(turn) == {"speaker", "text"}
                    for turn in case["state"]["conversation"]
                )
            )

    def test_exact_v1_freeze_attestation_and_mismatch_gate(self) -> None:
        frozen = e.ORACLE / "versions/v1/freeze-attestation.json"
        self.assertEqual(
            e.load_freeze(frozen),
            {
                name: e.sha((e.ORACLE / "versions/v1" / name).read_bytes())
                for name in e.V1_FILES
            },
        )
        with TemporaryDirectory() as temporary:
            attestation = Path(temporary) / "freeze.json"
            changed = e.read_object(frozen)
            changed["review_sha256"] = "0" * 64
            attestation.write_bytes(e.json_bytes(changed))
            with self.assertRaisesRegex(e.ContractError, "V1_NOT_FROZEN"):
                e.load_freeze(attestation)

    def test_response_capture_precedes_sdk_validation_and_preserves_unknown_bytes(
        self,
    ) -> None:
        case = self.cases[0]
        raw = response(extra=True)
        with TemporaryDirectory() as temporary:
            run_dir = Path(temporary)
            sent = []

            def handler(request: httpx2.Request) -> httpx2.Response:
                sent.append(request)
                return httpx2.Response(200, content=raw)

            capture = e.CaptureClient(
                run_dir, case, self.question, transport=httpx2.MockTransport(handler)
            )
            with TypeSafeClient(
                api_key="test-key",
                model=e.MODEL,
                base_url="https://example.invalid",
                retry=RetryPolicy(max_retries=0),
                http_client=capture,
            ) as client:
                parsed = client.system_one(
                    state=case["state"],
                    questions={"context_sufficiency": Choice(**self.question)},
                )
                self.assertEqual(
                    parsed.choices["context_sufficiency"].choice, "SUFFICIENT"
                )
            self.assertEqual(len(sent), 1)
            self.assertEqual(capture.raw_sha, e.sha(raw))
            self.assertEqual((run_dir / capture.raw_path).read_bytes(), raw)
            emitted = (
                run_dir / "requests" / case["group"] / f"{case['case_id']}.body"
            ).read_bytes()
            self.assertEqual(emitted, sent[0].content)
            self.assertEqual(
                set(json.loads(emitted)["state"]),
                {"background", "conversation", "utterance"},
            )
            self.assertNotIn(b"test-key", emitted)

    def test_invalid_2xx_bytes_are_preserved_and_non_2xx_body_is_not(self) -> None:
        case = self.cases[0]
        with TemporaryDirectory() as temporary:
            for status, raw in ((200, b"{bad-json"), (500, b"private-error-body")):
                run_dir = Path(temporary) / str(status)
                run_dir.mkdir()
                capture = e.CaptureClient(
                    run_dir,
                    case,
                    self.question,
                    transport=httpx2.MockTransport(
                        lambda request: httpx2.Response(status, content=raw)
                    ),
                )
                with TypeSafeClient(
                    api_key="test-key",
                    model=e.MODEL,
                    base_url="https://example.invalid",
                    retry=RetryPolicy(max_retries=0),
                    http_client=capture,
                ) as client:
                    with self.assertRaises(Exception):
                        client.system_one(
                            state=case["state"],
                            questions={"context_sufficiency": Choice(**self.question)},
                        )
                if status == 200:
                    self.assertEqual((run_dir / capture.raw_path).read_bytes(), raw)
                else:
                    self.assertIsNone(capture.raw_path)
                    self.assertFalse((run_dir / "responses").exists())

    def test_parse_and_arbitrary_threshold_recomputation_preserve_raw_choice(
        self,
    ) -> None:
        parsed = e.parse_answer(response(extra=True))
        self.assertEqual(parsed["status"], "VALID")
        row = {
            "group": "research",
            "case_id": "x",
            "expected": "INSUFFICIENT",
            **parsed,
        }
        self.assertEqual(
            e.candidate_errors([row], 0.8)["research"]["insufficient_to_sufficient"], 1
        )
        self.assertEqual(
            e.candidate_errors([row], 0.81)["research"]["insufficient_to_sufficient"], 0
        )
        self.assertEqual(row["choice"], "SUFFICIENT")
        self.assertEqual(e.parse_answer(b"{bad")["status"], "INVALID")

    def test_group_summary_does_not_count_missing_as_correct(self) -> None:
        rows = []
        for case in self.cases:
            rows.append(
                {
                    "group": case["group"],
                    "case_id": case["case_id"],
                    "expected": case["expected"],
                    "status": "NOT_RUN",
                    "choice": None,
                }
            )
        summary = e.summarize(rows)
        self.assertFalse(summary["complete"])
        self.assertIsNone(summary["groups"]["research"]["correct_per_valid"])
        self.assertEqual(summary["groups"]["research"]["correct_per_planned"], 0)

    def test_store_policy_rejects_temporary_root(self) -> None:
        with TemporaryDirectory() as temporary:
            store = Path(temporary)
            policy = store / "policy.json"
            policy.write_text(
                json.dumps(
                    {
                        "approved_by": "owner",
                        "store_id": "test",
                        "retention_until": "2099-01-01",
                        "agent_access": "authorized",
                        "versioned_immutable": True,
                        "root": str(store.resolve()),
                    }
                )
            )
            with self.assertRaisesRegex(e.ContractError, "STORE_APPROVAL_MISMATCH"):
                e.load_store_policy(policy, store)

    def test_local_policy_states_no_immutability_or_backup(self) -> None:
        policy = e.read_object(e.TOPIC / "local-store-policy.json")
        self.assertEqual(policy["root"], str(e.LOCAL_STORE_ROOT))
        self.assertEqual(policy["storage_mode"], "local_staging")
        self.assertIs(policy["versioned_immutable"], False)
        self.assertIs(policy["backup_verified"], False)
        self.assertIsNone(policy["retention_until"])

    def test_missing_key_preflight_never_constructs_sdk(self) -> None:
        with (
            patch.object(e, "load_freeze", return_value={}),
            patch.object(e, "load_store_policy", return_value={}),
            patch.object(
                e, "load_live_authorization", return_value=("run-unique", "0" * 64)
            ),
            patch.object(e, "TypeSafeClient") as client,
            patch.dict(os.environ, {"TYPESAFE_API_KEY": ""}),
        ):
            self.assertEqual(
                e.run_live(Path("freeze"), Path("policy"), Path("store"), Path("auth")),
                2,
            )
            client.assert_not_called()

    def test_live_authorization_is_committed_specific_and_one_use(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            auth = root / "live.json"
            freeze = root / "freeze.json"
            policy = root / "policy.json"
            freeze.write_bytes(b"freeze")
            policy.write_bytes(b"policy")
            document = {
                "run_id": "run-unique",
                "authorized_by": "Owner",
                "scope": "one E013 75-case Context Sufficiency run",
                "model": e.MODEL,
                "freeze_attestation_sha256": e.sha(b"freeze"),
                "store_policy_sha256": e.sha(b"policy"),
            }
            auth.write_bytes(e.json_bytes(document))
            with patch.object(
                e.subprocess,
                "run",
                return_value=subprocess.CompletedProcess([], 0, auth.read_bytes()),
            ):
                self.assertEqual(
                    e.load_live_authorization(auth, freeze, policy, root)[0],
                    "run-unique",
                )
                auth.write_bytes(e.json_bytes({**document, "run_id": "reused"}))
                with self.assertRaisesRegex(
                    e.ContractError, "LIVE_AUTHORIZATION_UNVERIFIED"
                ):
                    e.load_live_authorization(auth, freeze, policy, root)
            (root / "runs" / "run-unique").mkdir(parents=True)
            with (
                patch.object(e, "load_freeze", return_value={}),
                patch.object(e, "load_store_policy", return_value={}),
                patch.object(
                    e, "load_live_authorization", return_value=("run-unique", "0" * 64)
                ),
                patch.object(e, "TypeSafeClient") as client,
            ):
                self.assertEqual(e.run_live(freeze, policy, root, auth), 2)
                client.assert_not_called()

    def test_capture_write_failure_retains_no_model_choice(self) -> None:
        case = self.cases[0]
        with TemporaryDirectory() as temporary:
            capture = e.CaptureClient(
                Path(temporary),
                case,
                self.question,
                transport=httpx2.MockTransport(
                    lambda request: httpx2.Response(200, content=response())
                ),
            )
            original = e.write_exclusive

            def fail_response_write(path: Path, data: bytes) -> None:
                if "responses" in path.parts:
                    raise OSError("synthetic write failure")
                original(path, data)

            with (
                patch.object(e, "write_exclusive", side_effect=fail_response_write),
                TypeSafeClient(
                    api_key="test-key",
                    model=e.MODEL,
                    base_url="https://example.invalid",
                    retry=RetryPolicy(max_retries=0),
                    http_client=capture,
                ) as client,
            ):
                with self.assertRaises(OSError):
                    client.system_one(
                        state=case["state"],
                        questions={"context_sufficiency": Choice(**self.question)},
                    )
            self.assertIsNone(capture.raw_path)
            self.assertIsNone(capture.raw_sha)

    def test_request_boundary_mismatch_stops_before_transport(self) -> None:
        case = deepcopy(self.cases[0])
        case["state"]["secret_oracle"] = "INSUFFICIENT"
        with TemporaryDirectory() as temporary:
            capture = e.CaptureClient(
                Path(temporary),
                self.cases[0],
                self.question,
                transport=httpx2.MockTransport(
                    lambda request: self.fail("transport reached")
                ),
            )
            with TypeSafeClient(
                api_key="test-key",
                model=e.MODEL,
                base_url="https://example.invalid",
                retry=RetryPolicy(max_retries=0),
                http_client=capture,
            ) as client:
                with self.assertRaises(e.ContractError):
                    client.system_one(
                        state=case["state"],
                        questions={"context_sufficiency": Choice(**self.question)},
                    )

    def test_reviewed_export_and_clean_checkout_show_restricted_gap(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            restricted = root / "restricted" / "runs" / "run-1"
            restricted.mkdir(parents=True)
            e.write_exclusive(
                restricted / "manifest.json",
                e.json_bytes(
                    {
                        "run_id": "run-1",
                        "model": e.MODEL,
                        "freeze_hashes": e.load_freeze(
                            e.ORACLE / "versions/v1/freeze-attestation.json"
                        ),
                        "v0_hashes": e.V0_HASHES,
                        "rubric_sha256": e.POLICY_HASH,
                        "runner_sha256": "test-runner",
                        "store_root": str(root / "restricted"),
                        "store": {
                            "store_id": "owner-store",
                            "agent_access": "approved agents",
                            "retention_until": None,
                            "storage_mode": "local_staging",
                        },
                    }
                ),
            )
            rows = []
            decisions = []
            raw = response()
            for index, case in enumerate(self.cases):
                body = raw if index < 2 else None
                locator = (
                    f"responses/{case['group']}/{case['case_id']}.body"
                    if body
                    else None
                )
                if body:
                    e.write_exclusive(restricted / locator, body)
                row = {
                    "run_id": "run-1",
                    "ordinal": index + 1,
                    "group": case["group"],
                    "case_id": case["case_id"],
                    "expected": case["expected"],
                    "model": e.MODEL,
                    "rubric_sha256": e.POLICY_HASH,
                    "runner_sha256": "test-runner",
                    "case_version": e.V0_HASHES
                    if case["group"] == "v0"
                    else e.load_freeze(
                        e.ORACLE / "versions/v1/freeze-attestation.json"
                    ),
                    "status": "VALID" if body else "NOT_RUN",
                    "choice": "SUFFICIENT" if body else None,
                    "probabilities": {"SUFFICIENT": 0.8, "INSUFFICIENT": 0.2}
                    if body
                    else None,
                    "confidence": 0.7 if body else None,
                    "raw_sha256": e.sha(body) if body else None,
                    "raw_locator": locator,
                }
                rows.append(row)
                decisions.append(
                    {
                        "group": case["group"],
                        "case_id": case["case_id"],
                        "analysis_public": index != 1,
                        "raw_public": index == 0,
                        "safety_checked": True,
                        "analysis_sha256": e.sha(e.json_bytes(row)),
                        "raw_sha256": row["raw_sha256"],
                    }
                )
            e.write_exclusive(
                restricted / "analysis.jsonl",
                b"".join(e.json_bytes(row) for row in rows),
            )
            e.write_exclusive(
                restricted / "summary.json", e.json_bytes(e.summarize(rows))
            )
            summary = e.read_object(restricted / "summary.json")
            summary.update(
                {
                    "run_id": "run-1",
                    "generated_utc": "2026-10-08T00:00:00Z",
                    "evidence_status": "local-unbacked-until-reviewed-git-export",
                }
            )
            (restricted / "summary.json").write_bytes(e.json_bytes(summary))
            summary_hash = e.sha((restricted / "summary.json").read_bytes())
            approval = root / "approval.json"
            approval.write_bytes(
                e.json_bytes(
                    {
                        "run_id": "run-1",
                        "approved_by": "owner",
                        "summary_public": True,
                        "summary_safety_checked": True,
                        "summary_sha256": summary_hash,
                        "cases": decisions,
                    }
                )
            )
            unchecked = deepcopy(decisions)
            unchecked[0]["safety_checked"] = False
            approval.write_bytes(
                e.json_bytes(
                    {
                        "run_id": "run-1",
                        "approved_by": "owner",
                        "summary_public": True,
                        "summary_safety_checked": True,
                        "summary_sha256": summary_hash,
                        "cases": unchecked,
                    }
                )
            )
            with self.assertRaisesRegex(e.ContractError, "INVALID_PUBLICATION_REVIEW"):
                evidence.publish_reviewed(
                    restricted, approval, root / "checkout-evidence"
                )
            self.assertFalse((root / "checkout-evidence").exists())
            approval.write_bytes(
                e.json_bytes(
                    {
                        "run_id": "run-1",
                        "approved_by": "owner",
                        "summary_public": True,
                        "summary_safety_checked": True,
                        "summary_sha256": summary_hash,
                        "cases": decisions,
                    }
                )
            )
            output = evidence.publish_reviewed(
                restricted, approval, root / "checkout-evidence"
            )
            self.assertEqual(evidence.verify_local_run(restricted)["gaps"], [])
            public_manifest = e.read_object(output / "manifest.json")
            self.assertNotIn("store_root", public_manifest)
            self.assertEqual(
                (
                    output
                    / "raw"
                    / self.cases[0]["group"]
                    / f"{self.cases[0]['case_id']}.body"
                ).read_bytes(),
                raw,
            )
            without_access = evidence.verify_evidence(output)
            self.assertEqual(without_access["verified_cases"], 74)
            self.assertEqual(
                {gap["reason"] for gap in without_access["gaps"]},
                {"ANALYSIS_ACCESS_REQUIRED"},
            )
            with_access = evidence.verify_evidence(output, restricted, 0.8)
            self.assertEqual(with_access["verified_cases"], 75)
            self.assertEqual(with_access["gaps"], [])
            self.assertEqual(
                with_access["candidate_threshold_errors"]["research"]["eligible"], 2
            )
            self.assertEqual(
                with_access["summary"]["groups"]["research"]["planned"], 40
            )
            public_rows = (output / "analysis.jsonl").read_bytes()
            public_manifest = (output / "manifest.json").read_bytes()
            summary_bytes = (output / "summary.json").read_bytes()
            restricted_rows = (restricted / "analysis.jsonl").read_bytes()
            raw_file = (
                output
                / "raw"
                / self.cases[0]["group"]
                / f"{self.cases[0]['case_id']}.body"
            )

            # A coherent forged row/hash still conflicts with the frozen oracle.
            forged = [json.loads(line) for line in public_rows.splitlines()]
            forged[0]["expected"] = (
                "INSUFFICIENT"
                if forged[0]["expected"] == "SUFFICIENT"
                else "SUFFICIENT"
            )
            (output / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in forged)
            )
            altered = e.read_object(output / "manifest.json")
            altered["cases"][0]["analysis_sha256"] = e.sha(e.json_bytes(forged[0]))
            (output / "manifest.json").write_bytes(e.json_bytes(altered))
            self.assertIn(
                "CASE_INVENTORY_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "analysis.jsonl").write_bytes(public_rows)
            (output / "manifest.json").write_bytes(public_manifest)

            # A byte-consistent alternate raw response cannot redefine its analysis.
            changed_raw = response().replace(b'"confidence":0.7', b'"confidence":0.6')
            raw_file.write_bytes(changed_raw)
            altered = e.read_object(output / "manifest.json")
            altered["cases"][0]["raw_sha256"] = e.sha(changed_raw)
            (output / "manifest.json").write_bytes(e.json_bytes(altered))
            self.assertIn(
                "RAW_ANALYSIS_HASH_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            forged = [json.loads(line) for line in public_rows.splitlines()]
            forged[0]["raw_sha256"] = e.sha(changed_raw)
            (output / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in forged)
            )
            altered["cases"][0]["analysis_sha256"] = e.sha(e.json_bytes(forged[0]))
            (output / "manifest.json").write_bytes(e.json_bytes(altered))
            self.assertIn(
                "RAW_ANALYSIS_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            raw_file.write_bytes(raw)
            (output / "analysis.jsonl").write_bytes(public_rows)
            (output / "manifest.json").write_bytes(public_manifest)

            altered_restricted = [
                json.loads(line) for line in restricted_rows.splitlines()
            ]
            altered_restricted[1]["case_id"] = "different-case"
            (restricted / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in altered_restricted)
            )
            # A malformed restricted inventory is a gap, never a traceback.
            self.assertIn(
                "RESTRICTED_ANALYSIS_MISSING",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (restricted / "analysis.jsonl").write_bytes(restricted_rows)

            (output / "summary.json").write_bytes(summary_bytes + b" ")
            self.assertIn(
                "SUMMARY_HASH_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "summary.json").write_bytes(summary_bytes)

            # A failed copy leaves no published run and permits a clean retry.
            second_root = root / "retry-evidence"
            original_write = e.write_exclusive

            def fail_analysis(path: Path, data: bytes) -> None:
                if path.name == "analysis.jsonl":
                    raise OSError("injected failure")
                original_write(path, data)

            with patch.object(e, "write_exclusive", side_effect=fail_analysis):
                with self.assertRaises(OSError):
                    evidence.publish_reviewed(restricted, approval, second_root)
            self.assertFalse((second_root / "runs" / "run-1").exists())
            self.assertEqual(list((second_root / "runs").iterdir()), [])
            evidence.publish_reviewed(restricted, approval, second_root)

            # Even INVALID 2xx observations must carry the captured body.
            altered = e.read_object(output / "manifest.json")
            altered["cases"][0]["raw_sha256"] = None
            (output / "manifest.json").write_bytes(e.json_bytes(altered))
            forged = [json.loads(line) for line in public_rows.splitlines()]
            forged[0]["status"] = "INVALID"
            (output / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in forged)
            )
            self.assertIn(
                "CAPTURED_BODY_MISSING",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "analysis.jsonl").write_bytes(public_rows)
            (output / "manifest.json").write_bytes(public_manifest)
            (
                output
                / "raw"
                / self.cases[0]["group"]
                / f"{self.cases[0]['case_id']}.body"
            ).write_bytes(b"tampered")
            self.assertEqual(
                evidence.verify_evidence(output, restricted)["gaps"][0]["reason"],
                "RAW_HASH_MISMATCH",
            )
            (restricted / rows[0]["raw_locator"]).write_bytes(b"tampered")
            self.assertEqual(
                evidence.verify_local_run(restricted)["gaps"][0]["reason"],
                "RAW_SHA256_MISMATCH",
            )


if __name__ == "__main__":
    unittest.main()
