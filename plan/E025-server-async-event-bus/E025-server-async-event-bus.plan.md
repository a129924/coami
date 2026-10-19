# E025 — Server AsyncEventBus cancellation feasibility

Planning review: **approved**, independent verdicts recorded in review-log; this is not implementation approval.
Analysis-layer semantic warning: `analysis/E025-server-async-event-bus/requirements.md` and `analysis/E025-server-async-event-bus/technical-spec.md` are absent. Optional analysis-layer status is **INCOMPLETE**; the owner-approved dialogue is materialized in the shared spec and Python contract below, without inventing analysis artifacts.
D1: non-trivial — new async ownership, WebSocket ingress/egress, grouped cancellation and reproducible worker harness.
Authority: this file owns topic lifecycle/artifact routing (11 canonical sections); `python/E025-server-async-event-bus.plan.md` owns Python implementation decisions (13 sections); both share the root spec and step file. No competing step/spec copies.

## Goal / Outcome

Determine whether existing bubus 1.5.6 can support complete per-Robot Server business cancellation while preserving transport/control and other Robots. Deliver a reproducible isolated experiment and evidence-based recommendation, not production adoption.

## Scope

Only this topic's planning artifacts and `experiments/E025-server-async-event-bus/`. Implement a synthetic FastAPI WebSocket experiment, six requirement-mapped case families, process-isolated repetition runner, pinned dependencies and eight-section evidence README. Use the existing feature worktree `/private/tmp/coami-server-async-event-bus-worktree`, branch `feat/andrew/server-async-event-bus`, base `93a1a7d`; never implement on dev.

## Locked Decisions

- Cancellation is an exclusion gate: stop all old active/queued/child/subscriber business work of the sending Robot, await cleanup barrier, suppress old results. Preserve WebSocket/control/Robot B.
- Use existing bubus 1.5.6 first, with Pydantic-native synthetic events. No custom pub/sub or bus framework. Standard `asyncio.TaskGroup` and a fixed per-Robot supervisor own business work; bus handlers only transfer tracked work. AnyIO is an existing transport dependency, not the EventBus candidate.
- General path: WebSocket -> typed Pydantic/event model -> bubus -> handlers -> Robot generation work scope. Cancel bypasses the business bus and directly signals its Robot supervisor.
- Disconnect cancels old work. Reconnect cannot admit work before old cleanup; quarantine survives reconnect. Failed cleanup/unhandled child or subscriber failure quarantines that Robot until case teardown.
- `generation` invalidation occurs after recognizing Cancel and before the next await. Writer's final generation check through starting send has no await. In-flight bytes cannot be recalled.
- Synthetic cooperative async only; 2-second cleanup/barrier, 10-second case watchdog, 30-second individual worker process watchdog; each parameterized case repeats 20 times in a fresh process.
- Topic-only budget: 90 minutes from 2026-10-19 04:22:30 UTC, deadline 05:52:30 UTC; at most two bounded implementation-fix rounds per candidate. No extra budget or forced second candidate. Investigate another existing bus only if bubus fails necessary gates and budget remains; record its evidence/decisions before implementation.
- No stable-library surfaces, version bump, release or automatic adoption. Owner authorized bounded implementation, topic commit, push and Draft PR -> human review; this current-turn authorization supersedes the default per-message commit confirmation for this topic only.

## Boundaries / Exclusions

No `server/src/`, `device/src/`, `.github/`, root README/VERSION or unrelated experiment changes. No NLU, real LLM/TTS SDK, real Robot/SDK, actual playback/movement stop, threads, remote-operation cancellation, non-cooperative-work termination, real-network validation, third-party internals patching or general runtime framework. No merge, release, branch/worktree deletion or cleanup. A passing experiment recommends a candidate; owner decides adoption separately.

## Status / Allowed Transitions

- Topic execution current: `publish-in-progress` (independent implementation review and code review approved; owner-authorized topic commit/push/Draft PR preparation). Planning review was independently approved; see review-log.
- Canonical transitions: `planned` -> `creator-in-progress` -> `review-ready` -> `reviewer-in-progress` -> `approved` or `needs-rework`; `needs-rework` -> `creator-in-progress`; `approved` -> `creator-in-progress` or `publish-in-progress`; `publish-in-progress` -> `pr-open` or `merged`; `pr-open` -> `needs-rework` or `merged`; `merged` -> terminal.
- Authorized publication stops at Draft `pr-open` for human review. The merge transitions describe the repository lifecycle, not authorization to execute them. No `released` transition.
- Creator owns implementation steps; Tester supplies execution evidence; independent Reviewer owns verdicts; Main agent owns authorized publication routing. Do not mark reviewer work as creator implementation completion.

## Artifact Paths

