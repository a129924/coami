---
topic: E005-robot-action-catalog
step_profile: base-plan
source_plan: plan/E005-robot-action-catalog/E005-robot-action-catalog.plan.md
created: 2026-09-23
---

# E005-robot-action-catalog — Step Tracking

## Workflow Stages

| Current status | Allowed next transitions | Next actor |
| --- | --- | --- |
| approved | approved → publish-in-progress | Main Agent |

## Actionable Steps

### Main Agent — Fixed Head

- [X] **Actor:** Main Agent — **Action:** create-worktree — **Selector:** topic=E005-robot-action-catalog; branch=feat/andrew/e005-robot-action-catalog; managed-path-intent=/private/tmp/coami-e005-robot-action-catalog; primary-worktree=false
- [X] **Actor:** Main Agent — **Action:** prepare-topic-branch — **Selector:** topic=E005-robot-action-catalog; branch=feat/andrew/e005-robot-action-catalog; managed-path-intent=/private/tmp/coami-e005-robot-action-catalog; primary-worktree=false

### Contextual Actions

- [X] **Actor:** Main Agent — **Action:** hand the independently approved plan and selected E005 worktree to Creator for bounded implementation.

## Implementation Steps

- [X] 1. Build the isolated E005 MOD and simulator harness; prove the A pressed/released selection, C run, and B reset/release protocol with same-run evidence.
- [X] 2. Run each candidate from its required starting state; draft the matrix with API, parameters, MOD trace, observed effect and video timecode. Hand the reproducible run evidence to Tester for the independent visual verdict.
- [X] 3. After Tester records per-candidate PASS/FAIL in the matrix, expose dedicated buttons only for PASS actions; implement serialized dispatch, stop quiescence, reset gate, restart isolation, and late-trace protection.
- [X] 4. Implement typed command/result JSONL download, tests, build and reproduction guide; record final evidence and decision.

## Main Agent Actionable Steps — Fixed Tail

- [X] **Actor:** Main Agent — **Action:** Validate the approved Written set and perform bounded staging only.
- [X] **Actor:** Main Agent — **Action:** Obtain explicit human approval at STOP POINT 1 before commit, push, or PR creation.
- [ ] **Actor:** Main Agent — **Action:** Commit the approved bounded changes.
- [ ] **Actor:** Main Agent — **Action:** Push the topic branch.
- [ ] **Actor:** Main Agent — **Action:** Open the pull request.
- [ ] **Actor:** Main Agent — **Action:** Review and observe the pull request and route actionable feedback.
- [ ] **Actor:** Main Agent — **Action:** Hand off for human merge at STOP POINT 2 and completely stop.
- [ ] **Actor:** Main Agent — **Action:** Record exact human merge evidence after a new execution begins.
- [ ] **Actor:** Main Agent — **Action:** Require a new explicit human resume before post-merge work.
- [ ] **Actor:** Main Agent — **Action:** Verify the pull request is merged.
- [ ] **Actor:** Main Agent — **Action:** Fast-forward-only sync the target/default branch.
- [ ] remote-retained — preserve the remote branch; retention is required or unknown, and human/policy follow-up is required before deletion
- [X] Determine release requirement — release not required
- [X] release-not-applicable — source plan declares terminal at merged
- [ ] **Actor:** Main Agent — **Action:** Inspect the selected managed topic worktree and prove clean/release evidence — **Selector:** topic=E005-robot-action-catalog; branch=feat/andrew/e005-robot-action-catalog; managed-path-intent=/private/tmp/coami-e005-robot-action-catalog; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Obtain exact destructive approval to remove the selected managed topic worktree — **Selector:** topic=E005-robot-action-catalog; branch=feat/andrew/e005-robot-action-catalog; managed-path-intent=/private/tmp/coami-e005-robot-action-catalog; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Remove the selected managed topic worktree and verify removal — **Selector:** topic=E005-robot-action-catalog; branch=feat/andrew/e005-robot-action-catalog; managed-path-intent=/private/tmp/coami-e005-robot-action-catalog; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Delete the local topic branch after verified managed worktree removal.
- [ ] **Actor:** Main Agent — **Action:** Perform final verification and record close-semantics evidence without equating merged with closed.

## Handoff / Gate Notes

- Selected profile: base-plan
- Source plan: `plan/E005-robot-action-catalog/E005-robot-action-catalog.plan.md`
- Shared lifecycle shell: `.codex/skills/step-creator/templates/shared-lifecycle-shell.md`
- Managed worktree intent: topic=E005-robot-action-catalog; branch=feat/andrew/e005-robot-action-catalog; managed-path-intent=/private/tmp/coami-e005-robot-action-catalog; primary-worktree=false
- Progression truth inputs: `analysis/E005-robot-action-catalog/requirements.md`, `analysis/E005-robot-action-catalog/technical-spec.md`, `plan/E005-robot-action-catalog/E005-robot-action-catalog.plan.md`.
- Completion evidence inputs: `git worktree list --porcelain` for the fixed head, `experiments/E005-robot-action-catalog/EXPERIMENT.md`, `experiments/E005-robot-action-catalog/evidence/action-matrix.md`, `experiments/E005-robot-action-catalog/evidence/action-run.webm`, TypeScript checks and independent review verdict.
- Marker semantics: `[X]` exact one-to-one evidence; `[ ]` pending/planned/unproved; lowercase source `[x]` is pending and warns.
- Tracker semantics: `check_all_succeeded` covers rendered head/contextual/Implementation/tail checkboxes; `check_impl_steps_succeeded` covers only Implementation Steps.
- Owner-only updates: only the action owner may update after exact evidence; step-creator never updates an existing output.
