---
topic: E003-robot-event-loop
step_profile: base-plan
source_plan: plan/E003-robot-event-loop/E003-robot-event-loop.plan.md
created: 2026-09-22
---

# E003-robot-event-loop — Step Tracking

## Workflow Stages

| Current status | Allowed next transitions | Next actor |
| --- | --- | --- |
| approved | approved → publish-in-progress | Main Agent |

## Actionable Steps

### Main Agent — Fixed Head

- [X] **Actor:** Main Agent — **Action:** create-worktree — **Selector:** topic=E003-robot-event-loop; branch=feat/andrew/e003-robot-event-loop; managed-path-intent=/Users/andrew/code/python/coami-e003-robot-event-loop; primary-worktree=false
- [X] **Actor:** Main Agent — **Action:** prepare-topic-branch — **Selector:** topic=E003-robot-event-loop; branch=feat/andrew/e003-robot-event-loop; managed-path-intent=/Users/andrew/code/python/coami-e003-robot-event-loop; primary-worktree=false

### Contextual Actions

- [X] **Actor:** Reviewer — **Action:** Review E003 implementation and Stage 1/2 evidence before publish routing.

## Implementation Steps

- [X] 1. Create Stage 1 MOD and simulator web bridge so one A press produces and displays the exact Context-derived event trace without Server traffic or greet.
- [X] 2. Record Stage 1 setup, same-run Host.Button A, MOD trace, browser receipt, release behavior, and independent Reviewer-confirmed PASS in E003 evidence and EXPERIMENT.md; stop on documented blocker.
- [X] 3. Only after Stage 1 PASS, add the E003 event/command/result protocol, fixed-rule Server, C greet/B stop, and browser session.
- [X] 4. Verify Stage 2 ID correlation, duplicate, busy, result, disconnect, delivery failure, TS/Python checks, and visible screenshot; record Creator/Tester evidence for independent Reviewer decision.

## Main Agent Actionable Steps — Fixed Tail

- [X] **Actor:** Main Agent — **Action:** Validate the approved Written set and perform bounded staging only.
- [ ] **Actor:** Main Agent — **Action:** Obtain explicit human approval at STOP POINT 1 before commit, push, or PR creation.
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
- [ ] **Actor:** Main Agent — **Action:** Inspect the selected managed topic worktree and prove clean/release evidence — **Selector:** topic=E003-robot-event-loop; branch=feat/andrew/e003-robot-event-loop; managed-path-intent=/Users/andrew/code/python/coami-e003-robot-event-loop; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Obtain exact destructive approval to remove the selected managed topic worktree — **Selector:** topic=E003-robot-event-loop; branch=feat/andrew/e003-robot-event-loop; managed-path-intent=/Users/andrew/code/python/coami-e003-robot-event-loop; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Remove the selected managed topic worktree and verify removal — **Selector:** topic=E003-robot-event-loop; branch=feat/andrew/e003-robot-event-loop; managed-path-intent=/Users/andrew/code/python/coami-e003-robot-event-loop; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Delete the local topic branch after verified managed worktree removal.
- [ ] **Actor:** Main Agent — **Action:** Perform final verification and record close-semantics evidence without equating merged with closed.

## Handoff / Gate Notes

- Selected profile: base-plan
- Source plan: `plan/E003-robot-event-loop/E003-robot-event-loop.plan.md`
- Shared lifecycle shell: `.codex/skills/step-creator/templates/shared-lifecycle-shell.md`
- Managed worktree intent: topic=E003-robot-event-loop; branch=feat/andrew/e003-robot-event-loop; managed-path-intent=/Users/andrew/code/python/coami-e003-robot-event-loop; primary-worktree=false
- Progression truth inputs: `plan/E003-robot-event-loop/E003-robot-event-loop.plan.md`, `analysis/E003-robot-event-loop/requirements.md`, `analysis/E003-robot-event-loop/technical-spec.md`, `experiments/E003-robot-event-loop/EXPERIMENT.md`
- Completion evidence inputs: `git worktree list --porcelain` showing the selected path and attached branch; `experiments/E003-robot-event-loop/evidence/phase-1-event-bridge.md`; `experiments/E003-robot-event-loop/evidence/phase-2-full-loop.md`; independent review verdicts.
- Marker semantics: `[X]` exact one-to-one evidence; `[ ]` pending/planned/unproved; lowercase source `[x]` is pending and warns.
- Tracker semantics: `check_all_succeeded` covers rendered head/contextual/Implementation/tail checkboxes; `check_impl_steps_succeeded` covers only Implementation Steps.
- Owner-only updates: only the action owner may update after exact evidence; step-creator never updates an existing output.
- Stage 2 is conditional on Stage 1 PASS and independent Reviewer confirmation. STOP POINT 1 includes AGENTS.md commit-message confirmation. Remote branch retention is unknown and defaults to retained.
