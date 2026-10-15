---
topic: E024-mock-target-offset
phase: plan-authoring
created: 2026-10-15
---

# E024-mock-target-offset — Step Tracking

> Executor: Mark each step `[X]` only with recorded evidence. All Implementation Steps must be `[X]` before implementation review.

## Workflow Stages

- [X] plan-authoring
- [X] plan-review
- [ ] tdd-test-authoring
- [X] implementation
- [X] implementation-review
- [X] code-review

## Implementation Steps

- [X] 1. Create experiments/E024-mock-target-offset/test_calculator.py and mock_cases.py with independent expected values, classifications, identity, immutable snapshot and deterministic-repeat checks.
- [X] 2. Implement experiments/E024-mock-target-offset/calculator.py with immutable VO, bounded validation, exclusive results and pure current-center normalization.
- [X] 3. Add experiments/E024-mock-target-offset/run_cases.py and pyrightconfig.json for a repeatable fixed-case demonstration and strict local type checking.
- [X] 4. Run the bounded unittest, Ruff, Pyright and fixed-case commands; record actual evidence and the eight-part experiments/E024-mock-target-offset/README.md without claiming consumer or control convergence.

## Handoff / Gate Notes
Python implementation profile; canonical Python 13-section plan, not a competing Base topic schema.
All writes are in /private/tmp/E024-mock-target-offset/feature-worktree on feat/andrew/e024-mock-target-offset; primary-worktree=false.
Actual review evidence is recorded in review-log.md. Tests-first initial import failure is not behavior-level RED; tdd-test-authoring stage is not claimed without its distinct gate.
User authorized commit/push/Draft PR on 2026-10-15 and requested stop for human review; no merge, post-merge cleanup or release.

Completion evidence: experiments/E024-mock-target-offset/evidence/run.json and README.md; common cases and tests.txt. Independent implementation and code review results are recorded below.

Independent implementation/code-quality approvals: review-log.md. Lifecycle stops at Draft PR human review; pending formal TDD is not claimed as complete or required by this experiment contract.
