---
topic: E025-server-async-event-bus
phase: plan-authoring
created: 2026-10-19
---

# E025-server-async-event-bus — Step Tracking

> **Executor**: Mark each step `[X]` when complete.
> All Implementation Steps must be `[X]` before submitting for `python-implementation-review`.
> Update this file at: `plan/E025-server-async-event-bus/E025-server-async-event-bus.step.md`.
> Shared by the root topic plan and `python/E025-server-async-event-bus.plan.md`; reviewer verdicts belong in review-log, not Implementation Steps.

## Workflow Stages

- [X] plan-authoring
- [X] plan-review
- [X] tdd-test-authoring
- [X] implementation
- [X] implementation-review
- [X] code-review

## Implementation Steps

- [X] 1. Create `experiments/E025-server-async-event-bus/pyproject.toml` and `uv.lock` with isolated pinned runtime/test tools, then author `test_app.py` mapping R1–R6 and all parameterized cases to handshakes and independent expected audit assertions; record actual initial test state without calling an import failure behavioral RED.
- [X] 2. Implement `experiments/E025-server-async-event-bus/app.py`: typed synthetic WS models, `create_app`, bubus adapter, fixed Robot supervisors, bounded queue, generation TaskGroups, cancellation/cleanup/quarantine, single writer and harness-only Lab gates/audit.
- [X] 3. Implement `experiments/E025-server-async-event-bus/run_experiment.py` with parameterized node discovery, one process per candidate/case/repetition, 10-second case and 30-second outer watchdogs, deadline enforcement and evidence classification.
- [X] 4. Execute the bounded local checks and complete 20-repetition matrix using the runner; save `evidence/summary.json`, `runs.jsonl`, `workers.log`, `toolchain.txt`, `checks.txt`, and write `README.md` with the eight-part experiment record, actual statuses, recommendation and evidence limits.

## Completion evidence

1. `experiments/E025-server-async-event-bus/pyproject.toml`, `uv.lock`, `test_app.py`; initial importable-scaffold observations and formal TDD guard skip_with_reason are recorded in `evidence/checks.txt`. No false production_code_modified:false claim.
2. `app.py` plus the 240 source-hash-matched audits in `evidence/runs.jsonl`.
3. `run_experiment.py`; one parameterized node per process, signal and independent process watchdogs.
4. `evidence/summary.json`: 240/240 success, 0 failure/inconclusive; every worker teardown has zero business tasks, no watchdog. `evidence/checks.txt` records all checks; eight-section README states limits and recommendation.

TDD workflow stage records test authoring before behavior and actual scaffold RED; it does not claim the separate formal TDD skill guard passed. Independent planning approvals are in review-log. Independent implementation/code reviews are approved; actual verdicts and bounded correction history are in review-log.
