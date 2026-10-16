"""Historical evidence audit regressions; real Git blob reads, no runtime control."""

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
    def test_historical_source_is_verified_even_when_current_runner_changed(self):
        inputs = json.loads(
            (
                ROOT
                / "evidence/wasm-runs/WASM-2026-10-15T07-05-48-980Z/source-inputs.json"
            ).read_text()
        )
        module.verify_sources(ROOT, inputs["sha256"])
        result = module.audit(ROOT)
        self.assertEqual(result["source_commit"], module.SOURCE_COMMIT)
        self.assertEqual(result["total_sdk_calls"], 90)
        self.assertEqual(len(result["cases"]), 15)

    def test_wrong_recorded_hash_is_rejected(self):
        with self.assertRaisesRegex(AssertionError, "recorded source mismatch"):
            module.verify_sources(ROOT, {"web/scripts/runtime-run.mjs": "0" * 64})

    def test_duplicate_or_missing_ids_cannot_pass_audit(self):
        cases = [{"id": f"TC-E2E-{i:02}"} for i in range(1, 16)]
        module.verify_case_ids(cases)
        for invalid in [cases[:-1], cases[:-1] + [cases[0]], [cases[0]] * 15]:
            with self.assertRaisesRegex(AssertionError, "15 distinct cases"):
                module.verify_case_ids(invalid)
