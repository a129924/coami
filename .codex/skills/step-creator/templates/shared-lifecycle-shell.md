# Shared lifecycle shell

This is the sole non-authoritative fixed lifecycle renderer for all profiles.
Resolve this shell's `<resolved-checkbox>` values to `[X]` only with exact
evidence; otherwise resolve them to `[ ]`. It is a textual template placeholder,
never a generated marker. The Python profile's fixed `[X] plan-authoring` stage
is owned by its canonical profile wire after Python eligibility succeeds, not by
this lifecycle shell. Generated artifacts may output only `[X]` or `[ ]`; the
tracker treats lowercase `[x]` and every other non-standard marker as pending
and warns.

## Selector inputs

Freeze and repeat one selector tuple:

```text
topic=<topic>; branch=<governed topic-branch selector>; managed-path-intent=<worktree-manager path intent>; primary-worktree=false
```

Every selector-bearing row renders this complete tuple, including
`primary-worktree=false`; no row may abbreviate or omit one member. It is a
planned selector, not a claim that the worktree exists. Initial generation may
render the worktree actions pending.

## Fixed head

The profile frozen wire is the sole owner of the `### Main Agent — Fixed Head`
heading. This shell contributes only the two rendered rows below, so composing
the profile wire with this shell never produces a duplicate heading.

```markdown
- <resolved-checkbox> **Actor:** Main Agent — **Action:** create-worktree — **Selector:** <complete selector tuple>
- <resolved-checkbox> **Actor:** Main Agent — **Action:** prepare-topic-branch — **Selector:** <complete selector tuple>
```

`create-worktree` is complete only when exact inventory proves the selected
managed worktree and attached branch. The primary worktree is never a target.

## Fixed tail

Render after `## Implementation Steps` under
`## Main Agent Actionable Steps — Fixed Tail` in exactly this order:

```markdown
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Validate the approved Written set and perform bounded staging only.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Obtain explicit human approval at STOP POINT 1 before commit, push, or PR creation.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Commit the approved bounded changes.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Push the topic branch.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Open the pull request.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Review and observe the pull request and route actionable feedback.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Hand off for human merge at STOP POINT 2 and completely stop.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Record exact human merge evidence after a new execution begins.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Require a new explicit human resume before post-merge work.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Verify the pull request is merged.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Fast-forward-only sync the target/default branch.
<slot-12 remote resolution>
<slot-13 release resolution>
<release branch: slots 14–21 or one release-not-applicable sentinel>
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Inspect the selected managed topic worktree and prove clean/release evidence — **Selector:** <complete selector tuple>
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Obtain exact destructive approval to remove the selected managed topic worktree — **Selector:** <complete selector tuple>
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Remove the selected managed topic worktree and verify removal — **Selector:** <complete selector tuple>
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Delete the local topic branch after verified managed worktree removal.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Perform final verification and record close-semantics evidence without equating merged with closed.
```

## Conditional renderings

Slot 12 is exactly one of:

```markdown
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Delete the remote topic branch when source plan or retention policy explicitly permits deletion.
```

or:

```markdown
- <resolved-checkbox> remote-retained — preserve the remote branch; retention is required or unknown, and human/policy follow-up is required before deletion
```

When release is required, render slots 14–21 in order:

```markdown
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Discover current authoritative version sources.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Synchronize discovered authoritative version sources.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Update README when stable-skill, public-contract, or index change requires it.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Commit release changes.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Push release changes.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Obtain exact human approval for annotated tag creation and tag push.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Create the annotated git tag.
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Push the git tag.
```

For this branch, slot 13 is:

```markdown
- <resolved-checkbox> **Actor:** Main Agent — **Action:** Resolve whether release work is required from the source plan.
```

Replace slot 15 with the exact tag-only line when the authoritative inventory is
empty:

```markdown
- [X] tag-only — no authoritative version source discovered
```

Replace slot 16 with the exact README sentinel when evidence permits:

```markdown
- [X] README-not-required — stable-library metadata or explicit non-stable/no-README declaration requires no README change
```

When exact source truth declares terminal at merged, slot 13 is:

```markdown
- [X] Determine release requirement — release not required
```

Then omit slots 14–21 and render only:

```markdown
- [X] release-not-applicable — source plan declares terminal at merged
```

Unknown or contradictory release applicability is `BLOCKED` before output; do
not render either release branch. This is not an initial-create cleanup
exception. STOP POINT 1 precedes commit, push, and PR; STOP POINT 2 stops
before merge follow-up; release push precedes tag approval; worktree removal
precedes local branch deletion.

For slot 12, unknown retention is a safety-default rendering, not a generic
"resolve" action or a `BLOCKED` fallback: render the `remote-retained` row as
pending unless exact retention evidence completes it, and record the required
human/policy follow-up before deletion. Contradictory explicit retention truth
is `BLOCKED` before rendering.
