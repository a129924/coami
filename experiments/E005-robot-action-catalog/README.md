# E005 — Robot action catalog

This TypeScript-only POC runs in the Stack-chan browser simulator. It researches face and head actions and records each human trigger as structured JSONL. E004's FastAPI greet experiment is separate; this page has no server connection.

## Run

Use Node 24–26. From this experiment's `web/` directory:

```sh
npm ci
npm run prepare:poc
npm test
npm run build
npm run dev -- --port 5175
```

Open `http://127.0.0.1:5175/`. The pinned simulator WASM files are fetched only if absent and checked by SHA-256; the MOD archive is built from `mod/mod.ts`. The candidate dropdown and generic test button let a researcher observe each action. A dedicated button appears only after the action matrix records an independent visual PASS. B stops the active action and returns to neutral. Download JSONL to inspect explicit command and result fields.

## Protocol and evidence

The browser can push only simulator A/B/C. The E005 MOD interprets A as selection, C as execute, and B as stop/reset. Selection and release acknowledgements must match before C. The experimental record fields are in [action-records.md](contracts/action-records.md). The question, procedure, result and decision are in [EXPERIMENT.md](EXPERIMENT.md), with per-candidate observations in [action-matrix.md](evidence/action-matrix.md) and the visible [WebM run](evidence/action-run.webm).

No real servo, network transport, audio, or production device/server behavior is asserted by this POC.
