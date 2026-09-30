# E010 virtual top-touch greet — topic plan

## Goal / Outcome

Deliver a simulator-only, three-zone virtual top-touch POC whose valid tap is recognized as a runtime `touch-panel` event and starts exactly one visible greeting.

## Scope

- **In-Scope / Goal**: E010 analysis, plan, step, MOD, web surface, tests, E010-owned runtime patch, staged browser host runtime, scratch rebuild and evidence.
- **Out-Of-Scope / Non-Goal**: K151/Si12T, hardware validation/deployment, screen input, Server, public API, persistence, production code, release, VERSION and root README.

## Locked Decisions

- Browser validity is same primary pointer + same zone, duration ≤300 ms, movement ≤15 CSS px.
- The simulator host queues raw three-channel samples. Existing `TouchPanel` recognition, rather than browser event injection, creates `release/tap` events.
- The MOD accepts finite monotonic ticks, `kind: "touch-panel"`, `gesture: "release"`, valid tap zone/duration/movement; busy and malformed events never queue.
- The user worktree's `vendor/stack-chan` is read-only. The new E010 patch applies only to a scratch checkout pinned at `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`.

## Boundaries / Exclusions

**ReadOnly**: all existing files, including `vendor/stack-chan`, root README and VERSION. **Written**: only new E010 files under `analysis/`, `plan/`, and `experiments/`. **Modify**: none. **Deleted**: none. Ignored `web/generated/`, `web/dist/`, and `web/node_modules/` are local outputs.

## Status / Allowed Transitions

**Current**: `review-ready`. The owner supplied manual browser trace for left, center, right, and busy rejection. Current-patch WASM provenance regeneration remains a reproducibility follow-up because the local Moddable/Emscripten toolchain was unavailable; it is not a K151 claim. Next: `reviewer-in-progress` → `approved|needs-rework`.

## Artifact Paths

`analysis/E010-virtual-top-touch-greet/{requirements,technical-spec}.md`; `plan/E010-virtual-top-touch-greet/{E010-virtual-top-touch-greet.plan,E010-virtual-top-touch-greet.step}.md`; and `experiments/E010-virtual-top-touch-greet/` for the MOD, web harness, runtime patch, README, experiment record, and evidence.

## Implementation Steps

1. Create strict TS surface and greeting controller tests before implementation.
2. Add E010 MOD, browser surface, event trace and explicit failure UI.
3. Add scratch-only WASM patch, stage the matching patched browser host runtime, and record runtime provenance.
4. Capture browser success, invalid-input and busy evidence, then request independent review.

## Validation / Acceptance Checks

- **TestCase**: each zone valid tap; secondary/cross-zone/moved/late/cancelled pointer with cancellation recovery; coordinate-derived final release zone; fresh generated-parent staging; MOD archive includes each emitted local helper; malformed/non-monotonic input; busy repeat with no host sample backlog; stale terminal; controlled renderer failure; forward/backward swipe regression.
- `npm test`, strict typecheck, MOD archive and Vite build must pass.
- Contract test must stage the same patched browser engine used by the preview and prove `TopTouchPanel`, `pushTopTouch`, and press/release samples. Scratch checkout must pass `npm run test:unit` and `npm run build:wasm`; copied runtime hashes must match current-patch provenance.
- Owner-provided manual trace proves surface → raw sample → recognized event → MOD acceptance → one matching terminal for left/center/right, plus busy rejection. Browser automation was unavailable to the agent; the evidence is classified as manual, not automated.

## Reviewer Handoff

```json
{"verdict":"approved|needs-rework","blocking_issues":[],"copilot_feedback_triage":{"ADDRESS":[],"DISCUSS":[],"SKIP":[]}}
```

## Post-merge / release actions

No release, tag, deployment, version update, or hardware action is authorized. Human review is required before merge.

## Open Questions / Unresolved Items

Browser-accessible manual simulator verification is currently blocked by the unavailable browser binding. K151 validation is a separate mission.
