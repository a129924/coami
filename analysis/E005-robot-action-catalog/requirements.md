# E005 Robot action catalog — requirements

## Goal

In a browser simulator, let a human trigger each verified visible face or head action with one button click and download structured command/result evidence.

## In-Scope

- Research the eight vendor emotions, eye blink and wink, mouth open, head left/right/up/down/nod/shake/center, and the previously demonstrated greet.
- Validate each candidate visually in the simulator before enabling its dedicated button.
- Record one command and one result per human request in downloadable JSONL, including cancellation and failure.
- Keep an independent B stop/reset control.

## Out-Of-Scope / Non-Goal

FastAPI, server APIs, real hardware, audio, arbitrary user pose parameters, production `src/`, changes to E003/E004/vendor, and release metadata.

## Acceptance

The three-button selector protocol is proven in the simulator before action buttons are enabled. Each enabled action has trace and video evidence of its visible effect, and every click has a matching command/result pair. Failed candidates remain documented without an enabled button.

## Constraints

All implementation and evidence is isolated under `experiments/E005-robot-action-catalog/` in the E005 feature worktree. E004 is an in-progress, unrelated FastAPI greet experiment and is not an implementation dependency.
