# E015 independent reviews — 2026-10-13

## Formal planning review

Independent actor: Plan-Reviewer (`/root/plan_reviewer`). Read actual analysis, plan, step and both canonical repository contracts. Result:

```json
{"verdict":"approved","blocking_issues":[],"copilot_feedback_triage":{"ADDRESS":[],"DISCUSS":[],"SKIP":[]}}
```

This is a planning-contract gate, not recording feasibility approval.

## Bounded implementation review

Independent actor: Reviewer (`/root/code_reviewer`). Reviewed capture sequence/unique pairing/buffer ownership, late callbacks, final chunks, cancel/restart, player readiness, browser wiring, MOD/scripts and evidence semantics.

Two cleanup defects were addressed: cleanup failure must block restart; MediaRecorder construction failure must release canvas tracks, with release failures propagated as CleanupFailure. A behavior test was observed failing (`idle !== blocked`) before the fix; latest independent test run: **18/18 PASS**.

Verdict: **approved for bounded code delivery to Draft PR**. No remaining implementation blocker reported. Live recording status remains 未執行; no full runtime/webcam/manual TC1–TC5 proof. This verdict does not approve the recording hypothesis or production adoption.

## Publication authorization and routing

Owner explicitly accepted the plan and directed: create feature worktree, implement there (not dev), commit by topic, push, open Draft PR, stop for human review. That latest direction authorizes the topic commits/publication without another message-confirmation prompt. No merge, release or worktree removal is authorized.

## Draft PR handoff

- Feature implementation commit: fab0dc2b1fd321b77b9e038cbe222b5159687b0f, pushed to origin.
- Draft PR [#15](https://github.com/a129924/coami/pull/15), base dev, verified OPEN and isDraft=true.
- Local PR Lens graph validated/rendered with real commit provenance and unchanged E008/vendor neighbors. Graphify: no graph, targeted source fallback, no extraction. Archify structural showcase9 passed; desktop visual containment failed and remains a separate auxiliary gap.
- Narrow independent dependency follow-up approved: only topic name and source-map-js 1.2.1→1.2.2 lockfile entries differ from E008; direct pins unchanged.
- Git reported lefthook unavailable. Explicit tests/typecheck/MOD/web build succeeded independently; hook completion is not claimed.
- Human review and manual recording cases are pending. No merge, release or worktree cleanup is performed.

## Live-start correction review — 2026-10-13

Owner's two Start attempts timed out before camera permission. Pinned WASM default splash is 8000ms; E015 previously bounded installed readiness at 5000ms. The isolated adapter correction uses the engine's existing 30000ms startup bound, preserves early/late signal isolation and leaves frame/probe/camera-start/finalization 5000ms criteria unchanged. Vendor/old topics are unchanged.

Independent Reviewer (`/root/code_reviewer`) reread source and adapter wiring, repeated **20/20 pure tests**, and returned **approved, no new blocker**. Tests first reproduced early settlement at 5s and 5000!=30000, then passed. Owner rerun is still required; current live classification is 無法判定. This is the single bounded correction for the current live attempt.
