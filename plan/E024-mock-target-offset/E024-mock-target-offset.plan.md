# E024 — Mock observation to TargetOffset

## Goal
Verify that one Mock frame observation can produce a correct, resolution-independent current-center TargetOffset, an explicit no-target result, or a rejected result, preserving observation identity.

## Non-goals
No real OpenCV interface selection/implementation, models, camera, images, tracking, target selection, frame differencing, mirror/crop/resize processing, distance/angles, Robot SDK, control loop or real consumer integration. No production APIs, shared package, server/device changes, external runtime dependencies or release.

## Current Context
Materialization of the owner-approved five-section dialogue processed-plan and approved local clarifications, not a new mission. No existing upstream VO/Calculator implementation exists in the base. E023 is a distinct downstream gaze experiment and remains untouched. Optional analysis artifacts are absent; the approved dialogue contract is materialized in the companion spec.
Base: a855b451b6fe1c24d02caf67c569ffa90a9ea732 (origin/dev).
Worktree: /private/tmp/E024-mock-target-offset/feature-worktree; branch: feat/andrew/e024-mock-target-offset; primary-worktree=false.
D1: non-trivial — new immutable observation/result contract, numeric validation and pure transformation across multiple experiment files.
User explicitly authorizes bounded implementation, topic commit, push and Draft PR, followed by human review; no merge, release or cleanup authorization. Remote branch and worktree retained at human review. Lifecycle terminal at merged; release not required.

## Requirements
R1. DetectionObservation is one frame snapshot: opaque str observation_id, integer dimensions, tuple of current boxes; ID is not cross-frame target identity and is unchanged in all outcomes.
R2. Immutable typed Box, TargetOffset and exclusive Target/NoTarget/Rejected results; only Target has offset and only Rejected has one of invalid_frame/multiple_targets/invalid_box.
R3. Validate original numeric types and MAX_PIXEL bounds before arithmetic: frame int excluding bool in [1, 2**31-1]; box int/float excluding bool, each between -MAX and MAX, positive dimensions, full containment including touching edges. No repair or clamp.
R4. Frame validation precedes count: zero boxes => NoTarget, more than one => multiple_targets, one invalid box => invalid_box; all invalid frames => invalid_frame.
R5. Normalize current center relative to frame center: left/up negative, right/down positive, center zero, output [-1,1]. Not previous-current motion or rotation angle.
R6. Pure synchronous stateless deterministic function: no OpenCV/image/Tracker/SDK/history/I/O. Repeated identical observations yield identical results and never automatically converge.
R7. Independently specified common vectors prove direction, center, scaling, size invariance, fractional boxes, edges and bounded/invalid classification; every outcome preserves ID.
R8. Document adapter-side detector/Tracker ownership and external observe/adapt/calculate/rotate/reobserve responsibility, deferred tracking/consumer/control validation and actual experiment evidence.

## Decisions
- Async-planning status: exempt — R6 fixes synchronous scalar arithmetic with no I/O, resources, cancellation, background work or concurrency boundary.
- Module/package placement: isolated experiments/E024-mock-target-offset/, imported from that directory; no installation or production package.
- New public API: experimental calculate_offset(observation: DetectionObservation) -> OffsetResult and immutable VO described below.
- Interface changes: new experiment-local interface only; no existing consumers changed.
- Breaking changes allowed: no; no existing interface modified.
- New dependencies: none. Standard-library dataclasses, typing and unittest; existing server venv Ruff/Pyright reused as developer tools without modifying it.
- Error handling strategy: invalid values inside typed VO return Rejected; zero targets is NoTarget; no expected input-validation exceptions. Arbitrarily malformed Python objects/JSON are outside the typed boundary.
- Typing strategy: fully annotated frozen dataclasses, tuple boxes and Literal reason codes; no Any. Deliberately malformed-value test fixtures may use documented cast solely to exercise runtime validation.
MAX_PIXEL = 2**31 - 1 is experiment policy, not an OpenCV guarantee. Check type and comparison bounds before float conversion/isfinite/arithmetic. Image coordinate convention: already oriented, unmirrored, top-left origin, X right/Y down, pixel boundaries with fractional boxes supported.
No true adapter selected: OpenCV 4.8.0 Cascade rectangles and FaceDetectorYN faces first xywh fields can map into these VO, but partial out-of-image rectangles are rejected. ID comes from caller. Detector/Tracker remains adapter-side; native errors must not become no_target. Image shape is height,width.
Sources: https://docs.opencv.org/4.8.0/d1/de5/classcv_1_1CascadeClassifier.html ; https://docs.opencv.org/4.8.0/df/d20/classcv_1_1FaceDetectorYN.html ; https://docs.opencv.org/4.8.0/d3/df2/tutorial_py_basic_ops.html .

