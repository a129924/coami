# E028 — Robot State POC

## Inputs

- Analysis routing: **INCOMPLETE optional analysis layer**; neither `analysis/E028-robot-state-poc/requirements.md` nor `analysis/E028-robot-state-poc/technical-spec.md` exists. This named semantic warning does not invent an analysis prerequisite; this plan records the explicit 2026-10-22 owner request and bounded execution contract.
- Baseline: dev `d7ff0368a4e7d3ecd36d79a955745baae8b3c756`; dedicated managed worktree `/Users/andrew/.codex/worktrees/7a76/coami`, branch `feat/andrew/robot-state-poc`. Primary dev worktree is read-only.
- PR #31 remains OPEN/Draft, head `eb1b4b7beb8a0eea4fff05d086c4de66c0d42f13`, unmerged at preflight. Read its `docs/robot-state-semantics.md` at that revision as the semantic baseline, without changing, cherry-picking or copying its plan/docs into this topic. Record recheck time/status during execution; changed merge status does not authorize rebasing or editing its contract.
- Read-only source references: E005 action catalog and its `neutral()`; E025 listening/saying experiment's MOD, observer, asset preparation, builder and simulator page; pinned `vendor/stack-chan` commit `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`.
- New experiment E028 avoids E026/E027 reserved by other worktrees/PRs. This is executable strict TypeScript implementation, not a delivery label.

## Goal / Outcome

Create an isolated runnable simulator POC with a pure strict TypeScript state kernel, genuine red→green→refactor evidence, stock-runtime adapters and an operator-facing state trace. Prove the automated contract first, then prepare bounded simulator verification and stop human-dependent cases at `awaiting-human`. Publish a topic commit and Draft PR for human review, without merging.

## Scope

- **In scope**: three independently represented activities (recording, audio output, managed head sequence), atomic admission/resource reservations, correlated lifecycle observations, explicit unknown retention, strict TS unit tests, a new E028 MOD and simulator page, metadata-only evidence and human instructions.
- **Out of scope**: PR #31 changes, production modules, ASR, general stop/cancel, scheduler/queue/preemption, server integration, camera/touch/IMU full state integration, gaze policy integration, hardware verification, wholesale reruns of prior Action/Event experiments.
- Runtime actions are record (5 seconds), replay of the current in-memory recording, fixed-text say, and E005-derived head.nod including its final neutral(). These bound the first runnable path; no broad Action catalog expansion.

## Locked Decisions

