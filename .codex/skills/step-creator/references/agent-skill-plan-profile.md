# `agent-skill-plan` profile

## Eligibility preflight

The source must satisfy every shared Base progression requirement and also:

- declare exactly one bounded Agent Skill name and one responsibility;
- declare Creator outputs only at canonical exact paths under
  `skills/<skill-name>/...`, never projection-only paths;
- separate Creator from an independent Reviewer; and
- hand off at `review-ready`, never claim creator-owned `approved`.

Generic or multiple-skill intent, projection-only paths, ambiguous ownership,
Creator/Reviewer collapse, review-ready/approved mismatch, or any source/profile
incompatibility is `BLOCKED`.

## Frozen output wire

The wire is byte-for-byte structurally identical to `base-plan` except its
frontmatter and selected-profile note use `agent-skill-plan`:

```markdown
---
topic: <topic>
step_profile: agent-skill-plan
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

- Selected profile: agent-skill-plan
- Source plan: plan/<topic>/<topic>.plan.md
- Shared lifecycle shell: skills/step-creator/templates/shared-lifecycle-shell.md
- Managed worktree intent: topic=<topic>; branch=<selector>; managed-path-intent=<intent>; primary-worktree=false
- Progression truth inputs: <exact paths>
- Completion evidence inputs: <exact paths/identifiers>
- Marker semantics: `[X]` exact one-to-one evidence; `[ ]` pending/planned/unproved; lowercase source `[x]` is pending and warns.
- Tracker semantics: `check_all_succeeded` covers rendered head/contextual/Implementation/tail checkboxes; `check_impl_steps_succeeded` covers only Implementation Steps.
- Owner-only updates: only the action owner may update after exact evidence; step-creator never updates an existing output.
```

The plan's Creator actions remain contextual; independent review, publishing,
human handoff, and lifecycle work remain outside Implementation Steps. Preserve
one-to-one Implementation mapping and only exact collective contextual dedup.
The frozen profile wire owns the `### Main Agent — Fixed Head` heading; the
shared shell supplies its two rows only. Render actual `[X]` or `[ ]` in place
of every `<resolved-checkbox>` placeholder; no other marker is literal output.
Every selector-bearing shared-shell row must carry the complete frozen tuple,
including `primary-worktree=false`, exactly as Handoff / Gate Notes does.
