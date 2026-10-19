# E025 — Python implementation contract

Planning review: **approved**, actual independent verdicts recorded in the shared review-log; no author self-approval. D1: **non-trivial**.
Canonical topic lifecycle is in `../E025-server-async-event-bus.plan.md`; shared spec is `../E025-server-async-event-bus.spec.md`, shared steps are `../E025-server-async-event-bus.step.md`. This Python contract has the required 13 sections; it does not replace the root 11-section topic contract.

## Goal

Build a reproducible synthetic FastAPI/bubus experiment proving or disproving complete per-Robot business cancellation, cross-Robot isolation and stale-work/result suppression. Return a recommendation with bounded evidence, not automatic production adoption.

## Non-goals

No custom EventBus/pubsub framework, production server/device/.github modifications, real network/Robot SDK, NLU, LLM/TTS SDK, actual playback/movement interruption, threads, remote operation or non-cooperative-work termination. No third-party internals changes, unbounded experiments, release, merge, worktree/branch deletion or shared-library extraction.

## Current Context

Feature worktree `/private/tmp/coami-server-async-event-bus-worktree`, branch `feat/andrew/server-async-event-bus`, base `93a1a7d`; dev remains untouched. `server/pyproject.toml` declares Python >=3.12,<3.13, FastAPI/Uvicorn and pytest/httpx/Ruff/Pyright tools; `server/uv.lock` supplies the inspected baseline. E025 is a new isolated experiment, not an existing production API. Optional `analysis/E025-server-async-event-bus/requirements.md` and `technical-spec.md` are absent: analysis-layer semantic warning/status INCOMPLETE, with approved dialogue explicitly materialized in the shared spec rather than silently substituted for existing analysis.

bubus 1.5.6 source shows a same-event-loop global lock across instances; parallel handlers do not establish Robot isolation, stop is not the required complete business barrier, and clear removes handlers. Source: https://raw.githubusercontent.com/browser-use/bubus/1.5.6/bubus/service.py . This source risk motivates R2; it is not a predeclared experimental failure.

## Requirements

- R1: cancel A's active/queued/subscriber/child business, verify cleanup barrier, preserve transport/control/B.
- R2: prove B progress before A cancellation and during cleanup in the same app event loop.
- R3: bounded queue capacity 2 with nonblocking rejection; Cancel/Ping remain serviceable when full and during cleanup.
- R4: generation cutoff blocks stale business and old result sends, including already-bus-queued events and both completion/cancel orderings; successful barrier permits new work.
- R5: disconnect cancels old session; reconnect admits work only after old cleanup, never resumes old work/results.
- R6: cleanup timeout/error and unhandled child/subscriber errors quarantine A across reconnect until teardown, without false success or impact on control/B.

Full acceptance, Given/When/Then and classification are in the shared spec; do not weaken them in tests.

## Decisions

- Async-planning status: **triggered** — shared spec R1–R6 introduce WebSocket async boundaries, background business ownership, concurrency, cancellation, cleanup, timeouts and grouped failure.
- Module/package placement: isolated `experiments/E025-server-async-event-bus/`; no production package installation or shared service abstraction.
- New public API: experiment-only `create_app(lab: Lab | None = None) -> FastAPI`, plus synthetic typed WS frames and harness `Lab`; no production API addition.
- Interface changes: new `/ws/{robot_id}` experiment endpoint with typed synthetic Work/Cancel/Ping and correlation IDs. Identity/session/generation ownership is internal; these frames are not an agreed Robot wire contract.
- Breaking changes allowed: no; no existing consumer or production signatures change.
- New dependencies: isolated `bubus==1.5.6`; pin inspected baseline `fastapi==0.141.1`, `starlette==1.6.0`, `anyio==4.15.1`, `pydantic==2.13.5`, `httpx==0.28.1`, `pytest==9.1.1`, `ruff==0.16.8`, `pyright==1.1.414` in experiment environment/lock. Use standard-library asyncio.TaskGroup for business ownership. Do not alter server dependency files.
- Error handling strategy: malformed frame validation rejects without starting business or cancelling healthy B; full/cleaning/quarantined work admission rejects explicitly. Supervisor catches/records grouped child/subscriber or cleanup failures and quarantines only that Robot. Cancellation success requires actual cleanup terminal evidence. Watchdog/environment interruptions remain distinguishable from observed contract violations.
- Typing strategy: fully annotated Pydantic discriminated synthetic input models and bubus BaseEvent models; typed supervisor/generation/audit state, Literal statuses and mapping/JSON types. Any required third-party typing accommodation must be narrow and documented, not an untyped business boundary.

### Async boundary decision

WebSocket receiver validates then routes normal Work through bubus; async short handlers transfer business into the Robot's current generation TaskGroup and return promptly. Cancel bypasses the bus. Long work belongs to the supervised generation, never the bus event loop/receiver. Parsing, status transitions and final send admission remain synchronous between await points.

### Resource lifecycle decision

