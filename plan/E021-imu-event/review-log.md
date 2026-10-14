# E021 readiness / review log

## 2026-10-14 — Authorized persistence checkpoint

- Recorder: Plan-Creator; dispatch from Main Agent. This checkpoint records provided conversation evidence and read-only inventory, not a new reviewer verdict.
- Conversation: owner accepted the complete E021 plan after independent conversation reviews and bounded corrections (canonical reviewer payload, sampleTicks upper-bound cooldown proof, PR Lens pending routing, E020→E021 identity correction). No runtime/build/test passed is claimed.
- Later owner authorization: create feature worktree → implementation → bounded topic commits → push → Draft PR → human review. No repeated commit-message confirmation is required; this later authorization supersedes the earlier AGENTS confirmation requirement. Independent readiness/code review remains required. No merge/release authorization.
- Main Agent managed create-worktree operation: `351ff9e6-9130-4805-ba91-8154f8a3c0e6`; actual root `/Users/andrew/.codex/worktrees/05ae/coami`. Earlier temporary worktree intent is superseded.
- Read-only inventory command: `git worktree list --porcelain`, run in `/Users/andrew/.codex/worktrees/05ae/coami`; selected entry is recorded below. `git branch --show-current` reports `feat/andrew/e021-imu-event`; `git status --short` was empty before these three planning files were created.

```text
worktree /Users/andrew/.codex/worktrees/05ae/coami
HEAD b67c42356a1bc9f0c07d51e6af31a61d737dec65
branch refs/heads/feat/andrew/e021-imu-event
```

- These observations support fixed-head create-worktree/prepare-topic-branch only. S1–S4 remain unexecuted; no source, runtime, test, provenance, PR Lens, Archify or acceptance evidence exists from this persistence pass.
- Release: not required; root README/VERSION/tag unchanged. Remote branch retained; destructive cleanup requires later exact authorization and evidence.
- Next: independent repo-visible plan/step readiness review. Future reviewer verdict belongs to the independent Reviewer; no verdict is authored in this checkpoint.

## Repository readiness and actual implementation evidence

Independent Plan-Reviewer: approved repo-visible plan/step, blocking_issues=[]; Planner routed root as Implementer. Actual managed worktree and feature branch match the selector. SDK initialization completed at the pinned gitlink.

S1/S2 artifacts implemented; 42 source tests PASS, strict TypeScript PASS, WASM/MOD builds PASS. First browser raw attempts FAILED on invalid clock. Independent Reviewer traced the real root cause to the pinned Moddable WASM xs_time_ticks() empty body and Time.ticks getter. A double-to-integer diagnostic did not resolve the SDK clock gap; failed results are preserved. Do not mark S1/runtime or S3/core acceptance complete. Human/page-level lifecycle verification remains incomplete.

Owner scope question raised: allow a bounded E021 scratch true-monotonic Time.ticks adapter (original recognizer/IMU/Event unchanged), or retain the pinned defect and deliver partial evidence. No reply/adapter authorization yet. Work stops before that dependent change or publication; no commit/push/Draft PR has executed. Original SDK/other topics/primary dev worktree remain unchanged.

Independent Reviewer requested accurate E021 TOOLCHAIN prose: corrected copied unrelated human-trace/review-change claims to actual read-only E019 isolated copies including caches and no cold-bootstrap/human evidence. Archify auxiliary implementation passed showcase9/9 and desktop visual checks; these are not runtime correctness evidence.


## 2026-10-14 — Owner-authorized scratch clock compatibility delta

