# E001 command protocol

This contract belongs to the experiment. It is independent of FastAPI and of the MOD runtime.

The browser simulator uses device ID `coami-sim-001`. After the MOD starts, the browser opens
`/v1/devices/coami-sim-001/session` and sends:

```json
{"type":"robot.hello","device_id":"coami-sim-001","version":1}
```

The Server replies `{"type":"robot.ready","device_id":"coami-sim-001"}`.

`POST /v1/devices/coami-sim-001/actions/greet` or `/stop` returns HTTP 202 with a
`command_id`, `device_id`, `action`, and `status: "pending"`. The Server sends:

```json
{"type":"robot.command","command_id":"<uuid>","action":"greet"}
```

The browser maps `greet` to MOD button A and `stop` to button B. The MOD reports a
`COAMI_RESULT|<action>|<status>` trace only after the visible action (or stop) runs. The
browser attaches the pending command ID and sends:

```json
{"type":"robot.command_result","command_id":"<uuid>","status":"completed"}
```

Statuses are `pending`, `completed`, `cancelled`, and `failed`. `GET /v1/commands/<uuid>`
returns the latest status. A disconnected simulator fails its pending commands. A second
greet while a greet is pending returns HTTP 409. This in-memory state resets with the
Server and is deliberately limited to one simulator.
