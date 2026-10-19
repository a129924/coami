"""Source-bound evidence audit regressions; real Git reads, no runtime control."""

import ast
import copy
import importlib.util
import json
import os
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location(
    "evidence_audit", ROOT / "evidence/audit-wasm.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class EvidenceAuditTests(unittest.TestCase):
    def build_fixture(self):
        run = ROOT / "evidence/wasm-runs" / module.RUN_ID
        return json.loads((run / "report.json").read_text()), json.loads(
            (run / "source-inputs.json").read_text()
        )

    def test_build_binding_checks_immutable_source_and_complete_output(self):
        report, inputs = self.build_fixture()
        module.verify_build(ROOT, report, inputs)

    def test_build_binding_rejects_legacy_run_without_manifest(self):
        run = ROOT / "evidence/wasm-runs/WASM-2026-10-15T07-05-48-980Z"
        with self.assertRaisesRegex(module.AuditError, "source-bound build manifest"):
            module.verify_build(
                ROOT,
                json.loads((run / "report.json").read_text()),
                json.loads((run / "source-inputs.json").read_text()),
            )

    def test_build_binding_rejects_stale_bundle_or_incomplete_dist(self):
        for omit_html in [False, True]:
            report, inputs = self.build_fixture()
            if omit_html:
                del report["build"]["distSha256"]["index.html"]
            else:
                name = next(iter(report["bundleSha256"]))
                report["bundleSha256"][name] = "0" * 64
            with self.assertRaisesRegex(
                module.AuditError, "bundle/public hash mismatch|incomplete dist"
            ):
                module.verify_build(ROOT, report, inputs)

    def test_build_binding_rejects_missing_source_or_runtime_mutation(self):
        report, inputs = self.build_fixture()
        del report["build"]["sourcesSha256"]["web/src/observer.ts"]
        inputs["sha256"] = copy.deepcopy(report["build"]["sourcesSha256"])
        with self.assertRaisesRegex(module.AuditError, "incomplete recorded source"):
            module.verify_build(ROOT, report, inputs)
        report, inputs = self.build_fixture()
        report["provenance"]["hashes"]["mc.wasm"] = "0" * 64
        with self.assertRaisesRegex(module.AuditError, "runtime pin mismatch"):
            module.verify_build(ROOT, report, inputs)

    def test_wrong_recorded_hash_is_rejected(self):
        with self.assertRaisesRegex(module.AuditError, "recorded source mismatch"):
            module.verify_sources(ROOT, {"web/scripts/runtime-run.mjs": "0" * 64})

    def test_duplicate_or_missing_ids_cannot_pass_audit(self):
        cases = [{"id": f"TC-E2E-{i:02}"} for i in range(1, 16)]
        module.verify_case_ids(cases)
        for invalid in [cases[:-1], cases[:-1] + [cases[0]], [cases[0]] * 15]:
            with self.assertRaisesRegex(module.AuditError, "15 distinct cases"):
                module.verify_case_ids(invalid)

    def test_new_full_run_is_source_bound(self):
        result = module.audit(ROOT)
        self.assertEqual(result["source_commit"], module.SOURCE_COMMIT)
        self.assertTrue(result["build_manifest_match"])
        self.assertEqual(result["total_sdk_calls"], 90)
        self.assertEqual(len(result["cases"]), 15)

    def test_missing_clean_install_cannot_pass_dependency_attribution(self):
        report, inputs = self.build_fixture()
        del report["build"]["dependencies"]
        with self.assertRaisesRegex(
            module.AuditError, "dependency install attestation"
        ):
            module.verify_build(ROOT, report, inputs)

    def test_modified_dependency_tree_or_lock_is_rejected(self):
        for field, message in [
            ("installedTreeSha256", "dependency tree mismatch"),
            ("lockSha256", "dependency lock mismatch"),
        ]:
            report, inputs = self.build_fixture()
            report["build"]["dependencies"][field] = "0" * 64
            with self.assertRaisesRegex(module.AuditError, message):
                module.verify_build(ROOT, report, inputs)

    def test_missing_or_changed_compiler_and_python_proof_is_rejected(self):
        for field, message in [
            ("mod", "MOD compiler attestation"),
            ("python", "Python runtime attestation"),
        ]:
            report, inputs = self.build_fixture()
            del report[field]
            with self.assertRaisesRegex(module.AuditError, message):
                module.verify_build(ROOT, report, inputs)
        report, inputs = self.build_fixture()
        report["python"]["venvTreeSha256"] = "0" * 64
        with self.assertRaisesRegex(module.AuditError, "Python runtime attestation"):
            module.verify_build(ROOT, report, inputs)
        report, inputs = self.build_fixture()
        report["mod"]["dependencies"]["installedTreeSha256"] = "0" * 64
        report["provenance"]["modBuild"] = copy.deepcopy(report["mod"])
        with self.assertRaisesRegex(
            module.AuditError, "MOD compiler dependency mismatch"
        ):
            module.verify_build(ROOT, report, inputs)

    def test_optimization_cannot_remove_validation(self):
        tree = ast.parse((ROOT / "evidence/audit-wasm.py").read_text())
        self.assertFalse(any(isinstance(node, ast.Assert) for node in ast.walk(tree)))
        for expression in [
            "m.verify_case_ids([{'id':'TC-E2E-01'}]*15)",
            "m.verify_sources(root, {'web/scripts/runtime-run.mjs':'0'*64})",
        ]:
            code = (
                "import importlib.util;from pathlib import Path;"
                f"root=Path({str(ROOT)!r});"
                "s=importlib.util.spec_from_file_location('audit',root/'evidence/audit-wasm.py');"
                "m=importlib.util.module_from_spec(s);s.loader.exec_module(m);"
                + expression
            )
            result = subprocess.run(
                [sys.executable, "-B", "-O", "-c", code],
                capture_output=True,
                text=True,
                env={**os.environ, "PYTHONOPTIMIZE": "2"},
                check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("AuditError", result.stderr)

    def test_full_audit_rejects_incomplete_or_mismatched_sdk_targets(self):
        case_path = ROOT / "evidence/wasm-runs" / module.RUN_ID / "TC-E2E-02.json"
        original_read = Path.read_text
        for phase in ["decoded", "returned"]:
            for target in [
                [],
                [1],
                [1, 0],
                [1, 0, 0, 0],
                [float("nan"), 0, 0],
                [True, 0, 0],
                [0, 0, 1],
                None,
            ]:
                data = json.loads(original_read(case_path))
                for row in data["records"]:
                    if row["kind"] == "trace" and row["text"].startswith("COAMI23|"):
                        trace = json.loads(row["text"].split("|", 1)[1])
                        if trace.get("phase") == phase and trace["seq"] == 7:
                            if target is None:
                                trace.pop("target")
                            else:
                                trace["target"] = target
                            row["text"] = "COAMI23|" + json.dumps(trace)

                serialized = json.dumps(data)

                def read(path, *args, payload=serialized, **kwargs):
                    return (
                        payload
                        if path == case_path
                        else original_read(path, *args, **kwargs)
                    )

                with (
                    self.subTest(phase=phase, target=target),
                    patch.object(Path, "read_text", read),
                    self.assertRaisesRegex(module.AuditError, "SDK target"),
                ):
                    module.audit(ROOT)

    def test_full_audit_rejects_missing_transport_records_and_short_offsets(self):
        original_read = Path.read_text
        for filename, mutation in [
            ("TC-E2E-02.json", "transport"),
            ("TC-E2E-01.json", "offset"),
        ]:
            case_path = ROOT / "evidence/wasm-runs" / module.RUN_ID / filename
            data = json.loads(original_read(case_path))
            if mutation == "transport":
                data["records"] = [
                    r for r in data["records"] if r["kind"] not in ["sent", "server"]
                ]
            else:
                for row in data["records"]:
                    if row["kind"] == "decision-observation":
                        row["offset"] = []
            serialized = json.dumps(data)

            def read(path, *args, payload=serialized, selected=case_path, **kwargs):
                return (
                    payload
                    if path == selected
                    else original_read(path, *args, **kwargs)
                )

            with (
                self.subTest(mutation=mutation),
                patch.object(Path, "read_text", read),
                self.assertRaises(module.AuditError),
            ):
                module.audit(ROOT)

    def test_server_exchanges_reject_broken_identity_targets_and_completions(self):
        data = json.loads(
            (ROOT / "evidence/wasm-runs" / module.RUN_ID / "TC-E2E-02.json").read_text()
        )
        self.assertEqual(
            module.verify_server_exchanges(data), {"observations": 4, "commands": 1}
        )
        changes = [
            ("sent", "hello", "run_id", "other"),
            ("server", "hello", "run_id", "other"),
            ("sent", "observation", "run_id", "other"),
            ("sent", "observation", "observation_seq", 99),
            ("sent", "observation", "offset", [0, 0.8]),
            ("sent", "observation", "rotation", []),
            ("sent", "observation", "age_ms", 1001),
            ("server", "command", "run_id", "other"),
            ("server", "command", "observation_seq", 99),
            ("server", "command", "command_id", "other:7"),
            ("server", "command", "target", [0, 0, 1]),
            ("server", "command", "target", []),
            ("sent", "completed", "command_id", "other:7"),
            ("server", "completed", "command_id", "other:7"),
        ]
        for kind, phase, field, value in changes:
            changed = copy.deepcopy(data)
            row = next(
                r
                for r in changed["records"]
                if r["kind"] == kind
                and r["message" if kind == "sent" else "reply"]["kind"] == phase
            )
            row["message" if kind == "sent" else "reply"][field] = value
            with (
                self.subTest(kind=kind, phase=phase, field=field),
                self.assertRaises(module.AuditError),
            ):
                module.verify_server_exchanges(changed)
        for kind in ["sent", "server", "frame-committed"]:
            changed = copy.deepcopy(data)
            changed["records"] = [r for r in changed["records"] if r["kind"] != kind]
            with self.subTest(missing=kind), self.assertRaises(module.AuditError):
                module.verify_server_exchanges(changed)

    def test_centering_requires_two_finite_numeric_offset_components(self):
        for offset in [[], [0], [0, 0, 0], [float("nan"), 0], [True, 0], [None, 0]]:
            self.assertFalse(module.finite_vector(offset, 2))
        self.assertTrue(module.finite_vector([0.1, -0.1], 2))