- Review-ready-only experimental topic; no stable-library surface, README root, VERSION, release notes or production promotion.
- Toolchain: Node 24, npm, ESM; exact E025 versions: three 0.185.1, @types/node 26.1.2, @types/three 0.185.4, TypeScript 7.0.2, Vite 8.2.1. Own package-lock and feature-local node_modules. Strict ES2022/ESNext/Bundler/DOM/noEmit configuration, no unconstrained any or strict suppression. `node --test src/*.test.ts`; tsc checks browser and MOD; Vite builds browser.
- Kernel receives commands and trusted adapter observations, has no browser SDK or Python dependency. Export activity/resource/action/state/operation identity and observation discriminated unions; snapshot and transition records must be immutable copies. No wire/API compatibility promise beyond E028.
- Activity states are inactive/requested/active/unknown. Every operation has immutable `{sessionEpoch, operationId}`, action, full resource set and lifecycle state; duplicates/stale/mismatched observations cannot alter another operation. An operation's reliable terminal is a tombstone for duplicate late events in the same session.
- Admission is synchronous and atomic: validate the action's complete resource set and record/output exclusion, then reserve all or reject with reason and conflicting identities. Rejection produces no dispatch, no partial reservation, no queue and no preemption. Recording reserves microphone; replay reserves audio output; say reserves audio output+appearance; head.nod reserves head+appearance because final E005 neutral writes expression, eyes, mouth and head. Resource declarations are fixed and tested against every adopted MOD sequence's full body, not only its first call.
- Accepted→requested; only correlated start evidence→active. Timeout, failure/result names, Server cancel notices and observer interruption may mark unknown but never release. Only a correlated reliable end releases that operation's full reservations and makes it inactive; reliable later evidence may resolve an unknown operation. Unknown cannot be promoted by a late start alone. Sequence end is distinct from physical pose/motor observations: head pose and motor-stop knowledge remain unknown in this POC.
- Admission and observation are separate: a genuine external/stock observation may register an operation that was not admitted and bypass policy. Keep its identity and reservations, mark the policy violation, and retain actual recording/output overlap in snapshots and traces. Never erase one activity to manufacture mutual exclusion. Unattributed/ambiguous observations retain a diagnostic and unknown occupancy rather than being assigned to whichever command is newest. A resource with unknown occupancy blocks admission until reliable correlated evidence or a new controlled session resolves it.
- Track operations per identity rather than overwriting a singleton when observations overlap. Activity summary precedence is unknown > active > requested > inactive; per-operation rows preserve simultaneous known starts and unresolved work. Record/output summaries are independent, so both can be active. Finished operations stay in bounded current-session trace/history without holding resources.
- Fresh initialization means only this newly created managed simulator session has no accepted/observed work. Label its initial inactive as managed-session scope; do not claim global device inactivity. Reload creates a new epoch, does not certify old physical work stopped, and old-epoch observations never clear new reservations.
- Simulator command path is fixed: SDK A=record, C=say, B=head.nod. The adapter registers the accepted operation before pushButton, then binds the first matching MOD called/sequence-start acknowledgement and monotonic sequence number to that pending operation; unexpected/duplicate acknowledgements do not attach to another operation. SDK callbacks and observer tokens retain that identity for the complete call. Replay uses the exact current in-memory buffer captured by the stock input wrapper, dispatched through the same observed stock AudioOutBridge.play on the host, explicitly labelled host replay; it is not a fourth SDK button or invented Robot API. No current buffer means rejection before reservation.
- Browser observation uses E025 stock bridge factories through dependency injection with frozen operation tokens, not a patched vendor. MediaRecorder start confirms recording; the same recorder's stop event confirms capture termination; stop() invocation, bytes or resolved record Promise alone do not. Output starts only on advancing AudioContext inside a playing buffer interval. Natural ended with advancing clock and no interruption is evidence for that source, not speaker audibility.
- Say/replay may have multiple buffer sources. Release output only when a correlated successful producer terminal (MOD terminal for say, host play completion for host replay) establishes no more sources will be scheduled AND all observed sources have reliable natural ends with at least one confirmed start. Absent sources, interrupted sources, failed terminals, unattributed lifecycle or incomplete evidence remain unknown; a bare Promise never ends the activity. Say's appearance reservation lasts through the complete managed operation.
- Head-sequence-start trace is emitted immediately before executing the adopted sequence; sequence-end only after every step including neutral completes. It confirms managed execution only. Exceptions emit uncertainty; do not substitute Promise pose success for pose arrival/motor stop. Test this distinction explicitly.
- No major scope/contract issues: proceed through approved gates without another intent interview. Material drift routes back to Planner/Plan-Creator and independent review; do not invent recovery, broaden resources or patch SDK internals.

## Boundaries / Exclusions

Implementer writes only the E028 files listed below; planning/status owners write their exact plan/tracker/review records. Existing experiments, PR #31, governance, configs, device/server modules, vendor sources and dev worktree remain read-only. Initializing the pinned submodule in the feature worktree is allowed; changing its gitlink/source is not. No Graphify build, PR Lens map or Archify artifact is required by this new bounded topic; prior topic's auxiliary work is not imported. If a relevant existing graph is consulted, use Graphify's pinned runtime and auto-refresh opt-out, verify source facts, and do not generate a graph automatically.

