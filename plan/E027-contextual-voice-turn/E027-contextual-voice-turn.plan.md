# E027 Contextual voice turn

## Goal / Outcome
Validate SDK-A03→real ASR/contextual response/TTS→MOD→SDK-A05 with adult Traditional Chinese, independently scored reply vs clarification.

## Scope
Python Server + TS/native C simulator only. E027 assigned by owner. No optional analysis-layer artifacts exist; approved conversation is the source baseline.
| Field | Bound contract |
|---|---|
| In-Scope | server /turn and /tts-check; scratch native ingress; same-turn runtime and evidence |
| Out-Of-Scope | child data, camera, memory, multi-turn, Jev, hardware, production, changing model/policy |
| ReadOnly | vendor, old experiments, production source and governance; TS also treats server/env/provider contract readonly |
| Written | new E027 server/mod/bridge/web/evidence files listed by S1–S5; planning docs in this directory |
| Deleted | existing files/branch/worktree/evidence: none |
| Modify | S3 may modify S2 web package/lock/tsconfig, four src modules/three tests/two scripts only for integration; S5 README/validation only |
| Goal | traceable facts for the frozen feasibility hypothesis, including negative or inconclusive results |
| Non-Goal | build/graphs are not human hearing, model correctness or production adoption |
| TestCase | TC-PY, TS, BUILD, ENV, X01/02, TTS01/02, V01–06, AUX; live cases separate |

## Locked Decisions
SDK pin b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322. record4000; ASR gpt-transcribe; Responses gpt-6-luna; TTS gpt-4o-mini-tts-2025-12-15 coral WAV. Stop on 2027-01-06 or unavailable model; no replacement/retry. Fixed clear/ambiguous contexts and same utterance 我想要車車; three each, interleaved. Two TTS prerequisites via same bridge/MOD/A05. Generated nonempty Traditional Chinese <=40chars, no expected branch supplied. Budget20 accepted operations/day including failures/cancel, <=60 cloud HTTP. Server30s/host40s, single flight, no queue, tokens session_id/run_seq, fail closed on stale/duplicate/unknown playback. Frozen process-key-only .env.example contract; no auto-dotenv. Python detailed contract is E027-contextual-voice-turn.python.plan.md.

## Boundaries / Exclusions
All source in feature worktree experiments/E027-contextual-voice-turn; never implement in dev. Python remains Python; ts-implementation labels S2/S3 only. No stable-library README/VERSION/release changes. Do not read secrets or commit raw audio. No .pr-lens workspace, tool install, graph build/refresh, provider fallback, uploads or publication of diagram assets.

## Status / Allowed Transitions
creator-in-progress. Code is reviewable for Draft PR; S4 runtime/human evidence remains pending. Canonical creator-in-progress→review-ready→reviewer-in-progress→approved|needs-rework; pending checks cannot be declared done. Draft PR handoff is not an implementation gate pass. User explicitly authorizes topic commit/push/Draft PR then human review. No merge/release.

## Artifact Paths
Experiment prefix experiments/E027-contextual-voice-turn/. Exact source inventory: server/{app.py,models.py,contexts.py,providers.py,pyproject.toml,uv.lock,.env.example,tests/test_turn.py}; mod/{mod.ts,host.d.ts,tsconfig.json}; bridge/{turn-exchange.c.inc,turn-exchange.js}; web/{package.json,package-lock.json,tsconfig.json,vite.config.ts,index.html,.gitignore}; web/scripts/{prepare-assets.mjs,build-mod.mjs}; web/src/{browser-runtime.ts,turn-bridge.ts,turn-session.ts,strict-audio-bridge.ts,main.ts,style.css,turn-bridge.test.ts,turn-session.test.ts,strict-audio-bridge.test.ts}.
Evidence README.md plus evidence/{validation.txt,ts-red.txt,bridge-red.txt,runtime-build.txt,runtime-provenance.json,voice-trace.jsonl,voice-run.md,acceptance-summary.json,auxiliary.md}; evidence/archify candidate/HTML/receipts/contact sheet/screenshots named by actual CLI receipt. Public renderer's private spec snapshot is CLI-owned.
Planning prefix plan/E027-contextual-voice-turn/ with .plan.md, .python.plan.md, .spec.md, .step.md and review-log.md. External PR Lens: /private/tmp/E027-contextual-voice-turn/pr-lens/{graph.json,rendered/drawn.graph.json,rendered/manifest.json,manifest-selected SVGs}; no repo config modifications.

## Implementation Steps
1. S1 Python explicit wire models, fixed provider pipeline, lifecycle, bounds and empty server .env.example. See server exact inventory above. Missing ambient credential never calls cloud; .env file loading is not implemented.
2. S2 TS/native C scratch bridge + MOD + package/lock/tsconfig + four runtime modules and three tests; no S3 dependency. TS server/env/provider contract readonly; test/typecheck before integration. Native C only copies buffers.
3. S3 TS UI/runtime integrates same-token record/hash/exchange/reply/hash/playback, precheck hearing controls, busy/deadline/pagehide cleanup; creates Vite/index/style/main/local ignore and modifies only listed S2 web surfaces.
4. S4 fresh runtime, two TTS + six adult cases and injected failures; program readonly, defects return bounded step. NOT DONE when compiler/toolchain or human hearing missing.
5. S5 Archify sequence + actual-diff PR Lens local map and Graphify source fallback, source review notes, truthful evidence. AUX is separate from voice hypothesis.

## Validation / Acceptance Checks
Pure pytest + Ruff/Pyright strict; Vitest/typecheck/Vite build; pinned MOD/fresh native runtime/served-byte hashes; synthetic decode/reload isolation separately. Adult cases require ASR sense, branch/content, exact token/WAV, SDK and natural onended, human hearing. Four statuses only 未執行/成功/失敗/無法判定; prerequisite separately scored, main unexecuted when prereq not reached. Hypothesis failure can finish validation; unknown requires documented cause/evidence gap and cannot unblock decision. Source tests/graphs never prove voice hypothesis.

## Reviewer Handoff
Current source quality reviewed independently; see review-log. Actual runtime/human completion pending; no formal completion approval claimed.
{"verdict":"needs-rework","blocking_issues":["Fresh native runtime and human acceptance evidence pending"],"copilot_feedback_triage":{"ADDRESS":[],"DISCUSS":[],"SKIP":[]}}

## Post-merge / release actions
Stop at human review on Draft PR. No merge, release, deployment, stable promotion, branch/worktree deletion authorized by this handoff.

## Open Questions / Unresolved Items
Pinned compiler/toolchain absent in current environment. Live account/model access, Chinese TTS hearing, native bridge execution and six adult semantic outcomes unverified. No model/architecture decision reopened.