- Recorder: Plan-Creator, bounded synchronization of plan/step/review-log only; no source/test/build/publication performed by this pass.
- Owner async choice explicitly accepted: 「擴充 E021 scratch 平台以真實單調時鐘補齊 Time.ticks 再驗完整路徑，保留原 recognizer 門檻 Event shape」。This supersedes the earlier pending-choice/no-adapter-authorization entry; the scope-choice blocker is resolved. Historical failed browser/NaN evidence and earlier root-cause record remain unchanged.
- Independent read-only Reviewer feasibility finding supplied by Main Agent: install the getter on imported Time before wasm-imu-bridge platform installation using Object.defineProperty(Time, 'ticks', {get: native('xs_stackchan_e021_ticks')}); native C returns xsmcSetNumber(xsResult, emscripten_get_now()). Original SDK IMU polling and raw driver then read the same real monotonic millisecond domain. This is feasibility evidence, not a successful runtime execution claim.
- Scope is raw provider plus this owner-authorized E021 scratch clock compatibility. Existing runtime/wasm-imu.patch remains the sole patch artifact; original Moddable/tool source pins remain clean, original imu.ts/recognizer/Event shape and thresholds remain unchanged. No sample-index or Timer-interval fake clock and no implementation of other Time stub methods. Provenance must disclose the upstream stub gap and compatibility clock source/patch identity.
- Plan/step synchronized: current creator-in-progress; next Implementer; action Complete S1–S4 in order with the owner-authorized scratch Time.ticks compatibility adapter.; current allowed-next creator-in-progress→review-ready, full canonical transition graph retained. S1 In-Scope/TestCase reflect compatibility; implementation sections mirror exactly and all four completion checkboxes remain pending. Managed selector is unchanged.
- Next dispatch: Implementer performs the authorized patch and full-path verification; independent Reviewer checks bounded delta and resulting evidence. S3 human/page lifecycle remains pending. No new PASS or review verdict is claimed by this record.


## 2026-10-14 — Same-scope scratch Time alias-wrapper fallback

- Recorder: Plan-Creator, technical-plan synchronization only; no SDK/experiment source, build/test or publication performed by this pass.
- Main Agent actual browser evidence: Object.defineProperty on the preloaded Time snapshot failed with invalid descriptor for both the native getter and a JavaScript getter. The previous getter-install feasibility entry is historical and superseded as execution design, not deleted; earlier NaN/stub failures remain preserved. These failures do not constitute recognizer/threshold failures.
- Bounded fallback within the same owner-authorized real-clock capability: scratch patch adds firmware/host/modules/input/wasm/time-compat.js, imports PinnedTime from e021-original-time, and exports a Time subclass whose static ticks getter returns native('xs_stackchan_e021_ticks').call(this). Scratch input manifest maps time to ['./wasm/time-compat', '$(MODULES)/base/time/wasm/modTime'] and e021-original-time to '$(MODULES)/base/time/time'. Existing IMU bridge C native returns xsmcSetNumber(xsResult, emscripten_get_now()). Original IMU and raw driver both import time and therefore share the real monotonic millisecond domain.
- Independent Reviewer confirmed this alias-wrapper choice remains in the owner-authorized clock-compatibility scope; no new owner scope choice is required. Original Moddable Time JS/C, IMU/recognizer/Event and tool pins remain unchanged; other Time methods are inherited without filling stubs. runtime/wasm-imu.patch remains the sole repo patch artifact, with the new wrapper represented inside that patch only. Provenance discloses the alias wrapper and the actual compatibility gap/clock source.
- Plan locked execution mechanism and S1 In-Scope/provenance updated; plan/step Implementation Steps remain exact mirrors. Status stays creator-in-progress, Next actor Implementer, managed selector unchanged; all four engineering completion markers remain pending.
- New build/runtime verification is pending; no new PASS or successful full-path claim is made. S3 human/page lifecycle remains pending; Reviewer must inspect actual resulting evidence.


## 2026-10-14 — Alias precedence and pinned-base copy guard synchronization

- Recorder: Plan-Creator; bounded plan/step/review-log changes only, no source/build/test changes in this pass.
- Main Agent reported actual manifest precedence: wildcard registration selected the original time source before the direct alias wrapper, so the previous direct original-time alias mechanism was ignored. Earlier descriptor/NaN failures and prior feasibility/design entries are preserved as historical evidence.
- Same authorized clock capability, finalized scratch selection: manifest `~` excludes '$(MODULES)/base/time/time.js'; `time` maps to './wasm/time-compat'; `e021-original-time` maps to './wasm/pinned-time'. Scratch pinned-time.js is the exact byte copy of pinned Moddable Time JS. prepare-runtime checks bytes.equals against the original pin-clean source before build; mismatch stops. Original modTime.c still compiles unchanged. Wrapper/native real monotonic getter and original IMU/raw-driver shared clock domain remain unchanged.
- Provenance records originalTimeJsSha256 and originalWasmTimeCSha256 as well as the alias/compatibility/patch identity. Original Moddable Time JS/C, IMU, recognizer, thresholds, Event shape and tool pins remain read-only. No new repo artifact: both scratch JS modules remain represented inside the existing runtime/wasm-imu.patch.
- Main Agent reported makefile selection now identifies time.xsb with time-compat source and the intended private original-time alias. This is source-selection/build evidence only; actual debug8 is running and is not declared PASS here. S3 human/page lifecycle remains pending.
- Plan locked alias paths, S1 In-Scope/TestCase and preflight/provenance text synchronized; step Implementation Steps mirror exactly. Status creator-in-progress / next Implementer / managed selector unchanged; all four engineering checkboxes remain pending until accepted actual evidence.


