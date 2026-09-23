# E004 simulator named Action protocol

This experiment uses one `coami-sim-001` browser simulator. The browser bridge represents the Robot WebSocket client because the pinned simulator WASM has no Wi-Fi. The wire contract is independent of FastAPI, Python, and MOD internal types.

## Named Action

`Action` is an explicit enum with the sole v1 value `greet`. The Python `StrEnum` and TypeScript enum serialize to the same lowercase string. The MOD receives a C button event; it does not parse Action names. Unknown HTTP Action values are rejected before command creation with `422 {"detail":"unsupported_action"}`. Unknown WebSocket Action values receive a correlated `failed/unsupported_action` result from the bridge.

## Session and dispatch

The bridge connects to `/v1/devices/coami-sim-001/session` and sends `{"type":"robot.hello","device_id":"coami-sim-001","version":1}`. Server sends `robot.ready` successfully before publishing the session for command dispatch. Ready and command sends are serialized and bounded.

An operator calls `POST /v1/devices/coami-sim-001/actions/greet` from FastAPI Docs. Unknown device is `404/unknown_device`; no dispatchable session is `409/device_offline`; Server-known pending command is `409/device_busy`. These rejections create no command. The Server checks session identity under the same lock before accepting an event; a queued event from a removed socket cannot create a command. Acceptance is HTTP 202 with:

```json
{"command_id":"<uuid>","event_id":null,"device_id":"coami-sim-001","action":"greet","status":"pending","detail":null}
```

Server records the command under one lock and sends:

```json
{"type":"robot.command","command_id":"<uuid>","action":"greet"}
```

The bridge maps `greet` to MOD C. On result it sends `robot.command_result` with the same `command_id`, `status: completed|failed`, and optional `detail`. A direct B interruption is `failed/local_interrupted`; execution failure is `failed` with its Robot detail. GET `/v1/commands/<command_id>` returns the current command view.

The direct command has a 10-second monotonic deadline from creation. A failed or stalled command send is terminal `failed/delivery_failed`; a successfully sent command without a result by the deadline is `failed/result_timeout`. Send success is evidence of WebSocket send completion, not physical receipt. On send failure, the Server removes the session and attempts a bounded close frame outside the lock so the bridge can reconnect. Disconnect marks pending commands `failed/device_disconnected`. A known late result for a terminal direct command is ignored after checking current session identity. No terminal state is overwritten.

The bridge retains local busy while MOD is acting, including across disconnect/reconnect. If Server accepts another command after losing its earlier pending state, the bridge rejects it with `failed/bridge_busy` under its own ID; it never starts a second greet. If MOD stop fails without a greet result, the Server timeout terminates the direct command, while bridge busy remains until an actual MOD terminal trace or simulator reset.

## E003 event compatibility

MOD A pressed emits `COAMI_EVENT|button|a|pressed`; the bridge sends `robot.event` with `event_id` and button summary. Server's fixed decision remains `greet`, and its `robot.command` retains `event_id`. The `robot.event_ack` dispositions `accepted|duplicate|busy`, duplicate mapping, and event-origin `cancelled` on B remain. Both entry paths share the same command store, session, busy check, result handler, and GET endpoint. Server state is in-memory and disappears on restart.