Runtime is fixed official artifact plus an E028 MOD freshly compiled from the pinned editor toolchain. Do not borrow another unmerged experiment's runtime/cache or generated MOD. No external audio export/upload; memory-only recording/replay. Downloadable trace is metadata only, with no raw audio or secrets. Generated assets/node_modules/dist stay ignored by existing rules or the E028-local ignore file; do not modify global ignore/config/hooks.

## Status / Allowed Transitions

- **Current**: `publish-in-progress`
- **Next actor**: `Main Agent`
- **Stage-local action**: `Validate and stage only the approved bounded topic files, commit and push the feature branch, open a Draft PR, then stop at human review without merge; preserve human cases as awaiting-human.`
- **Execution model**: canonical creator→independent reviewer→publish→Draft PR; stop at human review. Separate plan-review gate precedes implementation. No topic-specific round cap and no automatic merge/release.
- **Allowed transitions**: planned→creator-in-progress; creator-in-progress→review-ready; review-ready→reviewer-in-progress; reviewer-in-progress→approved; reviewer-in-progress→needs-rework; needs-rework→creator-in-progress; approved→creator-in-progress; approved→publish-in-progress; publish-in-progress→pr-open; publish-in-progress→merged; pr-open→needs-rework; pr-open→merged; merged→terminal. The merge transitions are canonical lifecycle vocabulary, not execution authorization in this topic.
- Independent Plan-Reviewer logs plan verdict; Planner routes readiness; Step-Creator generates the exact base-plan tracker after approval. Creator-owned implementation checkboxes can complete when runnable handoff/evidence is ready while actual human effect cases remain awaiting-human. Do not claim whole lifecycle completion or human success from implementation completion.
- **Lifecycle routing record (2026-10-22T07:17:16.627610+00:00, recorded after owner-role evidence arrived):** `creator-in-progress`→`review-ready` on frozen six-step delivery and Main Agent's exact tracker CLI `check_impl_steps_succeeded E028-robot-state-poc`, exit 0 (`All 6 implementation steps complete`); `review-ready`→`reviewer-in-progress` on dispatch to independent `/root/poc_implementation_reviewer`; `reviewer-in-progress`→`approved` on that reviewer's original approved JSON with `blocking_issues=[]` in `review-log.md` (review timestamp 2026-10-22T07:15:48.317428+00:00); `approved`→`publish-in-progress` on Main Agent publication dispatch. This recording timestamp does not invent earlier transition timestamps or imply publication is already complete.
- **Frozen evidence:** 26 experiment-file manifest digest `b064414d69f5a688b60f732a725a91636fff00ad6677c7ace43a3325ccaa4c18`; independent 35/35 unit pass; strict browser/MOD checks and build exit 0 recorded in `evidence/checks.txt`; four-category handoff in `evidence/validation.md`. Actual simulator metadata is limited to the saved 28-line trace; final missing-end regression change was not rerun in browser. Human outcomes remain awaiting-human. Lifecycle-only planning changes do not change the reviewed experiment manifest.
- **Publication remains pending:** commit, push, Draft PR identity and subsequent human review require exact Main Agent evidence. No merge/release/cleanup is authorized.

## Artifact Paths

All experiment paths below have prefix `experiments/E028-robot-state-poc/` (expanded paths are exact executable allowlist). No other repo writes are authorized by this plan.

