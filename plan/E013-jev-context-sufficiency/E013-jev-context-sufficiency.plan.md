# E013 Jev Context Sufficiency evaluation — topic plan

## Inputs

- Accepted conversational processed plan: fixed 75-case Context evaluation and review-gated, versioned case evidence. The approved local staging path alone is not durable archival storage.
- ReadOnly: v0 oracle/review, v1 case data/validator/README, E012 policy and historical evidence, shared workflow contracts. Only the v1 `review.md` acceptance record may be updated without changing any oracle answer.
- Branch: `feat/andrew/e013-context-evaluation`; implementation occurs only in its feature worktree.
- Analysis-layer warning: no E013 `analysis/` requirements or technical-spec baseline exists; this plan derives from the Owner's processed plan and inspected repository contracts.

## Goal / Outcome

**Goal:** Evaluate frozen v1 research 40/holdout 20 and frozen v0 15 under fixed Jev Context Sufficiency conditions, preserving byte-exact responses locally and publishing safety-reviewed, versioned case analysis for later independent inspection.

**Non-Goal:** Do not choose or claim a model threshold, alter oracle/prompt/model, run other policies or Actions, or add production capabilities.

## Scope

**In-Scope:** freeze and approved local-staging preflight; 75 serial context-only calls after authorization; emitted request and 2xx response capture; validation, case index, group summary, review-gated evidence export, clean-checkout verification, and offline tests.

**Out-Of-Scope:** product APIs, device/server runtime, model tuning, holdout-driven changes, unreviewed raw publication, and safety certification.

## Locked Decisions

- The exact v1 `v1-draft-004` 60-case snapshot now has Owner acceptance with three SHA-256 values recorded in `review.md`. The Owner performed the human review; an independent fixture verdict is still pending, so v1 remains **NOT FROZEN**. A matching independent review, freeze record, validators and hashes must precede live calls; technical PR merge does not satisfy these gates.
- Pin `jev-1.13.0`, `typesafe-sdk==0.7.2`, E012 Context rubric, 30-second timeout, zero retries, disabled SDK logger. Fixed order research → holdout → v0, one request per case and one in flight.
- Jev state is only background/conversation/utterance; no oracle, split, ID, candidate, or threshold enters the request. Capture actual request body and entire 2xx response bytes before SDK parsing.
- Raw responses first reach the Owner-selected local staging root `/Users/andrew/coami-evidence/E013/runs/<run_id>/`, outside the repo and `/private/tmp`. Unique run directories, exclusive writes, point-in-time hashes and read-only file modes do not make one local directory immutable or backed up. Only case-by-case security-reviewed analysis/body bytes may be exported unchanged to Git, committed and pushed for versioned retrieval; restricted-only objects retain locators and hashes, with access limits and no promised retention.
- Run/case identity is `(run_id, group, case_id)`; raw file path includes group. Unknown and not-run are distinct; missing evidence is unverified. E013 reports observations only; later research may propose a candidate threshold for separate holdout checking.

## Boundaries / Exclusions

**ReadOnly:** v0 and v1 oracle data/validator/README, `experiments/E012-jev-text-policy/`, shared workflow contracts, `server/src/`, `device/src/`, root `README.md` and `VERSION`.

**Written:** E013 plan and experiment paths listed below, v1 `review.md` for the exact Owner acceptance and later independently verified freeze record, and the Owner-selected external local `runs/<run_id>/` staging root. Reviewed E013 Git evidence is written only after per-case safety approval. No live run is authorized by this update.

**Modify:** v1 `review.md` acceptance/gate status and E013 tracked plan, runner, evidence tool, tests and docs. **Deleted:** none.

## Status / Allowed Transitions

- Current: `creator-in-progress`; implementation and offline verification are being prepared in the feature worktree. Formal independent review has not yet approved this repository plan or code.
- Allowed: `planned` → `creator-in-progress` → `review-ready` → `reviewer-in-progress` → `approved|needs-rework`; `needs-rework` → `creator-in-progress`; `approved` → `publish-in-progress` → `pr-open` → `merged`.
- Live execution is a separate human boundary requiring v1 independent fixture review/freeze, verified local staging policy, and explicit live instruction. Human review follows Draft PR; merge/release is excluded from this handoff.

## Artifact Paths

