# E008 Camera input — topic plan

## Inputs

- Intent: `analysis/E008-camera-input/requirements.md`.
- Execution contract: `analysis/E008-camera-input/technical-spec.md`.
- Worktree: `/private/tmp/coami-e008-camera-input`, branch `feat/andrew/camera-input-feasibility`, primary-worktree=false.

## Goal / Outcome

Deliver an isolated TypeScript MOD and browser experiment that distinguishes real webcam frames reaching the MOD from synthetic fallback and records a reproducible PASS, FAIL, or blocked decision.

## Scope

- **In-Scope**: E008 analysis, plan, step tracker, MOD, localhost simulator page, pinned-runtime preflight, per-frame provenance/correlation, negative cases, lifecycle checks, and metadata-only evidence.
- **Out-Of-Scope**: image recognition, image persistence or upload, Server/Python, real hardware quality, production sources, vendor edits, E005 changes, and release work.

## Locked Decisions

- The technical spec is the execution source; requirements guard intent. This is a review-ready experiment with no stable-library surface.
- The formal runtime is pinned Stack-chan `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`; older E005 WASM assets cannot support a PASS claim. Missing exact binaries/toolchain is blocked, not camera FAIL.
- The E008-only bridge observes each canvas read and returned frame before a webcam label is assigned. Host and MOD frames require unique same-generation pairing; preview, connected status, counts, and dimensions alone do not pass.
- The owner grants camera permission and performs cover/uncover observation. No raw media is persisted or transmitted.
- Synthetic-only success is fallback PASS / webcam unproven. A reproducible webcam path failure after all prerequisites are established is FAIL.

## Boundaries / Exclusions

All tracked writes stay in the exact E008 paths below and in the E008 feature worktree. The dev worktree, existing topic plans, vendor, E005, `device/src/`, and `server/src/` are read-only. New tracked paths or scope drift require plan revision and re-review.

## Status / Allowed Transitions

- **Current**: `approved`; **Next actor**: Main Agent; **Stage-local action**: validate the E008 Written set and stage the bounded topic change for owner commit-message confirmation. Independent Plan-Reviewer approved the contract, and independent implementation Reviewer approved the blocked-result experiment on 2026-09-24.
- **Execution model**: independent plan review, bounded implementation, independent verification, then topic commit, push, draft PR, and human review. Owner confirmation of the proposed commit message is required before commit.
- **Allowed transitions**: `planned` → `creator-in-progress` → `review-ready` → `reviewer-in-progress` → `approved` or `needs-rework`; `needs-rework` → `creator-in-progress`; `approved` → `creator-in-progress` or `publish-in-progress`; `publish-in-progress` → `pr-open` or `merged`; `pr-open` → `needs-rework` or `merged`; `merged` is terminal.
- No round cap. Human review precedes merge.

## Artifact Paths

| Artifact | Exact path | Owner |
| --- | --- | --- |
| Requirements | `analysis/E008-camera-input/requirements.md` | Planning actor |
| Technical spec | `analysis/E008-camera-input/technical-spec.md` | Planning actor |
| Topic plan | `plan/E008-camera-input/E008-camera-input.plan.md` | Planning actor |
| Step tracker | `plan/E008-camera-input/E008-camera-input.step.md` | Planning actor |
| Experiment guide | `experiments/E008-camera-input/README.md` | Implementer |
| Experiment record | `experiments/E008-camera-input/EXPERIMENT.md` | Implementer/Tester |
| Run evidence | `experiments/E008-camera-input/evidence/camera-run.md` | Implementer/Tester |
| MOD source | `experiments/E008-camera-input/mod/mod.ts` | Implementer |
| MOD declarations | `experiments/E008-camera-input/mod/host.d.ts` | Implementer |
| MOD config | `experiments/E008-camera-input/mod/tsconfig.json` | Implementer |
| Web entry | `experiments/E008-camera-input/web/index.html` | Implementer |
| Web package | `experiments/E008-camera-input/web/package.json` | Implementer |
| Web lock | `experiments/E008-camera-input/web/package-lock.json` | Implementer |
| Web ignore | `experiments/E008-camera-input/web/.gitignore` | Implementer |
| Web config | `experiments/E008-camera-input/web/tsconfig.json` | Implementer |
| Vite config | `experiments/E008-camera-input/web/vite.config.ts` | Implementer |
| Asset script | `experiments/E008-camera-input/web/scripts/prepare-assets.mjs` | Implementer |
| MOD script | `experiments/E008-camera-input/web/scripts/build-mod.mjs` | Implementer |
| Web UI | `experiments/E008-camera-input/web/src/main.ts` | Implementer |
| Web style | `experiments/E008-camera-input/web/src/style.css` | Implementer |
| Camera observer | `experiments/E008-camera-input/web/src/camera-observer.ts` | Implementer |
| Observer tests | `experiments/E008-camera-input/web/src/camera-observer.test.ts` | Implementer |
| Capture ledger | `experiments/E008-camera-input/web/src/capture-ledger.ts` | Implementer |
| Ledger tests | `experiments/E008-camera-input/web/src/capture-ledger.test.ts` | Implementer |

**ReadOnly**: `AGENTS.md`, shared plan/workflow contracts, E005 MOD/Web, pinned vendor camera and simulator source. **Modify**: none of the existing tracked files. **Deleted**: none. Ignored `web/generated/`, `web/dist/`, and `web/node_modules/` are local artifacts. No root README, VERSION, or release files change.

## Implementation Steps

- [X] 1. Verify E008 path and pinned vendor/runtime prerequisites; document exact binary provenance or the blocking toolchain condition.
- [X] 2. Build the isolated MOD and TS browser harness with source observation, serialized host/MOD pairing, clear source status, and stop/restart release.
- [X] 3. Run strict TS tests, typecheck, MOD and web builds; when the exact runtime and owner camera are available, run the live grant, denial, unavailable, and stop/restart cases; otherwise record the prerequisite block without an end-to-end PASS claim.
- [X] 4. Record the procedure, evidence, webcam verdict, and independent fallback verdict without persisting real image data.

## Validation / Acceptance Checks

- Strict TypeScript typecheck, observer and ledger tests, MOD build, and web build pass. A runtime build blocker is recorded distinctly from a camera FAIL.
- Webcam PASS requires at least two uniquely matched host-webcam/MOD frames and owner-confirmed MOD-derived cover/uncover change. Negative scenarios never claim webcam PASS.
- Stop/restart releases old tracks, halts capture count, and isolates late traces. Evidence contains metadata only.
- Tracked writes match Artifact Paths, and the dev worktree, vendor, E005, production, and stable-library files remain unchanged.

## Reviewer Handoff

```json
{
  "verdict": "approved|needs-rework",
  "blocking_issues": [],
  "copilot_feedback_triage": { "ADDRESS": [], "DISCUSS": [], "SKIP": [] }
}
```

## Post-merge / release actions

Human review precedes merge. No VERSION bump, tag, release note, or repository release action; `merged` is terminal.

## Open Questions / Unresolved Items

No design decision remains open. Runtime availability and physical-camera evidence are execution gates; if unavailable, record the exact blocker without widening scope.