| Artifact | Path | Owner | Role |
| --- | --- | --- | --- |
| Topic plan | `plan/E028-robot-state-poc/E028-robot-state-poc.plan.md` | Plan-Creator; status owner for lifecycle fields | Execution contract |
| Step tracker | `plan/E028-robot-state-poc/E028-robot-state-poc.step.md` | Step-Creator creates; each action owner updates own evidence | Explicit `base-plan`, not a TS label |
| Review log | `plan/E028-robot-state-poc/review-log.md` | Independent Plan-Reviewer/Reviewer | Verdicts controlling routing, revision evidence |
| Experiment guide | `experiments/E028-robot-state-poc/README.md` | Implementer | Question, procedure, evidence, decision, scope |
| Local ignore | `experiments/E028-robot-state-poc/.gitignore` | Implementer | Generated local artifacts only |
| MOD | `experiments/E028-robot-state-poc/mod/mod.ts` | Implementer | Fixed bounded actions and correlated sequence traces |
| MOD host declarations | `experiments/E028-robot-state-poc/mod/host.d.ts` | Implementer | Pinned host types |
| MOD compiler config | `experiments/E028-robot-state-poc/mod/tsconfig.json` | Implementer | Strict MOD checks |
| Web manifest | `experiments/E028-robot-state-poc/web/package.json` | Implementer | Pinned scripts/dependencies |
| Web lock | `experiments/E028-robot-state-poc/web/package-lock.json` | Implementer | Reproducible installation |
| Web compiler config | `experiments/E028-robot-state-poc/web/tsconfig.json` | Implementer | Strict browser checks |
| Vite config | `experiments/E028-robot-state-poc/web/vite.config.ts` | Implementer | Local simulator runtime/asset serving |
| Web entry | `experiments/E028-robot-state-poc/web/index.html` | Implementer | Operator controls |
| Asset preparation | `experiments/E028-robot-state-poc/web/scripts/prepare-assets.mjs` | Implementer | Verify official artifact and provenance |
| MOD builder | `experiments/E028-robot-state-poc/web/scripts/build-mod.mjs` | Implementer | Build E028 MOD from pinned editor |
| State kernel | `experiments/E028-robot-state-poc/web/src/state.ts` | Implementer | Pure state/admission/observation |
| State tests | `experiments/E028-robot-state-poc/web/src/state.test.ts` | Implementer | Behavior contract tests |
| Adapter | `experiments/E028-robot-state-poc/web/src/adapter.ts` | Implementer | Correlation, evidence reduction, dispatch |
| Adapter tests | `experiments/E028-robot-state-poc/web/src/adapter.test.ts` | Implementer | Isolated fake-host wiring, not effects evidence |
| Audio observer | `experiments/E028-robot-state-poc/web/src/observed-audio.ts` | Implementer | E025-derived stock lifecycle observation |
| UI entry | `experiments/E028-robot-state-poc/web/src/main.ts` | Implementer | Real simulator integration, metadata trace |
| UI style | `experiments/E028-robot-state-poc/web/src/style.css` | Implementer | Readable controls/state/trace |
| TDD red log | `experiments/E028-robot-state-poc/evidence/red.txt` | Implementer | Genuine behavior assertion failure and command/exit |
| Green/refactor log | `experiments/E028-robot-state-poc/evidence/checks.txt` | Implementer | Tests, typecheck, build with exit codes |
| Toolchain/provenance | `experiments/E028-robot-state-poc/evidence/runtime-provenance.json` | Implementer | Revision/artifact/generated asset hashes |
| Simulator smoke | `experiments/E028-robot-state-poc/evidence/simulator-smoke.md` | Implementer | Actual boot/actions observed, precise gaps |
| Simulator trace | `experiments/E028-robot-state-poc/evidence/trace.jsonl` | Implementer | Actual metadata events only; empty until observed |
| Human verification | `experiments/E028-robot-state-poc/evidence/human-run.md` | Implementer creates; human verdicts attributed | Steps/expected traces and pending results |
| Validation/decision | `experiments/E028-robot-state-poc/evidence/validation.md` | Implementer | Four separate evidence categories and decision |

Root README.md, VERSION and .github/copilot-instructions.md: explicit no-change. New paths require plan amendment and independent review before writing. Generated local assets use `.cache/`, `web/public/`, `web/dist/`, `web/node_modules/` inside E028 and are ignored/untracked, not deliverable source paths.

## Implementation Steps

