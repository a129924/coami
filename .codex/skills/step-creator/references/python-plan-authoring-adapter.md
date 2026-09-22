# `python-implementation-plan` adapter

`python-plan-authoring` remains the authority for Python plan shape. This
adapter adds no competing Python schema.

## Eligibility preflight

- The caller explicitly selects `python-implementation-plan`; the source need
  not contain that literal profile name.
- The source explicitly describes bounded Python implementation work and
  satisfies the canonical 13 top-level sections in order.
- Its Decisions include reviewable async-planning status plus required triggered
  subsections where applicable; it has one top-level Implementation Steps,
  five Test Plan categories, and explicit Validation Commands/config reference.
- Do not extract or require a current status, allowed transitions, next actor,
  or stage-local action. Those are Base/Agent-only source-plan fields.
- Reject non-Python intent, missing/incomplete/ambiguous/contradictory canonical
  contract, existing output, or caller/source incompatibility as `BLOCKED`.

This is a profile adapter, not a competing Python source-plan contract:
`python-plan-authoring` remains the sole authority for the canonical source
shape and its execution intent.

## Frozen output wire

Retain exact canonical Python frontmatter, executor note, and six stages in
order. Insert the shared fixed head and contextual section before Implementation
Steps; insert the shared tail after it.

```markdown
---
topic: <topic>
phase: plan-authoring
created: YYYY-MM-DD
---

# <topic> — Step Tracking

> **Executor**: Mark each step `[X]` when complete.
> All Implementation Steps must be `[X]` before submitting for `python-implementation-review`.
> Update this file at: `plan/<topic>/<topic>.step.md`

## Workflow Stages

- [X] plan-authoring
- <resolved-checkbox> plan-review
- <resolved-checkbox> tdd-test-authoring
- <resolved-checkbox> implementation
- <resolved-checkbox> implementation-review
- <resolved-checkbox> code-review

## Actionable Steps

### Main Agent — Fixed Head

<rendered shared fixed head>

### Contextual Actions

- <resolved-checkbox> **Actor:** Creator — **Action:** Complete source ## Implementation Steps in order.

## Implementation Steps

- <resolved-checkbox> 1. <source Implementation Step 1, verbatim>

## Main Agent Actionable Steps — Fixed Tail

<rendered shared fixed tail>

## Handoff / Gate Notes

- Selected profile: python-implementation-plan
- Source plan: plan/<topic>/<topic>.plan.md
- Shared lifecycle shell: skills/step-creator/templates/shared-lifecycle-shell.md
- Managed worktree intent: topic=<topic>; branch=<selector>; managed-path-intent=<intent>; primary-worktree=false
- Progression truth inputs: <exact paths>
- Completion evidence inputs: <exact paths/identifiers>
- Marker semantics: `[X]` exact one-to-one evidence except the eligible
  canonical-template-defined fixed `plan-authoring` stage; `[ ]`
  pending/planned/unproved; lowercase source `[x]` is pending and warns.
- Tracker semantics: `check_all_succeeded` covers six stages plus rendered head/contextual/Implementation/tail; `check_impl_steps_succeeded` covers only Implementation Steps.
- Owner-only updates: only the action owner may update after exact evidence; step-creator never updates an existing output.
```

The frozen profile wire owns the `### Main Agent — Fixed Head` heading; the
shared shell supplies its two rows only. After the canonical 13-section
eligibility preflight succeeds, render the literal `[X] plan-authoring` stage
exactly as wired by `skills/python-plan-authoring/templates/step-template.md`.
It is a fixed template marker, not execution-completion evidence. Render actual
`[X]` or `[ ]` from exact evidence in place of every remaining
`<resolved-checkbox>` placeholder; no other marker is literal output. An
ineligible, incomplete, or ambiguous Python source is `BLOCKED` before any
output, including the fixed stage marker.
Every selector-bearing shared-shell row must carry the complete frozen tuple,
including `primary-worktree=false`, exactly as Handoff / Gate Notes does.
Exact stage evidence controls each actual marker. Pending stage blocks whole-file
success even if all Implementation Steps are done; it does not block the
implementation-only query. The contextual line is fixed profile-owned adapter
behavior: it has its own evidence marker, is not extracted from source
actor/action text, and does not use Base/Agent collective dedup rules.
