# Examples

## Valid Base generation

Caller input:

```text
topic=cache-policy
profile=base-plan
```

The source has canonical topic sections, exactly one `planned` status, valid
`creator-in-progress` transition, one Creator action, and a top-level ordered
Implementation Steps list. Destination is missing. Render the Base wire with
pending lifecycle actions; do not require an existing managed worktree merely
to create the tracker.

## Valid Agent Skill generation

Caller selects `agent-skill-plan`. The source declares one bounded
`skills/cache-policy-helper/` skill, Creator artifacts, an independent Reviewer,
and a `review-ready` handoff. Preserve the source Creator action in Contextual
Actions. Do not place reviewer approval or fixed lifecycle actions in
Implementation Steps.

## Valid Python generation without a literal profile marker

Caller explicitly selects `python-implementation-plan`. The source is a bounded
Python change with all 13 canonical sections, an explicit async exemption, five
test categories, Validation Commands, and top-level Implementation Steps. It
does not contain the text `python-implementation-plan`, a status, a next actor,
or a stage-local action. This is eligible: retain the exact Python frontmatter,
executor note, six workflow stages, fixed adapter-owned Creator contextual
action `**Actor:** Creator — **Action:** Complete source ## Implementation Steps in order.`, one-to-one Implementation mapping, and shared shell. Render
`- [X] plan-authoring` exactly as the canonical Python step template wires it;
the other five stages remain `[ ]` until exact completion evidence exists.

## Existing output blocks

If `plan/cache-policy/cache-policy.step.md` already exists, return:

```text
BLOCKED: output already exists at plan/cache-policy/cache-policy.step.md
```

Do not patch, normalize `[x]`, merge, overwrite, or create a second output.

After preflight and complete render validation succeed, write the candidate only
to a temporary file beside the final `.step.md`, validate it, recheck that the
final path is still absent, and atomically rename/promote without overwrite. If
validation, promotion, or the process fails—or the final path appears—remove the
temporary file and preserve the final path without a partial artifact.

## Invalid profile and extraction blockers

- Profile omitted or `auto`: `BLOCKED`; request one supported caller value.
- Base/Agent source with two current statuses, missing next actor, nested-only
  Implementation Steps, or a stage action that cannot be extracted exactly:
  `BLOCKED`.
- Agent source naming two skills or only `.github/skills/...` outputs:
  `BLOCKED`.
- Python source with non-Python intent or incomplete Decisions/Test/Validation
  contract: `BLOCKED`; do not create output or render the fixed Python
  `plan-authoring` marker.

## Marker and worktree evidence

A source `[x]` becomes `[ ]` in generated output and produces a warning. A
commit message or planned worktree path is not completion proof. Initial
generation with no topic worktree keeps fixed head and cleanup slots pending;
missing cleanup identity, clean/release, approval, or removal evidence does not
block that initial create. Only a later update/cleanup attempt claiming or
executing those rows must show exact managed worktree plus attached branch
evidence; a primary worktree, conflict, or ambiguity then blocks.

## Conditional tail examples

- When retention policy requires a remote branch, render only
  `remote-retained`; never additionally render remote delete.
- When neither the source plan nor retention policy states whether to retain the
  remote topic branch, render pending `remote-retained` and record required
  human/policy follow-up before any deletion; do not render a generic resolve
  action or return `BLOCKED` for unknown retention alone. If the two authorities
  explicitly conflict, return `BLOCKED` and report both exact evidence sources.
- When source truth declares terminal at merged, slot 13 is exactly `[X]
  Determine release requirement — release not required`; replace slots 14–21
  with the sole `release-not-applicable` sentinel. Do not also render a pending
  release-resolution checkbox.
- When release is required and no authoritative version source exists, slot 15
  is `tag-only`; when README is not needed, slot 16 is
  `README-not-required`. Multiple disagreeing version sources block.
- Missing or contradictory release applicability always blocks output before a
  release branch is selected. Missing tag approval, destructive removal
  approval, or selected-worktree identity is not a harmless pending branch when
  rendering a claimed completion: block rather than invent evidence. The
  initial-create exception applies only to cleanup rows, not release selection.

## Tracker split

For an eligible Python output, `plan-authoring` is the fixed `[X]` stage from
the canonical template, while the other five Workflow Stages may include one
pending stage even when every Implementation Step is `[X]`.
`check_all_succeeded` is false;
`check_impl_steps_succeeded` is true. For Base/Agent, whole-file scope includes
rendered head, contextual, Implementation, and tail checkboxes.
