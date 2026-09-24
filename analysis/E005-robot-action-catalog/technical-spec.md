# E005 Robot action catalog — technical spec

## Runtime boundary

The browser uses only `SimulatorEngine.pushButton('a'|'b'|'c')` and `onTrace`. There is no FastAPI connection, vendor edit, or device/server wire contract. The E005 MOD owns a fixed, versioned catalog. A pressed selects the next entry; C pressed executes it; B pressed cancels and resets. Browser and MOD must both be ready before dispatch.

## Catalog and visible candidates

The ordered catalog has IDs `face.neutral`, `face.angry`, `face.sad`, `face.happy`, `face.sleepy`, `face.doubtful`, `face.cold`, `face.hot`, `face.blink`, `face.wink_left`, `face.wink_right`, `face.mouth_open`, `head.left`, `head.right`, `head.up`, `head.down`, `head.nod`, `head.shake`, `head.center`, `greet`. `control.stop` is a separate B control, never a catalog entry. Initial selected index is -1. Candidate IDs do not imply visual support; only IDs with per-action PASS evidence may be enabled as dedicated buttons.

Emotions dwell 1.5 seconds before neutral. Eye closure uses 0 then 1 after 0.9 seconds; mouth uses 0.8 then 0 after 0.9 seconds. Robot-left yaw is +π/6, right is -π/6; up pitch is -π/6, down is +π/32. Poses dwell 0.9 seconds then return to zero. Nod uses pitch +0.28, shake uses yaw +0.25/-0.25/0. Neutral and center are tested from non-neutral and offset states. These are simulator-only values.

## Local trace protocol

Each MOD trace is one line: `COAMI5|` followed by JSON. Every message has `kind` and `catalog_version: 1`. `catalog` carries ordered `action_ids` and `selected_index: -1`. `selection` carries `selection_seq`, `selected_index`, `action_id`, `phase: 'pressed'|'released'`. `run` carries `run_seq`, `action_id`, `phase: 'started'|'completed'|'cancelled'|'failed'` and optional error. `reset` carries `phase: 'completed'|'failed'|'released'`. The browser ignores non-E005 trace lines and rejects malformed or mismatched messages.

For each A push, the browser awaits matching selection pressed and released phases, including `selection_seq`, `selected_index`, and `action_id`, before pushing A again. C is sent only after the confirmed action ID matches the requested ID. An acknowledgement timeout or mismatch produces a failed/timeout browser result and triggers B reset, without C. Browser holds at most one action request plus one stop request; a second stop is unavailable during internal reset. B invalidates the MOD's run generation and pending waits; the MOD emits exactly one run terminal, waits for the old runner to be quiescent, restores neutral face/eyes/mouth/pose, resets its selected index to -1 and selection sequence to 0, then emits reset completed. The browser resets its matching counters after confirmed reset completion and release. A failed MOD terminal also triggers B reset before another action may run. B release has a separate trace. Reset failure disables controls until restart. Restart increments browser `simulator_generation`; old callbacks and late run traces cannot resolve new requests.

## Record contract

Download is UTF-8 JSONL. Every action or B-stop click creates a `command` row and exactly one `result` row; restart and download controls do not create records. Export stays disabled while a result is pending. Both rows include `schema_version: 1`, `request_id`, `action_id`, `category`, `source: 'human_button'`, and `simulator_generation`; command includes `requested_at`. Result includes `mod_run_seq: number|null`, `started_at: string|null`, `finished_at`, `status: 'completed'|'cancelled'|'failed'|'timeout'`, `error_code: string|null`, `detail: string|null`, `cancelled_by_request_id: string|null`. A B control has `action_id: 'control.stop'`, `category: 'control'`, and records B dispatch time as `started_at`. If B interrupts a run, its action result precedes the B result and references the B request ID. A browser timeout is terminal even without a MOD terminal; late MOD traces are diagnostic only.

## Evidence rule

MOD completion proves the programmed sequence and dwell ended; it does not prove a visible effect. Each candidate is run from a declared starting state with trace and a video timecode. The action matrix records API source, parameters, expected/observed effect, MOD status, visual PASS/FAIL, and decision. Only PASS entries are in the enabled button list.