App lifespan owns bus infrastructure and fixed per-Robot supervisors. A Robot supervisor persists across connections until prior cleanup/quarantine is resolved; generation owns all its business tasks, queue entries and result tags. Separate connection-owned receiver/writer/control lifetimes from business cancellation. App teardown closes supervised infrastructure and records remaining task state; parent process watchdog bounds failed teardown. No broad asyncio.all_tasks cancellation.

### Concurrency model

One asyncio app event loop per worker, with two WebSocket sessions using the same TestClient portal. Each Robot has a fixed supervisor, generation TaskGroup and queue capacity 2; all primary, subscriber and child business is registered in the generation before it can run. Short dispatch callbacks and generation checks bridge bus-to-supervisor transfer. Lab contains only harness gates/audit, including a nonbusiness bus gate for stale-pending-event tests. Never use global bus stop as per-Robot cancellation.

### Failure model

Robot supervisor observes and contains TaskGroup/ExceptionGroup failures, records the cause, invalidates business and reaches quarantined state without cancelling WebSocket/control/B. Cleanup timeout, cleanup exception, child exception and subscriber exception each require independent injection/evidence. Quarantine prohibits business admission on current/reconnected sessions until case teardown; no recovery path. Validation/full-queue rejection is not a Robot business-failure quarantine.

### Cancellation / timeout policy

On recognizing Cancel, invalidate old generation before the receiver next awaits, close admission, discard old queue, request cancellation for every owned task and await cleanup. Repeated Cancel coalesces while cleanup is active. Use bounded shielded cleanup within one 2-second cancellation/barrier budget, not cumulative unbounded waits; timeout/error quarantines and cannot produce cancellation-complete. New generation requires successful old barrier. Disconnect follows the same cleanup policy; reconnect must respect old cleanup/quarantine.

Writer's final generation/session gate to beginning send contains no await. No new old-generation send may start after cancellation cutoff; already-started/in-flight frames cannot be recalled. Pending bus events must recheck generation at transfer/start so old work cannot be created after cancellation.

Per parameterized test node, a signal watchdog limits case execution to 10 seconds; runner's independent parent process deadline is 30 seconds including startup/teardown. Watchdog termination cannot prove business cancellation. Entire topic budget starts 2026-10-19 04:22:30 UTC, ends 05:52:30 UTC, with at most two bounded implementation-fix rounds per candidate.

### Validation plan

Tests use handshake-gated started/queued/child/subscriber/cleanup/result/send observations and independent assertions, not tight elapsed-time comparisons. R1–R6 include 12 parameterized nodes (four single cases, four result/bus/writer-race variants, four failure variants), each 20 times in a fresh process: 240 main workers plus a separate invalid-input smoke. Check same-loop identity, B progress before A cancellation, full queue control, child/subscriber/internal-related ownership, barrier order, stale pending events/results, reconnect and quarantine. Record per-worker actual input/audit/exit/watchdog/versions and classify honestly.

### Handoff notes for the implementer

Implement bubus first; Pydantic-native is preferred below cancellation correctness. Only investigate another existing bus after a necessary-gate failure and within the same remaining budget; do not build a comparison framework or custom bus. A further candidate must use the same ownership/handoff strategy and cases, with recorded dependency/source evidence before coding.

Author tests before behavior where practical. A minimum importable `create_app`/Lab scaffold is permitted to get meaningful behavioral RED; do not claim production_code_modified:false or label an import/collection failure red-tests-ready. If a formal TDD skill guard is inapplicable to new experiment scaffolding, record skip_with_reason and the actual initial state rather than inventing a gate. No additional TDD approval requirement is introduced by this plan.

### Async contradiction log

Resolved historical candidate conflict: earlier self-written thin pub/sub alternative was removed by explicit owner clarification. Existing bus is mandatory; asyncio/AnyIO task primitives are not competing EventBus candidates. No remaining async contradiction. The separate 11/13-section plan files and shared step/spec satisfy both planning contracts without mixing schemas.

## Public Contract / API Changes

Experiment-local `create_app(lab: Lab | None = None) -> FastAPI` returns a fresh isolated app; omitted Lab creates ordinary synthetic setup, supplied Lab permits controlled async gates/audit only. `/ws/{robot_id}` accepts typed Pydantic Work, Cancel and Ping; Work carries opaque work correlation, while generation/session are assigned internally. Reject malformed frames explicitly without business launch. Outputs expose experiment admission/result/control/barrier status and retain work correlation for assertions; exact output model details remain experiment-local and must be typed, never promoted to Robot protocol. Lab is not a production orchestration or business dependency. No existing public APIs change.

## Affected Files / Modules

Likely affected files:
- `experiments/E025-server-async-event-bus/app.py`
- `experiments/E025-server-async-event-bus/test_app.py`
- `experiments/E025-server-async-event-bus/run_experiment.py`
- `experiments/E025-server-async-event-bus/pyproject.toml`
- `experiments/E025-server-async-event-bus/uv.lock`
- `experiments/E025-server-async-event-bus/README.md`
- `experiments/E025-server-async-event-bus/evidence/summary.json`
- `experiments/E025-server-async-event-bus/evidence/runs.jsonl`
- `experiments/E025-server-async-event-bus/evidence/workers.log`
- `experiments/E025-server-async-event-bus/evidence/toolchain.txt`
- `experiments/E025-server-async-event-bus/evidence/checks.txt`
- Root topic plan, this Python plan, shared spec/steps and review-log under `plan/E025-server-async-event-bus/` as enumerated by the topic plan.

