"""E022: offline, research-first replay of the E012 adoption contract."""

from __future__ import annotations

import argparse
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
from typing import cast

RUN_ID = "20261008T035450Z-010364d7"
SOURCE_REVISION = "a855b451b6fe1c24d02caf67c569ffa90a9ea732"
TOPIC = "experiments/E013-jev-context-sufficiency"
RUN = f"{TOPIC}/evidence/runs/{RUN_ID}"
COUNTS = {"research": 40, "holdout": 20, "v0": 15}
LABELS = ("SUFFICIENT", "INSUFFICIENT")
PREFIXES = ("experiments/E012-jev-text-policy", TOPIC, "evaluation/context_sufficiency")
POLICY = ["min_adopted_i_to_s", "max_retained_correct", "min_integer_percent"]
LIMITATION = (
    "公開 holdout，非 unseen/blind；有限樣本與未校準機率不構成安全或產品採納證明。"
)


class AnalysisError(ValueError):
    """A source, input, or binding gap; never a model prediction."""


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


ANALYSIS_SHA256 = sha(Path(__file__).read_bytes())


def ensure_analysis_hash(expected: object) -> None:
    if expected != ANALYSIS_SHA256 or sha(Path(__file__).read_bytes()) != expected:
        raise AnalysisError("analysis source changed")


def object_dict(value: object) -> dict[str, object]:
    if not isinstance(value, dict) or any(not isinstance(k, str) for k in value):
        raise AnalysisError("expected JSON object")
    return cast(dict[str, object], value)


def unique_pairs(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise AnalysisError("duplicate JSON field")
        result[key] = value
    return result


def decode(data: bytes) -> dict[str, object]:
    return object_dict(json.loads(data, object_pairs_hook=unique_pairs))


def encode(value: object) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False)
        + "\n"
    ).encode()


def read_regular(path: Path) -> bytes:
    if not stat.S_ISREG(path.lstat().st_mode):
        raise AnalysisError("non-regular input")
    return path.read_bytes()


