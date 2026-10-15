"""Offline contract checks; no real Jev call or credential file is read."""

from __future__ import annotations

from copy import deepcopy
import base64
import hashlib
from importlib.machinery import SourceFileLoader
import json
import os
from pathlib import Path
import py_compile
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory
from types import ModuleType, SimpleNamespace
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
            attestation.write_bytes(
                (json.dumps(changed, ensure_ascii=False, indent=2) + "\n").encode()
            )
            with self.assertRaisesRegex(e.ContractError, "V1_NOT_FROZEN"):
                e.load_freeze(attestation)

            original = frozen.read_bytes()
            attestation.write_bytes(
                original.replace(
                    b'  "frozen": true,', b'  "frozen": false,\n  "frozen": true,'
                )
            )
            with self.assertRaisesRegex(e.ContractError, "INVALID_FREEZE_ATTESTATION"):
                e.load_freeze(attestation)
            for field, value in (
                ("snapshot_id", "v1-draft-003"),
                ("freeze_version", "other-version"),
                ("frozen_utc", "not-a-time"),
                ("fixture_reviewer", "Owner"),
                ("fixture_verdict", "rejected"),
                ("extra", "unreviewed"),
            ):
                altered = e.read_object(frozen)
                altered[field] = value
                attestation.write_bytes(
                    (json.dumps(altered, ensure_ascii=False, indent=2) + "\n").encode()
                )
                with (
                    self.subTest(field=field),
                    self.assertRaisesRegex(
                        e.ContractError, "INVALID_FREEZE_ATTESTATION"
                    ),
                ):
                    e.load_freeze(attestation)
            attestation.write_bytes(e.json_bytes(e.read_object(frozen)))
            with self.assertRaisesRegex(e.ContractError, "INVALID_FREEZE_ATTESTATION"):
                e.load_freeze(attestation)

    def test_live_requires_python_312_before_using_authorization(self) -> None:
        with TemporaryDirectory() as temporary:
            store = Path(temporary)
            with (
                patch.object(e.sys, "version_info", (3, 13, 0)),
                patch.object(e, "load_freeze") as load_freeze,
                patch.object(e, "TypeSafeClient") as client,
            ):
                self.assertEqual(e.run_live(Path("freeze"), Path("policy"), store), 2)
                load_freeze.assert_not_called()
                client.assert_not_called()
            self.assertFalse((store / "authorization-uses").exists())

    def test_live_rejects_review_bytes_that_differ_from_head(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            attestation = root / e.FREEZE_RELATIVE
            review = root / "evaluation/context_sufficiency/versions/v1/review.md"
            attestation.parent.mkdir(parents=True)
            attestation.write_bytes(b"attestation")
            review.write_bytes(b"temporarily accepted")
            with (
                patch.object(e, "committed_git_bytes", return_value=b"revoked"),
                patch.object(e, "load_freeze") as load_freeze,
                patch.object(e, "TypeSafeClient") as client,
            ):
                self.assertEqual(
                    e.run_live(attestation, root / e.POLICY_RELATIVE, root, root=root),
                    2,
                )
                load_freeze.assert_not_called()
                client.assert_not_called()

    def test_frozen_validators_have_no_site_hooks_or_api_key(self) -> None:
        freeze = e.load_freeze(e.ORACLE / "versions/v1/freeze-attestation.json")
        sources = e.read_frozen_case_sources(e.ROOT, freeze)
        with (
            patch.dict(os.environ, {"TYPESAFE_API_KEY": "secret"}),
            patch.object(
                e.subprocess,
                "run",
                return_value=subprocess.CompletedProcess([], 0, b""),
            ) as run,
        ):
            e.validate_oracles(e.ROOT, freeze, sources)
        self.assertEqual(run.call_count, 2)
        for call in run.call_args_list:
            self.assertEqual(call.args[0][1:4], ["-I", "-S", "-B"])
            self.assertNotIn("TYPESAFE_API_KEY", call.kwargs["env"])

    def test_deep_json_response_is_a_fixed_invalid_result(self) -> None:
        raw = b"[" * 10000 + b"0" + b"]" * 10000
        parsed = e.parse_answer(raw)
        self.assertEqual(parsed["status"], "INVALID")
        self.assertEqual(parsed["error_code"], "INVALID_RESPONSE")
        self.assertTrue(evidence.sdk_rejects(raw, self.cases[0], self.question))
        self.assertEqual(
            evidence.request_gap(raw, self.cases[0], self.question),
            "REQUEST_CONTENT_MISMATCH",
        )

    def test_deep_analysis_json_reports_contract_failure(self) -> None:
        with TemporaryDirectory() as temporary:
            analysis = Path(temporary) / "analysis.jsonl"
            analysis.write_bytes(b"[" * 10000 + b"0" + b"]" * 10000 + b"\n")
            with self.assertRaisesRegex(e.ContractError, "ANALYSIS_UNAVAILABLE"):
                evidence.read_rows(analysis)

    def test_deep_manifest_json_reports_contract_failure(self) -> None:
        with TemporaryDirectory() as temporary:
            manifest = Path(temporary) / "manifest.json"
            manifest.write_bytes(b"[" * 10000 + b"0" + b"]" * 10000 + b"\n")
            with self.assertRaisesRegex(e.ContractError, "INVALID_EVIDENCE_MANIFEST"):
                evidence.read_manifest(manifest)

    def test_deep_gate_json_reports_contract_failure(self) -> None:
        nested = b"[" * 1200 + b"0" + b"]" * 1200
        for code in ("INVALID_FREEZE_ATTESTATION", "STORE_POLICY_MISMATCH"):
            with self.subTest(code=code):
                with self.assertRaisesRegex(e.ContractError, code):
                    e.parse_gate_document(nested, code)
        with self.assertRaisesRegex(e.ContractError, "LIVE_AUTHORIZATION_UNVERIFIED"):
            e.parse_live_authorization(nested)

    def test_symlink_loop_locator_reports_contract_failure(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "raw.body").symlink_to("raw.body")
            with self.assertRaisesRegex(e.ContractError, "INVALID_EVIDENCE_LOCATOR"):
                evidence.bounded_path(root, "raw.body")

    def test_fifo_manifest_is_rejected_before_open(self) -> None:
        with TemporaryDirectory() as temporary:
            run = Path(temporary) / "run-1"
            run.mkdir()
            os.mkfifo(run / "manifest.json")
            with self.assertRaisesRegex(e.ContractError, "INVALID_EVIDENCE_FILE"):
                evidence.read_manifest(run / "manifest.json")
            with self.assertRaisesRegex(e.ContractError, "INVALID_EVIDENCE_FILE"):
                evidence.verify_evidence(run)

    def test_evidence_read_rejects_a_file_replaced_at_open(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            artifact = root / "artifact"
            artifact.write_bytes(b"reviewed")
            target = root / "target"
            target.write_bytes(b"other")
            real_open = os.open

            def replace_with_symlink(path: Path, flags: int) -> int:
                self.assertTrue(flags & os.O_NOFOLLOW)
                self.assertTrue(flags & os.O_NONBLOCK)
                artifact.unlink()
                artifact.symlink_to(target)
                return real_open(path, flags)

            with patch.object(evidence.os, "open", side_effect=replace_with_symlink):
                with self.assertRaisesRegex(e.ContractError, "INVALID_EVIDENCE_FILE"):
                    evidence.regular_bytes(artifact)
            artifact.unlink()
            os.mkfifo(artifact)
            with self.assertRaisesRegex(e.ContractError, "INVALID_EVIDENCE_FILE"):
                evidence.regular_bytes(artifact)

    def test_freeze_sources_use_fixed_revision_and_reject_fifo(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            paths = [
                e.FREEZE_RELATIVE,
                Path("evaluation/context_sufficiency/versions/v1/review.md"),
                *(
                    Path("evaluation/context_sufficiency/versions/v1") / name
                    for name in e.V1_FILES
                ),
                *(
                    Path("evaluation/context_sufficiency") / name
                    for name in e.V0_HASHES
                ),
            ]
            committed = {}
            for path in paths:
                local = root / path
                local.parent.mkdir(parents=True, exist_ok=True)
                local.write_bytes(path.as_posix().encode())
                committed[path.as_posix()] = local.read_bytes()
            revision = "a" * 40

            def git_show(repo: Path, arguments: list[str]) -> bytes:
                self.assertEqual(repo, root)
                self.assertEqual(arguments[0], "show")
                fixed, name = arguments[1].split(":", 1)
                self.assertEqual(fixed, revision)
                return committed[name]

            with (
                patch.object(e, "ROOT", root),
                patch.object(e, "checked_git", side_effect=git_show),
            ):
                self.assertEqual(
                    evidence.committed_freeze_sources(revision),
                    {path: committed[path.as_posix()] for path in paths},
                )
                first = root / paths[0]
                first.unlink()
                os.mkfifo(first)
                with self.assertRaisesRegex(
                    e.ContractError, "FREEZE_SOURCE_UNCOMMITTED"
                ):
                    evidence.committed_freeze_sources(revision)

    def test_unavailable_historical_replay_revision_is_a_contract_error(self) -> None:
        with patch.object(
            e,
            "checked_git",
            side_effect=subprocess.CalledProcessError(128, ["git", "show"]),
        ):
            with self.assertRaisesRegex(
                e.ContractError, "SDK_REPLAY_INVENTORY_MISSING"
            ):
                evidence.verify_replay_sdk(
                    Path("unused"), {"run_id": evidence.PRE_RECORD_RUN_ID}
                )

    def test_committed_verifier_rejects_modified_public_bytes(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            run = root / e.RUNNER_RELATIVE.parent / "evidence/runs/run-1"
            run.mkdir(parents=True)
            (run / "manifest.json").write_bytes(b"{}\n")
            (run / "raw.body").write_bytes(b"original")
            subprocess.run(["git", "init", "-q", str(root)], check=True)
            subprocess.run(["git", "-C", str(root), "add", "."], check=True)
            subprocess.run(
                [
                    "git",
                    "-C",
                    str(root),
                    "-c",
                    "user.name=Test",
                    "-c",
                    "user.email=test@example.invalid",
                    "commit",
                    "-qm",
                    "evidence",
                ],
                check=True,
            )
            captured = []

            def inspect_snapshot(
                snapshot: Path, *_args: object, **_kwargs: object
            ) -> dict[str, object]:
                captured.append((snapshot / "raw.body").read_bytes())
                self.assertEqual(
                    _kwargs["evidence_revision"],
                    subprocess.check_output(
                        ["git", "-C", str(root), "rev-parse", "HEAD"]
                    )
                    .decode()
                    .strip(),
                )
                return {"gaps": []}

            with (
                patch.object(e, "ROOT", root),
                patch.object(e, "TOPIC", root / e.RUNNER_RELATIVE.parent),
                patch.object(evidence, "verify_evidence", side_effect=inspect_snapshot),
            ):
                self.assertEqual(evidence.verify_committed_evidence(run)["gaps"], [])
                self.assertEqual(captured, [b"original"])
                (run / "raw.body").write_bytes(b"forged")
                with self.assertRaisesRegex(
                    e.ContractError, "PUBLIC_EVIDENCE_UNCOMMITTED"
                ):
                    evidence.verify_committed_evidence(run)

    def test_public_verifier_reuses_evidence_revision_for_freeze(self) -> None:
        revision = (
            e.checked_git(e.ROOT, ["rev-parse", "HEAD^{commit}"]).decode().strip()
        )
        run = e.TOPIC / "evidence/runs/20261008T035450Z-010364d7"
        with patch.object(
            evidence,
            "committed_freeze_sources",
            wraps=evidence.committed_freeze_sources,
        ) as sources:
            verified = evidence.verify_evidence(run, evidence_revision=revision)
        self.assertEqual(verified["verified_cases"], 75)
        self.assertEqual(verified["gaps"], [])
        sources.assert_called_once_with(revision)

    def test_live_store_rejects_redirected_subdirectories(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            store = root / "approved"
            outside = root / "outside"
            store.mkdir()
            outside.mkdir()
            (store / "runs").symlink_to(outside, target_is_directory=True)
            with self.assertRaisesRegex(e.ContractError, "STORE_BOUNDARY_MISMATCH"):
                e.ensure_live_store_boundary(store)
            self.assertFalse((store / "authorization-uses").exists())
            (store / "runs").unlink()
            e.ensure_live_store_boundary(store)
            self.assertTrue((store / "runs").is_dir())
            self.assertTrue((store / "authorization-uses").is_dir())

    def test_summary_comparison_rejects_bool_integer_aliases(self) -> None:
        expected = e.summarize([])
        altered = deepcopy(expected)
        altered["complete"] = int(expected["complete"])
        self.assertFalse(evidence.same_json_value(altered, expected))
        altered = deepcopy(expected)
        altered["groups"]["research"]["valid"] = False
        self.assertFalse(evidence.same_json_value(altered, expected))
        self.assertTrue(evidence.same_json_value(expected, deepcopy(expected)))

    def test_validator_executes_frozen_source_and_rejects_replacement(self) -> None:
        v1 = e.ORACLE / "versions/v1"
        freeze = {
            "validate_dataset.py": e.sha((v1 / "validate_dataset.py").read_bytes())
        }
        sources = {
            "research": (v1 / "context_sufficiency_v1.jsonl").read_bytes(),
            "v0": (e.ORACLE / "dataset/context_sufficiency_v0.jsonl").read_bytes(),
        }
        e.validate_oracles(e.ROOT, freeze, sources)
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            for relative in (
                "evaluation/context_sufficiency/validate_dataset.py",
                "evaluation/context_sufficiency/versions/v1/validate_dataset.py",
            ):
                target = root / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes((e.ROOT / relative).read_bytes())
            altered = root / "evaluation/context_sufficiency/validate_dataset.py"
            altered.write_bytes(b"raise SystemExit(0)\n")
            with self.assertRaisesRegex(e.ContractError, "ORACLE_VALIDATOR_MISMATCH"):
                e.validate_oracles(root, freeze, sources)

    def test_sdk_preflight_rejects_shadowed_import_environment(self) -> None:
        lock = b"""[[package]]
name = "typesafe-sdk"
version = "0.7.2"
source = { registry = "https://pypi.org/simple" }
[[package]]
name = "httpx2"
version = "2.13.1"
source = { registry = "https://pypi.org/simple" }
[[package]]
name = "pydantic"
version = "2.13.5"
source = { registry = "https://pypi.org/simple" }
"""
        with patch.dict(os.environ, {"PYTHONPATH": "/unreviewed"}):
            with self.assertRaisesRegex(e.ContractError, "SDK_IMPORT_MISMATCH"):
                e.verify_sdk_imports(lock)
        with TemporaryDirectory() as temporary:
            topic = Path(temporary)
            environment = topic / ".venv"
            site = environment / "lib/python3.12/site-packages"
            packages = {}
            loaded = {}
            digests: dict[str, dict[str, str]] = {}

            class FakeEntry(SimpleNamespace):
                def __str__(self) -> str:
                    return "/".join(self.parts)

            for name, prefix, expected_version in (
                ("typesafe-sdk", "typesafe_sdk", e.SDK_VERSION),
                ("httpx2", "httpx2", e.HTTPX2_VERSION),
                ("pydantic", "pydantic", "2.13.5"),
            ):
                location = site / prefix / "__init__.py"
                location.parent.mkdir(parents=True)
                location.write_bytes(b"verified source\n")
                digest = (
                    base64.urlsafe_b64encode(
                        hashlib.sha256(location.read_bytes()).digest()
                    )
                    .rstrip(b"=")
                    .decode("ascii")
                )
                entry = FakeEntry(
                    parts=(prefix, "__init__.py"),
                    suffix=".py",
                    hash=SimpleNamespace(mode="sha256", value=digest),
                )
                digests[name] = {str(entry): e.sha(location.read_bytes())}
                packages[name] = SimpleNamespace(
                    version=expected_version,
                    files=[entry],
                    locate_file=lambda unused, path=location: path,
                )
                module = ModuleType(prefix)
                module.__loader__ = SourceFileLoader(prefix, str(location))
                module.__spec__ = SimpleNamespace(origin=str(location))
                loaded[prefix] = module
            digest_bytes = e.json_bytes({"lock_sha256": e.sha(lock), "files": digests})
            with (
                patch.object(e, "TOPIC", topic),
                patch.object(e, "SDK_DIGESTS_SHA256", e.sha(digest_bytes)),
                patch.object(e.sys, "prefix", str(environment)),
                patch.object(e, "distribution", side_effect=packages.__getitem__),
                patch.object(e.sys, "modules", loaded),
                patch.dict(os.environ, {"PYTHONPATH": ""}),
            ):
                e.verify_sdk_imports(lock, digest_bytes)
                (site / "httpx2/__init__.py").write_bytes(b"modified source\n")
                with self.assertRaisesRegex(e.ContractError, "SDK_IMPORT_MISMATCH"):
                    e.verify_sdk_imports(lock, digest_bytes)

                packages["httpx2"].files[0].hash.value = (
                    base64.urlsafe_b64encode(
                        hashlib.sha256(b"modified source\n").digest()
                    )
                    .rstrip(b"=")
                    .decode("ascii")
                )
                with self.assertRaisesRegex(e.ContractError, "SDK_IMPORT_MISMATCH"):
                    e.verify_sdk_imports(lock, digest_bytes)
                (site / "httpx2/__init__.py").write_bytes(b"verified source\n")
                packages["httpx2"].files[0].hash.value = digest
                loaded["pydantic"].__spec__.origin = str(topic / "pydantic.py")
                with self.assertRaisesRegex(e.ContractError, "SDK_IMPORT_MISMATCH"):
                    e.verify_sdk_imports(lock, digest_bytes)

    def test_sdk_digest_baseline_is_runner_pinned(self) -> None:
        data = (e.ROOT / e.SDK_DIGESTS_RELATIVE).read_bytes()
        document = json.loads(data)
        self.assertEqual(e.sha(data), e.SDK_DIGESTS_SHA256)
        self.assertEqual(
            document["lock_sha256"], e.sha((e.ROOT / e.LOCK_RELATIVE).read_bytes())
        )
        self.assertEqual(sum(map(len, document["files"].values())), 287)

    def test_historical_review_and_authorization_shapes_cannot_be_erased(self) -> None:
        manifest = {"run_id": e.HISTORICAL_RUN_ID}
        with TemporaryDirectory() as temporary:
            review = {
                "run_id": e.HISTORICAL_RUN_ID,
                "approved_by": "Owner",
                "summary_public": True,
                "summary_safety_checked": True,
                "summary_sha256": "0" * 64,
                "cases": [],
                "method": evidence.HISTORICAL_REVIEW_METHOD,
                "reviewed_utc": "2026-10-08T04:00:00+00:00",
            }
            path = Path(temporary) / "review.json"
            path.write_bytes(e.json_bytes(review))
            self.assertEqual(evidence.read_review(path), review)
            del review["method"]
            del review["reviewed_utc"]
            for decision in review["cases"]:
                del decision["checks"]
            path.write_bytes(e.json_bytes(review))
            with self.assertRaisesRegex(e.ContractError, "INVALID_PUBLICATION_REVIEW"):
                evidence.read_review(path)
        for field, value in (
            ("live_authorization_sha256", "0" * 64),
            ("live_authorization_path", "authorization.json"),
            ("uv_lock_path", "uv.lock"),
            ("uv_lock_sha256", "0" * 64),
            ("sdk_code_digests_path", "sdk-code-digests.json"),
            ("sdk_code_digests_sha256", "0" * 64),
        ):
            altered = deepcopy(manifest)
            altered[field] = value
            with self.subTest(field=field):
                self.assertEqual(
                    evidence.authorization_gap(Path(temporary), altered),
                    "AUTHORIZATION_MISMATCH",
                )

    def test_live_cases_use_validated_source_bytes(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            source_paths = {
                "research": root
                / "evaluation/context_sufficiency/versions/v1/context_sufficiency_v1.jsonl",
                "v0": root
                / "evaluation/context_sufficiency/dataset/context_sufficiency_v0.jsonl",
            }
            for group, path in source_paths.items():
                original = (
                    e.ORACLE
                    / (
                        "versions/v1/context_sufficiency_v1.jsonl"
                        if group == "research"
                        else "dataset/context_sufficiency_v0.jsonl"
                    )
                ).read_bytes()
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(original)
            hashes = e.load_freeze(e.ORACLE / "versions/v1/freeze-attestation.json")
            snapshot = e.read_frozen_case_sources(root, hashes)
            expected = e.load_cases(root, snapshot)
            source_paths["research"].write_bytes(b"changed after snapshot")
            self.assertEqual(e.load_cases(root, snapshot), expected)
            with self.assertRaisesRegex(e.ContractError, "CASE_SOURCE_MISMATCH"):
                e.read_frozen_case_sources(root, hashes)

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
            ambiguous = raw.replace(
                b'"choice":"SUFFICIENT"',
                b'"choice":"INSUFFICIENT","choice":"SUFFICIENT"',
            )
            self.assertEqual(
                e.parse_answer(ambiguous)["error_code"], "DUPLICATE_RESPONSE_FIELD"
            )
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
                self.assertIs(capture._trust_env, False)
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

    def test_invalid_analysis_cannot_hide_a_valid_captured_choice(self) -> None:
        case = self.cases[0]
        forged = {
            "status": "INVALID",
            "choice": None,
            "probabilities": None,
            "confidence": None,
            "error_code": "SDK_RESPONSE_INVALID",
            "model": e.MODEL,
        }
        self.assertEqual(
            evidence.response_gap(forged, response(), case, self.question),
            "RAW_ANALYSIS_MISMATCH",
        )
        forged["error_code"] = "INVALID_RESPONSE"
        self.assertEqual(
            evidence.response_gap(forged, response(), case, self.question),
            "RAW_ANALYSIS_MISMATCH",
        )
        self.assertEqual(
            evidence.response_gap(forged, b"{bad", case, self.question),
            "RAW_ANALYSIS_MISMATCH",
        )
        forged["error_code"] = "SDK_RESPONSE_INVALID"
        self.assertIsNone(evidence.response_gap(forged, b"{bad", case, self.question))
        for status in ("ERROR", "UNKNOWN"):
            forged["status"] = status
            self.assertEqual(
                evidence.response_gap(forged, response(), case, self.question),
                "UNEXPECTED_CAPTURED_BODY",
            )

    def test_valid_analysis_requires_pinned_sdk_acceptance(self) -> None:
        case = self.cases[0]
        raw = response().replace(b'"input_tokens":10', b'"input_tokens":"bad"')
        parsed = e.parse_answer(raw)
        self.assertEqual(parsed["status"], "VALID")
        self.assertTrue(evidence.sdk_rejects(raw, case, self.question))
        row = {**parsed, "model": e.MODEL}
        self.assertEqual(
            evidence.response_gap(row, raw, case, self.question),
            "RAW_ANALYSIS_MISMATCH",
        )

    def test_sdk_recursion_is_not_an_invalid_response(self) -> None:
        case = self.cases[0]
        row = {
            "status": "INVALID",
            "choice": None,
            "probabilities": None,
            "confidence": None,
            "error_code": "SDK_RESPONSE_INVALID",
            "model": e.MODEL,
        }
        with patch.object(e.TypeSafeClient, "system_one", side_effect=RecursionError):
            self.assertEqual(
                evidence.response_gap(row, response(), case, self.question),
                "SDK_REPLAY_RUNTIME_FAILED",
            )

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

    def test_retained_policy_identity_requires_nonempty_strings(self) -> None:
        original = e.read_object(e.TOPIC / "local-store-policy.json")
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            for field in ("approved_by", "store_id", "agent_access"):
                for value in ("", False, [], {}):
                    policy = deepcopy(original)
                    policy[field] = value
                    data = (
                        json.dumps(policy, ensure_ascii=False, indent=2) + "\n"
                    ).encode()
                    (root / "store-policy.json").write_bytes(data)
                    store = {key: policy[key] for key in policy if key != "root"}
                    manifest = {
                        "store_policy_path": "store-policy.json",
                        "store_policy_sha256": e.sha(data),
                        "store": store,
                        "restricted_store_id": policy["store_id"],
                        "restricted_access": policy["agent_access"],
                        "restricted_retention_until": None,
                    }
                    self.assertEqual(
                        evidence.metadata_gaps(root, manifest, published=True),
                        [{"reason": "STORE_POLICY_MISMATCH"}],
                    )

    def test_retained_policy_state_matches_live_gate(self) -> None:
        original = e.read_object(e.TOPIC / "local-store-policy.json")
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            for field, value in (
                ("storage_mode", "remote"),
                ("versioned_immutable", True),
                ("backup_verified", True),
                ("retention_until", "2099-01-01"),
            ):
                with self.subTest(field=field):
                    policy = deepcopy(original)
                    policy[field] = value
                    data = (
                        json.dumps(policy, ensure_ascii=False, indent=2) + "\n"
                    ).encode()
                    (root / "store-policy.json").write_bytes(data)
                    manifest = {
                        "store_policy_path": "store-policy.json",
                        "store_policy_sha256": e.sha(data),
                        "store": {
                            key: original[key] for key in original if key != "root"
                        },
                        "restricted_store_id": original["store_id"],
                        "restricted_access": original["agent_access"],
                        "restricted_retention_until": None,
                    }
                    self.assertEqual(
                        evidence.metadata_gaps(root, manifest, published=True),
                        [{"reason": "STORE_POLICY_MISMATCH"}],
                    )

    def test_store_policy_gate_rejects_duplicate_and_noncanonical_json(self) -> None:
        original = (e.TOPIC / "local-store-policy.json").read_bytes()
        with TemporaryDirectory() as temporary:
            path = Path(temporary) / "policy.json"
            path.write_bytes(
                original.replace(
                    b'  "backup_verified": false,',
                    b'  "backup_verified": true,\n  "backup_verified": false,',
                )
            )
            with self.assertRaisesRegex(e.ContractError, "STORE_APPROVAL_MISMATCH"):
                e.load_store_policy(path, e.LOCAL_STORE_ROOT)
            path.write_bytes(
                e.json_bytes(e.read_object(e.TOPIC / "local-store-policy.json"))
            )
            with self.assertRaisesRegex(e.ContractError, "STORE_APPROVAL_MISMATCH"):
                e.load_store_policy(path, e.LOCAL_STORE_ROOT)

    def test_reviewed_summary_rejects_duplicate_and_noncanonical_json(self) -> None:
        source = (
            e.TOPIC / "evidence/runs/20261008T035450Z-010364d7/summary.json"
        ).read_bytes()
        with TemporaryDirectory() as temporary:
            path = Path(temporary) / "summary.json"
            path.write_bytes(source)
            self.assertEqual(evidence.summary_bytes(path.parent), source)
            path.write_bytes(
                source.replace(
                    b'"complete": true', b'"complete": false, "complete": true'
                )
            )
            with self.assertRaisesRegex(e.ContractError, "INVALID_SUMMARY"):
                evidence.summary_bytes(path.parent)
            changed = json.loads(source)
            for bad_time in (None, "not-a-time", "2026-10-08T00:00:00"):
                changed["generated_utc"] = bad_time
                path.write_bytes(e.json_bytes(changed))
                with self.assertRaisesRegex(e.ContractError, "INVALID_SUMMARY"):
                    evidence.summary_bytes(path.parent)
            path.write_bytes(source + b" ")
            with self.assertRaisesRegex(e.ContractError, "INVALID_SUMMARY"):
                evidence.summary_bytes(path.parent)
            path.write_bytes(b"[" * 1200 + b"0" + b"]" * 1200)
            with self.assertRaisesRegex(e.ContractError, "INVALID_SUMMARY"):
                evidence.summary_bytes(path.parent)

    def test_analysis_rejects_unbounded_failure_reasons(self) -> None:
        source = e.TOPIC / "evidence/runs/20261008T035450Z-010364d7/analysis.jsonl"
        rows = [json.loads(line) for line in source.read_bytes().splitlines()]
        with TemporaryDirectory() as temporary:
            path = Path(temporary) / "analysis.jsonl"
            for status in ("ERROR", "UNKNOWN"):
                changed = deepcopy(rows)
                changed[0].update(
                    status=status,
                    choice=None,
                    probabilities=None,
                    confidence=None,
                    error_code="secret traceback details",
                )
                path.write_bytes(b"".join(e.json_bytes(row) for row in changed))
                with self.assertRaisesRegex(
                    e.ContractError, "INVALID_ANALYSIS_STATUS_FIELDS"
                ):
                    evidence.read_rows(path)
            changed = deepcopy(rows)
            changed[0].update(
                status="ERROR",
                choice=None,
                probabilities=None,
                confidence=None,
                error_code="SDK_RESPONSE_INVALID",
                raw_sha256=None,
                raw_locator=None,
            )
            path.write_bytes(b"".join(e.json_bytes(row) for row in changed))
            with self.assertRaisesRegex(
                e.ContractError, "INVALID_ANALYSIS_STATUS_FIELDS"
            ):
                evidence.read_rows(path)

    def test_response_parser_rejects_non_json_constants(self) -> None:
        changed = response().replace(b'"usage":{', b'"ignored":NaN,"usage":{')
        self.assertEqual(e.parse_answer(changed)["status"], "INVALID")
        self.assertEqual(e.parse_answer(changed)["error_code"], "INVALID_RESPONSE")

    def test_summary_time_follows_attempted_rows(self) -> None:
        rows = [{"ended_utc": "2026-10-08T00:00:03+00:00"}]
        summary = {
            "run_id": "run-1",
            "evidence_status": "local-unbacked-until-reviewed-git-export",
            "threshold_selected": False,
            "generated_utc": "2026-10-08T00:00:02+00:00",
        }
        self.assertTrue(evidence.summary_identity_gap(summary, "run-1", rows))
        summary["generated_utc"] = "2026-10-08T00:00:03+00:00"
        self.assertFalse(evidence.summary_identity_gap(summary, "run-1", rows))

    def test_parser_failure_requires_sdk_acceptance(self) -> None:
        case = self.cases[0]
        raw = b"{bad-json"
        self.assertTrue(evidence.sdk_rejects(raw, case, self.question))
        row = {
            "status": "INVALID",
            "choice": None,
            "probabilities": None,
            "confidence": None,
            "error_code": "INVALID_RESPONSE",
            "model": e.MODEL,
        }
        self.assertEqual(
            evidence.response_gap(row, raw, case, self.question),
            "RAW_ANALYSIS_MISMATCH",
        )

    def test_runner_source_must_be_the_launched_snapshot(self) -> None:
        source = Path(e.__file__).read_bytes()
        with patch.object(e, "EXECUTED_RUNNER_SOURCE", None):
            with self.assertRaisesRegex(e.ContractError, "RUNNER_SOURCE_UNVERIFIED"):
                e.checked_executed_source(e.sha(source))
        with patch.object(e, "EXECUTED_RUNNER_SOURCE", source):
            self.assertEqual(e.checked_executed_source(e.sha(source)), source)
            with self.assertRaisesRegex(e.ContractError, "RUNNER_SOURCE_UNVERIFIED"):
                e.checked_executed_source("0" * 64)

    def test_isolated_entry_skips_site_hooks_and_cached_bytecode(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            site = root / "site-packages"
            site.mkdir()
            marker = root / "hook-ran"
            (site / "sitecustomize.py").write_text(
                f"from pathlib import Path; Path({str(marker)!r}).write_text('site')\n"
            )
            (site / "startup.pth").write_text(
                f"import pathlib; pathlib.Path({str(marker)!r}).write_text('pth')\n"
            )
            module = site / "candidate.py"
            module.write_text("VALUE = 'malicious'\n")
            py_compile.compile(
                str(module),
                invalidation_mode=py_compile.PycInvalidationMode.UNCHECKED_HASH,
                doraise=True,
            )
            module.write_text("VALUE = 'source'\n")
            script = (
                "import sys,tempfile; from pathlib import Path; "
                "sys.path.insert(0,sys.argv[1]); "
                "sys.pycache_prefix=tempfile.mkdtemp(prefix='e013-empty-pycache-'); "
                "import candidate; print(candidate.VALUE)"
            )
            result = subprocess.run(
                [sys.executable, "-I", "-S", "-B", "-c", script, str(site)],
                capture_output=True,
                text=True,
                check=True,
            )
            self.assertEqual(result.stdout.strip(), "source")
            self.assertFalse(marker.exists())

    def test_isolated_entry_keeps_standard_library_ahead_of_packages(self) -> None:
        with TemporaryDirectory() as temporary:
            site = Path(temporary) / "site-packages"
            site.mkdir()
            marker = Path(temporary) / "shadow-ran"
            (site / "tomllib.py").write_text(
                f"from pathlib import Path; Path({str(marker)!r}).write_text('shadow')\n"
            )
            result = subprocess.run(
                [
                    sys.executable,
                    "-I",
                    "-S",
                    "-B",
                    "-c",
                    "import sys; sys.path.append(sys.argv[1]); import tomllib; "
                    "print(tomllib.__file__)",
                    str(site),
                ],
                capture_output=True,
                text=True,
                check=True,
            )
            self.assertNotIn(str(site), result.stdout)
            self.assertFalse(marker.exists())

    def test_documented_bootstrap_rejects_edited_runner_before_execution(self) -> None:
        documentation = (e.TOPIC / "README.md").read_text()
        future = documentation.split("For a separately authorized future run", 1)[
            1
        ].split("For `--verify-local-run`", 1)[0]
        self.assertIn("uv sync --quiet --locked", future)
        self.assertIn("--no-build --no-install-project", future)
        self.assertNotIn("--env-file", future)
        self.assertNotIn("uv run", future)
        executable = Path(
            "/Users/andrew/.local/share/uv/python/cpython-3.12.12-macos-aarch64-none/bin/python3.12"
        )
        self.assertIn(e.sha(executable.read_bytes()), future)
        uv_binary = Path("/Users/andrew/.local/pipx/venvs/uv/bin/uv")
        self.assertIn(e.sha(uv_binary.read_bytes()), future)
        self.assertIn("--credential-file", future)
        self.assertEqual(future.count("/usr/bin/env -u TYPESAFE_API_KEY"), 2)
        self.assertNotIn("\nenv -u TYPESAFE_API_KEY", future)
        runtime_check = future.split("/usr/bin/python3 -I -S -B -c '\n", 1)[1].split(
            "\n'\n}", 1
        )[0]
        verified = subprocess.run(
            ["/usr/bin/python3", "-I", "-S", "-B", "-c", runtime_check],
            capture_output=True,
            text=True,
        )
        self.assertEqual(verified.returncode, 0, verified.stderr)
        self.assertIn('git("show", f"{revision}:{relative}")', runtime_check)
        self.assertIn(
            '"experiments/E013-jev-context-sufficiency/pyproject.toml"', runtime_check
        )
        self.assertIn(
            '"experiments/E013-jev-context-sufficiency/uv.lock"', runtime_check
        )
        self.assertIn('E013_PREFLIGHT_REVISION="$e013_revision"', future)
        for digest in (
            e.sha(uv_binary.read_bytes()),
            "e28f4275a88734b4fc6e768440429812dfd363b026ca221ce966c4ab7f531135",
        ):
            with self.subTest(digest=digest):
                denied = subprocess.run(
                    [
                        "/usr/bin/python3",
                        "-I",
                        "-S",
                        "-B",
                        "-c",
                        runtime_check.replace(digest, "0" * 64),
                    ],
                    capture_output=True,
                    text=True,
                )
                self.assertNotEqual(denied.returncode, 0)
                self.assertIn("E013 BLOCKED LAUNCH_RUNTIME_UNVERIFIED", denied.stderr)
        bootstrap = documentation.split("python3.12 -I -S -B -c '\n", 1)[1].split(
            "\n' --live", 1
        )[0]
        self.assertNotIn("'", bootstrap)
        self.assertIn('"rev-parse", "HEAD^{commit}"', bootstrap)
        self.assertIn(
            'revision != os.environ.pop("E013_PREFLIGHT_REVISION", None)', bootstrap
        )
        self.assertIn('f"{revision}:{relative}"', bootstrap)
        self.assertNotIn('f"HEAD:{relative}"', bootstrap)
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            subprocess.run(["git", "init", "-q", str(root)], check=True)
            runner = root / e.RUNNER_RELATIVE
            runner.parent.mkdir(parents=True)
            trusted = b"print('trusted')\n"
            runner.write_bytes(trusted)
            auth = root / "authorization.json"
            auth.write_bytes(e.json_bytes({"runner_sha256": e.sha(trusted)}))
            credential = root / "credential.env"
            subprocess.run(["git", "-C", str(root), "add", "."], check=True)
            subprocess.run(
                [
                    "git",
                    "-C",
                    str(root),
                    "-c",
                    "user.name=Test",
                    "-c",
                    "user.email=test@example.invalid",
                    "commit",
                    "-qm",
                    "trusted",
                ],
                check=True,
            )
            credential.write_text("TYPESAFE_API_KEY=synthetic-test-key\n")

            def revision_env(**extra: str) -> dict[str, str]:
                revision = (
                    subprocess.check_output(
                        ["git", "-C", str(root), "rev-parse", "HEAD^{commit}"]
                    )
                    .decode()
                    .strip()
                )
                return {**os.environ, **extra, "E013_PREFLIGHT_REVISION": revision}

            marker = root / "malicious-ran"
            runner.write_text(
                f"from pathlib import Path; Path({str(marker)!r}).write_text('ran')\n"
            )
            result = subprocess.run(
                [
                    sys.executable,
                    "-I",
                    "-S",
                    "-B",
                    "-c",
                    bootstrap,
                    "--live",
                    "--live-authorization",
                    "authorization.json",
                    "--credential-file",
                    "credential.env",
                ],
                cwd=root,
                env=revision_env(),
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 2)
            self.assertIn("E013 BLOCKED RUNNER_SOURCE_UNVERIFIED", result.stdout)
            self.assertFalse(marker.exists())
            runner.write_bytes(trusted)
            accepted = subprocess.run(
                [
                    sys.executable,
                    "-I",
                    "-S",
                    "-B",
                    "-c",
                    bootstrap,
                    "--live",
                    "--live-authorization",
                    "authorization.json",
                    "--credential-file",
                    "credential.env",
                ],
                cwd=root,
                env=revision_env(),
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(accepted.returncode, 0)
            self.assertIn("trusted", accepted.stdout)
            for missing_value in (
                ["--live", "--live-authorization"],
                [
                    "--live",
                    "--live-authorization",
                    "authorization.json",
                    "--credential-file",
                ],
            ):
                with self.subTest(missing_value=missing_value):
                    malformed = subprocess.run(
                        [
                            sys.executable,
                            "-I",
                            "-S",
                            "-B",
                            "-c",
                            bootstrap,
                            *missing_value,
                        ],
                        cwd=root,
                        capture_output=True,
                        text=True,
                        check=False,
                    )
                    self.assertEqual(malformed.returncode, 2)
                    self.assertIn(
                        "E013 BLOCKED RUNNER_SOURCE_UNVERIFIED", malformed.stdout
                    )
                    self.assertNotIn("Traceback", malformed.stderr)
            shim_dir = root / "shim"
            shim_dir.mkdir()
            shim_marker = root / "git-shim-ran"
            shim = shim_dir / "git"
            shim.write_text(f"#!/bin/sh\ntouch {shim_marker}\nexit 99\n")
            shim.chmod(0o755)
            accepted_with_shim = subprocess.run(
                [
                    sys.executable,
                    "-I",
                    "-S",
                    "-B",
                    "-c",
                    bootstrap,
                    "--live",
                    "--live-authorization",
                    "authorization.json",
                    "--credential-file",
                    "credential.env",
                ],
                cwd=root,
                env=revision_env(PATH=f"{shim_dir}:{os.environ.get('PATH', '')}"),
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(accepted_with_shim.returncode, 0)
            self.assertFalse(shim_marker.exists())
            for invalid_authorization in (
                b"[]\n",
                b"null\n",
                b"[" * 1200 + b"0" + b"]" * 1200,
            ):
                with self.subTest(invalid_authorization=invalid_authorization[:8]):
                    auth.write_bytes(invalid_authorization)
                    subprocess.run(
                        ["git", "-C", str(root), "add", "authorization.json"],
                        check=True,
                    )
                    subprocess.run(
                        [
                            "git",
                            "-C",
                            str(root),
                            "-c",
                            "user.name=Test",
                            "-c",
                            "user.email=test@example.invalid",
                            "commit",
                            "-qm",
                            "invalid authorization",
                        ],
                        check=True,
                    )
                    rejected = subprocess.run(
                        [
                            sys.executable,
                            "-I",
                            "-S",
                            "-B",
                            "-c",
                            bootstrap,
                            "--live",
                            "--live-authorization",
                            "authorization.json",
                            "--credential-file",
                            "credential.env",
                        ],
                        cwd=root,
                        env=revision_env(),
                        capture_output=True,
                        text=True,
                        check=False,
                    )
                    self.assertEqual(rejected.returncode, 2)
                    self.assertIn(
                        "E013 BLOCKED RUNNER_SOURCE_UNVERIFIED", rejected.stdout
                    )
                    self.assertNotIn("Traceback", rejected.stderr)

    def test_documented_bootstrap_authenticates_evidence_tool(self) -> None:
        documentation = (e.TOPIC / "README.md").read_text()
        bootstrap = documentation.split("python3.12 -I -S -B -c '\n", 1)[1].split(
            "\n' --live", 1
        )[0]
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            subprocess.run(["git", "init", "-q", str(root)], check=True)
            runner = root / e.RUNNER_RELATIVE
            runner.parent.mkdir(parents=True)
            runner.write_bytes(
                b"def main():\n    import evidence_tools\n    return evidence_tools.check()\n"
            )
            evidence_tool = runner.with_name("evidence_tools.py")
            trusted_tool = (
                b"import jev_context as runner\n"
                b"def check():\n    print('trusted evidence', runner.__name__)\n    return 0\n"
            )
            evidence_tool.write_bytes(trusted_tool)
            subprocess.run(["git", "-C", str(root), "add", "."], check=True)
            subprocess.run(
                [
                    "git",
                    "-C",
                    str(root),
                    "-c",
                    "user.name=Test",
                    "-c",
                    "user.email=test@example.invalid",
                    "commit",
                    "-qm",
                    "trusted",
                ],
                check=True,
            )
            marker = root / "unreviewed-ran"
            evidence_tool.write_text(
                f"from pathlib import Path; Path({str(marker)!r}).write_text('ran')\n"
            )
            argv = [
                sys.executable,
                "-I",
                "-S",
                "-B",
                "-c",
                bootstrap,
                "--verify-evidence",
            ]
            blocked = subprocess.run(argv, cwd=root, capture_output=True, text=True)
            self.assertEqual(blocked.returncode, 2)
            self.assertIn("RUNNER_SOURCE_UNVERIFIED", blocked.stdout)
            self.assertFalse(marker.exists())
            evidence_tool.write_bytes(trusted_tool)
            accepted = subprocess.run(argv, cwd=root, capture_output=True, text=True)
            self.assertEqual(accepted.returncode, 0)
            self.assertIn("trusted evidence", accepted.stdout)

    def test_dependency_wrapper_is_rejected_before_its_import(self) -> None:
        with TemporaryDirectory() as temporary:
            topic = Path(temporary) / "experiments/E013-jev-context-sufficiency"
            topic.mkdir(parents=True)
            for name in ("jev_context.py", "uv.lock", "sdk-code-digests.json"):
                shutil.copy2(e.TOPIC / name, topic / name)
            shutil.copytree(e.TOPIC / ".venv", topic / ".venv", symlinks=True)
            site = topic / ".venv/lib/python3.12/site-packages"
            target = site / "httpx2/__init__.py"
            marker = Path(temporary) / "wrapper-ran"
            original = target.read_bytes()
            target.write_text(
                "from pathlib import Path\n"
                f"Path({str(marker)!r}).write_text('executed')\n"
                f"Path({str(target)!r}).write_bytes({original!r})\n"
            )
            script = (
                "import sys; from pathlib import Path; "
                "p=Path(sys.argv[1]); v=p.parent/'.venv'; "
                "sys.prefix=sys.exec_prefix=str(v); "
                "sys.path.append(str(v/'lib/python3.12/site-packages')); "
                "sys.argv=[str(p),'--verify-evidence']; "
                "s=p.read_bytes(); exec(compile(s,str(p),'exec'),"
                "{'__name__':'__main__','__file__':str(p),'_E013_EXECUTED_SOURCE':s})"
            )
            result = subprocess.run(
                [
                    sys.executable,
                    "-I",
                    "-S",
                    "-B",
                    "-c",
                    script,
                    str(topic / "jev_context.py"),
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 2)
            self.assertIn("E013 BLOCKED SDK_IMPORT_MISMATCH", result.stdout)
            self.assertFalse(marker.exists())
            target.write_bytes(original)
            shadow = site / "typesafe_sdk" / f"__init__{e.EXTENSION_SUFFIXES[0]}"
            shadow.write_bytes(b"untracked extension")
            result = subprocess.run(
                [
                    sys.executable,
                    "-I",
                    "-S",
                    "-B",
                    "-c",
                    script,
                    str(topic / "jev_context.py"),
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 2)
            self.assertIn("E013 BLOCKED SDK_IMPORT_MISMATCH", result.stdout)

    def test_replay_rejects_unverified_sdk_before_reading_evidence(self) -> None:
        with patch.object(
            evidence,
            "verify_replay_sdk",
            side_effect=e.ContractError("SDK_IMPORT_MISMATCH"),
        ):
            with TemporaryDirectory() as temporary:
                directory = Path(temporary)
                (directory / "manifest.json").write_bytes(
                    e.json_bytes({"run_id": "run-1"})
                )
                with self.assertRaisesRegex(e.ContractError, "SDK_IMPORT_MISMATCH"):
                    evidence.verify_evidence(directory)
                with self.assertRaisesRegex(e.ContractError, "SDK_IMPORT_MISMATCH"):
                    evidence.verify_local_run(directory)

    def test_replay_requires_retained_lock_and_digest_baseline(self) -> None:
        with TemporaryDirectory() as temporary:
            run_dir = Path(temporary)
            lock = (e.ROOT / e.LOCK_RELATIVE).read_bytes()
            baseline = (e.ROOT / e.SDK_DIGESTS_RELATIVE).read_bytes()
            manifest = {
                "run_id": "run-1",
                "uv_lock_path": "uv.lock",
                "uv_lock_sha256": e.sha(lock),
                "sdk_code_digests_path": "sdk-code-digests.json",
                "sdk_code_digests_sha256": e.sha(baseline),
            }
            (run_dir / "uv.lock").write_bytes(lock)
            (run_dir / "sdk-code-digests.json").write_bytes(baseline)
            with patch.object(e, "verify_sdk_imports") as verify:
                evidence.verify_replay_sdk(run_dir, manifest)
                verify.assert_called_once_with(lock, baseline)
            with self.assertRaisesRegex(
                e.ContractError, "SDK_REPLAY_INVENTORY_MISMATCH"
            ):
                evidence.verify_replay_sdk(
                    run_dir, {**manifest, "uv_lock_sha256": "0" * 64}
                )

    def test_publication_requires_approved_store_source(self) -> None:
        with TemporaryDirectory() as temporary:
            approved = Path(temporary) / "approved"
            source = approved / "runs" / "run-1"
            source.mkdir(parents=True)
            (source / "manifest.json").write_bytes(
                e.json_bytes({"run_id": "run-1", "store_root": str(approved)})
            )
            copy = Path(temporary) / "copy" / "run-1"
            copy.mkdir(parents=True)
            (copy / "manifest.json").write_bytes(
                (source / "manifest.json").read_bytes()
            )
            with patch.object(e, "LOCAL_STORE_ROOT", approved):
                evidence.require_approved_publish_source(source)
                with self.assertRaisesRegex(
                    e.ContractError, "PUBLICATION_SOURCE_UNAPPROVED"
                ):
                    evidence.require_approved_publish_source(copy)

    def test_committed_git_bytes_ignore_inherited_repository_overrides(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary) / "coami"
            other = Path(temporary) / "other"
            for repo, payload in ((root, b"approved"), (other, b"forged")):
                repo.mkdir()
                subprocess.run(["git", "init", "-q", str(repo)], check=True)
                (repo / "record.txt").write_bytes(payload)
                subprocess.run(
                    ["git", "-C", str(repo), "add", "record.txt"], check=True
                )
                subprocess.run(
                    [
                        "git",
                        "-C",
                        str(repo),
                        "-c",
                        "user.name=Test",
                        "-c",
                        "user.email=test@example.invalid",
                        "commit",
                        "-qm",
                        "record",
                    ],
                    check=True,
                )
            old_manifest = (
                root
                / "experiments/E013-jev-context-sufficiency/evidence/runs"
                / "run-archived/manifest.json"
            )
            old_manifest.parent.mkdir(parents=True)
            old_manifest.write_bytes(b"published\n")
            subprocess.run(
                [
                    "git",
                    "-C",
                    str(root),
                    "add",
                    old_manifest.relative_to(root).as_posix(),
                ],
                check=True,
            )
            for action in ("publish", "delete"):
                if action == "delete":
                    old_manifest.unlink()
                    subprocess.run(["git", "-C", str(root), "add", "-u"], check=True)
                subprocess.run(
                    [
                        "git",
                        "-C",
                        str(root),
                        "-c",
                        "user.name=Test",
                        "-c",
                        "user.email=test@example.invalid",
                        "commit",
                        "-qm",
                        action,
                    ],
                    check=True,
                )
            with patch.dict(
                os.environ,
                {"GIT_DIR": str(other / ".git"), "GIT_WORK_TREE": str(other)},
            ):
                self.assertEqual(
                    e.committed_git_bytes(root, Path("record.txt")), b"approved"
                )
                self.assertTrue(e.published_run_id_seen(root, "run-archived"))
                self.assertFalse(e.published_run_id_seen(root, "run-new"))
            original = subprocess.run(
                ["git", "-C", str(root), "rev-parse", "HEAD"],
                capture_output=True,
                text=True,
                check=True,
            ).stdout.strip()
            (root / "record.txt").write_bytes(b"forged replacement")
            subprocess.run(["git", "-C", str(root), "add", "record.txt"], check=True)
            subprocess.run(
                [
                    "git",
                    "-C",
                    str(root),
                    "-c",
                    "user.name=Test",
                    "-c",
                    "user.email=test@example.invalid",
                    "commit",
                    "-qm",
                    "forged",
                ],
                check=True,
            )
            replacement = subprocess.run(
                ["git", "-C", str(root), "rev-parse", "HEAD"],
                capture_output=True,
                text=True,
                check=True,
            ).stdout.strip()
            subprocess.run(
                ["git", "-C", str(root), "reset", "--hard", original],
                capture_output=True,
                check=True,
            )
            subprocess.run(
                ["git", "-C", str(root), "replace", original, replacement], check=True
            )
            self.assertEqual(
                e.committed_git_bytes(root, Path("record.txt")), b"approved"
            )

    def test_missing_key_preflight_never_constructs_sdk(self) -> None:
        with TemporaryDirectory() as temporary:
            auth = Path(temporary) / "auth.json"
            auth.write_bytes(b"authorized")
            with (
                patch.object(e, "load_freeze", return_value={}),
                patch.object(e, "load_store_policy", return_value={}),
                patch.object(
                    e,
                    "load_live_authorization",
                    return_value=("run-unique", e.sha(auth.read_bytes())),
                ),
                patch.object(e, "TypeSafeClient") as client,
                patch.dict(os.environ, {"TYPESAFE_API_KEY": ""}),
            ):
                self.assertEqual(
                    e.run_live(Path("freeze"), Path("policy"), Path(temporary), auth), 2
                )
                client.assert_not_called()

    def test_live_authorization_is_committed_specific_and_one_use(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / ".git").mkdir()
            auth = root / "live.json"
            freeze = (
                root
                / "evaluation/context_sufficiency/versions/v1/freeze-attestation.json"
            )
            policy = (
                root
                / "experiments/E013-jev-context-sufficiency/local-store-policy.json"
            )
            runner = root / e.RUNNER_RELATIVE
            lock = root / e.LOCK_RELATIVE
            freeze.parent.mkdir(parents=True)
            policy.parent.mkdir(parents=True)
            freeze.write_bytes(b"freeze")
            policy.write_bytes(b"policy")
            runner.write_bytes(b"runner")
            lock.write_bytes(b"lock")
            document = {
                "run_id": "run-unique",
                "authorized_by": "Owner",
                "scope": "one E013 75-case Context Sufficiency run",
                "model": e.MODEL,
                "freeze_attestation_sha256": e.sha(b"freeze"),
                "store_policy_sha256": e.sha(b"policy"),
                "runner_sha256": e.sha(b"runner"),
                "uv_lock_sha256": e.sha(b"lock"),
            }
            auth.write_bytes(e.json_bytes(document))
            committed = {
                "live.json": auth.read_bytes(),
                freeze.relative_to(root).as_posix(): freeze.read_bytes(),
                policy.relative_to(root).as_posix(): policy.read_bytes(),
                runner.relative_to(root).as_posix(): runner.read_bytes(),
                lock.relative_to(root).as_posix(): lock.read_bytes(),
            }

            def git_show(
                args: list[str], **kwargs: object
            ) -> subprocess.CompletedProcess[bytes]:
                if "rev-parse" in args:
                    return subprocess.CompletedProcess(
                        args, 0, f"{root}\n{root / '.git'}\n".encode()
                    )
                return subprocess.CompletedProcess(
                    args, 0, committed[args[-1].split(":", 1)[1]]
                )

            with patch.object(
                e.subprocess,
                "run",
                side_effect=git_show,
            ):
                self.assertEqual(
                    e.load_live_authorization(auth, freeze, policy, root, runner)[0],
                    "run-unique",
                )
                self.assertEqual(
                    e.load_live_authorization(
                        auth, freeze, policy, root, runner, freeze_snapshot=b"freeze"
                    )[0],
                    "run-unique",
                )
                with self.assertRaisesRegex(
                    e.ContractError, "LIVE_AUTHORIZATION_UNVERIFIED"
                ):
                    e.load_live_authorization(
                        auth, freeze, policy, root, runner, freeze_snapshot=b"other"
                    )
                self.assertEqual(
                    e.load_live_authorization(
                        auth, freeze, policy, root, runner, store_snapshot=b"policy"
                    )[0],
                    "run-unique",
                )
                with self.assertRaisesRegex(
                    e.ContractError, "LIVE_AUTHORIZATION_UNVERIFIED"
                ):
                    e.load_live_authorization(
                        auth, freeze, policy, root, runner, store_snapshot=b"other"
                    )
                rogue = e.json_bytes({**document, "run_id": "rogue-run"})
                with self.assertRaisesRegex(
                    e.ContractError, "LIVE_AUTHORIZATION_UNVERIFIED"
                ):
                    e.load_live_authorization(
                        auth,
                        freeze,
                        policy,
                        root,
                        runner,
                        authorization_snapshot=rogue,
                    )
                self.assertEqual(
                    e.load_live_authorization(
                        auth,
                        freeze,
                        policy,
                        root,
                        runner,
                        authorization_snapshot=committed["live.json"],
                    )[0],
                    "run-unique",
                )
                alternate = root / "alternate-freeze.json"
                alternate.write_bytes(freeze.read_bytes())
                with self.assertRaisesRegex(
                    e.ContractError, "LIVE_AUTHORIZATION_UNVERIFIED"
                ):
                    e.load_live_authorization(auth, alternate, policy, root, runner)
                duplicate = b'{"run_id":"other",' + auth.read_bytes()[1:]
                auth.write_bytes(duplicate)
                committed["live.json"] = duplicate
                with self.assertRaisesRegex(
                    e.ContractError, "LIVE_AUTHORIZATION_UNVERIFIED"
                ):
                    e.load_live_authorization(auth, freeze, policy, root, runner)
                auth.write_bytes(e.json_bytes(document))
                committed["live.json"] = auth.read_bytes()
                freeze.write_bytes(b"dirty freeze")
                with self.assertRaisesRegex(
                    e.ContractError, "LIVE_AUTHORIZATION_UNVERIFIED"
                ):
                    e.load_live_authorization(auth, freeze, policy, root, runner)
                freeze.write_bytes(b"freeze")
                policy.write_bytes(b"dirty policy")
                with self.assertRaisesRegex(
                    e.ContractError, "LIVE_AUTHORIZATION_UNVERIFIED"
                ):
                    e.load_live_authorization(auth, freeze, policy, root, runner)
                policy.write_bytes(b"policy")
                runner.write_bytes(b"dirty runner")
                with self.assertRaisesRegex(
                    e.ContractError, "LIVE_AUTHORIZATION_UNVERIFIED"
                ):
                    e.load_live_authorization(auth, freeze, policy, root, runner)
                runner.write_bytes(b"runner")
                lock.write_bytes(b"dirty lock")
                with self.assertRaisesRegex(
                    e.ContractError, "LIVE_AUTHORIZATION_UNVERIFIED"
                ):
                    e.load_live_authorization(auth, freeze, policy, root, runner)
                lock.write_bytes(b"lock")
                committed[lock.relative_to(root).as_posix()] = b"changed lock"
                with self.assertRaisesRegex(
                    e.ContractError, "LIVE_AUTHORIZATION_UNVERIFIED"
                ):
                    e.load_live_authorization(auth, freeze, policy, root, runner)
                lock.write_bytes(b"changed lock")
                with self.assertRaisesRegex(
                    e.ContractError, "LIVE_AUTHORIZATION_MISMATCH"
                ):
                    e.load_live_authorization(auth, freeze, policy, root, runner)
                lock.write_bytes(b"lock")
                committed[lock.relative_to(root).as_posix()] = b"lock"
                auth.write_bytes(e.json_bytes({**document, "run_id": "reused"}))
                with self.assertRaisesRegex(
                    e.ContractError, "LIVE_AUTHORIZATION_UNVERIFIED"
                ):
                    e.load_live_authorization(auth, freeze, policy, root, runner)
            (root / "runs" / "run-unique").mkdir(parents=True)
            (root / "authorization-uses").mkdir()
            (root / "authorization-uses" / "run-unique.json").write_bytes(b"used")
            (root / "runs" / "run-unique").rmdir()
            review = root / "evaluation/context_sufficiency/versions/v1/review.md"
            review.write_bytes(b"review")
            review_patch = patch.object(
                e, "committed_git_bytes", return_value=b"review"
            )
            review_patch.start()
            self.addCleanup(review_patch.stop)
            with (
                patch.object(e, "load_freeze", return_value={}),
                patch.object(e, "load_store_policy", return_value={}),
                patch.object(
                    e,
                    "load_live_authorization",
                    return_value=("run-unique", e.sha(auth.read_bytes())),
                ),
                patch.object(e, "TypeSafeClient") as client,
            ):
                self.assertEqual(e.run_live(freeze, policy, root, auth, root), 2)
                client.assert_not_called()
            with (
                patch.object(e, "load_freeze", return_value={}),
                patch.object(e, "load_store_policy", return_value={}),
                patch.object(
                    e,
                    "load_live_authorization",
                    return_value=(e.HISTORICAL_RUN_ID, e.sha(auth.read_bytes())),
                ),
                patch.object(e, "TypeSafeClient") as client,
            ):
                self.assertEqual(e.run_live(freeze, policy, root, auth, root), 2)
                self.assertFalse(
                    (
                        root / "authorization-uses" / f"{e.HISTORICAL_RUN_ID}.json"
                    ).exists()
                )
                client.assert_not_called()

            tracked = (
                root
                / "experiments/E013-jev-context-sufficiency/evidence/runs"
                / "run-published"
            )
            tracked.mkdir(parents=True)
            with (
                patch.object(e, "load_freeze", return_value={}),
                patch.object(e, "load_store_policy", return_value={}),
                patch.object(
                    e,
                    "load_live_authorization",
                    return_value=("run-published", e.sha(auth.read_bytes())),
                ),
                patch.object(e, "TypeSafeClient") as client,
            ):
                self.assertEqual(e.run_live(freeze, policy, root, auth, root), 2)
                client.assert_not_called()
            with (
                patch.object(e, "load_freeze", return_value={}),
                patch.object(e, "load_store_policy", return_value={}),
                patch.object(
                    e,
                    "load_live_authorization",
                    return_value=("run-git-only", e.sha(auth.read_bytes())),
                ),
                patch.object(
                    e,
                    "checked_git",
                    side_effect=lambda unused, args: b"false\n"
                    if args[0] == "rev-parse"
                    else b"tracked manifest\n",
                ),
                patch.object(e, "TypeSafeClient") as client,
            ):
                self.assertEqual(e.run_live(freeze, policy, root, auth, root), 2)
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

            interrupted_root = Path(temporary) / "interrupted"
            interrupted = e.CaptureClient(
                interrupted_root,
                case,
                self.question,
                transport=httpx2.MockTransport(
                    lambda request: httpx2.Response(200, content=response())
                ),
            )

            def interrupt_after_response_write(path: Path, data: bytes) -> None:
                original(path, data)
                if "responses" in path.parts:
                    raise KeyboardInterrupt

            with (
                patch.object(
                    e, "write_exclusive", side_effect=interrupt_after_response_write
                ),
                TypeSafeClient(
                    api_key="test-key",
                    model=e.MODEL,
                    base_url="https://example.invalid",
                    retry=RetryPolicy(max_retries=0),
                    http_client=interrupted,
                ) as client,
            ):
                with self.assertRaises(KeyboardInterrupt):
                    client.system_one(
                        state=case["state"],
                        questions={"context_sufficiency": Choice(**self.question)},
                    )
            self.assertIsNone(interrupted.raw_sha)
            self.assertTrue(
                (
                    interrupted_root
                    / "responses"
                    / case["group"]
                    / f"{case['case_id']}.body"
                ).is_file()
            )

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
        source_patch = patch.object(evidence, "require_approved_publish_source")
        source_patch.start()  # Synthetic fixture lives outside the Owner's local store.
        self.addCleanup(source_patch.stop)
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            restricted = root / "restricted" / "runs" / "run-1"
            restricted.mkdir(parents=True)
            runner_source = b"synthetic runner source\n"
            e.write_exclusive(restricted / "runner.py", runner_source)
            store_policy_bytes = (e.TOPIC / "local-store-policy.json").read_bytes()
            e.write_exclusive(restricted / "store-policy.json", store_policy_bytes)
            uv_lock_bytes = (e.TOPIC / "uv.lock").read_bytes()
            e.write_exclusive(restricted / "uv.lock", uv_lock_bytes)
            digest_bytes = (e.TOPIC / "sdk-code-digests.json").read_bytes()
            e.write_exclusive(restricted / "sdk-code-digests.json", digest_bytes)
            authorization = e.json_bytes(
                {
                    "run_id": "run-1",
                    "authorized_by": "Owner",
                    "scope": "one E013 75-case Context Sufficiency run",
                    "model": e.MODEL,
                    "freeze_attestation_sha256": e.sha(
                        (e.ORACLE / "versions/v1/freeze-attestation.json").read_bytes()
                    ),
                    "store_policy_sha256": e.sha(store_policy_bytes),
                    "runner_sha256": e.sha(runner_source),
                    "uv_lock_sha256": e.sha(uv_lock_bytes),
                }
            )
            e.write_exclusive(restricted / "authorization.json", authorization)
            authorization_repo_path = (e.AUTHORIZATION_DIR / "run-1.json").as_posix()
            authorization_revision = "a" * 40
            actual_checked_git = e.checked_git

            def checked_git_with_synthetic_authorization(
                checkout: Path, arguments: list[str]
            ) -> bytes:
                if arguments == [
                    "merge-base",
                    "--is-ancestor",
                    authorization_revision,
                    "HEAD",
                ]:
                    return b""
                if arguments == [
                    "show",
                    f"{authorization_revision}:{authorization_repo_path}",
                ]:
                    return authorization
                authorized_inputs = {
                    e.RUNNER_RELATIVE: runner_source,
                    e.LOCK_RELATIVE: uv_lock_bytes,
                    e.FREEZE_RELATIVE: (
                        e.ORACLE / "versions/v1/freeze-attestation.json"
                    ).read_bytes(),
                    e.POLICY_RELATIVE: store_policy_bytes,
                }
                for relative, snapshot in authorized_inputs.items():
                    if arguments == [
                        "show",
                        f"{authorization_revision}:{relative.as_posix()}",
                    ]:
                        return snapshot
                return actual_checked_git(checkout, arguments)

            git_patch = patch.object(
                e, "checked_git", side_effect=checked_git_with_synthetic_authorization
            )
            git_patch.start()
            self.addCleanup(git_patch.stop)
            e.write_exclusive(
                restricted / "manifest.json",
                e.json_bytes(
                    {
                        "run_id": "run-1",
                        "created_utc": "2026-10-08T00:00:00+00:00",
                        "publication": "local-unbacked-until-reviewed-git-export",
                        "model": e.MODEL,
                        "freeze_hashes": e.load_freeze(
                            e.ORACLE / "versions/v1/freeze-attestation.json"
                        ),
                        "v0_hashes": e.V0_HASHES,
                        "rubric_sha256": e.POLICY_HASH,
                        "runner_sha256": e.sha(runner_source),
                        "runner_source_path": "runner.py",
                        "live_authorization_sha256": e.sha(authorization),
                        "live_authorization_path": "authorization.json",
                        "authorization_repo_path": authorization_repo_path,
                        "authorization_revision": authorization_revision,
                        "store_policy_sha256": e.sha(store_policy_bytes),
                        "store_policy_path": "store-policy.json",
                        "uv_lock_sha256": e.sha(uv_lock_bytes),
                        "uv_lock_path": "uv.lock",
                        "sdk_code_digests_sha256": e.sha(digest_bytes),
                        "sdk_code_digests_path": "sdk-code-digests.json",
                        "sdk_version": e.SDK_VERSION,
                        "conditions": {
                            "timeout_seconds": 30,
                            "retries": 0,
                            "order": list(e.GROUPS),
                        },
                        "store_root": str(e.LOCAL_STORE_ROOT),
                        "store": {
                            **{
                                name: e.read_object(
                                    e.TOPIC / "local-store-policy.json"
                                )[name]
                                for name in ("approved_by", "store_id", "agent_access")
                            },
                            "retention_until": None,
                            "storage_mode": "local_staging",
                            "versioned_immutable": False,
                            "backup_verified": False,
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
                    request = evidence.emitted_request(case, self.question)
                    e.write_exclusive(
                        restricted
                        / "requests"
                        / case["group"]
                        / f"{case['case_id']}.body",
                        request,
                    )
                row = {
                    "run_id": "run-1",
                    "ordinal": index + 1,
                    "group": case["group"],
                    "case_id": case["case_id"],
                    "expected": case["expected"],
                    "model": e.MODEL,
                    "rubric_sha256": e.POLICY_HASH,
                    "runner_sha256": e.sha(runner_source),
                    "case_version": e.V0_HASHES
                    if case["group"] == "v0"
                    else e.load_freeze(
                        e.ORACLE / "versions/v1/freeze-attestation.json"
                    ),
                    "status": "VALID"
                    if body
                    else "UNKNOWN"
                    if index == 2
                    else "NOT_RUN",
                    "choice": "SUFFICIENT" if body else None,
                    "probabilities": {"SUFFICIENT": 0.8, "INSUFFICIENT": 0.2}
                    if body
                    else None,
                    "confidence": 0.7 if body else None,
                    "error_code": "CAPTURE_OR_RUNTIME_FAILED" if index == 2 else None,
                    "request_sha256": e.sha(request) if body else None,
                    "raw_sha256": e.sha(body) if body else None,
                    "raw_locator": locator,
                    "started_utc": f"2026-10-08T00:00:0{index}+00:00"
                    if index < 3
                    else None,
                    "ended_utc": f"2026-10-08T00:00:0{index + 1}+00:00"
                    if index < 3
                    else None,
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
                restricted / "events.jsonl", evidence.event_log_bytes(rows)
            )
            e.write_exclusive(
                restricted / "summary.json", e.json_bytes(e.summarize(rows))
            )
            summary = e.read_object(restricted / "summary.json")
            summary.update(
                {
                    "run_id": "run-1",
                    "generated_utc": "2026-10-08T00:00:03Z",
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
            bad_key = deepcopy(decisions)
            bad_key[0]["group"] = []
            approval.write_bytes(
                e.json_bytes(
                    {
                        "run_id": "run-1",
                        "approved_by": "owner",
                        "summary_public": True,
                        "summary_safety_checked": True,
                        "summary_sha256": summary_hash,
                        "cases": bad_key,
                    }
                )
            )
            with self.assertRaisesRegex(e.ContractError, "INVALID_PUBLICATION_REVIEW"):
                evidence.publish_reviewed(
                    restricted, approval, root / "checkout-evidence"
                )
            duplicate_review = e.json_bytes(
                {
                    "run_id": "run-1",
                    "approved_by": "owner",
                    "summary_public": True,
                    "summary_safety_checked": True,
                    "summary_sha256": summary_hash,
                    "cases": decisions,
                }
            ).replace(
                b'"raw_public": true',
                b'"raw_public": false, "raw_public": true',
                1,
            )
            self.assertIn(b'"raw_public": false, "raw_public": true', duplicate_review)
            approval.write_bytes(duplicate_review)
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
            verified_authorization = evidence.authorization_gap
            authorization_checks = []

            def replace_authorization_after_review(
                run_dir: Path,
                record: dict[str, object],
                revision: str = "HEAD",
                freeze_snapshot: bytes | None = None,
            ) -> str | None:
                result = verified_authorization(
                    run_dir, record, revision, freeze_snapshot
                )
                authorization_checks.append(run_dir)
                if len(authorization_checks) == 2:
                    (run_dir / "authorization.json").write_bytes(
                        b"changed after review"
                    )
                return result

            with patch.object(
                evidence,
                "authorization_gap",
                side_effect=replace_authorization_after_review,
            ):
                with self.assertRaisesRegex(
                    e.ContractError, "PUBLICATION_EVIDENCE_UNVERIFIED"
                ):
                    evidence.publish_reviewed(
                        restricted, approval, root / "changed-authorization-evidence"
                    )
            self.assertFalse(
                (root / "changed-authorization-evidence/runs/run-1").exists()
            )
            with (
                patch.object(e, "load_cases", wraps=e.load_cases) as loaded,
                patch.object(
                    e, "read_frozen_case_sources", wraps=e.read_frozen_case_sources
                ) as read_sources,
                patch.object(e, "load_freeze", wraps=e.load_freeze) as load_freeze,
            ):
                self.assertEqual(evidence.verify_local_run(restricted)["gaps"], [])
                self.assertEqual(loaded.call_count, 1)
                self.assertIsNotNone(loaded.call_args.kwargs["source_bytes"])
                self.assertIs(
                    read_sources.call_args.args[2],
                    load_freeze.call_args.kwargs["source_snapshots"],
                )
            orphan = restricted / "responses/research/orphan.body"
            orphan.write_bytes(response())
            self.assertIn(
                "UNREFERENCED_CAPTURED_FILE",
                {
                    gap["reason"]
                    for gap in evidence.verify_local_run(restricted)["gaps"]
                },
            )
            with self.assertRaisesRegex(e.ContractError, "LOCAL_EVIDENCE_UNVERIFIED"):
                evidence.publish_reviewed(
                    restricted, approval, root / "orphaned-capture-evidence"
                )
            self.assertFalse((root / "orphaned-capture-evidence/runs/run-1").exists())
            orphan.unlink()
            local_manifest = e.read_object(restricted / "manifest.json")
            missing_locator = dict(local_manifest)
            missing_locator.pop("runner_source_path")
            self.assertIn(
                "RUNNER_SOURCE_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_local_run(restricted, missing_locator)[
                        "gaps"
                    ]
                },
            )
            changed_runner_hash = dict(local_manifest)
            changed_runner_hash["runner_sha256"] = "0" * 64
            self.assertEqual(
                evidence.authorization_gap(restricted, changed_runner_hash),
                "AUTHORIZATION_MISMATCH",
            )
            self.assertEqual(
                evidence.authorization_gap(
                    restricted, local_manifest, freeze_snapshot=b"different freeze"
                ),
                "AUTHORIZATION_COMMIT_MISMATCH",
            )
            checked_before_unreachable = e.checked_git

            def unreachable_authorization(
                checkout: Path, arguments: list[str]
            ) -> bytes:
                if arguments[:2] == ["merge-base", "--is-ancestor"]:
                    raise subprocess.CalledProcessError(1, ["git", *arguments])
                return checked_before_unreachable(checkout, arguments)

            with patch.object(e, "checked_git", side_effect=unreachable_authorization):
                self.assertEqual(
                    evidence.authorization_gap(restricted, local_manifest),
                    "AUTHORIZATION_COMMIT_MISMATCH",
                )
            original_checked_git = e.checked_git
            policy_revision = [
                "show",
                f"{authorization_revision}:{e.POLICY_RELATIVE.as_posix()}",
            ]

            def replace_runner_after_snapshot(
                checkout: Path, arguments: list[str]
            ) -> bytes:
                result = original_checked_git(checkout, arguments)
                if arguments == policy_revision:
                    (restricted / "runner.py").write_bytes(b"changed after snapshot")
                return result

            try:
                with patch.object(
                    e, "checked_git", side_effect=replace_runner_after_snapshot
                ):
                    self.assertIsNone(
                        evidence.authorization_gap(restricted, local_manifest)
                    )
            finally:
                (restricted / "runner.py").write_bytes(runner_source)
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
            public_events = (output / "events.jsonl").read_bytes()
            (output / "events.jsonl").write_bytes(b"tampered")
            self.assertEqual(
                {gap["reason"] for gap in evidence.verify_evidence(output)["gaps"]},
                {"ANALYSIS_ACCESS_REQUIRED", "EVENT_LOG_MISMATCH"},
            )
            (output / "events.jsonl").write_bytes(public_events)
            public_summary = (output / "summary.json").read_bytes()
            (output / "summary.json").write_bytes(b"broken")
            self.assertEqual(
                {gap["reason"] for gap in evidence.verify_evidence(output)["gaps"]},
                {"ANALYSIS_ACCESS_REQUIRED", "SUMMARY_HASH_MISMATCH"},
            )
            (output / "summary.json").write_bytes(public_summary)
            with patch.object(e, "load_cases", wraps=e.load_cases) as loaded:
                with_access = evidence.verify_evidence(output, restricted, 0.8)
                self.assertEqual(loaded.call_count, 1)
                self.assertIsNotNone(loaded.call_args.kwargs["source_bytes"])
            self.assertEqual(with_access["verified_cases"], 75)
            self.assertEqual(with_access["gaps"], [])
            expected_authorized_lock = [
                "show",
                f"{authorization_revision}:{e.LOCK_RELATIVE.as_posix()}",
            ]
            original_checked_git = e.checked_git

            def missing_authorized_lock(checkout: Path, arguments: list[str]) -> bytes:
                if arguments == expected_authorized_lock:
                    return b"different lock at authorization revision"
                return original_checked_git(checkout, arguments)

            with patch.object(e, "checked_git", side_effect=missing_authorized_lock):
                self.assertIn(
                    "AUTHORIZATION_COMMIT_MISMATCH",
                    {
                        gap["reason"]
                        for gap in evidence.verify_evidence(output, restricted)["gaps"]
                    },
                )
            public_review = (output / "review.json").read_bytes()
            original_summary_parser = evidence.summary_bytes
            original_review_parser = evidence.parse_review_bytes

            def replace_summary_after_read(run_dir: Path) -> bytes:
                snapshot = original_summary_parser(run_dir)
                (run_dir / "summary.json").write_bytes(b"changed after snapshot")
                return snapshot

            def replace_review_after_read(snapshot: bytes) -> dict[str, object]:
                (output / "review.json").write_bytes(b"changed after snapshot")
                return original_review_parser(snapshot)

            try:
                with (
                    patch.object(
                        evidence,
                        "summary_bytes",
                        side_effect=replace_summary_after_read,
                    ),
                    patch.object(
                        evidence,
                        "parse_review_bytes",
                        side_effect=replace_review_after_read,
                    ),
                ):
                    self.assertEqual(
                        evidence.verify_evidence(output, restricted)["gaps"], []
                    )
            finally:
                (output / "summary.json").write_bytes(public_summary)
                (output / "review.json").write_bytes(public_review)
            committed_git = e.checked_git

            def changed_freeze(checkout: Path, arguments: list[str]) -> bytes:
                if arguments[-1].endswith(f":{e.FREEZE_RELATIVE.as_posix()}"):
                    return b"uncommitted freeze"
                return committed_git(checkout, arguments)

            with patch.object(e, "checked_git", side_effect=changed_freeze):
                self.assertIn(
                    "FREEZE_SOURCE_UNCOMMITTED",
                    {
                        gap["reason"]
                        for gap in evidence.verify_evidence(output, restricted)["gaps"]
                    },
                )
            changed_manifest = e.read_object(output / "manifest.json")
            changed_manifest["authorization_revision"] = "0" * 40
            (output / "manifest.json").write_bytes(e.json_bytes(changed_manifest))
            self.assertIn(
                "AUTHORIZATION_COMMIT_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "manifest.json").write_bytes(e.json_bytes(public_manifest))
            published_lock = (output / "uv.lock").read_bytes()
            (output / "uv.lock").write_bytes(published_lock + b"\n")
            with self.assertRaisesRegex(
                e.ContractError, "SDK_REPLAY_INVENTORY_MISMATCH"
            ):
                evidence.verify_evidence(output, restricted)
            (output / "uv.lock").write_bytes(published_lock)
            published_baseline = (output / "sdk-code-digests.json").read_bytes()
            (output / "sdk-code-digests.json").write_bytes(published_baseline + b"\n")
            with self.assertRaisesRegex(
                e.ContractError, "SDK_REPLAY_INVENTORY_MISMATCH"
            ):
                evidence.verify_evidence(output, restricted)
            (output / "sdk-code-digests.json").write_bytes(published_baseline)
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
            local_manifest_bytes = (restricted / "manifest.json").read_bytes()
            late_manifest = e.read_object(restricted / "manifest.json")
            late_manifest["created_utc"] = "2026-10-08T00:00:09Z"
            (restricted / "manifest.json").write_bytes(e.json_bytes(late_manifest))
            self.assertIn(
                "MANIFEST_CHRONOLOGY_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_local_run(restricted)["gaps"]
                },
            )
            (restricted / "manifest.json").write_bytes(local_manifest_bytes)
            event_bytes = (restricted / "events.jsonl").read_bytes()
            (restricted / "events.jsonl").unlink()
            self.assertIn(
                "EVENT_LOG_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_local_run(restricted)["gaps"]
                },
            )
            (restricted / "events.jsonl").write_bytes(event_bytes)
            public_event_bytes = (output / "events.jsonl").read_bytes()
            (output / "events.jsonl").write_bytes(public_event_bytes + b" ")
            self.assertIn(
                "EVENT_LOG_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "events.jsonl").write_bytes(public_event_bytes)
            review_path = e.ORACLE / "versions/v1/review.md"
            review_bytes = review_path.read_bytes()
            review_path.write_bytes(b"NOT FROZEN\n" + review_bytes)
            try:
                self.assertIn(
                    "FREEZE_SOURCE_UNCOMMITTED",
                    {
                        gap["reason"]
                        for gap in evidence.verify_evidence(output, restricted)["gaps"]
                    },
                )
            finally:
                review_path.write_bytes(review_bytes)
            invalid_expected = [
                json.loads(line) for line in restricted_rows.splitlines()
            ]
            for value in ("UNKNOWN_LABEL", []):
                invalid_expected[0]["expected"] = value
                (restricted / "analysis.jsonl").write_bytes(
                    b"".join(e.json_bytes(row) for row in invalid_expected)
                )
                with self.assertRaisesRegex(
                    e.ContractError, "INVALID_ANALYSIS_EXPECTED"
                ):
                    evidence.verify_local_run(restricted)
            (restricted / "analysis.jsonl").write_bytes(restricted_rows)
            missing_transport_request = [
                json.loads(line) for line in restricted_rows.splitlines()
            ]
            missing_transport_request[0].update(
                status="ERROR",
                choice=None,
                probabilities=None,
                confidence=None,
                error_code="IO_TIMEOUT",
                request_sha256=None,
                raw_sha256=None,
                raw_locator=None,
            )
            (restricted / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in missing_transport_request)
            )
            self.assertIn(
                "REQUEST_BODY_MISSING",
                {
                    gap["reason"]
                    for gap in evidence.verify_local_run(restricted)["gaps"]
                },
            )
            (restricted / "analysis.jsonl").write_bytes(restricted_rows)
            sequence = [json.loads(line) for line in restricted_rows.splitlines()]
            sequence[0].update(
                status="UNKNOWN",
                choice=None,
                probabilities=None,
                confidence=None,
                error_code="CAPTURE_OR_RUNTIME_FAILED",
            )
            (restricted / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in sequence)
            )
            with self.assertRaisesRegex(e.ContractError, "INVALID_ANALYSIS_SEQUENCE"):
                evidence.read_rows(restricted / "analysis.jsonl")
            sequence[0] = json.loads(restricted_rows.splitlines()[0])
            sequence[0]["probabilities"] = {
                "SUFFICIENT": True,
                "INSUFFICIENT": False,
            }
            (restricted / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in sequence)
            )
            with self.assertRaisesRegex(
                e.ContractError, "INVALID_ANALYSIS_STATUS_FIELDS"
            ):
                evidence.read_rows(restricted / "analysis.jsonl")
            sequence[0] = json.loads(restricted_rows.splitlines()[0])
            sequence[2]["status"] = "NOT_RUN"
            sequence[2]["error_code"] = None
            sequence[2]["started_utc"] = None
            sequence[2]["ended_utc"] = None
            (restricted / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in sequence)
            )
            with self.assertRaisesRegex(e.ContractError, "INVALID_ANALYSIS_SEQUENCE"):
                evidence.read_rows(restricted / "analysis.jsonl")
            (restricted / "analysis.jsonl").write_bytes(restricted_rows)
            captured_unknown = deepcopy(sequence[2])
            captured_unknown.update(
                status="UNKNOWN",
                error_code="CAPTURE_OR_RUNTIME_FAILED",
                started_utc="2026-10-08T00:00:02+00:00",
                ended_utc="2026-10-08T00:00:03+00:00",
                request_sha256=e.sha(
                    evidence.emitted_request(self.cases[2], self.question)
                ),
                raw_sha256=e.sha(raw),
                raw_locator=f"responses/{self.cases[2]['group']}/{self.cases[2]['case_id']}.body",
            )
            sequence[2] = captured_unknown
            (restricted / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in sequence)
            )
            self.assertEqual(
                evidence.read_rows(restricted / "analysis.jsonl")[2], captured_unknown
            )
            self.assertIsNone(
                evidence.response_gap(
                    captured_unknown, raw, self.cases[2], self.question
                )
            )
            (restricted / "analysis.jsonl").write_bytes(restricted_rows)
            extra_file = output / ".env"
            extra_file.write_bytes(b"unreviewed local secret")
            self.assertIn(
                "UNREVIEWED_EVIDENCE_FILE",
                {gap["reason"] for gap in evidence.verify_evidence(output)["gaps"]},
            )
            extra_file.unlink()
            extra_raw = output / "raw" / "research" / "unexpected.body"
            extra_raw.write_bytes(b"unreviewed response")
            self.assertIn(
                "UNREVIEWED_EVIDENCE_FILE",
                {gap["reason"] for gap in evidence.verify_evidence(output)["gaps"]},
            )
            extra_raw.unlink()
            full_rows = [json.loads(line) for line in public_rows.splitlines()]
            full_rows[0]["unreviewed_secret"] = "credential"
            (output / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in full_rows)
            )
            with self.assertRaisesRegex(e.ContractError, "UNREVIEWED_ANALYSIS_FIELD"):
                evidence.verify_evidence(output)
            (output / "analysis.jsonl").write_bytes(public_rows)
            for malformed in (public_rows.replace(b"\n", b"\r\n"), public_rows[:-1]):
                (output / "analysis.jsonl").write_bytes(malformed)
                with self.assertRaisesRegex(e.ContractError, "NONCANONICAL_ANALYSIS"):
                    evidence.verify_evidence(output)
            (output / "analysis.jsonl").write_bytes(public_rows)
            wrong_full_locator = [json.loads(line) for line in public_rows.splitlines()]
            wrong_full_locator[0]["raw_locator"] = "responses/research/wrong.body"
            (output / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in wrong_full_locator)
            )
            with self.assertRaisesRegex(e.ContractError, "INVALID_RAW_LOCATOR_STATE"):
                evidence.verify_evidence(output)
            (output / "analysis.jsonl").write_bytes(public_rows)
            wrong_source = e.read_object(output / "manifest.json")
            wrong_source["runner_source_path"] = "other.py"
            (output / "manifest.json").write_bytes(e.json_bytes(wrong_source))
            self.assertIn(
                "RUNNER_SOURCE_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "manifest.json").write_bytes(public_manifest)
            review_bytes = (output / "review.json").read_bytes()
            for location in ("top", "decision"):
                altered_review = e.read_object(output / "review.json")
                if location == "top":
                    altered_review["unreviewed_note"] = "secret"
                else:
                    altered_review["cases"][0]["unreviewed_note"] = "secret"
                (output / "review.json").write_bytes(e.json_bytes(altered_review))
                updated_manifest = e.read_object(output / "manifest.json")
                updated_manifest["review_sha256"] = e.sha(
                    (output / "review.json").read_bytes()
                )
                (output / "manifest.json").write_bytes(e.json_bytes(updated_manifest))
                self.assertIn(
                    "REVIEW_MISSING",
                    {
                        gap["reason"]
                        for gap in evidence.verify_evidence(output, restricted)["gaps"]
                    },
                )
                (output / "review.json").write_bytes(review_bytes)
                (output / "manifest.json").write_bytes(public_manifest)
            marked_restricted = [
                json.loads(line) for line in restricted_rows.splitlines()
            ]
            marked_restricted[1]["analysis_restricted"] = True
            (restricted / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in marked_restricted)
            )
            self.assertIn(
                "RESTRICTED_ANALYSIS_INVALID",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (restricted / "analysis.jsonl").write_bytes(restricted_rows)
            with (
                patch.object(e, "TOPIC", root / "changed-policy-location"),
                patch.object(evidence, "verify_replay_sdk"),
            ):
                self.assertEqual(
                    evidence.verify_evidence(output, restricted)["gaps"], []
                )
            policy_file = output / "store-policy.json"
            published_policy = policy_file.read_bytes()
            policy_file.write_bytes(published_policy + b" ")
            self.assertIn(
                "STORE_POLICY_MISMATCH",
                {gap["reason"] for gap in evidence.verify_evidence(output)["gaps"]},
            )
            policy_file.write_bytes(published_policy)

            malformed_time = [json.loads(line) for line in restricted_rows.splitlines()]
            malformed_time[0]["ended_utc"] = "2026-10-07T23:59:59+00:00"
            (restricted / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in malformed_time)
            )
            with self.assertRaisesRegex(e.ContractError, "INVALID_ANALYSIS_TIME"):
                evidence.verify_local_run(restricted)
            malformed_time[0] = json.loads(restricted_rows.splitlines()[0])
            malformed_time[1]["started_utc"] = "2026-10-08T00:00:00+00:00"
            malformed_time[1]["ended_utc"] = "2026-10-08T00:00:01+00:00"
            (restricted / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in malformed_time)
            )
            with self.assertRaisesRegex(e.ContractError, "INVALID_ANALYSIS_TIME"):
                evidence.verify_local_run(restricted)
            malformed_time[1] = json.loads(restricted_rows.splitlines()[1])
            malformed_time[2]["started_utc"] = "2026-10-08T00:00:00+00:00"
            (restricted / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in malformed_time)
            )
            with self.assertRaisesRegex(e.ContractError, "INVALID_ANALYSIS_TIME"):
                evidence.verify_local_run(restricted)
            (restricted / "analysis.jsonl").write_bytes(restricted_rows)

            duplicate_manifest = public_manifest[:-2] + b', "reviewed_by": "other"}\n'
            (output / "manifest.json").write_bytes(duplicate_manifest)
            with self.assertRaisesRegex(e.ContractError, "INVALID_EVIDENCE_MANIFEST"):
                evidence.verify_evidence(output)
            (output / "manifest.json").write_bytes(public_manifest)
            (output / "manifest.json").write_bytes(public_manifest + b" ")
            with self.assertRaisesRegex(e.ContractError, "INVALID_EVIDENCE_MANIFEST"):
                evidence.verify_evidence(output)
            (output / "manifest.json").write_bytes(public_manifest)
            extra_locator = e.read_object(output / "manifest.json")
            extra_locator["cases"][0]["unreviewed_note"] = "must-not-publish"
            (output / "manifest.json").write_bytes(e.json_bytes(extra_locator))
            with self.assertRaisesRegex(e.ContractError, "INVALID_EVIDENCE_MANIFEST"):
                evidence.verify_evidence(output, restricted)
            (output / "manifest.json").write_bytes(public_manifest)
            altered_revision = e.read_object(output / "manifest.json")
            altered_revision["runner_revision"] = "0" * 40
            (output / "manifest.json").write_bytes(e.json_bytes(altered_revision))
            self.assertIn(
                "RUNNER_REVISION_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "manifest.json").write_bytes(public_manifest)
            historical = e.read_object(
                e.TOPIC / "evidence/runs/20261008T035450Z-010364d7/manifest.json"
            )
            self.assertEqual(
                historical["runner_revision"],
                evidence.PRE_RECORD_RUNNER_REVISION,
            )
            altered = e.read_object(output / "manifest.json")
            del altered["restricted_store_id"]
            (output / "manifest.json").write_bytes(e.json_bytes(altered))
            self.assertIn(
                "STORE_POLICY_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "manifest.json").write_bytes(public_manifest)

            local_manifest = (restricted / "manifest.json").read_bytes()
            actual_verify = evidence.verify_local_run

            def mutate_after_verify(
                run_dir: Path, manifest: dict[str, object]
            ) -> dict[str, object]:
                result = actual_verify(run_dir, manifest)
                changed = e.read_object(run_dir / "manifest.json")
                changed["store"]["unreviewed_secret"] = "must-not-publish"
                (run_dir / "manifest.json").write_bytes(e.json_bytes(changed))
                return result

            with patch.object(
                evidence, "verify_local_run", side_effect=mutate_after_verify
            ):
                race_output = evidence.publish_reviewed(
                    restricted, approval, root / "race-evidence"
                )
            self.assertNotIn(
                "unreviewed_secret",
                e.read_object(race_output / "manifest.json")["store"],
            )
            (restricted / "manifest.json").write_bytes(local_manifest)
            visible = [json.loads(line) for line in public_rows.splitlines()]
            full_local = [json.loads(line) for line in restricted_rows.splitlines()]
            visible[1] = full_local[1]
            (output / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in visible)
            )
            self.assertIn(
                "ANALYSIS_VISIBILITY_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "analysis.jsonl").write_bytes(public_rows)
            wrong_stub = [json.loads(line) for line in public_rows.splitlines()]
            wrong_stub[1]["analysis_sha256"] = "0" * 64
            (output / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in wrong_stub)
            )
            self.assertIn(
                "ANALYSIS_VISIBILITY_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "analysis.jsonl").write_bytes(public_rows)

            wrong_request = [json.loads(line) for line in public_rows.splitlines()]
            wrong_request[0]["request_sha256"] = "0" * 64
            (output / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in wrong_request)
            )
            request_review_bytes = (output / "review.json").read_bytes()
            request_review = e.read_object(output / "review.json")
            request_review["cases"][0]["analysis_sha256"] = e.sha(
                e.json_bytes(wrong_request[0])
            )
            (output / "review.json").write_bytes(e.json_bytes(request_review))
            request_manifest = e.read_object(output / "manifest.json")
            request_manifest["cases"][0]["analysis_sha256"] = request_review["cases"][
                0
            ]["analysis_sha256"]
            request_manifest["review_sha256"] = e.sha(
                (output / "review.json").read_bytes()
            )
            (output / "manifest.json").write_bytes(e.json_bytes(request_manifest))
            self.assertIn(
                "REQUEST_HASH_MISMATCH",
                {gap["reason"] for gap in evidence.verify_evidence(output)["gaps"]},
            )
            (output / "analysis.jsonl").write_bytes(public_rows)
            (output / "review.json").write_bytes(request_review_bytes)
            (output / "manifest.json").write_bytes(public_manifest)

            request_path = (
                restricted
                / "requests"
                / self.cases[0]["group"]
                / f"{self.cases[0]['case_id']}.body"
            )
            request_bytes = request_path.read_bytes()
            request_path.unlink()
            self.assertIn(
                "REQUEST_BODY_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            os.mkfifo(request_path)
            self.assertIn(
                "REQUEST_BODY_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            request_path.unlink()
            request_path.write_bytes(request_bytes)
            restricted_body = restricted / rows[1]["raw_locator"]
            restricted_body_bytes = restricted_body.read_bytes()
            restricted_body.unlink()
            os.mkfifo(restricted_body)
            self.assertIn(
                "RAW_HASH_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            restricted_body.unlink()
            restricted_body.write_bytes(restricted_body_bytes)
            reformatted_request = json.dumps(
                json.loads(request_bytes), ensure_ascii=False, indent=2
            ).encode()
            self.assertNotEqual(reformatted_request, request_bytes)
            altered_local = [json.loads(line) for line in restricted_rows.splitlines()]
            altered_local[0]["request_sha256"] = e.sha(reformatted_request)
            (restricted / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in altered_local)
            )
            request_path.write_bytes(reformatted_request)
            self.assertIn(
                "REQUEST_CONTENT_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_local_run(restricted)["gaps"]
                },
            )
            with self.assertRaisesRegex(e.ContractError, "LOCAL_EVIDENCE_UNVERIFIED"):
                evidence.publish_reviewed(
                    restricted, approval, root / "another-evidence"
                )
            request_path.write_bytes(request_bytes)
            (restricted / "analysis.jsonl").write_bytes(restricted_rows)

            public_review = e.read_object(output / "review.json")
            original_review = (output / "review.json").read_bytes()
            public_review["cases"][0]["group"] = []
            (output / "review.json").write_bytes(e.json_bytes(public_review))
            self.assertIn(
                "REVIEW_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "review.json").write_bytes(original_review)

            wrong_reviewer = e.read_object(output / "manifest.json")
            wrong_reviewer["reviewed_by"] = "someone else"
            (output / "manifest.json").write_bytes(e.json_bytes(wrong_reviewer))
            self.assertIn(
                "REVIEW_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "manifest.json").write_bytes(public_manifest)

            stale_locator = [json.loads(line) for line in restricted_rows.splitlines()]
            stale_locator[2]["raw_locator"] = "responses/research/stale.body"
            (restricted / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in stale_locator)
            )
            with self.assertRaisesRegex(e.ContractError, "INVALID_RAW_LOCATOR_STATE"):
                evidence.verify_local_run(restricted)
            (restricted / "analysis.jsonl").write_bytes(restricted_rows)

            captured_error = [json.loads(line) for line in restricted_rows.splitlines()]
            captured_error[0].update(
                {
                    "status": "ERROR",
                    "choice": None,
                    "probabilities": None,
                    "confidence": None,
                    "error_code": "HTTP_FAILED",
                }
            )
            (restricted / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in captured_error)
            )
            self.assertIn(
                "UNEXPECTED_CAPTURED_BODY",
                {
                    gap["reason"]
                    for gap in evidence.verify_local_run(restricted)["gaps"]
                },
            )
            (restricted / "analysis.jsonl").write_bytes(restricted_rows)

            lines = public_rows.splitlines()
            duplicate = lines[0][:-1] + b',"status":"INVALID"}'
            (output / "analysis.jsonl").write_bytes(
                b"\n".join([duplicate, *lines[1:]]) + b"\n"
            )
            with self.assertRaisesRegex(e.ContractError, "DUPLICATE_ANALYSIS_FIELD"):
                evidence.verify_evidence(output, restricted)
            (output / "analysis.jsonl").write_bytes(
                b"\n".join([lines[0] + b" ", *lines[1:]]) + b"\n"
            )
            with self.assertRaisesRegex(e.ContractError, "NONCANONICAL_ANALYSIS"):
                evidence.verify_evidence(output, restricted)
            (output / "analysis.jsonl").write_bytes(public_rows)
            unexpected_manifest = e.read_object(restricted / "manifest.json")
            original_local_manifest = (restricted / "manifest.json").read_bytes()
            unexpected_manifest["debug_secret"] = "should-never-publish"
            (restricted / "manifest.json").write_bytes(
                e.json_bytes(unexpected_manifest)
            )
            with self.assertRaisesRegex(e.ContractError, "UNREVIEWED_MANIFEST_FIELD"):
                evidence.publish_reviewed(
                    restricted, approval, root / "another-evidence"
                )
            (restricted / "manifest.json").write_bytes(original_local_manifest)

            unexpected_public = e.read_object(output / "manifest.json")
            unexpected_public["debug_secret"] = "should-never-publish"
            (output / "manifest.json").write_bytes(e.json_bytes(unexpected_public))
            with self.assertRaisesRegex(e.ContractError, "UNREVIEWED_MANIFEST_FIELD"):
                evidence.verify_evidence(output, restricted)
            (output / "manifest.json").write_bytes(public_manifest)

            other_directory = output.with_name("other-run")
            output.rename(other_directory)
            with self.assertRaisesRegex(e.ContractError, "EVIDENCE_RUN_MISMATCH"):
                evidence.verify_evidence(other_directory, restricted)
            other_directory.rename(output)
            self.assertEqual(
                e.sha((output / "runner.py").read_bytes()), e.sha(runner_source)
            )
            self.assertEqual(
                e.sha((output / "review.json").read_bytes()),
                e.read_object(output / "manifest.json")["review_sha256"],
            )
            self.assertEqual(len(e.read_object(output / "review.json")["cases"]), 75)
            self.assertEqual(
                (output / "authorization.json").read_bytes(), authorization
            )

            (output / "authorization.json").write_bytes(authorization + b" ")
            self.assertIn(
                "AUTHORIZATION_HASH_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "authorization.json").write_bytes(authorization)
            missing_authorization = e.read_object(output / "manifest.json")
            del missing_authorization["live_authorization_sha256"]
            del missing_authorization["live_authorization_path"]
            (output / "manifest.json").write_bytes(e.json_bytes(missing_authorization))
            self.assertIn(
                "AUTHORIZATION_MISSING",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "manifest.json").write_bytes(public_manifest)

            altered_store = e.read_object(restricted / "manifest.json")
            original_store_manifest = (restricted / "manifest.json").read_bytes()
            altered_store["store"]["backup_verified"] = True
            (restricted / "manifest.json").write_bytes(e.json_bytes(altered_store))
            self.assertIn(
                "STORE_POLICY_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_local_run(restricted)["gaps"]
                },
            )
            (restricted / "manifest.json").write_bytes(original_store_manifest)

            changed_summary = e.read_object(restricted / "summary.json")
            original_summary = (restricted / "summary.json").read_bytes()
            changed_summary["run_id"] = "other-run"
            (restricted / "summary.json").write_bytes(e.json_bytes(changed_summary))
            self.assertIn(
                "SUMMARY_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_local_run(restricted)["gaps"]
                },
            )
            (restricted / "summary.json").write_bytes(original_summary)

            # The local publication gate needs the emitted request for each response.
            missing_request = [
                json.loads(line) for line in restricted_rows.splitlines()
            ]
            missing_request[0]["request_sha256"] = None
            (restricted / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in missing_request)
            )
            self.assertIn(
                "REQUEST_BODY_MISSING",
                {
                    gap["reason"]
                    for gap in evidence.verify_local_run(restricted)["gaps"]
                },
            )
            (restricted / "analysis.jsonl").write_bytes(restricted_rows)

            unknown = [json.loads(line) for line in public_rows.splitlines()]
            unknown[0]["status"] = "SURPRISE"
            (output / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in unknown)
            )
            with self.assertRaisesRegex(e.ContractError, "INVALID_ANALYSIS_STATUS"):
                evidence.verify_evidence(output, restricted)
            for malformed_status in ({"unexpected": True}, ["VALID"]):
                unknown[0]["status"] = malformed_status
                (output / "analysis.jsonl").write_bytes(
                    b"".join(e.json_bytes(row) for row in unknown)
                )
                with self.assertRaisesRegex(e.ContractError, "INVALID_ANALYSIS_STATUS"):
                    evidence.verify_evidence(output, restricted)
            (output / "analysis.jsonl").write_bytes(public_rows)
            wrong_ordinal = [json.loads(line) for line in public_rows.splitlines()]
            wrong_ordinal[0]["ordinal"] = True
            (output / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in wrong_ordinal)
            )
            with self.assertRaisesRegex(e.ContractError, "INVALID_ANALYSIS_ORDINAL"):
                evidence.verify_evidence(output, restricted)
            (output / "analysis.jsonl").write_bytes(public_rows)
            malformed = [json.loads(line) for line in public_rows.splitlines()]
            malformed[0]["group"] = []
            (output / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in malformed)
            )
            with self.assertRaisesRegex(e.ContractError, "INVALID_ANALYSIS_KEY"):
                evidence.verify_evidence(output, restricted)
            (output / "analysis.jsonl").write_bytes(public_rows)

            altered = e.read_object(output / "manifest.json")
            altered["conditions"]["retries"] = 1
            (output / "manifest.json").write_bytes(e.json_bytes(altered))
            self.assertIn(
                "RUN_CONTRACT_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "manifest.json").write_bytes(public_manifest)
            altered = e.read_object(output / "manifest.json")
            altered["conditions"]["retries"] = False
            (output / "manifest.json").write_bytes(e.json_bytes(altered))
            self.assertIn(
                "RUN_CONTRACT_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "manifest.json").write_bytes(public_manifest)

            altered = e.read_object(output / "manifest.json")
            del altered["cases"][0]["analysis_sha256"]
            (output / "manifest.json").write_bytes(e.json_bytes(altered))
            with self.assertRaisesRegex(e.ContractError, "INVALID_EVIDENCE_MANIFEST"):
                evidence.verify_evidence(output, restricted)
            (output / "manifest.json").write_bytes(public_manifest)

            review_bytes = (output / "review.json").read_bytes()
            (output / "review.json").write_bytes(b"tampered")
            self.assertIn(
                "REVIEW_MISSING",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "review.json").write_bytes(review_bytes + b" ")
            self.assertIn(
                "REVIEW_MISSING",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            with self.assertRaisesRegex(e.ContractError, "INVALID_PUBLICATION_REVIEW"):
                evidence.read_review(output / "review.json")
            (output / "review.json").write_bytes(review_bytes)
            self.assertEqual(evidence.verify_evidence(output, restricted)["gaps"], [])

            (output / "runner.py").write_bytes(b"changed runner")
            self.assertIn(
                "RUNNER_SOURCE_MISMATCH",
                {
                    gap["reason"]
                    for gap in evidence.verify_evidence(output, restricted)["gaps"]
                },
            )
            (output / "runner.py").write_bytes(runner_source)
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
            if (second_root / "runs").exists():
                self.assertEqual(list((second_root / "runs").iterdir()), [])

            def mutate_original_after_verify(
                run_dir: Path, manifest: dict[str, object]
            ) -> dict[str, object]:
                result = actual_verify(run_dir, manifest)
                changed = [json.loads(line) for line in restricted_rows.splitlines()]
                changed[0]["status"] = "ERROR"
                (restricted / "analysis.jsonl").write_bytes(
                    b"".join(e.json_bytes(row) for row in changed)
                )
                return result

            with patch.object(
                evidence, "verify_local_run", side_effect=mutate_original_after_verify
            ):
                retry_output = evidence.publish_reviewed(
                    restricted, approval, second_root
                )
            (restricted / "analysis.jsonl").write_bytes(restricted_rows)
            self.assertEqual(
                evidence.verify_evidence(retry_output, restricted)["gaps"], []
            )

            # Even INVALID 2xx observations must carry the captured body.
            altered = e.read_object(output / "manifest.json")
            altered["cases"][0]["raw_sha256"] = None
            altered["cases"][0]["raw_public_path"] = None
            altered["cases"][0]["raw_restricted_path"] = None
            forged = [json.loads(line) for line in public_rows.splitlines()]
            forged[0]["status"] = "INVALID"
            forged[0]["choice"] = None
            forged[0]["probabilities"] = None
            forged[0]["confidence"] = None
            forged[0]["error_code"] = "INVALID_RESPONSE"
            forged[0]["raw_sha256"] = None
            forged[0]["raw_locator"] = None
            altered["cases"][0]["analysis_sha256"] = e.sha(e.json_bytes(forged[0]))
            (output / "manifest.json").write_bytes(e.json_bytes(altered))
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
            # Public raw bytes remain verifiable when the analysis row is private.
            public_review = (output / "review.json").read_bytes()
            restricted_manifest = e.read_object(output / "manifest.json")
            restricted_manifest["cases"][0]["analysis_restricted"] = True
            restricted_review = e.read_object(output / "review.json")
            restricted_review["cases"][0]["analysis_public"] = False
            (output / "review.json").write_bytes(e.json_bytes(restricted_review))
            restricted_manifest["review_sha256"] = e.sha(
                (output / "review.json").read_bytes()
            )
            (output / "manifest.json").write_bytes(e.json_bytes(restricted_manifest))
            stubbed = [json.loads(line) for line in public_rows.splitlines()]
            stubbed[0] = {
                "run_id": stubbed[0]["run_id"],
                "group": stubbed[0]["group"],
                "case_id": stubbed[0]["case_id"],
                "status": stubbed[0]["status"],
                "raw_sha256": stubbed[0]["raw_sha256"],
                "analysis_restricted": True,
                "analysis_sha256": restricted_manifest["cases"][0]["analysis_sha256"],
            }
            (output / "analysis.jsonl").write_bytes(
                b"".join(e.json_bytes(row) for row in stubbed)
            )
            public_body = (
                output
                / "raw"
                / self.cases[0]["group"]
                / f"{self.cases[0]['case_id']}.body"
            )
            original_body = public_body.read_bytes()
            public_body.write_bytes(b"tampered")
            reasons = {
                gap["reason"] for gap in evidence.verify_evidence(output)["gaps"]
            }
            self.assertIn("ANALYSIS_ACCESS_REQUIRED", reasons)
            self.assertIn("RAW_HASH_MISMATCH", reasons)
            public_body.write_bytes(original_body)
            (output / "review.json").write_bytes(public_review)
            (output / "manifest.json").write_bytes(public_manifest)
            (output / "analysis.jsonl").write_bytes(public_rows)
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
