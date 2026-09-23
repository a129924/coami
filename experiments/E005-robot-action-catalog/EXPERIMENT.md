# E005 — What visible actions can this robot simulator perform?

## Question

Can a human trigger named face/head actions through the existing three-button simulator bridge, with explicit records suitable for later validation? Which vendor action candidates have a distinguishable visible result?

## Procedure

1. Build the pinned MOD and simulator assets following `README.md`; confirm `catalog_version: 1`, ordered catalog, and simulator ready.
2. Run each candidate through the page's generic research control. For every A press, require a matching `selection_seq/action_id` pressed and released trace before sending the next A or C. Record the C start/terminal and visible dwell in the same run.
3. Inspect the [38.8-second WebM](evidence/action-run.webm) at the timecodes in [action-matrix.md](evidence/action-matrix.md), then independently mark visual PASS/FAIL. Only PASS IDs can be promoted to dedicated buttons.
4. During an action, press B; check run cancellation, reset completion/release, neutral appearance, and downloaded JSONL pairing. Run `npm test`, `npm run typecheck`, `npm run mod`, and `npm run build`.

## Creator evidence, 2026-09-23

- A headless Chrome run used the actual E005 page and WASM simulator. All 20 catalog candidates emitted `started` and `completed`; the page produced 40 records, one command and one result per click. The video and preliminary observations are in the action matrix. This establishes MOD execution, not yet independent visual PASS.
- Three emotions (`DOUBTFUL`, `COLD`, `HOT`) had no distinguishable appearance from neutral in the recorded simulator view. The independent Tester marked them FAIL, and they remain candidates without dedicated buttons. The Tester marked the other 17 candidates PASS after inspecting their visible effects at the matrix timecodes; only those IDs have dedicated buttons.
- A separate actual simulator stop run yielded `selection pressed → released → run started → run cancelled → reset completed → reset released`. The downloaded JSONL had four rows: the interrupted `face.neutral` result was `cancelled` and referenced the `control.stop` request; the stop result was `completed`. No C was sent before the selected action was confirmed.
- Same-run MOD trace excerpt from that stop run (all messages had `catalog_version: 1`):

  ```text
  selection selection_seq=1 selected_index=0 action_id=face.neutral phase=pressed
  selection selection_seq=1 selected_index=0 action_id=face.neutral phase=released
  run run_seq=1 action_id=face.neutral phase=started
  run run_seq=1 action_id=face.neutral phase=cancelled
  reset phase=completed
  reset phase=released
  ```

- A separate stop-during-selection run targeted `greet` from initial index -1. It emitted five selection traces before B, no run-start/C trace, and one reset completed/released pair. This caught and fixed an initial index wraparound bug in the browser dispatcher; the direct-last-item regression test now passes.
- A fresh simulator run selected `greet` directly from index -1 through the full catalog and finished `greet · completed` with one command/result pair, confirming the wraparound fix in the real bridge.
- The independent Tester also repeated the interruption in a fresh browser run: A pressed/released, C started/cancelled, then B reset completed/released. Its downloaded JSONL had one command/result pair for the action and one for stop, with `cancelled_by_request_id` pointing to the stop request. A separate `face.angry` run completed with matching A/C traces and one pair.
- After enabling only the 17 PASS IDs, a fresh Chrome run clicked every dedicated button once. All 17 completed, the three FAIL IDs were absent from dedicated controls, and the page held exactly 34 command/result records.
- Independent implementation review found a stop-during-selection race: with synchronous A pressed/released acknowledgements, an immediate B could still be followed by C. A regression test reproduced `A → B → C` before the fix. The dispatcher now rechecks cancellation after each selection acknowledgement and immediately before C; the same test passes with `A → B`, a cancelled action linked to the stop request, and a completed stop result.
- The independent Reviewer rechecked that fix and the final E005-only staged set, then returned `approved` with no blocking issues; all 15 dispatcher tests, strict typecheck, and web build passed.
- Dispatcher tests cover selection mismatch, rapid clicks, cancellation during selection and active run, acknowledgement timeout, reset failure lockout, restart, catalog mismatch, and record pairing. `npm test`, strict typecheck, MOD archive build, and Vite build passed. The build reports a size warning for the pinned simulator bundle but completes successfully.

## Decision and limits

The A/C/B selector protocol is viable in the browser simulator. Independent visual review supports dedicated buttons for 17 PASS actions; `face.doubtful`, `face.cold`, and `face.hot` are FAIL and have no dedicated buttons. MOD completion alone is not treated as visual proof. This experiment does not validate M5Stack hardware, real servos, or a future device/server wire contract.