Candidate files to inspect:
- `AGENTS.md`, `server/pyproject.toml`, `server/uv.lock`, `.pre-commit-config.yaml` (read-only context).

## Implementation Steps

1. Create `experiments/E025-server-async-event-bus/pyproject.toml` and `uv.lock` with isolated pinned runtime/test tools, then author `test_app.py` mapping R1–R6 and all parameterized cases to handshakes and independent expected audit assertions; record actual initial test state without calling an import failure behavioral RED.
2. Implement `experiments/E025-server-async-event-bus/app.py`: typed synthetic WS models, `create_app`, bubus adapter, fixed Robot supervisors, bounded queue, generation TaskGroups, cancellation/cleanup/quarantine, single writer and harness-only Lab gates/audit.
3. Implement `experiments/E025-server-async-event-bus/run_experiment.py` with parameterized node discovery, one process per candidate/case/repetition, 10-second case and 30-second outer watchdogs, deadline enforcement and evidence classification.
4. Execute the bounded local checks and complete 20-repetition matrix using the runner; save `evidence/summary.json`, `runs.jsonl`, `workers.log`, `toolchain.txt`, `checks.txt`, and write `README.md` with the eight-part experiment record, actual statuses, recommendation and evidence limits.

## Test Plan

File: `experiments/E025-server-async-event-bus/test_app.py`. Six families are `test_complete_cancellation`, `test_robot_isolation`, `test_queue_full_and_repeated_cancel`, `test_races_and_restart`, `test_disconnect_and_reconnect`, and `test_failure_quarantine`. Parameterize case 4 by complete-first/cancel-first/bus-pending/writer-pending, case 6 by cleanup_timeout/cleanup_error/child_error/subscriber_error. Runner discovers all 12 main parameterized nodes and repeats each 20 times rather than treating a family as one run. `test_invalid_input_keeps_control` is an additional smoke test, outside the 240 main workers.

- Happy path: R1 complete cancellation and cleanup, R2 B progress, new work after successful barrier; Ping confirms control survival.
- Invalid input: Pydantic malformed/unknown frames reject without business launch; full-queue/cleaning/quarantined admission rejects explicitly. No new production wire validation policy.
- Edge case: full queue, repeated Cancel, both completion races, already-queued stale bus event, disconnect/reconnect during cleanup, child/subscriber grouped error and cleanup timeout/error.
- Regression: no old-result send begins after cutoff, no old business launches after bus dispatch is released, same identity reconnect respects quarantine, no global bus-stop impact on B.
- Backward compatibility: no existing production API changed; real Robot/SDK compatibility N/A because not integrated. Same-loop ASGI behavior is not real-network validation.

Use asynchronous gates through the existing shared portal; never sleep to infer ordering. Tests may use watchdogs to prevent hangs, not as proof of successful cancellation. Audit terminal business state explicitly.

## Validation Commands

Run from `experiments/E025-server-async-event-bus/` in the feature worktree. Keep all installs/caches isolated; no server lock modification.

```sh
uv sync --frozen
uv run pytest --collect-only -q test_app.py
uv run ruff check app.py test_app.py run_experiment.py
uv run ruff format --check app.py test_app.py run_experiment.py
uv run pyright app.py test_app.py run_experiment.py --pythonversion 3.12
uv run python run_experiment.py --repetitions 20 --case-timeout 10 --worker-timeout 30 --deadline 2026-10-19T05:52:30Z
```

Runner launches pytest workers using its own interpreter, records initial/final evidence and enforces process boundaries. Single selected-node runs for bounded diagnosis use `uv run pytest -q 'test_app.py::<nodeid>'`; do not replace the required full matrix with a diagnostic pass. Record exact commands, exit status, versions and source identity. Do not rerun a successful full matrix without changed code, a failure or unresolved evidence concern.

## Risks

bubus lock may serialize direct long handlers; short supervised transfer must actually let B progress before cancellation. Bus queue/handler/task handoff can leak stale work. TaskGroup failure can escape to transport unless Robot-owned supervision contains it. Shielded cleanup can hang without both local and outer bounds. TestClient instances on different loops can falsely hide shared-lock issues. Synthetic cooperative evidence cannot prove SDK/remote/hardware cancellation. Deadline or watchdog may leave an incomplete matrix, which cannot be reported success.

## Rollback Plan

Revert only the topic's enumerated `plan/E025-server-async-event-bus/` and `experiments/E025-server-async-event-bus/` tracked changes with a normal topic revert if needed. Do not reset dev or remove unrelated files, branches or worktrees. No release/version rollback because none is introduced. At authorized Draft PR/human boundary retain branch/worktree; do not merge/delete.

## Open Questions

None blocking. Independent plan, implementation and code reviews are approved and the source-matched experiment matrix is complete. Real SDK/Robot effects, alternate candidate if necessary, and production adoption remain future decisions constrained by the same scope/budget.