## 2026-10-14 — Planner engineering-delivery / human-acceptance classification

- Recorder: Plan-Creator, bounded clarification of plan/step/review-log only; no experiment source/test/build/publication actions in this pass.
- Planner formally classified the delivery as bounded clarification, not a gate bypass, aligned with existing owner commit→push→Draft PR→human review authorization. S3 title is now 自動 runtime 驗證與人工驗收交接. This creator pass requires a complete automated runtime matrix with actual evidence and executable required-human procedures plus a NOT_EXECUTED human matrix. Engineering review is still required before bounded commit/push/Draft PR.
- Required actual human operations move to STOP POINT 2 after Draft PR, owned by the human operator/reviewer. They remain mandatory for full verification. Draft PR must disclose the unexecuted human matrix, remaining checklist and fullVerification=false. No fabricated human session/trace/PASS and no substitution of automated input for human input is permitted. Original all-core-cases-executed/all-PASS acceptance thresholds are unchanged.
- Main Agent reported real-clock core45 cases PASS in an earlier run. A later watchdog test timed out because it stalled RAF while actual Emscripten scheduling uses Timeout; this was test stimulus mismatch, not established product failure. The runner was corrected to stall actual Timeout; its complete-suite rerun was still in progress at dispatch, with29 PASS and zero browser errors reported so far. This record does not claim that the latest complete suite passed or mark any implementation step complete.
- Plan current creator-in-progress, next Tester, action Complete the automated runtime matrix and prepare the required human-acceptance handoff for independent engineering review. Step contextual action/workflow row and all nine S3 fields are source-faithful; full implementation sections mirror exactly. All engineering completion markers remain pending for the Main Agent/authorized action owners to update from accepted evidence.
- Frozen fixed head/tail wording and managed selector unchanged; topic-local STOP POINT 2 notes provide human responsibility and unresolved acceptance list. No new reviewer verdict, gate PASS, commit, push or PR is asserted here.

## 2026-10-14 — Engineering action-owner evidence checkpoint

Main Agent acting as Implementer/Tester records completed bounded S1–S4 engineering actions: source42 PASS, strict typecheck/WASM/MOD/web builds PASS; actual Chrome CDP53/53 PASS and browserErrors=[] at 2026-10-14T03:11:45.718Z. runtime-provenance binds patch/runtime/MOD and original Time sources. All six events have repeated independent actual runtime positives, complete negative/cooldown/lifecycle/failure checks. Final screenshot inspected: visible fallenForward2 from MOD. Required human procedure and53-row NOT_EXECUTED matrix recorded with runs[]; fullVerification=false, verificationComplete=false, overallSuccess=false. Archify9/9 and four viewport visual evidence PASS, Graphify bounded source fallback complete; PR Lens pending real reviewed head and explicitly deferred by S4. Historical failures retained. Completion markers updated only from these action-owner facts; Planner must run implementation-only completion gate and Reviewer supplies independent verdict before publication.

## 2026-10-14 — Planner completion gate and independent review dispatch

Planner executed `python .codex/skills/plan-step-tracker/scripts/step_tracker.py check_impl_steps_succeeded E021-imu-event`: exit0, stdout All 4 implementation steps complete. This is engineering completion only; fullVerification=false and required human NOT_EXECUTED. Planner classified creator-in-progress→review-ready and dispatched active independent Reviewer; workflow now reviewer-in-progress. Planner subagent could not persist due filesystem PermissionError (no auto-review rejection, no partial write); root records this authorized metadata-only routing. Reviewer independently verified53/53 actual runtime, clock/identity/provenance and original protected bytes; final docs/human procedure check remains the last review item. No commit/publication yet.

