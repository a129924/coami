# step-creator checklist

## Preflight

- [ ] Caller supplied one path-safe topic and exactly one supported profile.
- [ ] Source is exactly `plan/<topic>/<topic>.plan.md` and readable.
- [ ] Destination is exactly `plan/<topic>/<topic>.step.md` and absent.
- [ ] No temporary file exists before a preflight BLOCKED result. After all
  preflight and rendered-content validation pass, any temporary file is in the
  final `.step.md` directory; it is fully validated, atomically renamed/promoted
  without overwrite only while destination remains absent, and removed on validation
  failure, interruption, promotion failure, or a destination race.
- [ ] Selected profile reference was used; no inference/fallback occurred.
- [ ] Base/Agent eligibility has unique compatible status, transition, next
  actor/action, top-level Implementation Steps, selector tuple, and required
  conditional truth; Python has canonical intent/13-section eligibility without
  requiring Base/Agent status/actor/action fields.

## Fidelity and markers

- [ ] Base/Agent frontmatter has exactly topic, step_profile, source_plan,
  created in that order; Python has exactly topic, phase, created.
- [ ] Base/Agent table and Python executor note/six stages use frozen order.
- [ ] Base/Agent contextual actions preserve exact Actor/Action wording and
  order; Python renders only its fixed adapter-owned Creator action.
- [ ] Python's contextual action is exactly `**Actor:** Creator — **Action:** Complete source ## Implementation Steps in order.` with its evidence marker; it is not source actor/action extraction.
- [ ] Only Base/Agent explicit collective/shared exact duplicates were
  deduplicated; Python does not source-extract or deduplicate its fixed action.
- [ ] Every top-level source Implementation Step maps once, verbatim, and in
  order; no lifecycle/reviewer/human action appears there.
- [ ] Every generated marker is `[X]` or `[ ]`; source `[x]` is pending and
  warned; every other non-standard marker is also pending/warned by the
  tracker; every `[X]` has exact one-to-one repo-visible evidence except an
  eligible Python source's fixed template-defined `[X] plan-authoring` stage.
- [ ] A Python source receives fixed `[X] plan-authoring` only after its
  canonical 13-section eligibility preflight succeeds; its other five stages
  remain evidence-only, and every ineligible, incomplete, or ambiguous Python
  source is `BLOCKED` without rendered output or this marker.

## Lifecycle and conditionals

- [ ] The complete selector tuple, including `primary-worktree=false`, repeats
  unchanged in every fixed-head row, tail slots 22–24, and Handoff.
- [ ] Initial no-worktree generation stays valid with pending lifecycle and
  cleanup actions; missing cleanup truth is not a creation-time `BLOCKED`. A
  primary worktree is never accepted as managed evidence during later updates.
- [ ] Fixed order preserves STOP POINT 1 before commit/push/PR and STOP POINT 2
  before human merge follow-up.
- [ ] Slot 12 has exactly one remote outcome and exact source-plan or
  retention-policy evidence: render delete only when it explicitly permits
  deletion; render `remote-retained` when retention is required or unknown,
  recording human/policy follow-up before later deletion; only contradictory
  explicit retention truth is `BLOCKED`. Slot 13 is always rendered.
- [ ] Exact no-release truth renders slot 13 as `[X] Determine release
  requirement — release not required`, then replaces slots 14–21 with only the
  exact sentinel; it never leaves a pending release-resolution checkbox.
- [ ] Unknown or contradictory release applicability is `BLOCKED` before
  output; do not apply the initial-create cleanup exception to release
  selection.
- [ ] Release branch preserves version inventory, synchronization/tag-only,
  README outcome, release commit/push, approval, tag, and push order.
- [ ] Only later update/cleanup execution blocks on missing or conflicting
  cleanup identity, clean/release evidence, destructive approval, or removal
  evidence; initial cleanup rows remain pending. Cleanup retains
  removal-before-local-deletion and final close evidence.

## Output and handoff

- [ ] Handoff notes include profile, source, shared shell, selector, progression
  truth, completion evidence, marker/tracker semantics, and owner-only updates.
- [ ] Base/Agent all-gate is head/context/Implementation/tail; Python adds six
  stages; implementation-only scope is only `## Implementation Steps`.
- [ ] Replaced slots leave no phantom pending checkboxes.
- [ ] Only the new destination is written; source, existing skills, README,
  VERSION, ReadOnly authorities, and projections have no diff.
- [ ] Result is `review-ready`, not self-approved; send to independent
  `agent-skill-reviewer`.