- [ ] Establish the isolated E028 package/MOD scaffold and pure typed kernel interfaces; author behavior tests, run them against a minimal nonfunctional implementation, and save genuine assertion-level red evidence.
- [ ] Implement the kernel and fixed full-resource Action declarations until all required behavior/correlation tests pass; refactor while preserving green and strict typecheck.
- [ ] Implement and test correlated adapters plus stock audio lifecycle observer, E028 MOD sequence traces, simulator controls and metadata-only exports; record fake-host tests separately from real effects.
- [ ] Run all affected automated tests, strict browser/MOD typechecks and production web build; save commands, versions, exit codes and final green/refactor evidence before browser verification.
- [ ] Prepare hash-verified official simulator assets and freshly built E028 MOD, boot the real simulator, save only observations actually obtained, and deliver operator steps/expected traces with all human-dependent or unsupported cases explicitly awaiting-human/unverified.
- [ ] Complete the experiment question/procedure/evidence/decision and handoff, separating automated, simulator, pending-human and unverified results; verify allowlist/clean generated-artifact handling and prepare the topic for independent implementation review.

## Validation / Acceptance Checks

### Automated behavior acceptance

1. Atomic accepted command reserves every resource immediately, remains requested until confirmed start, then becomes active. Rejected calls never dispatch. Replay without a nonempty current recording is rejected before admission.
2. Recording→playback, playback→recording, record→record, output→output and head→head reject later requests in requested/active/unknown states. Cross-activity independent head and recording can coexist. Say↔head.nod additionally rejects on appearance, and a composite conflict leaves no partial leases.
3. Timeout, failure names, rejected/fulfilled host Promises and Server cancel notices never release resources; unknown is sticky until reliable same-operation end. This is a local input semantics test, not new Server integration.
4. Reliable same-operation end returns inactive and frees only its resources. Head sequence end leaves pose-arrival and motor-stop unknown. Failure before terminal remains unknown unless actual reliable termination exists.
5. Explicit external observations can show record and output active together and report policy conflict; neither observation is erased. Summary unknown precedence does not remove per-operation starts or identities. Unknown external occupancy blocks relevant requests.
6. Full side effects include E005 neutral expression/eyes/mouth/head; adopted head.nod always reserves appearance+head and say reserves appearance+output. Test adopted MOD sequence wiring and resource manifest together so deleting final neutral/resource cannot silently pass.
7. Stale epoch, wrong op ID, duplicate start/end, late start after reliable end, unmatched source end and multi-source playback cannot clear a newer/unrelated reservation. Snapshot mutation cannot change kernel state.
8. Fake-host adapter tests verify accepted dispatch once, denial dispatch zero, tokens stable across async callbacks, missing/lost lifecycle→unknown, capture stop-call≠end, start-call≠clock evidence and failed/empty/interrupted output≠reliable termination. Label them unit evidence only.

Red must fail an actual behavior assertion (not imports, install, type errors or missing files). Keep its original command, exit code and source-phase description before replacing the implementation; do not regenerate a fake red after green. Then test→typecheck→build on final code; any refactor reruns affected checks. No arbitrary coverage threshold or new lint toolchain.

### Runtime preparation and simulator evidence

Use official SDK artifact `10585271971`, CI run `35444663129`, archive SHA-256 `0570742fb76a8dd73289d4a06b8b72aaa6f3c516a6cc831a53cdb6320da6d0e7`, pinned source above. Verify downloaded archive digest and fixed expected ZIP entries, reject traversal/unexpected input, record generated mc.js/mc.wasm/MOD hashes, and browser-verify served bytes before boot. Recheck availability; if expired/unavailable stop runtime verification with concrete blocker, do not silently use another archive. Freshly compile E028 MOD with pinned editor as demonstrated by E025; no vendor patch.

Browser controls provide start/unlock, record, replay, say, head.nod, current identity/resource rows, rejected-request reasons and metadata trace download. Do not disable all controls during activity: retain relevant controls to demonstrate policy rejection. Evidence health issues must be visible. A 30-second diagnostic timeout marks unresolved work unknown; it is not an automatic stop. Runtime initialization/network/permissions failures are gaps, not passes.

Automated browser boot/smoke may prove loading, source hashes, bridge attachment and trace wiring if actually observed. It cannot prove the user's microphone phrase was captured, speaker sound was audible or visible head action matched intent. Do not rerun the entire existing catalog. Missing reliable evidence stays unknown; no automatic `passed` human result.

