---
topic: E015-manual-video-recording
step_profile: base-plan
source_plan: plan/E015-manual-video-recording/E015-manual-video-recording.plan.md
created: 2026-10-13
---

# E015-manual-video-recording — Step Tracking

## Workflow Stages

| Current status | Allowed next transitions | Next actor |
| --- | --- | --- |
| pr-open | pr-open -> needs-rework or merged | Owner / Human Reviewer |

## Actionable Steps

### Main Agent — Fixed Head

- [X] **Actor:** Main Agent — **Action:** create-worktree — **Selector:** topic=E015-manual-video-recording; branch=feat/andrew/e015-manual-video-recording; managed-path-intent=/private/tmp/coami-e015-manual-video-recording; primary-worktree=false
- [X] **Actor:** Main Agent — **Action:** prepare-topic-branch — **Selector:** topic=E015-manual-video-recording; branch=feat/andrew/e015-manual-video-recording; managed-path-intent=/private/tmp/coami-e015-manual-video-recording; primary-worktree=false

### Contextual Actions

- [X] **Actor:** Implementer — **Action:** Implement the bounded E015 experiment after independent formal plan review and readiness routing.

## Implementation Steps

- [X] 1. Implement the isolated E015 MOD, host capture pump and browser harness under the locked frame-ownership contract.
- [X] 2. Implement recording-session lifecycle, separate capture/finalization tokens, normal-end readiness/cleanup, cancellation and restart.
- [X] 3. Run TC6 pure tests, strict TypeScript checks and MOD/web builds where available; record exact prerequisite blockers without claiming unavailable checks passed.
- [X] 4. Write the eight-section experiment README and metadata evidence with reproducible owner procedures, actual check results and truthful pending live-experiment status.

## Main Agent Actionable Steps — Fixed Tail

- [X] **Actor:** Main Agent — **Action:** Validate the approved Written set and perform bounded staging only.
- [X] **Actor:** Main Agent — **Action:** Obtain explicit human approval at STOP POINT 1 before commit, push, or PR creation.
- [X] **Actor:** Main Agent — **Action:** Commit the approved bounded changes.
- [X] **Actor:** Main Agent — **Action:** Push the topic branch.
- [X] **Actor:** Main Agent — **Action:** Open the pull request.
- [X] **Actor:** Main Agent — **Action:** Review and observe the pull request and route actionable feedback.
- [X] **Actor:** Main Agent — **Action:** Hand off for human merge at STOP POINT 2 and completely stop.
- [ ] **Actor:** Main Agent — **Action:** Record exact human merge evidence after a new execution begins.
- [ ] **Actor:** Main Agent — **Action:** Require a new explicit human resume before post-merge work.
- [ ] **Actor:** Main Agent — **Action:** Verify the pull request is merged.
- [ ] **Actor:** Main Agent — **Action:** Fast-forward-only sync the target/default branch.
- [ ] remote-retained — preserve the remote branch; retention is required or unknown, and human/policy follow-up is required before deletion
- [X] Determine release requirement — release not required
- [X] release-not-applicable — source plan declares terminal at merged
- [ ] **Actor:** Main Agent — **Action:** Inspect the selected managed topic worktree and prove clean/release evidence — **Selector:** topic=E015-manual-video-recording; branch=feat/andrew/e015-manual-video-recording; managed-path-intent=/private/tmp/coami-e015-manual-video-recording; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Obtain exact destructive approval to remove the selected managed topic worktree — **Selector:** topic=E015-manual-video-recording; branch=feat/andrew/e015-manual-video-recording; managed-path-intent=/private/tmp/coami-e015-manual-video-recording; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Remove the selected managed topic worktree and verify removal — **Selector:** topic=E015-manual-video-recording; branch=feat/andrew/e015-manual-video-recording; managed-path-intent=/private/tmp/coami-e015-manual-video-recording; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Delete the local topic branch after verified managed worktree removal.
- [ ] **Actor:** Main Agent — **Action:** Perform final verification and record close-semantics evidence without equating merged with closed.

## Handoff / Gate Notes

- Selected profile: base-plan, explicitly selected by dispatcher on 2026-10-13.
- Source plan: plan/E015-manual-video-recording/E015-manual-video-recording.plan.md
- Shared lifecycle shell: .codex/skills/step-creator/templates/shared-lifecycle-shell.md
- Managed worktree intent: topic=E015-manual-video-recording; branch=feat/andrew/e015-manual-video-recording; managed-path-intent=/private/tmp/coami-e015-manual-video-recording; primary-worktree=false
- Progression truth inputs: analysis/E015-manual-video-recording/requirements.md, analysis/E015-manual-video-recording/technical-spec.md, plan/E015-manual-video-recording/E015-manual-video-recording.plan.md; review-log.md records independent planning/code verdicts.
- Completion evidence inputs: review-log.md, experiments/E015-manual-video-recording/evidence/validation.txt and recording-run.md; actual isolated worktree/branch attached at dev9155139. Creator pass complete; publication/merge/cleanup pending. Latest owner direction supplies STOP POINT 1 authorization. Release sentinels follow explicit source no-release declaration.
- STOP POINT 1 fixed shell is retained verbatim; the source plan records latest owner explicit commit/push/Draft PR authorization, so no repeated permission request is needed. Main Agent must record that authorization when updating the row.
- TC1–TC4 and physical TC5 belong to owner/Tester later. They are not creator Implementation Steps, may remain pending in a Draft PR, and cannot be treated as recording success. Live experiment state and code delivery state are separate.
- Formal independent Plan-Reviewer and bounded code Reviewer approved. Verdicts are recorded in review-log.md; actual live experiment remains unexecuted.
- Marker semantics: [X] exact one-to-one evidence; [ ] pending/planned/unproved; lowercase source [x] is pending and warns.
- Tracker semantics: check_all_succeeded covers rendered head/contextual/Implementation/tail checkboxes; check_impl_steps_succeeded covers only Implementation Steps.
- Owner-only updates: only the action owner may update after exact evidence; step-creator never updates an existing output.
- Retention default: remote-retained pending; policy/human follow-up required before deletion. Initial cleanup rows remain pending and no worktree removal is authorized.

## Draft handoff evidence

- Code commit: fab0dc2b1fd321b77b9e038cbe222b5159687b0f; pushed to origin/feat/andrew/e015-manual-video-recording.
- Draft PR: https://github.com/a129924/coami/pull/15 ; verified OPEN, isDraft=true, base dev, correct feature head. No human verdict yet.
- Owner review and live TC1–TC5 remain pending. Merge/release/cleanup rows remain pending; no approval or closure is inferred.
- PR Lens local graph/render validated against actual commit diff; Graphify used no-graph source fallback. Archify showcase passed but desktop visual containment failed (partial auxiliary delivery).
- Git warned lefthook was absent; no hook execution is claimed. Explicit E015 checks and independent review evidence are recorded separately.
