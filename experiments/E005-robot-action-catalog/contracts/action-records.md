# E005 local Action record contract

This is a browser-simulator experiment format, not a device/server wire contract. Every action or B-stop click writes a `command` JSONL line and exactly one matching `result` line; restart and download controls do not create records. Download is unavailable while an action or stop result is pending. `schema_version` is `1`; `source` is `human_button`. Pair lines by `(simulator_generation, request_id)` and require the same `action_id` and `category`.

| Field | Command | Result | Meaning |
| --- | --- | --- | --- |
| `record_type` | `command` | `result` | Discriminant |
| `schema_version` | `1` | `1` | Local record format |
| `request_id` | string | same string | Browser-created click identity |
| `action_id` | catalog ID or `control.stop` | same ID | Explicit requested action |
| `category` | `face`, `head`, `sequence`, or `control` | same category | Action family |
| `source` | `human_button` | `human_button` | Human trigger |
| `simulator_generation` | number | same number | Browser restart boundary |
| `requested_at` | ISO 8601 string | absent | Browser click time |
| `mod_run_seq` | absent | number or null | MOD run identity; null before C or for stop |
| `started_at` | absent | ISO 8601 string or null | MOD run start when observed; B dispatch time for `control.stop` |
| `finished_at` | absent | ISO 8601 string | Browser terminal time |
| `status` | absent | `completed`, `cancelled`, `failed`, `timeout` | Browser outcome |
| `error_code`, `detail` | absent | string or null | Failure detail |
| `cancelled_by_request_id` | absent | string or null | Stop request that interrupted an action |

The MOD emits only `completed`, `cancelled`, or `failed`; the browser records `timeout` when a required acknowledgement is absent. One action request may coexist briefly with one B stop request. On interruption, the action's result precedes the stop result, and each uses its own request ID. Old-generation traces are diagnostics only and never complete a new request.

MOD trace lines begin `COAMI5|` and contain JSON with `catalog_version: 1`. `catalog` declares the ordered IDs and initial `selected_index: -1`; `selection` has `selection_seq`, `selected_index`, `action_id`, and pressed/released phase; `run` has `run_seq`, `action_id`, and start/terminal phase; `reset` has completed/failed/released phase. A browser command ID is not sent through the A/B/C button bridge, so correlation relies on one active action and `(simulator_generation, run_seq, action_id)`.
