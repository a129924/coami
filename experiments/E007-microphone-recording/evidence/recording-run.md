# E007 recording run evidence

## Repeatable action

From E007 `web/`, run `npm run prepare:poc`, `npm run build`, and `npm run dev -- --port 5177`. Open the local page in a browser with microphone access, click the record button, say “一、二、三” within two seconds, and listen with headphones. Repeat with permission denied. The page itself saves no voice media.

## Available evidence, 2026-09-24

Manual-run environment reported by the independent human Tester, identified as the repository owner and distinct from the implementing agent: Chrome browser and personal headphones; microphone model not reported.

| Check | Observation |
| --- | --- |
| Strict TypeScript and web build | PASS |
| XS MOD archive | PASS, 2,060 bytes |
| Mock `record(2000)` and same-buffer replay | PASS, 12-byte buffer object identity preserved |
| Mock duplicate press and release | PASS, one recording call |
| Mock permission denial | PASS, `permission_denied` result |
| Mock empty buffer | PASS, `empty_buffer` result |
| Mock playback false | PASS, `playback_failed` result |
| Browser capture and byte count | Owner supplied `COAMI7|{"kind":"run","run_seq":3,"phase":"completed","byte_length":28310}` on 2026-09-24 |
| Independent audible recognition | Repository owner, acting as independent human Tester, reported clearly hearing “一、二、三” in replay on 2026-09-24 |
| PR #6 failure-path regression | `npm test` passed after reproducing and fixing playback-rejection misclassification and raw exception-detail leakage |

## Verdict

PASS for the scoped two-second capture and recognizable local replay: 28,310 bytes, terminal `completed`, and independent listening by the repository owner on 2026-09-24. This human Tester was distinct from the implementing agent. No voice file was stored. The initial independent code/evidence re-review returned `approved` with no blocking issues; PR #6 follow-up findings and corrections are recorded in `EXPERIMENT.md`.