## 2026-10-14 — Independent final engineering APPROVED and publication routing

Independent Reviewer final verdict APPROVED, blocking_issues=[], ADDRESS/DISCUSS/SKIP empty. Read-only independent inspection verified actual53/53runtime PASS/browserErrors=[] at03:11:45.718Z; ordered sample IDs, finite/nondecreasing raw clocks, Event clock bounds/cooldown, matching patch/runtime/MOD/run hashes, protected SDK bytes and exact pinned-Time copy, clean vendor/tool sources. Raw→C/WASM→originalSDK→MOD path has no named Event injection. Fresh/terminal/fault and actual hidden/pagehide/watchdog/timeout evidence verified; visible screenshot inspected. Human required/runs[]/53NOT_EXECUTED matrix and detailed stop-recovery/fault operations are consistent, fullVerification/verificationComplete/overallSuccess remainfalse. Plan/step engineering fields match ignoring owner progress markers.

Known staged diff --check four lines are inner patch blank context and unchanged pinned Time license whitespace; nonblocking, retained for byte-exact original copy. Approval is bounded engineering only, no human/hardware/full-success/merge/release claim. Root records supplied Reviewer verdict; reviewer-in-progress→approved→publish-in-progress under existing owner topic commit/push/DraftPR authorization. Bounded Written set inspected: only E021 experiment and E021 plan artifacts; generated runtime/tool binaries ignored, primary dev/vendor/history untouched. Runtime build topic staged and inspected before commit; next topics feature behavior and docs/evidence. PR Lens still pending actual head until normal commits exist.

## 2026-10-14 — Topic commits and real PR Lens supplementary review

Authorized normal commits:53e38d6 build runtime, cb635af feature behavior, f0eec2b docs/evidence. Staged groups inspected before each; generated tools/runtime binaries excluded. Hooks printed Can't find lefthook in PATH; no hook success claimed, independent source42/typecheck and actual runtime53 checks had executed. Raw build validation logs retain their original whitespace diagnostics.

PR Lens CLI0.11.0 validate/render exit0 with actual base34fd88caee29e3c467e709b5bbb2b52bcf67f38b/headf0eec2b75c6bce3233eb4466531569b45c65df1b; local dev advanced via concurrent E016 merge, primary remained clean. Actual triple-dot diff exclusively48 E021files. External map/receipt paths in auxiliary.md. Independent Reviewer verified diff bytes/revisions/manifest/SVG14002bytes,4lanes8nodes8edges3walkthrough, original unchanged neighbours/locations/gitlink/remote: APPROVED, no blockers. Supplementary docs-only status recording approved under existing authorization. Preserve this map as exact historical snapshot; later docs/publication commits are not falsely represented as mapped. Human requiredNOT_EXECUTED/fullVerificationfalse. Next push and DraftPR, then STOP2.

## 2026-10-14 — Draft PR publication and STOP POINT 2 handoff

Push succeeded, upstream origin/feat/andrew/e021-imu-event. Normal GitHub CLI created https://github.com/a129924/coami/pull/21 as Draft with base dev. Readback: stateOPEN/isDrafttrue/head5eb3bf5fb51b6ab12e1e42cf9f1dc85c19b2dfb4, local/remote head equal; feature and primary worktrees clean at observation. No comments/reviews yet. Initial CI readback had completed successes and remaining jobs in progress; no all-green claim. PR body exposes source42/runtime53PASS, scratch clock scope, retained failure evidence, local three-tool status, required human NOT_EXECUTED/fullVerificationfalse and exact outstanding checklist. No PR Lens publication/upload was used.

Publication-audit docs follow-up is within existing owner topic commit/push authorization and independent Reviewer approved supplementary docs recording; no source behavior changes. pr-open, required human review/acceptance next. STOP POINT2 handed off; no merge/release, no worktree/branch deletion, no target branch sync. Original post-merge/cleanup/future-human-resume rows remain pending. PR Lens remains the explicitly recorded historical f0eec2b snapshot, not this audit commit.