## Public Contract / API Changes
Frozen dataclasses: Box(x: int|float, y: int|float, width: int|float, height: int|float); DetectionObservation(observation_id: str, frame_width: int, frame_height: int, boxes: tuple[Box,...]); TargetOffset(horizontal: float, vertical: float); Target(observation_id: str, offset: TargetOffset); NoTarget(observation_id: str); Rejected(observation_id: str, reason: Literal["invalid_frame","multiple_targets","invalid_box"]). OffsetResult = Target | NoTarget | Rejected.
calculate_offset(observation: DetectionObservation) -> OffsetResult. Constructors represent data; numeric validation occurs in Calculator, not constructor exceptions. No existing public API changes or backward incompatibility.
For valid single box: cx=x+w/2, cy=y+h/2; horizontal=(cx-W/2)/(W/2), vertical=(cy-H/2)/(H/2).

## Affected Files / Modules
Likely affected files:
- experiments/E024-mock-target-offset/calculator.py
- experiments/E024-mock-target-offset/mock_cases.py
- experiments/E024-mock-target-offset/test_calculator.py
- experiments/E024-mock-target-offset/run_cases.py
- experiments/E024-mock-target-offset/pyrightconfig.json
- experiments/E024-mock-target-offset/README.md
- experiments/E024-mock-target-offset/evidence/ (bounded actual command transcripts and run metadata)
- plan/E024-mock-target-offset/E024-mock-target-offset.plan.md
- plan/E024-mock-target-offset/E024-mock-target-offset.spec.md
- plan/E024-mock-target-offset/E024-mock-target-offset.step.md
- plan/E024-mock-target-offset/review-log.md
Candidate files to inspect: AGENTS.md, server/pyproject.toml, .pre-commit-config.yaml. These remain unchanged.

## Implementation Steps
1. Create experiments/E024-mock-target-offset/test_calculator.py and mock_cases.py with independent expected values, classifications, identity, immutable snapshot and deterministic-repeat checks.
2. Implement experiments/E024-mock-target-offset/calculator.py with immutable VO, bounded validation, exclusive results and pure current-center normalization.
3. Add experiments/E024-mock-target-offset/run_cases.py and pyrightconfig.json for a repeatable fixed-case demonstration and strict local type checking.
4. Run the bounded unittest, Ruff, Pyright and fixed-case commands; record actual evidence and the eight-part experiments/E024-mock-target-offset/README.md without claiming consumer or control convergence.

## Test Plan
Test file: experiments/E024-mock-target-offset/test_calculator.py; cases: mock_cases.py.
- Happy path: independently fixed centers, cardinal/diagonal directions, scaling and box-size invariance.
- Invalid input: frame 0/negative/fractional/bool/NaN/Inf, boxes nonnumeric/bool/NaN/Inf/zero/negative/out-of-bounds, multi-target; MAX+1 and huge ints rejected without overflow.
- Edge case: fractional coordinates, touching all edges, full frame, MAX full-frame int/float, empty observations and ID across all outcomes.
- Regression: no-target distinct from center; repeated nonzero observation remains nonzero; interleaving observations does not affect output; immutable VO and no input mutation.
- Backward compatibility: no existing API consumers changed; real consumer compatibility N/A because no consumer integration is in scope.
Tests are authored before calculator implementation. Initial unavailable-module import is recorded honestly as import/collection evidence, not behavior-level RED or red-tests-ready. This is the approved unittest experiment, not an added pytest/TDD workflow requirement.
Absolute numeric tolerance 1e-12, relative 0. Optional independent Mock sequences are illustrative and cannot prove Robot convergence.

## Validation Commands
Run from experiments/E024-mock-target-offset/ in the feature worktree:
```sh
/Users/andrew/code/python/coami/server/.venv/bin/python -m unittest -v
/Users/andrew/code/python/coami/server/.venv/bin/python run_cases.py
/Users/andrew/code/python/coami/server/.venv/bin/ruff check .
/Users/andrew/code/python/coami/server/.venv/bin/ruff format --check .
/Users/andrew/code/python/coami/server/.venv/bin/pyright --project pyrightconfig.json
```
Source-only check requires calculator imports only standard library and no production files changed. Do not install tools or real detector assets.

## Risks
Native detector output differs and can be partially outside image; future specific adapter must map or explicitly reject without silently changing this contract. Mock correctness cannot establish real tracking/consumer/control behavior. Huge Python ints require bounds before float operations. External review maps must describe actual commits and stay local.
Budget recommendation: 60 minutes, at most one local implementation correction/re-run; stop at a material contract/scope change or unavailable prerequisite, preserve evidence.

## Rollback Plan
Revert only this topic's plan/E024-mock-target-offset and experiments/E024-mock-target-offset changes via a normal revert if needed. Do not remove or alter E023, dev or other worktrees. Do not delete branch/worktree at human review. No release, version bump or tags; no post-merge action in this authorization.

## Open Questions
None blocking implementation. Real detector/tracker, actual consumer compatibility and control convergence remain explicitly deferred missions.
