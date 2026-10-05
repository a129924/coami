"""TC01–TC05: offline behavior tests; no key, env file, SDK transport or network.

Fixed repository JSON fixtures are read as test data. Runner file writes are mocked.
"""

from __future__ import annotations

from contextlib import redirect_stdout
from copy import deepcopy
from dataclasses import replace
import io
import hashlib
import json
import logging
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import jev_policy as p


def payload(stage: str, choice: str, *, confidence: float = 1.0) -> dict[str, object]:
    return {
        "model": p.MODEL,
        "answers": {
            stage: {
                "type": "choice",
                "choice": choice,
                "confidence": confidence,
                "probabilities": {
                    key: float(key == choice) for key in p.OPTIONS[stage]
                },
            }
        },
    }


class FakeClient:
    def __init__(self, choices: list[object]) -> None:
        self.choices = list(choices)
        self.calls: list[dict[str, object]] = []

    def system_one(
        self, *, state: dict[str, object], questions: dict[str, p.Choice]
    ) -> SimpleNamespace:
        stage = next(iter(questions))
        self.calls.append(
            {"stage": stage, "state": deepcopy(state), "questions": questions}
        )
        value = self.choices.pop(0)
        if isinstance(value, BaseException):
            raise value
        data = payload(stage, value) if isinstance(value, str) else value
        return SimpleNamespace(raw_http_response=SimpleNamespace(json=lambda: data))


class PolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.questions = p.load_questions(p.DIRECTORY / "policies.json")
        cls.cases = p.load_cases()

    def decision(
        self, case: p.Case, choices: list[object]
    ) -> tuple[p.Decision, FakeClient]:
        client = FakeClient(choices)
        result = p.route(
            case.visible,
            case.candidate,
            case.suite == "oracle15",
            client,
            self.questions,
            p.AdoptionGate(0.5),  # Explicit test-only parameter, no product default.
        )
        return result, client

    def test_TC03_gate_boundary_uses_unrounded_selected_probability(self) -> None:
        # Test constants demonstrate comparison semantics, not a selected product policy.
        threshold = 0.625
        for score, expected in (
            (0.624999999999, "REJECT"),
            (threshold, "ADOPT"),
            (0.625000000001, "ADOPT"),
        ):
            with self.subTest(score=score):
                value = payload("context_sufficiency", "SUFFICIENT", confidence=0.01)
                value["answers"]["context_sufficiency"]["probabilities"] = {
                    "SUFFICIENT": score,
                    "INSUFFICIENT": 1 - score,
                }
                raw = p.validate_answer(value, "context_sufficiency")
                result = p.AdoptionGate(threshold).assess(raw)
                self.assertEqual(result.decision, expected)
                self.assertEqual(result.score, score)
                self.assertEqual(
                    result.adopted_choice, "SUFFICIENT" if expected == "ADOPT" else None
                )
                self.assertEqual(raw.choice, "SUFFICIENT")
                self.assertEqual(raw.confidence, 0.01)

    def test_TC02_gate_requires_valid_external_threshold(self) -> None:
        for value in (None, True, "0.8", float("nan"), float("inf"), -0.01, 1.01):
            with self.subTest(value=value), self.assertRaises(p.ContractError):
                p.AdoptionGate(value)
        for value in (0.0, 1.0):
            with self.subTest(value=value):
                self.assertEqual(p.AdoptionGate(value).threshold, value)

    def test_TC03_gate_rejects_every_input_choice_and_stops(self) -> None:
        for choice in p.OPTIONS["input_policy"]:
            with self.subTest(choice=choice):
                value = payload("input_policy", choice)
                value["answers"]["input_policy"]["probabilities"] = {
                    key: 0.8
                    if key == choice
                    else (
                        0.2
                        if key
                        == next(k for k in p.OPTIONS["input_policy"] if k != choice)
                        else 0.0
                    )
                    for key in p.OPTIONS["input_policy"]
                }
                client = FakeClient([value])
                result = p.route(
                    self.cases[8].visible,
                    self.cases[8].candidate,
                    True,
                    client,
                    self.questions,
                    p.AdoptionGate(0.85),
                )
                self.assertEqual(result.action, "BLOCK")
                self.assertEqual(result.reason, "INPUT_GATE_REJECTED")
                self.assertIsNone(result.delivery)
                self.assertEqual(result.stages["input_policy"].choice, choice)
                self.assertEqual(
                    result.stages["input_policy"].adoption.decision, "REJECT"
                )
                self.assertIsNone(result.stages["input_policy"].adoption.adopted_choice)
                self.assertEqual(
                    result.stages["context_sufficiency"].skip_reason,
                    "UPSTREAM_GATE_REJECTED",
                )
                self.assertEqual(len(client.calls), 1)

    def test_TC03_context_gate_rejects_both_choices_no_output_or_replacement(
        self,
    ) -> None:
        for choice in p.OPTIONS["context_sufficiency"]:
            with self.subTest(choice=choice):
                value = payload("context_sufficiency", choice)
                value["answers"]["context_sufficiency"]["probabilities"] = {
                    choice: 0.8,
                    next(
                        k for k in p.OPTIONS["context_sufficiency"] if k != choice
                    ): 0.2,
                }
                client = FakeClient(["COMPANION", value])
                result = p.route(
                    self.cases[8].visible,
                    self.cases[8].candidate,
                    True,
                    client,
                    self.questions,
                    p.AdoptionGate(0.85),
                )
                self.assertEqual(result.action, "BLOCK")
                self.assertEqual(result.reason, "CONTEXT_GATE_REJECTED")
                self.assertIsNone(result.proposed_action)
                self.assertEqual(result.stages["context_sufficiency"].choice, choice)
                self.assertEqual(
                    result.stages["output_policy"].adoption.decision, "NOT_EVALUATED"
                )
                self.assertEqual(len(client.calls), 2)

    def test_TC03_output_gate_rejects_every_choice_no_delivery(self) -> None:
        for choice in p.OPTIONS["output_policy"]:
            with self.subTest(choice=choice):
                value = payload("output_policy", choice)
                value["answers"]["output_policy"]["probabilities"] = {
                    key: 0.8
                    if key == choice
                    else (
                        0.2
                        if key
                        == next(k for k in p.OPTIONS["output_policy"] if k != choice)
                        else 0.0
                    )
                    for key in p.OPTIONS["output_policy"]
                }
                client = FakeClient(["COMPANION", value])
                result = p.route(
                    self.cases[0].visible,
                    self.cases[0].candidate,
                    False,
                    client,
                    self.questions,
                    p.AdoptionGate(0.85),
                )
                self.assertEqual(result.action, "BLOCK")
                self.assertEqual(result.reason, "OUTPUT_GATE_REJECTED")
                self.assertIsNone(result.delivery)
                self.assertEqual(result.stages["output_policy"].choice, choice)
                self.assertEqual(len(client.calls), 2)

    def test_TC04_gate_threshold_not_sent_to_model(self) -> None:
        clients = []
        for threshold in (0.5, 1.0):
            client = FakeClient(["COMPANION", "SUFFICIENT", "ALLOW"])
            p.route(
                self.cases[8].visible,
                self.cases[8].candidate,
                True,
                client,
                self.questions,
                p.AdoptionGate(threshold),
            )
            clients.append(client)
        self.assertEqual(clients[0].calls, clients[1].calls)
        self.assertNotIn("threshold", repr(clients[0].calls))

    def test_TC04_correct_raw_choice_rejected_is_not_model_failure(self) -> None:
        value = payload("input_policy", "COMPANION")
        value["answers"]["input_policy"]["probabilities"] = {
            "COMPANION": 0.8,
            "PARENT": 0.2,
            "SAFETY": 0.0,
            "UNCERTAIN": 0.0,
        }
        client = FakeClient([value])
        result = p.route(
            self.cases[0].visible,
            self.cases[0].candidate,
            False,
            client,
            self.questions,
            p.AdoptionGate(0.85),
        )
        record = p.evaluate(self.cases[0], result, "offline")
        self.assertTrue(record["stages"]["input_policy"]["matches"])
        self.assertFalse(record["model_has_failures"])
        self.assertEqual(
            record["verdict"], "FAIL"
        )  # Original expected final Action is unchanged.
        self.assertFalse(record["incomplete"])
        self.assertEqual(record["differences"], ["action"])
        self.assertIsNone(record["stages"]["output_policy"]["matches"])
        summary = p.summarize([record], "offline")
        self.assertEqual(
            summary["suites"]["policy8"]["stages"]["input_policy"]["adoption"],
            {"REJECT": 1},
        )

    def test_TC02_invalid_response_cannot_pass_even_zero_threshold(self) -> None:
        value = payload("input_policy", "COMPANION")
        value["answers"]["input_policy"]["confidence"] = float("nan")
        client = FakeClient([value])
        result = p.route(
            self.cases[0].visible,
            self.cases[0].candidate,
            False,
            client,
            self.questions,
            p.AdoptionGate(0.0),
        )
        self.assertEqual(result.action, "BLOCK")
        stage = result.stages["input_policy"]
        self.assertEqual(stage.status, "INVALID")
        self.assertEqual(stage.adoption.decision, "NOT_EVALUATED")
        self.assertIsNone(stage.adoption.score)
        self.assertIsNone(stage.adoption.adopted_choice)
        self.assertEqual(len(client.calls), 1)

    def test_TC07_gate_replay_retains_original_fail_and_valid_denominator(self) -> None:
        # Replay recorded model responses only; threshold is a test value, not calibration.
        source = (p.DIRECTORY / "evidence/live-results.jsonl").read_bytes()
        rows = [json.loads(line) for line in source.splitlines()]
        original = next(
            row
            for row in rows
            if row["run_id"] == "20261005T042808Z-1a07e13b"
            and row["id"] == "toy_car_ambiguous_001"
        )
        responses = []
        for stage in p.STAGES:
            s = original["stages"][stage]
            responses.append(
                {
                    "model": p.MODEL,
                    "answers": {
                        stage: {
                            key: s[key]
                            for key in ("choice", "confidence", "probabilities")
                        }
                        | {"type": "choice"}
                    },
                }
            )
        client = FakeClient(responses)
        result = p.route(
            self.cases[9].visible,
            self.cases[9].candidate,
            True,
            client,
            self.questions,
            p.AdoptionGate(0.8),
        )
        record = p.evaluate(self.cases[9], result, "offline-replay")
        self.assertEqual(result.stages["context_sufficiency"].choice, "SUFFICIENT")
        self.assertEqual(
            result.stages["context_sufficiency"].adoption.decision, "REJECT"
        )
        self.assertEqual(result.action, "BLOCK")
        self.assertEqual(record["verdict"], "FAIL")
        self.assertTrue(record["model_has_failures"])
        summary = p.summarize([record], "offline-replay")
        self.assertEqual(summary["context_sufficiency"]["valid_predictions"], 1)
        self.assertEqual(summary["context_sufficiency"]["correct"], 0)
        self.assertEqual(
            p.DIRECTORY.joinpath("evidence/live-results.jsonl").read_bytes(), source
        )

    def test_TC02_missing_gate_threshold_no_factory_or_cases(self) -> None:
        factory = MagicMock()
        with (
            patch.object(Path, "mkdir"),
            patch.object(p, "load_cases") as cases,
            patch.object(p, "save_summary") as save,
            patch.object(p, "metadata", return_value={}),
            redirect_stdout(io.StringIO()),
        ):
            self.assertEqual(p.run_live(factory=factory), 2)
        factory.assert_not_called()
        cases.assert_not_called()
        self.assertEqual(
            save.call_args.args[1]["blocked_code"], "MISSING_GATE_THRESHOLD"
        )

    def test_TC07_metadata_hashes_executing_runner_independent_of_head(self) -> None:
        directory = Path("/private/tmp/e012-test-config")
        source = Path(p.__file__).resolve()
        fingerprints = []
        for runner in (b"runner revision one", b"runner revision two"):
            reads = {
                source: runner,
                **{
                    directory / name: name.encode()
                    for name in ("uv.lock", "cases.json", "policies.json")
                },
            }
            with (
                self.subTest(runner=runner),
                patch.object(
                    Path, "read_bytes", autospec=True, side_effect=reads.__getitem__
                ),
                patch.object(
                    p.subprocess,
                    "run",
                    return_value=SimpleNamespace(stdout="same-head\n"),
                ),
                patch.object(p, "version", return_value=p.SDK_VERSION),
            ):
                result = p.metadata(directory, p.ROOT)
            self.assertEqual(result["head"], "same-head")
            fingerprint = result["artifact_hashes"]["jev_policy.py"]
            self.assertEqual(fingerprint, hashlib.sha256(runner).hexdigest())
            fingerprints.append(fingerprint)
        self.assertNotEqual(*fingerprints)

    def test_TC02_main_missing_threshold_forms_record_blocked_summary(self) -> None:
        real_run = p.run_live
        for args in (
            ["--live"],
            ["--live", "--min-choice-probability"],
            ["--min-choice-probability", "--live"],
        ):
            with self.subTest(args=args):
                factory = MagicMock()
                stdout, stderr = io.StringIO(), io.StringIO()
                with (
                    patch.object(sys, "argv", ["jev_policy.py", *args]),
                    patch.object(
                        p,
                        "run_live",
                        side_effect=lambda **kwargs: real_run(
                            factory=factory, **kwargs
                        ),
                    ),
                    patch.object(Path, "mkdir"),
                    patch.object(p, "load_cases") as cases,
                    patch.object(p, "save_summary") as save,
                    patch.object(p, "metadata", return_value={}),
                    redirect_stdout(stdout),
                    patch("sys.stderr", stderr),
                ):
                    self.assertEqual(p.main(), 2)
                factory.assert_not_called()
                cases.assert_not_called()
                save.assert_called_once()
                summary = save.call_args.args[1]
                self.assertEqual(summary["automatic_verdict"], "BLOCKED")
                self.assertEqual(summary["blocked_code"], "MISSING_GATE_THRESHOLD")
                self.assertFalse(summary["adoption_gate"]["configured"])
                for suite in ("policy8", "oracle15"):
                    self.assertEqual(summary["suites"][suite]["completed"], 0)
                self.assertEqual(stderr.getvalue(), "")
                self.assertIn("MISSING_GATE_THRESHOLD", stdout.getvalue())

    def test_TC02_main_invalid_threshold_records_fixed_blocked_code_without_echo(
        self,
    ) -> None:
        real_run = p.run_live
        for value in (
            "abc-secret-sentinel",
            "true",
            "",
            "nan",
            "inf",
            "-inf",
            "-0.1",
            "1.1",
        ):
            with self.subTest(value=value):
                factory = MagicMock()
                stdout, stderr = io.StringIO(), io.StringIO()
                with (
                    patch.object(
                        sys,
                        "argv",
                        [
                            "jev_policy.py",
                            "--live",
                            "--min-choice-probability=" + value,
                        ],
                    ),
                    patch.object(
                        p,
                        "run_live",
                        side_effect=lambda **kwargs: real_run(
                            factory=factory, **kwargs
                        ),
                    ),
                    patch.object(Path, "mkdir"),
                    patch.object(p, "save_summary") as save,
                    patch.object(p, "metadata", return_value={}),
                    redirect_stdout(stdout),
                    unittest.mock.patch("sys.stderr", stderr),
                ):
                    self.assertEqual(p.main(), 2)
                factory.assert_not_called()
                self.assertEqual(save.call_args.args[1]["automatic_verdict"], "BLOCKED")
                self.assertEqual(
                    save.call_args.args[1]["blocked_code"], "INVALID_GATE_THRESHOLD"
                )
                self.assertEqual(
                    save.call_args.args[1]["suites"]["oracle15"]["completed"], 0
                )
                self.assertEqual(stderr.getvalue(), "")
                self.assertNotIn("abc-secret-sentinel", stdout.getvalue())

    def test_TC02_main_numeric_text_threshold_parses_before_key_preflight(self) -> None:
        real_run = p.run_live
        for value in ("0", "0.625", "1"):
            with (
                self.subTest(value=value),
                patch.dict(p.os.environ, {}, clear=True),
                patch.object(
                    sys,
                    "argv",
                    ["jev_policy.py", "--live", "--min-choice-probability=" + value],
                ),
                patch.object(p, "run_live", side_effect=real_run),
                patch.object(Path, "mkdir"),
                patch.object(p, "save_summary") as save,
                patch.object(p, "metadata", return_value={}),
                redirect_stdout(io.StringIO()),
            ):
                self.assertEqual(p.main(), 2)
                self.assertEqual(save.call_args.args[1]["blocked_code"], "MISSING_KEY")
                self.assertEqual(
                    save.call_args.args[1]["adoption_gate"]["threshold"], float(value)
                )

    def test_TC01_all_23_expected_paths_offline(self) -> None:
        self.assertEqual(counter_suites(self.cases), {"policy8": 8, "oracle15": 15})
        records = []
        for case in self.cases:
            with self.subTest(case=case.id):
                choices = [
                    case.expected[stage]
                    for stage in p.STAGES
                    if case.expected[stage] not in ("SKIPPED", "NOT_APPLICABLE")
                ]
                decision, client = self.decision(case, choices)
                record = p.evaluate(case, decision, "offline-mocked")
                self.assertEqual(decision.action, case.expected["action"])
                self.assertEqual(record["verdict"], "PASS")
                self.assertEqual(len(client.calls), len(choices))
                self.assertEqual(
                    decision.delivery,
                    case.candidate.text
                    if decision.action.startswith("DELIVER_")
                    else None,
                )
                records.append(record)
        summary = p.summarize(records, "offline-mocked")
        self.assertEqual(summary["automatic_verdict"], "PASS")
        self.assertEqual(summary["final_verdict"], "human-check")
        self.assertEqual(summary["context_sufficiency"]["accuracy"], 1)
        self.assertEqual(summary["context_sufficiency"]["coverage"], 1)
        metrics = summary["context_sufficiency"]
        self.assertEqual(
            metrics["groups"]["expected_label"]["SUFFICIENT"]["observed"], 5
        )
        self.assertEqual(
            metrics["groups"]["expected_label"]["INSUFFICIENT"]["observed"], 10
        )
        for triplet in metrics["contrastive_cases"].values():
            self.assertEqual(len(triplet), 3)
            self.assertEqual(
                {row["context_type"] for row in triplet},
                {"clear", "ambiguous", "irrelevant"},
            )
            self.assertEqual(
                {row["sufficiency"]["choice"] for row in triplet},
                {"SUFFICIENT", "INSUFFICIENT"},
            )

    def test_TC01_handoff_skips_downstream_and_preserves_destination(self) -> None:
        for choice, action in (
            ("PARENT", "HANDOFF_PARENT"),
            ("SAFETY", "HANDOFF_SAFETY"),
        ):
            with self.subTest(choice=choice):
                result, client = self.decision(self.cases[8], [choice])
                self.assertEqual(result.action, action)
                self.assertIsNone(result.delivery)
                self.assertEqual(result.stages["context_sufficiency"].status, "SKIPPED")
                self.assertEqual(result.stages["output_policy"].status, "SKIPPED")
                self.assertEqual(len(client.calls), 1)

    def test_TC02_unknown_missing_malformed_response(self) -> None:
        good = payload("input_policy", "COMPANION")
        values: list[object] = [
            None,
            [],
            {"model": p.MODEL},
            {"model": "other", "answers": good["answers"]},
        ]
        for key in ("type", "choice", "confidence", "probabilities"):
            value = deepcopy(good)
            del value["answers"]["input_policy"][key]
            values.append(value)
        for choice in ("UNKNOWN", [], 1):
            value = deepcopy(good)
            value["answers"]["input_policy"]["choice"] = choice
            values.append(value)
        for value in values:
            with self.subTest(value=value):
                result, client = self.decision(self.cases[0], [value])
                self.assertEqual(result.action, "BLOCK")
                self.assertIsNone(result.delivery)
                self.assertEqual(result.stages["input_policy"].status, "INVALID")
                self.assertEqual(len(client.calls), 1)
                self.assertEqual(
                    p.evaluate(self.cases[0], result, "offline")["verdict"], "FAIL"
                )

    def test_TC02_probability_and_confidence_contract(self) -> None:
        for field, invalid in (
            ("confidence", None),
            ("confidence", True),
            ("confidence", float("nan")),
            ("confidence", float("inf")),
            ("confidence", -0.1),
            ("confidence", 1.1),
            ("probabilities", {}),
            ("probabilities", {"COMPANION": 1.0}),
        ):
            with self.subTest(field=field, invalid=invalid):
                value = payload("input_policy", "COMPANION")
                value["answers"]["input_policy"][field] = invalid
                with self.assertRaises(p.ContractError):
                    p.validate_answer(value, "input_policy")
        for invalid in (True, "1", float("nan"), float("inf"), -0.1, 1.1):
            with self.subTest(probability=invalid), self.assertRaises(p.ContractError):
                p.probability(invalid)
        for distribution in (
            {"COMPANION": 0.2, "PARENT": 0.2, "SAFETY": 0.2, "UNCERTAIN": 0.2},
            {"COMPANION": 0.1, "PARENT": 0.9, "SAFETY": 0.0, "UNCERTAIN": 0.0},
        ):
            value = payload("input_policy", "COMPANION")
            value["answers"]["input_policy"]["probabilities"] = distribution
            with self.assertRaises(p.ContractError):
                p.validate_answer(value, "input_policy")

    def test_TC02_wrong_id_and_type(self) -> None:
        value = payload("output_policy", "ALLOW")
        with self.assertRaises(p.ContractError):
            p.validate_answer(value, "input_policy")
        value["answers"]["output_policy"]["type"] = "score"
        with self.assertRaises(p.ContractError):
            p.validate_answer(value, "output_policy")

    def test_TC02_non_json_blocks(self) -> None:
        client = MagicMock()
        client.system_one.return_value.raw_http_response.json.side_effect = (
            json.JSONDecodeError("fake", "", 0)
        )
        result = p.route(
            self.cases[0].visible,
            self.cases[0].candidate,
            False,
            client,
            self.questions,
            p.AdoptionGate(0.5),  # Explicit test-only parameter, no product default.
        )
        self.assertEqual(result.action, "BLOCK")
        self.assertEqual(result.stages["input_policy"].status, "INVALID")

    def test_TC02_invalid_candidate_never_calls_model(self) -> None:
        invalid = p.Candidate(
            "candidate", "invalid"
        )  # Deliberate runtime-invalid input.
        client = FakeClient([])
        result = p.route(
            self.cases[0].visible,
            invalid,
            False,
            client,
            self.questions,
            p.AdoptionGate(0.5),
        )
        self.assertEqual(result.action, "BLOCK")
        self.assertEqual(client.calls, [])

    def test_TC02_inventory_and_hash_preflight(self) -> None:
        config = json.loads((p.DIRECTORY / "cases.json").read_bytes())
        for edit in ("kind", "missing", "freeze"):
            value = deepcopy(config)
            if edit == "kind":
                value["oracle_inventory"]["toy_car_clear_001"] = "INVALID"
            elif edit == "missing":
                del value["oracle_inventory"]["toy_car_clear_001"]
            else:
                value["oracle_hashes"] = {}
            with (
                self.subTest(edit=edit),
                patch.object(p, "read_json", return_value=value),
                self.assertRaises(p.ContractError),
            ):
                p.load_cases()
        with (
            patch.object(Path, "read_bytes", return_value=b"tampered"),
            patch.object(p, "read_json", return_value=config),
            self.assertRaises(p.ContractError),
        ):
            p.load_cases()

    def test_TC02_missing_source(self) -> None:
        with (
            patch.object(Path, "read_bytes", side_effect=OSError("fake sentinel")),
            self.assertRaisesRegex(p.ContractError, "SOURCE_UNAVAILABLE"),
        ):
            p.read_json(Path("unused"))

    def test_TC02_missing_key_no_client_no_case_results(self) -> None:
        factory = MagicMock()
        with (
            patch.dict(p.os.environ, {}, clear=True),
            patch.object(Path, "mkdir"),
            patch.object(p, "save_summary") as save,
            patch.object(p, "metadata", return_value={}),
            redirect_stdout(io.StringIO()),
        ):
            self.assertEqual(p.run_live(factory=factory, threshold=0.5), 2)
        factory.assert_not_called()
        self.assertEqual(save.call_args.args[1]["blocked_code"], "MISSING_KEY")
        self.assertEqual(save.call_args.args[1]["suites"]["policy8"]["completed"], 0)

    def test_TC02_env_loader_hard_failure_classification(self) -> None:
        # Loader fails before Python starts: only operator's fixed code is recorded.
        summary = p.summarize(
            [], "synthetic-startup-failure", blocked_code="ENV_LOAD_FAILED"
        )
        self.assertEqual(summary["automatic_verdict"], "BLOCKED")
        self.assertEqual(summary["suites"]["oracle15"]["completed"], 0)
        self.assertIsNone(summary["context_sufficiency"]["accuracy"])

    def test_TC03_both_candidate_mismatch_directions_still_evaluate_output(
        self,
    ) -> None:
        for index, suff in ((8, "INSUFFICIENT"), (9, "SUFFICIENT")):
            with self.subTest(index=index):
                result, client = self.decision(
                    self.cases[index], ["COMPANION", suff, "ALLOW"]
                )
                self.assertEqual(result.action, "BLOCK")
                self.assertFalse(result.kind_compatible)
                self.assertIsNone(result.delivery)
                self.assertEqual(result.stages["output_policy"].choice, "ALLOW")
                self.assertEqual(len(client.calls), 3)
                self.assertNotIn("context_sufficiency", client.calls[-1]["state"])
                record = p.evaluate(self.cases[index], result, "offline")
                self.assertEqual(record["verdict"], "FAIL")
                self.assertNotEqual(
                    record["stages"]["context_sufficiency"]["choice"],
                    record["stages"]["context_sufficiency"]["expected"],
                )

    def test_TC03_invalid_context_skips_output(self) -> None:
        result, client = self.decision(
            self.cases[8], ["COMPANION", payload("context_sufficiency", "UNKNOWN")]
        )
        self.assertEqual(result.action, "BLOCK")
        self.assertEqual(result.stages["output_policy"].status, "SKIPPED")
        self.assertEqual(len(client.calls), 2)

    def test_TC03_uncertain_and_disallowed_output_never_delivers(self) -> None:
        for choices in (
            ["UNCERTAIN"],
            ["COMPANION", "BLOCK"],
            ["COMPANION", "UNCERTAIN"],
        ):
            with self.subTest(choices=choices):
                result, _ = self.decision(self.cases[0], choices)
                self.assertEqual(result.action, "BLOCK")
                self.assertIsNone(result.delivery)

    def test_TC03_low_confidence_and_argmax_tie_are_valid(self) -> None:
        value = payload("input_policy", "COMPANION", confidence=0.01)
        value["answers"]["input_policy"]["probabilities"] = {
            "COMPANION": 0.5,
            "PARENT": 0.5,
            "SAFETY": 0.0,
            "UNCERTAIN": 0.0,
        }
        result, _ = self.decision(self.cases[0], [value, "ALLOW"])
        self.assertEqual(result.action, "DELIVER_ANSWER")
        self.assertEqual(result.stages["input_policy"].confidence, 0.01)

    def test_TC03_faults_block_without_retry_or_error_body(self) -> None:
        errors = [
            (p.TypeSafeAPITimeoutError(30), "IO_TIMEOUT"),
            (p.TypeSafeAPIConnectionError(), "CONNECTION_FAILED"),
            (
                p.TypeSafeAuthenticationError(401, {"secret": "fake-key-sentinel"}, {}),
                "AUTH_FAILED",
            ),
            (
                p.TypeSafePermissionDeniedError(403, "fake-key-sentinel", {}),
                "ACCESS_DENIED",
            ),
            (p.TypeSafeAPIError(503, "fake-key-sentinel", {}), "HTTP_FAILED"),
        ]
        for error, code in errors:
            with self.subTest(code=code):
                result, client = self.decision(self.cases[0], [error])
                record = p.evaluate(self.cases[0], result, "offline")
                self.assertEqual(result.action, "BLOCK")
                self.assertEqual(record["verdict"], "BLOCKED")
                self.assertEqual(result.stages["input_policy"].error_code, code)
                self.assertEqual(len(client.calls), 1)
                self.assertNotIn("fake-key-sentinel", json.dumps(record))

    def test_TC03_sdk_validation_error_is_fail_before_generic_http(self) -> None:
        error = p.TypeSafeAPIResponseValidationError(
            200, "fake-key-sentinel", {}, "answers"
        )
        result, _ = self.decision(self.cases[0], [error])
        self.assertEqual(result.stages["input_policy"].status, "INVALID")
        self.assertEqual(
            p.evaluate(self.cases[0], result, "offline")["verdict"], "FAIL"
        )

    def test_TC03_output_timeout_blocks_and_marks_incomplete(self) -> None:
        result, _ = self.decision(
            self.cases[8], ["COMPANION", "SUFFICIENT", p.TypeSafeAPITimeoutError(30)]
        )
        record = p.evaluate(self.cases[8], result, "offline")
        self.assertIsNone(result.delivery)
        self.assertEqual(record["verdict"], "BLOCKED")

    def test_TC04_oracle_and_nested_metadata_do_not_leak(self) -> None:
        source = {
            "background": "background",
            "conversation": [
                {"speaker": "child", "text": "hello", "expected": "SECRET_ORACLE"}
            ],
            "utterance": "hello",
            "id": "SECRET_ID",
            "expected": "SECRET_ORACLE",
            "rationale": "SECRET_RATIONALE",
        }
        visible = p.VisibleInput.project(source)
        first = FakeClient(["COMPANION", "SUFFICIENT", "ALLOW"])
        original = p.route(
            visible,
            p.Candidate("hi", "ANSWER"),
            True,
            first,
            self.questions,
            p.AdoptionGate(0.5),
        )
        source["expected"] = "BOGUS"
        source["rationale"] = "OTHER"
        source["conversation"][0]["expected"] = "BOGUS"
        second = FakeClient(["COMPANION", "SUFFICIENT", "ALLOW"])
        changed = p.route(
            p.VisibleInput.project(source),
            p.Candidate("hi", "ANSWER"),
            True,
            second,
            self.questions,
            p.AdoptionGate(0.5),  # Explicit test-only parameter, no product default.
        )
        self.assertEqual(original, changed)
        self.assertEqual(first.calls, second.calls)
        for call in first.calls:
            self.assertEqual(
                set(call["state"]),
                {"background", "conversation", "utterance"}
                | ({"candidate_text"} if call["stage"] == "output_policy" else set()),
            )
            self.assertEqual(set(call["state"]["conversation"][0]), {"speaker", "text"})
            self.assertNotIn("SECRET", repr(call))

    def test_TC04_router_does_not_observe_changed_evaluator_expectations(self) -> None:
        case = self.cases[8]
        bogus = replace(
            case,
            expected={
                **case.expected,
                "context_sufficiency": "INSUFFICIENT",
                "action": "BLOCK",
            },
        )
        first, _ = self.decision(case, ["COMPANION", "SUFFICIENT", "ALLOW"])
        second, _ = self.decision(bogus, ["COMPANION", "SUFFICIENT", "ALLOW"])
        self.assertEqual(first, second)
        self.assertEqual(p.evaluate(bogus, second, "offline")["verdict"], "FAIL")

    def test_TC04_skip_denominators_and_fail_priority(self) -> None:
        wrong, _ = self.decision(self.cases[8], ["PARENT"])
        fault, _ = self.decision(self.cases[9], [p.TypeSafeAPITimeoutError(30)])
        records = [
            p.evaluate(self.cases[8], wrong, "offline"),
            p.evaluate(self.cases[9], fault, "offline"),
        ]
        summary = p.summarize(records, "offline")
        self.assertEqual(summary["automatic_verdict"], "FAIL")
        self.assertTrue(summary["incomplete"])
        self.assertIsNone(summary["context_sufficiency"]["accuracy"])
        self.assertEqual(summary["context_sufficiency"]["coverage"], 0)
        self.assertIsNone(records[0]["stages"]["context_sufficiency"]["matches"])

    def test_TC04_partial_valid_denominator(self) -> None:
        result, _ = self.decision(self.cases[8], ["COMPANION", "SUFFICIENT", "ALLOW"])
        summary = p.summarize([p.evaluate(self.cases[8], result, "offline")], "offline")
        self.assertEqual(summary["context_sufficiency"]["accuracy"], 1)
        self.assertEqual(summary["context_sufficiency"]["coverage"], 1 / 15)
        self.assertEqual(summary["context_sufficiency"]["correct_over_total"], 1 / 15)

    def test_TC05_factory_logging_disabled_cleanup_and_sdk_settings(self) -> None:
        logger = logging.getLogger("typesafe_sdk")
        old_disabled, old_level = logger.disabled, logger.level
        self.addCleanup(setattr, logger, "disabled", old_disabled)
        self.addCleanup(logger.setLevel, old_level)
        logger.disabled = False
        logger.setLevel(logging.DEBUG)
        logs, stdout = io.StringIO(), io.StringIO()
        handler = logging.StreamHandler(logs)
        logger.addHandler(handler)
        logging.getLogger().addHandler(handler)
        self.addCleanup(logger.removeHandler, handler)
        self.addCleanup(logging.getLogger().removeHandler, handler)
        client = FakeClient([])
        manager = MagicMock()
        manager.__enter__.return_value = client
        observed = []

        def factory(**settings: object) -> MagicMock:
            observed.append(settings)
            self.assertTrue(logger.disabled)
            logger.debug("headers body fake-key-sentinel")
            return manager

        with (
            patch.dict(
                p.os.environ,
                {
                    "TYPESAFE_API_KEY": "fake-key-sentinel",
                    "TYPESAFE_LOG_LEVEL": "debug",
                },
            ),
            patch.object(p, "load_cases", return_value=[self.cases[0]]),
            patch.object(p, "load_questions", return_value=self.questions),
            patch.object(p, "version", return_value=p.SDK_VERSION),
            patch.object(p, "route", side_effect=KeyboardInterrupt),
            patch.object(Path, "mkdir"),
            patch.object(Path, "open", unittest.mock.mock_open()),
            patch.object(p, "save_summary") as save,
            patch.object(p, "metadata", return_value={}),
            redirect_stdout(stdout),
        ):
            self.assertEqual(p.run_live(factory=factory, threshold=0.5), 130)
        manager.__exit__.assert_called_once()
        self.assertEqual(observed[0]["model"], p.MODEL)
        self.assertEqual(observed[0]["timeout"], 30.0)
        self.assertEqual(observed[0]["retry"].max_retries, 0)
        self.assertNotIn(
            "fake-key-sentinel",
            logs.getvalue() + stdout.getvalue() + repr(save.call_args),
        )
        self.assertEqual(save.call_args.args[1]["suites"]["policy8"]["completed"], 0)
        self.assertTrue(save.call_args.args[1]["interrupted"])

    def test_TC05_logged_method_and_complete_runner_flush(self) -> None:
        logger = logging.getLogger("typesafe_sdk")
        old_disabled = logger.disabled
        self.addCleanup(setattr, logger, "disabled", old_disabled)
        logger.disabled = False
        case = self.cases[0]
        client = FakeClient(["COMPANION", "ALLOW"])
        original_method = client.system_one

        def logged(**kwargs: object) -> SimpleNamespace:
            logger.error("headers/body/fake-key-sentinel")
            return original_method(**kwargs)

        client.system_one = logged
        manager = MagicMock()
        manager.__enter__.return_value = client
        file_mock = unittest.mock.mock_open()
        stdout = io.StringIO()
        with (
            patch.dict(p.os.environ, {"TYPESAFE_API_KEY": "fake-key-sentinel"}),
            patch.object(p, "load_cases", return_value=[case]),
            patch.object(p, "load_questions", return_value=self.questions),
            patch.object(p, "version", return_value=p.SDK_VERSION),
            patch.object(Path, "mkdir"),
            patch.object(Path, "open", file_mock),
            patch.object(p, "save_summary"),
            patch.object(p, "metadata", return_value={}),
            redirect_stdout(stdout),
        ):
            self.assertEqual(p.run_live(factory=lambda **kw: manager, threshold=0.5), 2)
        manager.__exit__.assert_called_once()
        file_mock().flush.assert_called_once()
        self.assertNotIn(
            "fake-key-sentinel", stdout.getvalue() + repr(file_mock().write.call_args)
        )


def counter_suites(cases: list[p.Case]) -> dict[str, int]:
    return {
        suite: sum(case.suite == suite for case in cases)
        for suite in ("policy8", "oracle15")
    }


if __name__ == "__main__":
    unittest.main()
