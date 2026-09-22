---
name: step-creator
description: "Create a topic step artifact from an eligible plan and an explicitly selected workflow profile."
complexity: high
risk_profile:
  - ambiguity_sensitive
  - multi_agent_handoff
  - code_modification
inputs:
  - topic name
  - explicit profile: base-plan, agent-skill-plan, or python-implementation-plan
  - readable source plan at plan/<topic>/<topic>.plan.md
  - repo-visible progression and completion evidence when markers are not pending
outputs:
  - one newly created plan/<topic>/<topic>.step.md
use_when:
  - a caller needs a new step tracker for an eligible topic plan
  - the profile is explicitly selected and the destination does not exist
do_not_use_when:
  - a step file already exists or needs repair, merging, or marker updates
  - the caller wants profile inference, plan rewriting, or lifecycle execution
---

# Purpose

Create exactly one new `plan/<topic>/<topic>.step.md` from an eligible source
plan. The skill selects only the caller-specified profile, preserves dynamic
source truth, and adds the shared fixed lifecycle shell. It generates a
tracking artifact; it never executes its actions.

# Trigger / When to use

Use this skill when:

- a caller explicitly supplies `topic` and exactly one supported profile;
- `plan/<topic>/<topic>.plan.md` is ready to be rendered as a new tracker; and
- the matching `.step.md` destination does not exist.

Do not use this skill when:

- the caller wants to create, prepare, remove, commit, push, merge, tag, or
  otherwise execute lifecycle work;
- an existing `.step.md` needs updating, repair, normalization, or merge;
- the profile is absent, inferred from content, or outside the three supported
  values; or
- source truth, evidence, or a required conditional branch is ambiguous.

# Inputs

- `topic`: a path-safe topic token resolving to
  `plan/<topic>/<topic>.plan.md` and `plan/<topic>/<topic>.step.md`.
- `profile`: exactly one of `base-plan`, `agent-skill-plan`, or
  `python-implementation-plan`; this is caller input, never inferred.
- Source plan and the repo-visible authority named by the selected profile.
- Exact repo-visible progression/completion evidence only when a rendered
  checkbox can truthfully be `[X]`.

# Process

1. Resolve the fixed source and destination paths. If the source is missing or
   unreadable, the topic is unsafe, or the destination already exists, return
   `BLOCKED` before writing. Do not overwrite, merge, normalize, repair,
   truncate, or create a temporary destination.
2. Confirm the caller selected exactly one supported profile. Read the shared
   rules in `reference.md`, then read the selected profile reference. Do not
   fall back or content-sniff a different profile.
3. Run the selected profile's eligibility preflight. For Base/Agent, extract
   exact source status, allowed transitions, next actor, stage-local action,
   top-level Implementation Steps, declared paths, and source-declared
   lifecycle truth. For Python, validate only Python intent and the canonical
   13-section contract, then extract top-level Implementation Steps and
   lifecycle truth; never require Base/Agent status, actor, or action fields.
   Any profile-required missing, duplicate, contradictory, nested-only, or
   incompatible input is `BLOCKED`.
4. Freeze one complete selector tuple: topic, governed topic-branch selector,
   managed-worktree path intent, and `primary-worktree=false`. Carry every
   member unchanged into each fixed-head row, tail cleanup action, and Handoff
   / Gate Note. A planned tuple is not evidence that a worktree exists.
   Competing tuples are `BLOCKED`.
5. Render the selected frozen output wire. Render the fixed head, then the
   contextual middle, then a one-to-one verbatim Implementation Step mirror,
   then the fixed tail from `templates/shared-lifecycle-shell.md`. Base/Agent
   contextual actions are source-faithful; Python renders the fixed
   adapter-owned action `**Actor:** Creator — **Action:** Complete source ## Implementation Steps in order.` Do not place reviewer, human, release, Main
   Agent, or lifecycle actions inside Implementation Steps.
6. Resolve markers from evidence as specified in `reference.md`. A generated
   checkbox is always exactly `[X]` or `[ ]`: `[X]` normally requires exact
   one-to-one repo-visible completion evidence, while planned or unproved work
   is `[ ]`. The sole profile-wire exception is an eligible canonical Python
   source: after its 13-section preflight succeeds, render the fixed
   `[X] plan-authoring` stage from
   `skills/python-plan-authoring/templates/step-template.md`. That stage is not
   execution-completion evidence; all other Python stages remain evidence-only.
   Never emit a template placeholder as a marker. The tracker parses the
   one-character checkbox form matched by `^- \[(.)\](.*)`; lowercase `[x]`
   and every other non-standard marker are treated as pending and warned.
7. Resolve the conditional lifecycle branch. Slot 12 renders the delete action
   only when source-plan or retention-policy truth explicitly permits deletion.
   Explicit retention *or unknown retention truth* renders the
   `remote-retained` safety default, with required human/policy follow-up before
   any later deletion; unknown retention alone is not `BLOCKED`. Contradictory
   explicit retention truth is `BLOCKED`. Unknown or contradictory release
   applicability is always `BLOCKED`; do not choose a required-release or
   no-release branch. Unknown or contradictory version, README, or tag truth
   is `BLOCKED` when it is required to render the selected release branch.
   The initial-creation exception applies only to cleanup: initial creation
   keeps cleanup rows pending without requiring cleanup truth. Slot 13 always
   resolves release, and omitted release slots must not leave phantom
   checkboxes.
8. Validate section order, profile-specific wire, source fidelity, marker form,
   selector repetition, rendered tracker scope, and exact destination path.
   Only after all preflight and rendered-content validation pass, create a
   temporary file in the final `.step.md` directory, validate the complete
   temporary content, recheck that the final destination is absent, and perform
   atomic no-overwrite rename/promotion. On validation failure, interruption,
   promotion failure, or a destination race, clean up the temporary file,
   preserve any final artifact, and never leave a partial final file.
