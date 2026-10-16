"""Source-bound evidence audit regressions; real Git reads, no runtime control."""

import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location(
    "evidence_audit", ROOT / "evidence/audit-wasm.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class EvidenceAuditTests(unittest.TestCase):
    def build_fixture(self):
        run = ROOT / "evidence/wasm-runs/WASM-2026-10-16T06-26-29-613Z"
        return json.loads((run / "report.json").read_text()), json.loads(
            (run / "source-inputs.json").read_text()
        )

    def test_build_binding_checks_immutable_source_and_complete_output(self):
        report, inputs = self.build_fixture()
        module.verify_build(ROOT, report, inputs)

    def test_build_binding_rejects_legacy_run_without_manifest(self):
        run = ROOT / "evidence/wasm-runs/WASM-2026-10-15T07-05-48-980Z"
        with self.assertRaisesRegex(AssertionError, "source-bound build manifest"):
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
                AssertionError, "bundle/public hash mismatch|incomplete dist"
            ):
                module.verify_build(ROOT, report, inputs)

    def test_build_binding_rejects_missing_source_or_runtime_mutation(self):
        report, inputs = self.build_fixture()
        del report["build"]["sourcesSha256"]["web/src/observer.ts"]
        inputs["sha256"] = copy.deepcopy(report["build"]["sourcesSha256"])
        with self.assertRaisesRegex(AssertionError, "incomplete recorded source"):
            module.verify_build(ROOT, report, inputs)
        report, inputs = self.build_fixture()
        report["provenance"]["hashes"]["mc.wasm"] = "0" * 64
        with self.assertRaisesRegex(AssertionError, "runtime pin mismatch"):
            module.verify_build(ROOT, report, inputs)

    def test_wrong_recorded_hash_is_rejected(self):
        with self.assertRaisesRegex(AssertionError, "recorded source mismatch"):
            module.verify_sources(ROOT, {"web/scripts/runtime-run.mjs": "0" * 64})

    def test_duplicate_or_missing_ids_cannot_pass_audit(self):
        cases = [{"id": f"TC-E2E-{i:02}"} for i in range(1, 16)]
        module.verify_case_ids(cases)
        for invalid in [cases[:-1], cases[:-1] + [cases[0]], [cases[0]] * 15]:
            with self.assertRaisesRegex(AssertionError, "15 distinct cases"):
                module.verify_case_ids(invalid)

    def test_new_full_run_is_source_bound(self):
        result = module.audit(ROOT)
        self.assertEqual(result["source_commit"], module.SOURCE_COMMIT)
        self.assertTrue(result["build_manifest_match"])
        self.assertEqual(result["total_sdk_calls"], 90)
        self.assertEqual(len(result["cases"]), 15)
