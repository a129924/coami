"""Synthetic threshold tests: no live cases, credentials, or model calls."""

from __future__ import annotations

import importlib.util
import copy
import json
import math
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock


class ThresholdTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path = Path(__file__).resolve().parents[1] / "threshold_analysis.py"
        if not path.is_file():
            raise AssertionError("Planned threshold implementation is not present yet")
        spec = importlib.util.spec_from_file_location("threshold_analysis", path)
        cls.module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = cls.module
        spec.loader.exec_module(cls.module)

    def case(
        self,
        oracle="SUFFICIENT",
        choice="SUFFICIENT",
        p=0.8,
        group="research",
        name="synthetic",
    ):
        return self.module.Case(group, name, oracle, choice, p, "a" * 64, "b" * 64, {})

    def synthetic_source(self, root, *, no_candidate=False):
        """Build a wholly synthetic 40/20/15 run; never read repository evidence."""
        rows, entries, files = [], [], {}
        for group, count in self.module.COUNTS.items():
            for index in range(count):
                name = f"synthetic_{group}_{index:03d}"
                wrong = group == "research" and (index == 0 or no_candidate)
                p = 0.8 if wrong else 0.9
                probabilities = {"SUFFICIENT": p, "INSUFFICIENT": 1 - p}
                raw = self.module.encode(
                    {
                        "answers": {
                            "context_sufficiency": {
                                "choice": "SUFFICIENT",
                                "probabilities": probabilities,
                            }
                        }
                    }
                )
                raw_path = f"{self.module.RUN}/raw/{group}/{name}.body"
                target = root / raw_path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(raw)
                raw_sha = self.module.sha(raw)
                files[raw_path] = raw_sha
                row = {
                    "run_id": self.module.RUN_ID,
                    "group": group,
                    "case_id": name,
                    "case_version": {"snapshot": "synthetic"},
                    "expected": "INSUFFICIENT" if wrong else "SUFFICIENT",
                    "choice": "SUFFICIENT",
                    "probabilities": probabilities,
                    "confidence": 0.1,
                    "status": "VALID",
                    "raw_sha256": raw_sha,
                }
                rows.append(row)
                entries.append(
                    {
                        "group": group,
                        "case_id": name,
                        "raw_sha256": raw_sha,
                        "raw_public_path": f"raw/{group}/{name}.body",
                        "analysis_sha256": self.module.sha(self.row_bytes(row)),
                    }
                )
        self.save_synthetic_source(root, rows, entries, files)
        return rows, entries, files

    @staticmethod
    def row_bytes(row):
        return (json.dumps(row, sort_keys=True) + "\n").encode()

    def save_synthetic_source(self, root, rows, entries, files):
        analysis = b"".join(self.row_bytes(row) for row in rows)
        manifest = self.module.encode({"cases": entries})
        for name, data in [("analysis.jsonl", analysis), ("manifest.json", manifest)]:
            relative = f"{self.module.RUN}/{name}"
            (root / relative).write_bytes(data)
            files[relative] = self.module.sha(data)

    def synthetic_integrity(self, root, files, output):
        output.mkdir(parents=True, exist_ok=True)
        path = output / "integrity.json"
        path.write_bytes(
            self.module.encode(
                {
                    "source_checkout": str(root),
                    "source_revision": self.module.SOURCE_REVISION,
                    "run_id": self.module.RUN_ID,
                    "case_version": "v1-draft-004",
                    "verified_cases": 75,
                    "gaps": [],
                    "source_files": files,
                    "verification": {
                        "verified_cases": 75,
                        "gaps": [],
                        "summary": {"complete": True},
                    },
                }
            )
        )
        return path

    def guarded_research_reader(self, root, opened):
        original = self.module.read_regular

        def read(path):
            relative = path.relative_to(root).as_posix()
            if "/raw/" in relative:
                self.assertIn("/raw/research/", relative)
                opened.append(relative)
            return original(path)

        return read

    def test_research_raw_reads_are_guarded_and_other_group_values_do_not_tune(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            rows, entries, files = self.synthetic_source(root)
            opened = []
            with mock.patch.object(
                self.module,
                "read_regular",
                side_effect=self.guarded_research_reader(root, opened),
            ):
                before = self.module.research_payload(
                    self.module.load_cases(root, {"research"}, files)
                )
                for row in rows:
                    if row["group"] != "research":
                        row["expected"] = "INSUFFICIENT"
                        row["choice"] = "INSUFFICIENT"
                        row["probabilities"] = {"poison": "must not be processed"}
                        row["correctness"] = "poison"
                self.save_synthetic_source(root, rows, entries, files)
                after = self.module.research_payload(
                    self.module.load_cases(root, {"research"}, files)
                )
            self.assertEqual(before, after)
            self.assertEqual(before[1]["candidate_percent"], 81)
            self.assertEqual(len(opened), 80)

    def test_research_entrypoint_does_not_open_heldout_raw_during_integrity_check(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "source"
            _, _, files = self.synthetic_source(root)
            (root / ".git").mkdir()
            output = root / "synthetic-e022-evidence"
            integrity = self.synthetic_integrity(root, files, output)
            blobs = {name: (root / name).read_bytes() for name in files}

            def synthetic_git(checkout, *args):
                self.assertEqual(checkout, root)
                if args == ("rev-parse", "HEAD"):
                    return (self.module.SOURCE_REVISION + "\n").encode()
                if args == ("rev-parse", "--is-shallow-repository"):
                    return b"false\n"
                if args[0] == "ls-tree":
                    return ("\n".join(files) + "\n").encode()
                if args[0] == "show":
                    return blobs[args[1].split(":", 1)[1]]
                self.fail(f"unexpected synthetic git operation: {args}")

            opened = []
            reader = self.guarded_research_reader(root, opened)
            with mock.patch.object(self.module, "git", side_effect=synthetic_git):
                with mock.patch.object(self.module, "read_regular", side_effect=reader):
                    freeze = self.module.research(integrity, output)
                freeze_path = output / "candidate-freeze.json"
                original = self.module.read_regular
                heldout_reads = []

                def after_freeze_reader(path):
                    relative = path.relative_to(root).as_posix()
                    if "/raw/holdout/" in relative or "/raw/v0/" in relative:
                        self.assertTrue(freeze_path.is_file())
                        heldout_reads.append(relative)
                    return original(path)

                with mock.patch.object(
                    self.module, "read_regular", side_effect=after_freeze_reader
                ):
                    result = self.module.check_heldout(freeze_path, output)
            self.assertEqual(freeze["candidate_percent"], 81)
            self.assertEqual(result["candidate_percent"], 81)
            self.assertGreaterEqual(len(opened), 40)
            self.assertEqual(len(set(heldout_reads)), 35)
            self.assertGreater(len(heldout_reads), 35)

    def test_freeze_candidate_must_be_integer_not_bool_or_float(self):
        best, _ = self.module.rank_research(
            [self.case("INSUFFICIENT", "SUFFICIENT", 0), self.case(p=0.9)]
        )
        self.assertEqual(best.percent, 1)
        for value in [True, 1.0, "1"]:
            with self.subTest(value=repr(value)):
                freeze = {
                    "policy": self.module.POLICY,
                    "candidate_percent": value,
                    "diagnostic_best_percent": best.percent,
                    "threshold": 0.01,
                }
                with self.assertRaises(self.module.AnalysisError):
                    self.module.validate_selection(freeze, best)

    def test_missing_or_duplicate_manifest_cases_fail_closed(self):
        for mutation in ["missing", "duplicate"]:
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                rows, entries, files = self.synthetic_source(root)
                if mutation == "missing":
                    entries.pop(0)
                else:
                    entries.append(copy.deepcopy(entries[0]))
                self.save_synthetic_source(root, rows, entries, files)
                with self.assertRaises(self.module.AnalysisError):
                    self.module.load_cases(root, {"research"}, files)

    def test_missing_duplicate_and_unexpected_analysis_cases_fail_closed(self):
        for mutation in ["missing", "duplicate", "unexpected"]:
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                rows, entries, files = self.synthetic_source(root)
                if mutation == "missing":
                    rows.pop(0)
                elif mutation == "duplicate":
                    rows.append(copy.deepcopy(rows[0]))
                else:
                    rows[0]["case_id"] = "not_in_frozen_inventory"
                self.save_synthetic_source(root, rows, entries, files)
                with self.assertRaises(self.module.AnalysisError):
                    self.module.load_cases(root, {"research"}, files)

    def test_analysis_and_raw_hash_bindings_fail_closed(self):
        mutations = [
            "analysis_file",
            "analysis_row",
            "raw_file",
            "raw_entry",
            "raw_row",
        ]
        for mutation in mutations:
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                rows, entries, files = self.synthetic_source(root)
                raw = f"{self.module.RUN}/raw/research/{rows[0]['case_id']}.body"
                if mutation == "analysis_file":
                    files[f"{self.module.RUN}/analysis.jsonl"] = "0" * 64
                elif mutation == "analysis_row":
                    entries[0]["analysis_sha256"] = "0" * 64
                elif mutation == "raw_file":
                    (root / raw).write_bytes(b"tampered raw")
                elif mutation == "raw_entry":
                    entries[0]["raw_sha256"] = "0" * 64
                else:
                    rows[0]["raw_sha256"] = "0" * 64
                    entries[0]["analysis_sha256"] = self.module.sha(
                        self.row_bytes(rows[0])
                    )
                if mutation != "analysis_file":
                    self.save_synthetic_source(root, rows, entries, files)
                with self.assertRaises(self.module.AnalysisError):
                    self.module.load_cases(root, {"research"}, files)

    def test_raw_and_row_disagreement_rejected_even_with_matching_hashes(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            rows, entries, files = self.synthetic_source(root)
            rows[0]["probabilities"] = {"SUFFICIENT": 0.7, "INSUFFICIENT": 0.3}
            entries[0]["analysis_sha256"] = self.module.sha(self.row_bytes(rows[0]))
            self.save_synthetic_source(root, rows, entries, files)
            with self.assertRaises(self.module.AnalysisError):
                self.module.load_cases(root, {"research"}, files)

    def test_research_freeze_written_last_and_existing_history_preserved(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "source"
            _, _, files = self.synthetic_source(root)
            output = Path(temp) / "evidence"
            integrity = self.synthetic_integrity(root, files, output)
            written = []
            original = self.module.write_new

            def record(path, data):
                written.append(path.name)
                original(path, data)

            with mock.patch.object(self.module, "inventory", return_value=files):
                with mock.patch.object(self.module, "write_new", side_effect=record):
                    freeze = self.module.research(integrity, output)
                snapshots = {p.name: p.read_bytes() for p in output.iterdir()}
                with self.assertRaises(self.module.AnalysisError):
                    self.module.research(integrity, output)
            self.assertEqual(written[-1], "candidate-freeze.json")
            self.assertEqual(freeze["candidate_percent"], 81)
            self.assertEqual(
                snapshots, {p.name: p.read_bytes() for p in output.iterdir()}
            )

    def test_freeze_and_artifact_tampering_stops_before_heldout_reads(self):
        mutations = [
            "analysis_source_sha256",
            "run_id",
            "source_revision",
            "source_files",
            "artifact_binding",
            "missing_binding",
            "integrity.json",
            "research-summary.json",
            "research-decisions.jsonl",
            "candidate_percent",
            "threshold",
            "diagnostic_best_percent",
            "policy",
        ]
        for mutation in mutations:
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as temp:
                root = Path(temp) / "source"
                _, _, files = self.synthetic_source(root)
                output = Path(temp) / "evidence"
                integrity = self.synthetic_integrity(root, files, output)
                with mock.patch.object(self.module, "inventory", return_value=files):
                    freeze = self.module.research(integrity, output)
                    if mutation in {
                        "integrity.json",
                        "research-summary.json",
                        "research-decisions.jsonl",
                    }:
                        path = output / mutation
                        path.write_bytes(path.read_bytes() + b" ")
                    elif mutation == "artifact_binding":
                        freeze["artifact_sha256"]["integrity.json"] = "0" * 64
                    elif mutation == "missing_binding":
                        del freeze["artifact_sha256"]["research-summary.json"]
                    elif mutation in {"candidate_percent", "diagnostic_best_percent"}:
                        freeze[mutation] = 82
                    elif mutation == "threshold":
                        freeze[mutation] = 0.82
                    elif mutation == "source_files":
                        freeze[mutation] = {}
                    elif mutation == "policy":
                        freeze[mutation] = ["min_integer_percent"]
                    else:
                        freeze[mutation] = "tampered"
                    freeze_path = output / "candidate-freeze.json"
                    freeze_path.write_bytes(self.module.encode(freeze))
                    opened = []
                    reader = self.guarded_research_reader(root, opened)
                    original = self.module.read_regular
                    with mock.patch.object(
                        self.module,
                        "read_regular",
                        side_effect=lambda path: reader(path)
                        if path.is_relative_to(root)
                        else original(path),
                    ):
                        with self.assertRaises(self.module.AnalysisError):
                            self.module.check_heldout(freeze_path, output)
                self.assertFalse((output / "heldout-summary.json").exists())

    def test_changed_research_artifact_cannot_be_rebound_to_bypass_replay(self):
        for name in ["research-summary.json", "research-decisions.jsonl"]:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as temp:
                root = Path(temp) / "source"
                _, _, files = self.synthetic_source(root)
                output = Path(temp) / "evidence"
                integrity = self.synthetic_integrity(root, files, output)
                with mock.patch.object(self.module, "inventory", return_value=files):
                    freeze = self.module.research(integrity, output)
                    data = (output / name).read_bytes() + b" "
                    (output / name).write_bytes(data)
                    freeze["artifact_sha256"][name] = self.module.sha(data)
                    freeze_path = output / "candidate-freeze.json"
                    freeze_path.write_bytes(self.module.encode(freeze))
                    with self.assertRaises(self.module.AnalysisError):
                        self.module.check_heldout(freeze_path, output)
                self.assertFalse((output / "heldout-summary.json").exists())

    def test_changed_source_inventory_blocks_heldout(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "source"
            _, _, files = self.synthetic_source(root)
            output = Path(temp) / "evidence"
            integrity = self.synthetic_integrity(root, files, output)
            with mock.patch.object(self.module, "inventory", return_value=files):
                self.module.research(integrity, output)
            changed = {**files, "synthetic_changed_source": "0" * 64}
            with mock.patch.object(self.module, "inventory", return_value=changed):
                with self.assertRaises(self.module.AnalysisError):
                    self.module.check_heldout(output / "candidate-freeze.json", output)
            self.assertFalse((output / "heldout-summary.json").exists())

    def test_source_verifier_failure_records_gap_and_exits_without_candidate(self):
        for failure in ["nonzero_exit", "incomplete_cases"]:
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                output = root / "evidence" / "integrity.json"
                stdout = self.module.encode(
                    {
                        "run_id": self.module.RUN_ID,
                        "verified_cases": 74,
                        "gaps": [],
                        "summary": {"complete": True},
                    }
                )
                completed = self.module.subprocess.CompletedProcess(
                    args=["synthetic verifier"],
                    returncode=1 if failure == "nonzero_exit" else 0,
                    stdout=stdout,
                    stderr=b"synthetic failure",
                )
                with (
                    mock.patch.object(
                        self.module, "inventory", return_value={"synthetic": "a" * 64}
                    ),
                    mock.patch.object(
                        self.module,
                        "evidence_bootstrap",
                        return_value="synthetic offline verifier",
                    ),
                    mock.patch.object(
                        self.module.subprocess, "run", return_value=completed
                    ),
                ):
                    exit_code = self.module.main(
                        [
                            "verify-source",
                            "--source-checkout",
                            str(root),
                            "--source-revision",
                            self.module.SOURCE_REVISION,
                            "--output",
                            str(output),
                        ]
                    )
                self.assertNotEqual(exit_code, 0)
                proof = self.module.decode(output.read_bytes())
                self.assertTrue(proof["gaps"])
                self.assertNotIn("verified_cases", proof)
                self.assertFalse((output.parent / "candidate-freeze.json").exists())

    def test_source_verifier_preserves_case_gaps_and_handles_non_json_failure(self):
        detail = {
            "run_id": self.module.RUN_ID,
            "verified_cases": 74,
            "gaps": [
                {
                    "reason": "SYNTHETIC_RAW_HASH_MISMATCH",
                    "group": "research",
                    "case_id": "synthetic_affected_case",
                }
            ],
            "summary": None,
        }
        for structured in [True, False]:
            with (
                self.subTest(structured=structured),
                tempfile.TemporaryDirectory() as temp,
            ):
                root = Path(temp)
                output = root / "evidence" / "integrity.json"
                completed = self.module.subprocess.CompletedProcess(
                    args=["synthetic verifier"],
                    returncode=2,
                    stdout=self.module.encode(detail)
                    if structured
                    else b"synthetic runtime unavailable",
                    stderr=b"",
                )
                with (
                    mock.patch.object(
                        self.module, "inventory", return_value={"synthetic": "a" * 64}
                    ),
                    mock.patch.object(
                        self.module,
                        "evidence_bootstrap",
                        return_value="synthetic offline verifier",
                    ),
                    mock.patch.object(
                        self.module.subprocess, "run", return_value=completed
                    ),
                ):
                    exit_code = self.module.main(
                        [
                            "verify-source",
                            "--source-checkout",
                            str(root),
                            "--source-revision",
                            self.module.SOURCE_REVISION,
                            "--output",
                            str(output),
                        ]
                    )
                self.assertNotEqual(exit_code, 0)
                proof = self.module.decode(output.read_bytes())
                if structured:
                    self.assertEqual(proof["verification"], detail)
                    self.assertEqual(proof["gaps"], detail["gaps"])
                else:
                    self.assertNotIn("verification", proof)
                    self.assertEqual(
                        proof["gaps"],
                        [{"reason": "source/environment verification incomplete"}],
                    )
                self.assertFalse((output.parent / "candidate-freeze.json").exists())

    def test_null_candidate_skips_heldout_case_loading(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "source"
            _, _, files = self.synthetic_source(root, no_candidate=True)
            output = Path(temp) / "evidence"
            integrity = self.synthetic_integrity(root, files, output)
            with mock.patch.object(self.module, "inventory", return_value=files):
                freeze = self.module.research(integrity, output)
                self.assertIsNone(freeze["candidate_percent"])
                opened = []
                original = self.module.read_regular
                reader = self.guarded_research_reader(root, opened)

                def guarded(path):
                    if path.is_relative_to(root):
                        return reader(path)
                    return original(path)

                with mock.patch.object(
                    self.module, "read_regular", side_effect=guarded
                ):
                    result = self.module.check_heldout(
                        output / "candidate-freeze.json", output
                    )
            self.assertEqual(result["status"], "skipped: no usable candidate")
            self.assertEqual(result["groups"], {})
            self.assertFalse((output / "heldout-decisions.jsonl").exists())
            self.assertEqual(len(opened), 40)

    def test_single_candidate_replay_matches_and_preserves_history(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "source"
            _, _, files = self.synthetic_source(root)
            output = Path(temp) / "evidence"
            integrity = self.synthetic_integrity(root, files, output)
            with mock.patch.object(self.module, "inventory", return_value=files):
                self.module.research(integrity, output)
                freeze_path = output / "candidate-freeze.json"
                first = self.module.check_heldout(freeze_path, output)
                snapshots = {p.name: p.read_bytes() for p in output.iterdir()}
                replay = Path(temp) / "replay"
                second = self.module.check_heldout(freeze_path, replay)
                with self.assertRaises(self.module.AnalysisError):
                    self.module.check_heldout(freeze_path, output)
            self.assertEqual(first, second)
            self.assertEqual(
                snapshots, {p.name: p.read_bytes() for p in output.iterdir()}
            )
            for name in [
                "heldout-decisions.jsonl",
                "heldout-summary.json",
                "report.md",
            ]:
                self.assertEqual(
                    (output / name).read_bytes(), (replay / name).read_bytes()
                )
            rows = [
                json.loads(line)
                for line in (replay / "heldout-decisions.jsonl")
                .read_bytes()
                .splitlines()
            ]
            self.assertEqual(len(rows), 35)
            self.assertEqual({row["threshold_percent"] for row in rows}, {81})
            self.assertEqual(first["groups"]["holdout"]["N"], 20)
            self.assertEqual(first["groups"]["v0"]["N"], 15)

    def test_exact_boundary_and_adjacent_float(self):
        for p, adopted in [
            (0.8, True),
            (math.nextafter(0.8, 0), False),
            (math.nextafter(0.8, 1), True),
        ]:
            with self.subTest(p=p):
                self.assertEqual(self.case(p=p).decision(80)["adopted"], adopted)

    def test_endpoints_and_rejected_correct_raw_accuracy(self):
        cases = [self.case(p=0), self.case(p=1, name="one")]
        self.assertEqual(self.module.evaluate(cases, 0).adopted, 2)
        s = self.module.evaluate(cases, 100)
        self.assertEqual(
            (s.raw_correct, s.retained_correct, s.rejected_correct), (2, 1, 1)
        )

    def test_both_error_directions_and_correct_rejection(self):
        cases = [
            self.case("INSUFFICIENT", "SUFFICIENT", 0.7),
            self.case("SUFFICIENT", "INSUFFICIENT", 0.9),
            self.case(p=0.6),
        ]
        s = self.module.evaluate(cases, 80)
        self.assertEqual(
            (s.adopted_i_to_s, s.adopted_s_to_i, s.rejected_correct), (0, 1, 1)
        )
        self.assertEqual(s.raw_correct, 1)
        self.assertEqual(s.as_dict()["adopted_wrong"]["denominator"], 1)

    def test_zero_denominators_are_null(self):
        s = self.module.evaluate([self.case(p=0.2)], 100).as_dict()
        self.assertIsNone(s["adopted_wrong"]["rate"])
        self.assertIsNone(s["adopted_i_to_s"]["rate"])

    def test_ranking_and_lowest_equivalent_threshold(self):
        cases = [self.case("INSUFFICIENT", "SUFFICIENT", 0.8), self.case(p=0.9)]
        best, curve = self.module.rank_research(cases)
        self.assertEqual(len(curve), 101)
        self.assertEqual(
            (best.percent, best.adopted_i_to_s, best.retained_correct), (81, 0, 1)
        )
        self.assertEqual(self.module.hypothesis(best, curve[0]), "成功")

    def test_no_correct_retained_is_no_usable_candidate(self):
        best, _ = self.module.rank_research(
            [self.case("INSUFFICIENT", "SUFFICIENT", 1)]
        )
        self.assertIsNone(self.module.candidate(best))
        self.assertGreater(best.adopted, 0)
        best, _ = self.module.rank_research(
            [self.case("INSUFFICIENT", "SUFFICIENT", 0.9)]
        )
        self.assertIsNone(self.module.candidate(best))
        self.assertEqual(best.adopted, 0)

    def test_baseline_zero_is_not_hypothesis_success(self):
        best, curve = self.module.rank_research([self.case()])
        self.assertEqual(self.module.candidate(best), 0)
        self.assertEqual(self.module.hypothesis(best, curve[0]), "失敗")

    def test_research_rejects_other_groups_and_empty_input(self):
        for cases in [[], [self.case(group="holdout")], [self.case(group="v0")]]:
            with self.assertRaises(self.module.AnalysisError):
                self.module.rank_research(cases)

    def test_invalid_probability_and_choice(self):
        for p in [True, float("nan"), float("inf"), -0.1, 1.1]:
            with self.assertRaises(self.module.AnalysisError):
                self.case(p=p)
        with self.assertRaises(self.module.AnalysisError):
            self.case(choice="UNKNOWN")

    def test_invalid_threshold(self):
        for k in [True, -1, 101, 80.1]:
            with self.assertRaises(self.module.AnalysisError):
                self.case().decision(k)

    def test_confidence_is_not_used(self):
        row = {
            "group": "research",
            "case_id": "synthetic",
            "expected": "SUFFICIENT",
            "choice": "SUFFICIENT",
            "probabilities": {"SUFFICIENT": 0.8, "INSUFFICIENT": 0.2},
            "status": "VALID",
            "run_id": self.module.RUN_ID,
            "case_version": {},
        }
        a = self.module.parse_case({**row, "confidence": 0.1}, "a" * 64, "b" * 64)
        b = self.module.parse_case({**row, "confidence": 0.99}, "a" * 64, "b" * 64)
        self.assertEqual(a.decision(80), b.decision(80))

    def test_exclusive_output_preserves_existing_history(self):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp) / "freeze.json"
            self.module.write_new(p, b"original")
            with self.assertRaises(self.module.AnalysisError):
                self.module.write_new(p, b"replacement")
            self.assertEqual(p.read_bytes(), b"original")

    def test_duplicate_json_fields_rejected(self):
        with self.assertRaises(self.module.AnalysisError):
            self.module.decode(b'{"candidate":80,"candidate":90}')

    def test_missing_freeze_and_invalid_integrity_fail_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.assertNotEqual(
                self.module.main(
                    [
                        "check-heldout",
                        "--freeze",
                        str(root / "missing"),
                        "--output-dir",
                        str(root / "out"),
                    ]
                ),
                0,
            )
            integrity = root / "integrity.json"
            integrity.write_text('{"gaps":["missing raw"]}')
            self.assertNotEqual(
                self.module.main(
                    [
                        "research",
                        "--integrity",
                        str(integrity),
                        "--output-dir",
                        str(root / "out"),
                    ]
                ),
                0,
            )
            self.assertFalse((root / "out/candidate-freeze.json").exists())


if __name__ == "__main__":
    unittest.main()