9. Stop at `review-ready`. Report the generated path, profile, evidence inputs,
   warnings, and a reviewer handoff. Never self-approve or update an existing
   artifact.

# Examples

- Positive: the caller selects `agent-skill-plan`; one source plan declares one
  bounded skill under `skills/example-skill/`, a Creator-to-independent-Reviewer
  handoff at `review-ready`, and a missing destination. Generate the Agent wire
  with source wording preserved and a pending fixed head/tail.
- Positive: the caller selects `python-implementation-plan`; the source has
  bounded Python intent and the canonical 13 sections but no status, next
  actor, or stage-local action. Generate the Python wire with its fixed
  adapter-owned contextual action; do not impose a second source-plan schema.
- Negative: a caller says "make the right tracker" for a Python-shaped source.
  Do not infer `python-implementation-plan`; return `BLOCKED` and request the
  explicit supported profile.

# Outputs

- A newly created `plan/<topic>/<topic>.step.md` matching exactly one selected
  profile and the shared shell.
- A concise `BLOCKED` result with the exact unresolved field or condition and
  no write when safe rendering is impossible.
- A `review-ready` handoff, not an `approved`, `stable`, or execution result.

# Validation

## Required Checks

- Caller profile is explicit, singular, and supported; source and destination
  are exact topic paths.
- Destination is absent before creation and remains untouched on every blocked
  path.
- Selected profile eligibility and frozen wire pass without inference or repair.
- Every rendered checkbox is uppercase `[X]` or `[ ]`; only exact evidence may
  produce `[X]`, except the eligible Python profile's template-defined fixed
  `[X] plan-authoring` stage after its canonical preflight succeeds.
- Source Implementation Steps are top-level, verbatim, one-to-one, and ordered.
- The shared shell supplies the only fixed head/tail; conditional substitutions
  obey the slot contract and tracker scope remains truthful.
- Only the destination is written; source plans, authorities, README, VERSION,
  existing skills, and platform projections remain unchanged.

## Quality Checks (best effort)

- Include exact progression/evidence paths or identifiers in Handoff / Gate
  Notes, rather than chat memory or vague claims.
- Explain any lowercase `[x]` warning and any preserved conditional sentinel.
- Keep Base/Agent contextual actions minimal while preserving source actor/action
  wording and order; keep Python's one contextual action literal and
  adapter-owned.

## On Soft Fail

- Mark the result `INCOMPLETE` only for a recoverable presentation limitation.
- List the limitation and preserve every verified rule.
- Do not turn an ambiguous field that changes profile, output, markers, or
  lifecycle rendering into a soft failure; that condition is `BLOCKED`.

# Failure Handling

## Missing Context

- `BLOCKED`: missing topic, profile, source plan, profile-required source field,
  or needed evidence. Name the missing input; do not manufacture it.

## Ambiguous Requirement

- `BLOCKED`: competing profile, selector, source steps, conditional branch, or
  completion evidence; also block on competing Base/Agent-required status,
  transition, or actor/action fields. Do not choose a plausible interpretation.

## Execution Limitation

- If atomic creation or required read-only inspection cannot be performed,
  return `INCOMPLETE` with the limiting path or tool. Do not create partial
  output or claim a marker without evidence.

# Workflow State Contract

When participating in a multi-agent handoff, include:

```yaml
current_step: preflight | render | validate
next_step: review-ready | BLOCKED
status: IN_PROGRESS | COMPLETE | INCOMPLETE | BLOCKED
```

# Verification

- Use `check_all_succeeded` only as a rendered-checkbox query, not as external
  evidence validation. Base/Agent whole-file scope is head, contextual,
  Implementation Steps, and tail; Python additionally includes six stages.
- Use `check_impl_steps_succeeded` only for `## Implementation Steps`.
- Confirm no replacement slot is represented by an omitted pending checkbox.

# Red Flags

- Treating a primary worktree as the selected managed topic worktree.
- Treating `closed`, approval, planned state, `[x]`, or a commit alone as exact
  completion evidence.
- Generating a profile from source intent without explicit caller selection.
- Copying fixed lifecycle actions into creator-owned Implementation Steps.
- Treating `merged` or `released` as final close evidence.

# Common Rationalizations

- "The destination only needs a small repair." Existing output is still blocked.
- "This Python plan obviously selects the Python profile." Caller selection is
  still required.
- "The worktree path is known, so it must exist." A selector is not evidence.
- "No release probably means no tail action." Render the required
  `release-not-applicable` sentinel only when exact evidence permits it.

# Boundaries

- Do not execute lifecycle actions, modify a source plan, update a tracker, or
  perform Git, PR, merge, release, tag, or worktree operations.
- Do not create a fourth profile, infer profiles, or redefine upstream workflow,
  worktree, release, Python, Agent Skill, or tracker authority.
- Do not write `.github/**`, `.codex/**`, another projection, README, VERSION,
  or any path outside the single output destination during normal invocation.
- Do not claim approval or stable-library promotion.

# Local references

- `reference.md`: three shared topics only: generation/eligibility,
  evidence/tracker, and lifecycle rendering.
- `templates/shared-lifecycle-shell.md`: non-authoritative fixed head/tail renderer.
- `references/base-plan-profile.md`: Base eligibility and exact output wire.
- `references/agent-skill-plan-profile.md`: Agent Skill eligibility and exact wire.
- `references/python-plan-authoring-adapter.md`: Python eligibility and scaffold adapter.
- `examples.md`: valid and blocked profile/branch scenarios.
- `checklist.md`: repeatable preflight and output validation.
