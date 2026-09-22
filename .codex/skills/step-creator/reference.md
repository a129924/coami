# Shared step-creator reference

This file has only shared rules. Upstream workflow, Git, release, Python, Agent
Skill, and tracker documents remain the authorities; profile-specific source
contracts live in the selected profile reference.

## Generation and eligibility

- Source is `plan/<topic>/<topic>.plan.md`; destination is the absent,
  create-only `plan/<topic>/<topic>.step.md`.
- The caller supplies exactly one supported profile. Never infer, fall back,
  content-sniff, repair a source, or update an existing output.
- Validate the complete source and all required branch truth before creation.
  Invalid paths, unreadable source, existing output, incompatible profile,
  contradictory truth, or an unresolved material branch is `BLOCKED` with no
  write. Only after preflight and full rendered-content validation pass may a
  same-directory temporary file be created. Validate that temporary file,
  recheck destination absence, then atomically rename/promote it without
  overwrite.
  On validation failure, interruption, promotion failure, or a destination race,
  remove the temporary file, preserve the final file if present, and never leave
  a partial final destination.
- Base/Agent source extraction and frozen wires are owned by their profile
  references. Python eligibility is canonical intent plus the 13-section
  `python-plan-authoring` contract only; its fixed contextual action is adapter
  behavior, not a new Python source-plan requirement.
- Freeze exactly one complete selector tuple: topic, governed topic-branch
  selector, managed-worktree path intent, and `primary-worktree=false`. Repeat
  every member in each fixed-head row, cleanup slot, and Handoff Note. A
  planned tuple is not evidence that the selected worktree exists.

## Evidence and tracker

- `[X]` requires exact one-to-one repo-visible evidence for its rendered
  action. `[ ]` means planned, pending, or unproved. The only exception is the
  Python profile wire: after an eligible source passes the canonical 13-section
  preflight, it renders the fixed `[X] plan-authoring` stage prescribed by
  `skills/python-plan-authoring/templates/step-template.md`. That marker is a
  template wire, not execution-completion evidence; the other five Python
  stages still require exact evidence. Generated artifacts may output only
  those two checkbox markers; textual placeholders in templates are never
  output markers.
- A source `[x]` is pending input, renders `[ ]`, and produces a warning.
  The tracker recognizes the one-character checkbox syntax matched by
  `^- \[(.)\](.*)`; every non-standard marker, including lowercase `[x]`, is
  treated as pending and warned.
  Partial evidence, a broad commit/status claim, unrelated artifact existence,
  or evidence that cannot map one-to-one is `BLOCKED`.
- Completion-evidence inputs name exact paths and/or exact command, PR, merge,
  release, tag, or worktree identifiers. Progression truth names the source plan
  and each source-declared progression/review/summary artifact actually used.
- Initial generation does not require a worktree and always leaves cleanup rows
  pending, even when cleanup identity, clean/release, approval, or removal truth
  is not yet available. `create-worktree` is `[X]` only when exact inventory
  proves the selected managed worktree and selected attached branch; a primary
  worktree never qualifies. Only after an existing tracker enters its
  update/cleanup execution do absent, conflicting, primary, dirty, detached,
  locked, or unknown selected-worktree states become `BLOCKED`.
- The tracker evaluates lines beginning with that checkbox syntax. Base/Agent
  `check_all_succeeded` covers head, contextual actions, Implementation Steps,
  and tail; Python additionally covers six Workflow Stages. Every profile's
  `check_impl_steps_succeeded` covers only `## Implementation Steps`.

## Lifecycle rendering

- Use `templates/shared-lifecycle-shell.md` as the sole non-authoritative fixed
  head/tail renderer. Fixed lifecycle work belongs to Main Agent; source-owned
  contextual work and human merge/resume evidence remain outside Implementation
  Steps. This creator never updates output after generation.
- Slot 12 renders exactly one remote outcome. Render the remote-delete action
  only when source-plan or retention-policy truth explicitly permits deletion.
  Render the `remote-retained` safety default when retention is explicitly
  required or when its source/policy truth is unknown; the unknown form must
  record required human/policy follow-up before any later deletion. Do not emit
  a generic resolve action and do not `BLOCK` on unknown retention alone.
  Contradictory explicit retention truth is `BLOCKED`.
- Slot 13 always resolves release. When source truth is terminal at merged,
  render exactly `[X] Determine release requirement — release not required`,
  then replace slots 14–21 with the one `release-not-applicable` sentinel. Do
  not leave a pending slot 13 in that branch. Unknown or contradictory release
  applicability is always `BLOCKED` before output; the initial-create cleanup
  exception does not apply to release selection.
- In the release-required branch, inventory actual authoritative version sources;
  an empty inventory uses `tag-only`, while multiple sources must agree and be
  synchronized. Slot 16 renders the README action or `README-not-required`.
  Release commit and push precede tag approval, tag creation, and tag push.
- Initial cleanup slots are pending and are not a creation-time blocker. During
  later update/cleanup execution, exact destructive approval precedes worktree
  removal; verified removal precedes local branch deletion; merged or released
  never proves final closure.