| Artifact | Exact path | Owner | Role |
| --- | --- | --- | --- |
| Topic plan | `plan/E025-server-async-event-bus/E025-server-async-event-bus.plan.md` | Plan-Creator | Lifecycle contract |
| Python plan | `plan/E025-server-async-event-bus/python/E025-server-async-event-bus.plan.md` | Plan-Creator | Python implementation contract |
| Shared spec | `plan/E025-server-async-event-bus/E025-server-async-event-bus.spec.md` | Plan-Creator | R1–R6 acceptance/scenarios |
| Shared steps | `plan/E025-server-async-event-bus/E025-server-async-event-bus.step.md` | Creator | Six workflow stages; creator evidence |
| Review log | `plan/E025-server-async-event-bus/review-log.md` | Reviewer / Main | Actual independent verdicts and routing |
| Experiment app | `experiments/E025-server-async-event-bus/app.py` | Implementer | Typed model, supervisor, WS integration |
| Tests | `experiments/E025-server-async-event-bus/test_app.py` | Implementer | Handshake-driven R1–R6 tests |
| Runner | `experiments/E025-server-async-event-bus/run_experiment.py` | Implementer | Isolated workers and classification |
| Dependencies | `experiments/E025-server-async-event-bus/pyproject.toml` | Implementer | Experiment-only tool/runtime pins |
| Dependency lock | `experiments/E025-server-async-event-bus/uv.lock` | Implementer | Reproducible environment |
| Experiment record | `experiments/E025-server-async-event-bus/README.md` | Implementer / Tester | Eight-section findings/limitations |
| Summary | `experiments/E025-server-async-event-bus/evidence/summary.json` | Tester | Counts, versions, verdict, budget |
| Runs | `experiments/E025-server-async-event-bus/evidence/runs.jsonl` | Tester | Per-case/repetition audit/result |
| Worker transcripts | `experiments/E025-server-async-event-bus/evidence/workers.log` | Tester | Complete ordered worker stdout/stderr |
| Toolchain | `experiments/E025-server-async-event-bus/evidence/toolchain.txt` | Tester | Actual resolved versions/environment |
| Checks | `experiments/E025-server-async-event-bus/evidence/checks.txt` | Tester | Actual lint/type/test commands/outcomes |

Historical round-1 evidence is retained at exact paths `experiments/E025-server-async-event-bus/evidence/round-1/app.py`, `summary.json`, `runs.jsonl`, `workers.log`, `toolchain.txt`, and `checks.txt` (all names in that round-1 directory). This bounded artifact-inventory amendment preserves the pre-fix source/evidence; root evidence paths remain the current truth. No requirements or budget changed.

`.venv`, caches and build products are local untracked artifacts, not deliverables. Additional source/evidence paths require bounded plan amendment before use. Root README, VERSION and `.github/copilot-instructions.md` remain unchanged.

## Implementation Steps

1. Create `experiments/E025-server-async-event-bus/pyproject.toml` and `uv.lock` with isolated pinned runtime/test tools, then author `test_app.py` mapping R1–R6 and all parameterized cases to handshakes and independent expected audit assertions; record actual initial test state without calling an import failure behavioral RED.
2. Implement `experiments/E025-server-async-event-bus/app.py`: typed synthetic WS models, `create_app`, bubus adapter, fixed Robot supervisors, bounded queue, generation TaskGroups, cancellation/cleanup/quarantine, single writer and harness-only Lab gates/audit.
3. Implement `experiments/E025-server-async-event-bus/run_experiment.py` with parameterized node discovery, one process per candidate/case/repetition, 10-second case and 30-second outer watchdogs, deadline enforcement and evidence classification.
4. Execute the bounded local checks and complete 20-repetition matrix using the runner; save `evidence/summary.json`, `runs.jsonl`, `workers.log`, `toolchain.txt`, `checks.txt`, and write `README.md` with the eight-part experiment record, actual statuses, recommendation and evidence limits.

## Validation / Acceptance Checks

Shared spec R1–R6 is authoritative. All six case families and every parameter branch must run 20 times; incomplete matrix cannot be reported successful. B must progress before A cancellation. Include bus-pending stale event race and every failure/quarantine branch. All A/B sessions must share one app event loop per worker. Review ownership coverage across bus/subscriber/child handoffs and absence of leaked business tasks, not merely bus return values. Validate path scope, pinned environment, deadline, honest initial/final evidence and uppercase step markers. Reviewer independently checks the 11-section topic plan and separate 13-section Python plan; no author approval claim.

## Reviewer Handoff

```json
{
  "verdict": "approved",
  "blocking_issues": [],
  "copilot_feedback_triage": {"ADDRESS": [], "DISCUSS": [], "SKIP": []}
}
```

## Post-merge / release actions

No release, stable-library adoption, version bump or post-merge execution. Current authorization stops at Draft PR and human review, retaining feature branch/worktree. Reviewer Handoff above records the actual independent approval; detailed results and history are retained in review-log.

## Open Questions / Unresolved Items

No implementation-blocking product questions. Independent plan, implementation and code reviews are approved; corrected experiment evidence is complete. Optional analysis artifacts are absent as disclosed above; this does not create permission to add scope or claim their completion. Real SDK/Robot effects and production adoption remain separately deferred.