| Artifact | Exact path |
| --- | --- |
| Topic plan | `plan/E013-jev-context-sufficiency/E013-jev-context-sufficiency.plan.md` |
| Step tracker | `plan/E013-jev-context-sufficiency/E013-jev-context-sufficiency.step.md` |
| Python spec | `plan/E013-jev-context-sufficiency/E013-jev-context-sufficiency.spec.md` |
| Experiment guide | `experiments/E013-jev-context-sufficiency/README.md` |
| Local staging policy | `experiments/E013-jev-context-sufficiency/local-store-policy.json` |
| Experiment record | `experiments/E013-jev-context-sufficiency/EXPERIMENT.md` |
| Runner | `experiments/E013-jev-context-sufficiency/jev_context.py` |
| Evidence export and verification | `experiments/E013-jev-context-sufficiency/evidence_tools.py` |
| Dependencies | `experiments/E013-jev-context-sufficiency/pyproject.toml`, `experiments/E013-jev-context-sufficiency/uv.lock` |
| Local key template | `experiments/E013-jev-context-sufficiency/.env.example` |
| Ignore rules | `experiments/E013-jev-context-sufficiency/.gitignore` |
| Offline tests | `experiments/E013-jev-context-sufficiency/tests/test_jev_context.py` |
| Evidence guide | `experiments/E013-jev-context-sufficiency/evidence/README.md` |
| Reviewed run index | `experiments/E013-jev-context-sufficiency/evidence/runs/<run_id>/manifest.json` |
| Reviewed case rows | `experiments/E013-jev-context-sufficiency/evidence/runs/<run_id>/analysis.jsonl` |
| Reviewed summary | `experiments/E013-jev-context-sufficiency/evidence/runs/<run_id>/summary.json` |
| Reviewed byte-identical raw | `experiments/E013-jev-context-sufficiency/evidence/runs/<run_id>/raw/<group>/<case_id>.body` (only approved cases) |

The Owner-selected local staging root `/Users/andrew/coami-evidence/E013` uses `runs/<run_id>/manifest.json`, `events.jsonl`, `analysis.jsonl`, `summary.json`, `requests/<group>/<case_id>.body`, and `responses/<group>/<case_id>.body`. Its policy states `versioned_immutable: false`, `backup_verified: false`, and no retention date. The Git export is the versioned retrievable copy only for approved case objects; any restricted-only object remains local and is reported as a verification gap without authorized access.

## Implementation Steps

- [X] 1. Add E013-only pinned Python scaffold, frozen case loader and zero-call preflight.
- [X] 2. Capture exact emitted request and successful response bytes before SDK parsing; retain invalid responses and classify failures without error-body exposure.
- [X] 3. Add per-case local run rows, descriptive group report, review-gated Git export, and clean-checkout verification.
- [ ] 4. Complete offline tests, validators, static checks and evidence record; obtain independent technical review.
- [ ] 5. After Owner freeze, store decision and explicit live authorization, run 75 cases once and reconcile raw hashes and group counts. This step is blocked today.

## Validation / Acceptance Checks

**TestCase:** Owner acceptance alone leaves v1 zero-call blocked until independent review and freeze. Fake HTTP transport verifies request projection, 2xx byte equality including unknown/invalid bodies, and exclusion of non-2xx body. Inventory has unique 40/20/15 keys. Missing key/freeze/local policy/dependency blocks before network. Interruption, write failure and rerun do not invent a choice or overwrite evidence. Local verification checks run/case request and raw hashes and summary but does not assert immutability or backup. Per-case safety approval is required before export. A clean checkout resolves reviewed run/group/case, hashes raw and complete rows, recomputes groups and arbitrary candidate-threshold error counts, and reports inaccessible/mismatched evidence as unverified.

No successful offline test is a Jev model score or product pass. No threshold is selected in E013.

## Reviewer Handoff

```json
{
  "verdict": "approved|needs-rework",
  "blocking_issues": [],
  "copilot_feedback_triage": { "ADDRESS": [], "DISCUSS": [], "SKIP": [] }
}
```

## Post-merge / release actions

Draft PR stops for human review. No merge, README/VERSION change, tag, release note or release action is part of E013; `merged` would be terminal after a later human decision. Live execution remains separately gated.

## Open Questions / Unresolved Items

- Owner has selected local staging only. A backed-up immutable restricted archive and retention period remain undecided; no such guarantee is claimed for restricted-only objects.
- Owner has accepted the exact v1 snapshot. Independent fixture review and matching freeze are still required. No live run until that evidence and separate authorization exist.
