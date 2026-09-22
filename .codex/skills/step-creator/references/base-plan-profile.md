# `base-plan` profile

## Eligibility preflight

Accept only a source plan that:

- has every canonical topic-plan section required by `plan/topic-plan-contract.md`;
- makes no specialized Agent Skill or Python implementation claim;
- declares exactly one unambiguous current status, explicit allowed transition(s)
  valid in `plan/agent-handoff-workflow.md`, one exact next actor, and one exact
  stage-local action consistent with that state;
- has exactly one top-level `## Implementation Steps` section with executable
  ordered items; and
- has no conflicting selector, completion, release, or source extraction truth.

Missing, ambiguous, duplicated, contradictory, nested-only, or specialized
inputs are `BLOCKED`. This profile does not repair source wording.

## Frozen output wire

```markdown
---
topic: <topic>
step_profile: base-plan
source_plan: plan/<topic>/<topic>.plan.md
created: YYYY-MM-DD
---

# <topic> — Step Tracking

## Workflow Stages

| Current status | Allowed next transitions | Next actor |
| --- | --- | --- |
| <exact source-plan status> | <exact canonical allowed transition(s)> | <exact source-plan next actor> |

## Actionable Steps

### Main Agent — Fixed Head

<rendered shared fixed head>

### Contextual Actions

- <resolved-checkbox> **Actor:** <source actor> — **Action:** <preserved stage-local action>

## Implementation Steps

- <resolved-checkbox> 1. <source Implementation Step 1, verbatim>

## Main Agent Actionable Steps — Fixed Tail

<rendered shared fixed tail>

## Handoff / Gate Notes

- Selected profile: base-plan
- Source plan: plan/<topic>/<topic>.plan.md
- Shared lifecycle shell: skills/step-creator/templates/shared-lifecycle-shell.md
- Managed worktree intent: topic=<topic>; branch=<selector>; managed-path-intent=<intent>; primary-worktree=false
- Progression truth inputs: <exact paths>
- Completion evidence inputs: <exact paths/identifiers>
- Marker semantics: `[X]` exact one-to-one evidence; `[ ]` pending/planned/unproved; lowercase source `[x]` is pending and warns.
- Tracker semantics: `check_all_succeeded` covers rendered head/contextual/Implementation/tail checkboxes; `check_impl_steps_succeeded` covers only Implementation Steps.
- Owner-only updates: only the action owner may update after exact evidence; step-creator never updates an existing output.
```

The frozen profile wire owns the `### Main Agent — Fixed Head` heading; the
shared shell supplies its two rows only. Render actual `[X]` or `[ ]` in place
of every `<resolved-checkbox>` placeholder; no other marker is literal output.
Every selector-bearing shared-shell row must carry the complete frozen tuple,
including `primary-worktree=false`, exactly as Handoff / Gate Notes does.
Preserve contextual source wording and order. Follow the shared reference for
exact collective dedup and one-to-one mapping.