### Human handoff cases (initial result `awaiting-human`)

| Case | Operator action | Expected managed trace and real-effect check |
| --- | --- | --- |
| H1 recording | Start/unlock/allow mic; Record, speak a short phrase, then Replay after reliable capture end | record requested→capture-start active→capture-ended inactive; output requested→clock-active→all natural ends+host play terminal inactive. Human hears own phrase; bytes/Promises do not establish that. |
| H2 record then say | During recording press Say; try Record again | Reject both later requests; no extra dispatch/source. Human confirms ongoing capture; prior resource remains held. |
| H3 say then record/replay | Say and observe clock start; while output active press Record/Replay/Say | Later requests rejected; original output trace unchanged. Human hears fixed speech. |
| H4 head | Head nod; observe sequence including neutral; repeat during requested/active window; inspect independent pose knowledge | Reject overlapping head work. sequence-start active→sequence-end inactive, pose/motor unknown. Human checks visible nod/reset; simulator sequence event does not prove physical motor stop. |
| H5 independence/side effects | Record plus Head; separately Say then Head (and reversed) | Record+head independently represented if accepted; say/head conflict rejected due appearance; no partial dispatch. Human checks displayed states against actual effects. |
| H6 uncertainty | Use reproducible browser permission/interruption conditions only if available; otherwise leave unverified | Unresolved observer/result→unknown and busy retained; reload creates new managed epoch with explicit old-session caveat, not generic stop. Pure timeout/cancel tests remain automated evidence. |

Each human row records tester/time/browser/equipment, trace IDs, observations and verdict only after user input. Evidence/human-run.md starts pending; no agent fills “heard”, “seen” or pass. Imported historical E005/E025 evidence remains cited baseline, not a new E028 human result. Do not simulate overlap as proof of current live overlap; forced external overlap belongs unit tests unless really observed live.

Acceptance requires the six implementation deliverables, independent implementation review and honest human handoff, not successful human effects. Human-review publication is allowed while human cases await the user, with four distinct sections in validation.md/PR: **automated pass**, **simulator evidence actually observed**, **awaiting-human**, **unverified/capability gaps**. A failure in automated contract/typecheck/build blocks publication; lack of human operation pauses that case without inventing pass. Material source/SDK observation incompatibility routes back for review.

## Reviewer Handoff

The independent reviewer emits one JSON object with this exact shape; this is the output contract, not a pre-filled verdict:

```json
{
  "verdict": "approved|needs-rework",
  "blocking_issues": [],
  "copilot_feedback_triage": { "ADDRESS": [], "DISCUSS": [], "SKIP": [] }
}
```

Plan and implementation review rounds append timestamp, inspected revision/diff, issues and verdict to review-log.md; Main Agent routes rather than claiming its own gate. Implementer addresses bounded findings, independent reviewer rechecks. Completion evidence must match exact implementation checkbox; human outcomes never count as passed by handoff alone.

After approval inspect staged diff under git-commit-convention. Owner explicitly authorized topic commit→push→Draft PR; honor repository explicit message-confirmation boundary if the current skill/owner authorization does not cover the concrete message. Recommend semantic topic message `feat(experiments): add robot state POC`; no unrelated files. Push only feature branch, target dev with Draft PR and truthful four-category evidence. No merge, ready-for-review transition, release or unrelated PR edits.

## Post-merge / release actions

No merge is authorized; stop at Draft PR human review. No repository release or stable promotion action is required. Any later integration into device/server modules or hardware validation is a separate explicit decision/topic.

## Open Questions / Unresolved Items

No unresolved scope/contract choices block implementation. Actual human listening/visual verification and any unavailable browser permission/device capability remain `awaiting-human`/unverified, not design placeholders. Optional analysis-layer warning is recorded above. Artifact expiration, dependency installation or simulator availability are execution blockers to report truthfully with unaffected automated work preserved.