def write_new(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("xb") as stream:
            stream.write(data)
    except FileExistsError as exc:
        raise AnalysisError(
            "existing output is immutable; use external replay directory"
        ) from exc


def git(root: Path, *args: str) -> bytes:
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    env["GIT_NO_REPLACE_OBJECTS"] = "1"
    return subprocess.run(
        ["/usr/bin/git", "-C", str(root), *args],
        env=env,
        check=True,
        capture_output=True,
    ).stdout


def inventory(
    root: Path, revision: str, *, raw_groups: set[str] | None = None
) -> dict[str, str]:
    if (
        revision != SOURCE_REVISION
        or git(root, "rev-parse", "HEAD").decode().strip() != revision
    ):
        raise AnalysisError("source revision mismatch")
    if git(root, "rev-parse", "--is-shallow-repository").strip() != b"false":
        raise AnalysisError("incomplete source history")
    if (
        not (root / ".git").is_dir()
        or (root / ".git").is_symlink()
        or (root / ".git/objects/info/alternates").exists()
    ):
        raise AnalysisError("source must be an independent complete clone")
    names = (
        git(root, "ls-tree", "-r", "--name-only", revision, "--", *PREFIXES)
        .decode()
        .splitlines()
    )
    if not names:
        raise AnalysisError("missing source inventory")
    result: dict[str, str] = {}
    for name in names:
        committed = git(root, "show", f"{revision}:{name}")
        # The preflight already authenticated all 75 bodies. During selection,
        # retain their committed hashes without opening held-out filesystem bodies.
        # After freeze, the default full check verifies every body again.
        if raw_groups is not None and any(
            name.startswith(f"{RUN}/raw/{g}/") for g in COUNTS if g not in raw_groups
        ):
            result[name] = sha(committed)
            continue
        data = read_regular(root / name)
        if data != committed:
            raise AnalysisError(f"source bytes differ: {name}")
        result[name] = sha(data)
    return result


def evidence_bootstrap(root: Path) -> str:
    """Reuse the checked README's runtime authentication and evidence launcher."""
    text = read_regular(root / TOPIC / "README.md").decode()
    try:
        block = (
            "verify_inputs() {"
            + text.split("```sh\nverify_inputs() {", 1)[1].split("\n```", 1)[0]
        )
        launcher, _live_arguments = block.split("' --live \\\n", 1)
    except (IndexError, ValueError) as exc:
        raise AnalysisError("authenticated README bootstrap unavailable") from exc
    return launcher + f"' --verify-evidence --evidence-run {RUN}\n"


def verify_source(root: Path, revision: str, output: Path) -> dict[str, object]:
    root = root.resolve()
    proof: dict[str, object] = {
        "schema_version": 1,
        "source_checkout": str(root),
        "source_revision": revision,
        "run_id": RUN_ID,
        "case_version": "v1-draft-004",
        "gaps": [],
    }
    try:
        before = inventory(root, revision)
        script = evidence_bootstrap(root)
        env = {
            k: v
            for k, v in os.environ.items()
            if k != "TYPESAFE_API_KEY" and not k.startswith("GIT_")
        }
        completed = subprocess.run(
            ["/bin/bash", "-c", script],
            cwd=root,
            env=env,
            capture_output=True,
            check=False,
        )
        if completed.returncode:
            try:
                failed_result = decode(completed.stdout)
                proof["verification"] = failed_result
                if isinstance(failed_result.get("gaps"), list):
                    proof["gaps"] = failed_result["gaps"]
            except (ValueError, UnicodeDecodeError):
                pass
            raise AnalysisError(
                "authenticated E013 verification failed; environment or evidence gap"
            )
        result = decode(completed.stdout)
        summary = object_dict(result.get("summary"))
        if (
            result.get("run_id") != RUN_ID
            or result.get("verified_cases") != 75
            or result.get("gaps") != []
            or summary.get("complete") is not True
        ):
            raise AnalysisError("incomplete source verification")
        after = inventory(root, revision)
        if before != after:
            raise AnalysisError("source changed during verification")
        proof.update(
            {
                "source_files": before,
                "verified_cases": 75,
                "verification": result,
                "bootstrap_sha256": sha(script.encode()),
                "verifier_stdout_sha256": sha(completed.stdout),
                "verified_utc": datetime.now(timezone.utc).isoformat(),
                "command": [
                    "authenticated E013 README bootstrap",
                    "--verify-evidence",
                    "--evidence-run",
                    RUN,
                ],
                "python": "3.12.12",
                "sdk": "typesafe-sdk==0.7.2",
            }
        )
    except (AnalysisError, OSError, ValueError, subprocess.SubprocessError):
        if not proof.get("gaps"):
            proof["gaps"] = [{"reason": "source/environment verification incomplete"}]
        write_new(output, encode(proof))
        raise AnalysisError("source/environment verification incomplete") from None
    write_new(output, encode(proof))
    return proof


def checked_integrity(
    path: Path, *, raw_groups: set[str] | None = None
) -> tuple[dict[str, object], Path, dict[str, str]]:
    proof = decode(read_regular(path))
    if (
        proof.get("gaps") != []
        or proof.get("verified_cases") != 75
        or proof.get("run_id") != RUN_ID
        or proof.get("case_version") != "v1-draft-004"
    ):
        raise AnalysisError("source integrity is incomplete")
    verification = object_dict(proof.get("verification"))
    if (
        verification.get("gaps") != []
        or verification.get("verified_cases") != 75
        or object_dict(verification.get("summary")).get("complete") is not True
    ):
        raise AnalysisError("missing complete verifier result")
    location = proof.get("source_checkout")
    if not isinstance(location, str):
        raise AnalysisError("missing source checkout")
    root = Path(location).resolve()
    actual = inventory(root, str(proof.get("source_revision")), raw_groups=raw_groups)
    if proof.get("source_files") != actual:
        raise AnalysisError("source inventory binding mismatch")
    return proof, root, actual


def percent_value(percent: int) -> float:
    if type(percent) is not int or not 0 <= percent <= 100:
        raise AnalysisError("threshold must be an integer percent in 0..100")
    return percent / 100


@dataclass(frozen=True)
class Case:
    group: str
    case_id: str
    oracle: str
    choice: str
    probability: float
    raw_sha256: str
    analysis_sha256: str
    case_version: dict[str, object]

    def __post_init__(self) -> None:
        if (
            self.group not in COUNTS
            or self.oracle not in LABELS
            or self.choice not in LABELS
        ):
            raise AnalysisError("invalid group or choice")
        p = self.probability
        if type(p) not in (int, float) or not math.isfinite(p) or not 0 <= p <= 1:
            raise AnalysisError("invalid original probability")

    @property
    def correct(self) -> bool:
        return self.choice == self.oracle

    @property
    def direction(self) -> str | None:
        if self.correct:
            return None
        return (
            "INSUFFICIENT → SUFFICIENT"
            if self.oracle == "INSUFFICIENT"
            else "SUFFICIENT → INSUFFICIENT"
        )

    def decision(self, percent: int) -> dict[str, object]:
        threshold = percent_value(percent)
        adopted = self.probability >= threshold
        return {
            "run_id": RUN_ID,
            "group": self.group,
            "case_id": self.case_id,
            "case_version": self.case_version,
            "oracle": self.oracle,
            "raw_choice": self.choice,
            "adoption_probability": self.probability,
            "raw_sha256": self.raw_sha256,
            "analysis_sha256": self.analysis_sha256,
            "threshold_percent": percent,
            "threshold": threshold,
            "adopted": adopted,
            "result": self.choice if adopted else "BLOCK",
            "raw_correct": self.correct,
            "error_direction": self.direction,
        }


def parse_case(row: dict[str, object], raw_sha: str, row_sha: str) -> Case:
    if row.get("status") != "VALID" or row.get("run_id") != RUN_ID:
        raise AnalysisError("unverified or invalid case")
    choice = row.get("choice")
    p = object_dict(row.get("probabilities")).get(str(choice))
    if type(p) not in (int, float):
        raise AnalysisError("invalid original probability")
    return Case(
        str(row.get("group")),
        str(row.get("case_id")),
        str(row.get("expected")),
        str(choice),
        cast(float, p),
        raw_sha,
        row_sha,
        object_dict(row.get("case_version")),
    )


def load_cases(root: Path, groups: set[str], files: dict[str, str]) -> list[Case]:
    if not groups or not groups <= COUNTS.keys():
        raise AnalysisError("invalid requested groups")
    analysis = read_regular(root / RUN / "analysis.jsonl")
    if sha(analysis) != files.get(f"{RUN}/analysis.jsonl"):
        raise AnalysisError("analysis bytes changed")
    manifest = decode(read_regular(root / RUN / "manifest.json"))
    entries = manifest.get("cases")
    if not isinstance(entries, list):
        raise AnalysisError("missing manifest cases")
    selected = [
        object_dict(item)
        for item in entries
        if object_dict(item).get("group") in groups
    ]
    bound = {(str(e["group"]), str(e["case_id"])): e for e in selected}
    if len(bound) != sum(COUNTS[g] for g in groups) or len(bound) != len(selected):
        raise AnalysisError("missing or duplicate case inventory")
    result: list[Case] = []
    seen: set[tuple[str, str]] = set()
    for line in analysis.splitlines():
        row = decode(line)
        if row.get("group") not in groups:
            continue  # No probability processing or raw-body read for other groups.
        key = (str(row["group"]), str(row["case_id"]))
        if (
            key in seen
            or key not in bound
            or not re.fullmatch(r"[A-Za-z0-9_-]+", key[1])
        ):
            raise AnalysisError("duplicate or unexpected case")
        seen.add(key)
        entry = bound[key]
        row_sha = sha(line + b"\n")
        if row_sha != entry.get("analysis_sha256"):
            raise AnalysisError("case analysis hash mismatch")
        raw_path = f"{RUN}/raw/{key[0]}/{key[1]}.body"
        raw_bytes = read_regular(root / raw_path)
        raw_sha = sha(raw_bytes)
        if (
            raw_sha != files.get(raw_path)
            or raw_sha != entry.get("raw_sha256")
            or raw_sha != row.get("raw_sha256")
            or entry.get("raw_public_path") != f"raw/{key[0]}/{key[1]}.body"
        ):
            raise AnalysisError("case raw hash mismatch")
        answer = object_dict(
            object_dict(decode(raw_bytes).get("answers")).get("context_sufficiency")
        )
        if answer.get("choice") != row.get("choice") or answer.get(
            "probabilities"
        ) != row.get("probabilities"):
            raise AnalysisError("raw and analysis disagree")
        result.append(parse_case(row, raw_sha, row_sha))
    if seen != set(bound):
        raise AnalysisError("missing case rows")
    return sorted(result, key=lambda c: (c.group, c.case_id))


def metric(count: int, denominator: int) -> dict[str, object]:
    return {
        "count": count,
        "denominator": denominator,
        "rate": count / denominator if denominator else None,
    }


@dataclass(frozen=True)
class Score:
    percent: int
    total: int
    adopted: int
    raw_correct: int
    retained_correct: int
    adopted_i_to_s: int
    adopted_s_to_i: int
    oracle_i: int
    oracle_s: int
    raw_confusion: dict[str, dict[str, int]]

    @property
    def rejected_correct(self) -> int:
        return self.raw_correct - self.retained_correct

    def as_dict(self) -> dict[str, object]:
        return {
            "threshold_percent": self.percent,
            "threshold": percent_value(self.percent),
            "N": self.total,
            "V": self.total,
            "invalid": 0,
            "gaps": 0,
            "A": self.adopted,
            "raw_correct": metric(self.raw_correct, self.total),
            "adoption": metric(self.adopted, self.total),
            "retained_correct": metric(self.retained_correct, self.raw_correct),
            "rejected_correct": metric(self.rejected_correct, self.raw_correct),
            "adopted_i_to_s": metric(self.adopted_i_to_s, self.oracle_i),
            "adopted_s_to_i": metric(self.adopted_s_to_i, self.oracle_s),
            "adopted_wrong": metric(
                self.adopted_i_to_s + self.adopted_s_to_i, self.adopted
            ),
            "raw_confusion": self.raw_confusion,
        }


def evaluate(cases: list[Case], percent: int) -> Score:
    threshold = percent_value(percent)
    accepted = [c for c in cases if c.probability >= threshold]
    confusion = {
        oracle: {
            choice: sum(c.oracle == oracle and c.choice == choice for c in cases)
            for choice in LABELS
        }
        for oracle in LABELS
    }
    return Score(
        percent,
        len(cases),
        len(accepted),
        sum(c.correct for c in cases),
        sum(c.correct for c in accepted),
        sum(c.oracle == "INSUFFICIENT" and not c.correct for c in accepted),
        sum(c.oracle == "SUFFICIENT" and not c.correct for c in accepted),
        sum(c.oracle == "INSUFFICIENT" for c in cases),
        sum(c.oracle == "SUFFICIENT" for c in cases),
        confusion,
    )


def rank_research(cases: list[Case]) -> tuple[Score, list[Score]]:
    if not cases or any(c.group != "research" for c in cases):
        raise AnalysisError("candidate selection requires research only")
    curve = [evaluate(cases, k) for k in range(101)]
    return min(
        curve, key=lambda s: (s.adopted_i_to_s, -s.retained_correct, s.percent)
    ), curve


def candidate(best: Score) -> int | None:
    return best.percent if best.retained_correct else None


def hypothesis(best: Score, baseline: Score) -> str:
    return (
        "成功"
        if best.adopted_i_to_s < baseline.adopted_i_to_s and best.retained_correct > 0
        else "失敗"
    )


def decision_bytes(cases: list[Case], percents: Sequence[int]) -> bytes:
    return b"".join(
        (
            json.dumps(
                c.decision(k), ensure_ascii=False, sort_keys=True, allow_nan=False
            )
            + "\n"
        ).encode()
        for k in percents
        for c in cases
    )


def research_payload(cases: list[Case]) -> tuple[Score, dict[str, object], bytes]:
    best, curve = rank_research(cases)
    summary: dict[str, object] = {
        "group": "research",
        "run_id": RUN_ID,
        "candidate_percent": candidate(best),
        "diagnostic_best_percent": best.percent,
        "policy": POLICY,
        "hypothesis": hypothesis(best, curve[0]),
        "baseline_has_no_i_to_s": curve[0].adopted_i_to_s == 0,
        "curve": [s.as_dict() for s in curve],
        "limitation": LIMITATION,
    }
    return best, summary, decision_bytes(cases, range(101))


def research(integrity_path: Path, output: Path) -> dict[str, object]:
    proof, root, files = checked_integrity(integrity_path, raw_groups={"research"})
    best, summary, decisions = research_payload(load_cases(root, {"research"}, files))
    if integrity_path.resolve() != (output / "integrity.json").resolve():
        raise AnalysisError("research requires colocated integrity.json")
    names = (
        "research-decisions.jsonl",
        "research-summary.json",
        "candidate-freeze.json",
    )
    if any((output / n).exists() for n in names):
        raise AnalysisError("research already recorded; do not overwrite or tune")
    ensure_analysis_hash(ANALYSIS_SHA256)
    write_new(output / names[0], decisions)
    write_new(output / names[1], encode(summary))
    freeze: dict[str, object] = {
        "schema_version": 1,
        "run_id": RUN_ID,
        "source_revision": proof["source_revision"],
        "source_files": files,
        "analysis_source_sha256": ANALYSIS_SHA256,
        "artifact_sha256": {
            "integrity.json": sha(read_regular(integrity_path)),
            names[0]: sha(decisions),
            names[1]: sha(encode(summary)),
        },
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "policy": POLICY,
        "candidate_percent": candidate(best),
        "threshold": percent_value(best.percent)
        if candidate(best) is not None
        else None,
        "diagnostic_best_percent": best.percent,
        "reason": "先最少採用 I→S，再最多保留正確 choice，同效用取最低門檻；零正確保留則無可用候選。",
        "limitation": LIMITATION,
    }
    write_new(output / names[2], encode(freeze))
    return freeze


def validate_selection(freeze: dict[str, object], best: Score) -> None:
    expected = candidate(best)
    value = freeze.get("candidate_percent")
    diagnostic = freeze.get("diagnostic_best_percent")
    threshold = freeze.get("threshold")
    if (
        (value is not None and type(value) is not int)
        or type(diagnostic) is not int
        or (threshold is not None and type(threshold) is not float)
    ):
        raise AnalysisError("freeze threshold types are invalid")
    if (
        freeze.get("policy") != POLICY
        or freeze.get("candidate_percent") != expected
        or freeze.get("diagnostic_best_percent") != best.percent
        or freeze.get("threshold")
        != (percent_value(best.percent) if expected is not None else None)
    ):
        raise AnalysisError("freeze selection does not match research replay")


def check_heldout(freeze_path: Path, output: Path) -> dict[str, object]:
    freeze = decode(read_regular(freeze_path))
    ensure_analysis_hash(freeze.get("analysis_source_sha256"))
    bindings = object_dict(freeze.get("artifact_sha256"))
    if set(bindings) != {
        "integrity.json",
        "research-decisions.jsonl",
        "research-summary.json",
    }:
        raise AnalysisError("missing research bindings")
    for name, digest in bindings.items():
        if sha(read_regular(freeze_path.parent / name)) != digest:
            raise AnalysisError("research artifact binding mismatch")
    proof, root, files = checked_integrity(freeze_path.parent / "integrity.json")
    if (
        freeze.get("run_id") != RUN_ID
        or freeze.get("source_revision") != proof.get("source_revision")
        or freeze.get("source_files") != files
    ):
        raise AnalysisError("freeze source binding mismatch")
    research_cases = load_cases(root, {"research"}, files)
    best, summary, decisions = research_payload(research_cases)
    if (
        sha(encode(summary)) != bindings["research-summary.json"]
        or sha(decisions) != bindings["research-decisions.jsonl"]
    ):
        raise AnalysisError("research replay mismatch")
    validate_selection(freeze, best)
    names = ("heldout-decisions.jsonl", "heldout-summary.json", "report.md")
    if any((output / n).exists() for n in names):
        raise AnalysisError("heldout history is immutable; replay to external scratch")
    k = candidate(best)
    result: dict[str, object] = {
        "run_id": RUN_ID,
        "candidate_percent": k,
        "freeze_sha256": sha(read_regular(freeze_path)),
        "research_hypothesis": summary["hypothesis"],
        "limitation": LIMITATION,
        "groups": {},
    }
    held_cases: list[Case] = []
    if k is None:
        result["status"] = "skipped: no usable candidate"
    else:
        held_cases = load_cases(root, {"holdout", "v0"}, files)
        result["status"] = "descriptive fixed-candidate check"
        result["groups"] = {
            g: evaluate([c for c in held_cases if c.group == g], k).as_dict()
            for g in ("holdout", "v0")
        }
        write_new(output / names[0], decision_bytes(held_cases, [k]))
    ensure_analysis_hash(ANALYSIS_SHA256)
    write_new(output / names[1], encode(result))
    write_new(
        output / names[2],
        report(research_cases, held_cases, best, summary, result).encode(),
    )
    return result


def report(
    research_cases: list[Case],
    held_cases: list[Case],
    best: Score,
    summary: dict[str, object],
    result: dict[str, object],
) -> str:
    k = candidate(best)
    lines = [
        "# E022 Context Sufficiency 門檻研究",
        "",
        f"來源 run：`{RUN_ID}`；commit：`{SOURCE_REVISION}`。",
        "",
        f"研究候選：{str(k) + '%' if k is not None else '無可用候選'}；research 假設：{summary['hypothesis']}；驗證任務完成：是。",
        "",
        "排序：最少採用 I→S → 最多保留正確 → 最低整數百分比。比較 probabilities[raw choice] >= k/100；confidence 不參與，BLOCK 不改 raw accuracy。",
        "",
        "| Group | N | Raw correct | Adopted | Retained correct | Rejected correct | Adopted I→S | Adopted S→I |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    groups = [research_cases] + [
        [c for c in held_cases if c.group == g] for g in ("holdout", "v0")
    ]
    for cases in groups:
        if not cases:
            continue
        s = evaluate(cases, best.percent)
        lines.append(
            f"| {cases[0].group} | {s.total} | {s.raw_correct}/{s.total} | {s.adopted}/{s.total} | {s.retained_correct}/{s.raw_correct} | {s.rejected_correct}/{s.raw_correct} | {s.adopted_i_to_s}/{s.oracle_i} | {s.adopted_s_to_i}/{s.oracle_s} |"
        )
    lines += [
        "",
        "完整 101 點取捨與各項分母見 research-summary.json；逐案決策及來源 hashes 見相應 JSONL。無候選時 research 表僅為診斷性最優點。",
        "",
        "## 全部原始 I→S 案例",
        "",
        "| Group | Case | Raw choice probability | Fixed-point result |",
        "| --- | --- | ---: | --- |",
    ]
    for c in research_cases + held_cases:
        if c.oracle == "INSUFFICIENT" and not c.correct:
            d = c.decision(best.percent)
            lines.append(
                f"| {c.group} | {c.case_id} | {c.probability!r} | {d['result']} |"
            )
    lines += ["", "## 被拒絕的原本正確判斷", ""]
    rejected = [
        c
        for c in research_cases + held_cases
        if c.correct and not c.decision(best.percent)["adopted"]
    ]
    lines += [
        f"- {c.group}/{c.case_id}: {c.choice}, p={c.probability!r} → BLOCK"
        for c in rejected
    ] or ["- 無。"]
    lines += [
        "",
        "## 限制與 Owner 決策",
        "",
        LIMITATION,
        "",
        "樣本僅 research 40、holdout 20、v0 15。結果不能外推 Input／Output Policy 或其他情境；零觀察誤採用不是安全達標。Owner 尚須決定產品可接受的誤採用風險與候選採納，產品設定未修改。",
        "",
        "holdout 僅是候選固定後的一次描述性檢查，未用來選值；同候選重播是輸出一致性驗證。工具圖／測試通過不核准產品採用。",
        "",
    ]
    if summary["baseline_has_no_i_to_s"]:
        lines += ["research baseline 已無 I→S，無可降低空間。", ""]
    return "\n".join(lines)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    verify = commands.add_parser("verify-source")
    verify.add_argument("--source-checkout", type=Path, required=True)
    verify.add_argument("--source-revision", required=True)
    verify.add_argument("--output", type=Path, required=True)
    select = commands.add_parser("research")
    select.add_argument("--integrity", type=Path, required=True)
    select.add_argument("--output-dir", type=Path, required=True)
    held = commands.add_parser("check-heldout")
    held.add_argument("--freeze", type=Path, required=True)
    held.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "verify-source":
            result = verify_source(
                args.source_checkout, args.source_revision, args.output
            )
            print(
                json.dumps(
                    {"verified_cases": result["verified_cases"], "gaps": result["gaps"]}
                )
            )
        elif args.command == "research":
            result = research(args.integrity, args.output_dir)
            print(
                json.dumps(
                    {
                        "candidate_percent": result["candidate_percent"],
                        "freeze_written": True,
                    }
                )
            )
        else:
            result = check_heldout(args.freeze, args.output_dir)
            print(
                json.dumps(
                    {
                        "candidate_percent": result["candidate_percent"],
                        "status": result["status"],
                    }
                )
            )
        return 0
    except (
        AnalysisError,
        OSError,
        ValueError,
        KeyError,
        subprocess.SubprocessError,
    ) as exc:
        print(f"E022 incomplete: {type(exc).__name__}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
