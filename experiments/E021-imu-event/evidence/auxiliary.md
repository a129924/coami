# E021 auxiliary evidence

## Archify — 2026-10-14

- Status: PASS for the standalone static dataflow artifact only. No runtime, recognizer, hardware or overall experiment acceptance is inferred.
- Authored language: Traditional Chinese. `meta.locale`, animation and visual preset are omitted; fixed Viewer UI and `<html lang>` fall back to English, and Classic/Still is the default.
- Scope: 8 nodes, one raw samples → C/WASM → device.sensor.IMU → unchanged SDK IMU polling → unchanged MotionRecognizer → original IMUInputEvent → MOD → UI path. Scratch provider/input/MOD are experimental; original recognizer/Event contracts remain original SDK. Source references: `runtime/wasm-imu.patch`, `mod/mod.ts`, `mod/observer.ts`, pinned SDK `imu.ts`/`imu-motion.ts`/`input-event.ts`. This artifact is nonproduction.
- Specification: `diagram/imu-flow.json`, SHA-256 `0c0e8926c054b55af5dab982b64f2916ce3ecb30d8ed00bb547984dfd75a84fd`, 3924 bytes.
- HTML: `diagram/imu-flow.html`, SHA-256 `d6fc0142b6183dad992eb8119ad049d0a5cbd5119aceea034f1a96e4d7fac338`, 705892 bytes.
- Final deterministic acceptance: `diagram/imu-flow.delivery.json`; showcase **9/9**, **0 errors**, **0 warnings**, deliver exit 0.
- Commands: `node /Users/andrew/.codex/skills/archify/bin/archify.mjs validate dataflow <spec> --quality showcase --json`; `deliver dataflow <spec> <html> --quality showcase --json`; `visual-check <html> --repo-root /Users/andrew/.codex/worktrees/05ae/coami --json`. No package installation, renderer/CSS changes, server, animation, upload or API/provider calls.
- Automated visual evidence: `diagram/imu-flow.visual-check.json` plus same-name HTML contact sheet and four PNG sidecars. Exit 0; containment PASS at 1440×900, 1600×1000, 1920×1080 and 2048×1320. Scroll size equals viewport at all four; screenshots capture Light/Dark at smallest/largest. Automated receipt deliberately retains `visualReview: "pending"`.
- `visual_review: passed` — this agent actually inspected the four final Light/Dark screenshots at 1440×900 and 2048×1320 with the image reader. Text and cards fit, arrows follow the main path with no crossings/masked endpoints, no clipping or desktop scroll, and the largest composition retains readable diagram/cards. This is screenshot-based visual inspection, not a claim of testing every viewer interaction.
- `correction_rounds: 2` for the perceptual/containment repair after the first trusted delivery. The authoring precheck readability repair is recorded separately below.

### Actual diagnostics and corrections

1. Initial authoring validation emitted `ok: false`, `stage: "check"`, `error: "Final artifact check failed."`, diagnostic `composition/desktop-readability`: `accelerometer {x,y,z}`, sourceFontPx 7, projectedFontPx 5.25, minimumProjectedFontPx 6 at viewBox width1240. Reduced authored viewBox width to1080; next validation passed all9 with zero errors/warnings.
2. First delivery passed showcase9/9. Initial `visual-check` exited1 with `status: "fail"`, `containment.status: "fail"`: scrollHeight1186 at1440×900, 1260 at1600×1000, 1260 at1920×1080; 2048×1320 passed. Screenshot inspection confirmed unused lower diagram height. Original delivered artifact SHA-256 was `6d5bc6c9e12e0959fed72db1fe79eae1f22c34aa05e09aa9976dd42bd2da438c`.
3. Perceptual correction1 reduced authored viewBox height740→480, without changing type sizes or clipping CSS. Validation exited1 at render with `Data-flow layout validation failed:` and `Node "sdk-event" exceeds the readable diagram area — keep y between 104 and 406 (adjust row/yOffset or increase meta.viewBox[1]).` The same exact constraint applied to `e021-mod` and `e021-ui`.
4. Perceptual correction2 compacted only those three diagnosed nodes from row2 to row1. Validation then passed all9/zero errors/warnings; redelivery and visual-check exited0. Final receipts/hashes above bind this corrected artifact; no failed receipt is represented as final PASS.

Graphify and PR Lens status are owned by the Main Agent's subsequent evidence sections; this subtask does not assert their completion.


## Graphify

Pinned CLI verified: `GRAPHIFY_NO_AUTO_REFRESH=1 /Users/andrew/.local/bin/graphify --version` → graphify 0.9.73. Bounded graph-file search found no usable existing graph. Followed source fallback: original SDK `imu.ts`, `imu-motion.ts`, `input-event.ts`, compose/runtime input paths and pinned Moddable `modules/base/time/wasm/modTime.c`. Consequential clock relationship independently confirmed against source. No graph/cache/stamp, provider, integration, installation or upload performed. Status: source fallback completed; graph query skipped (no graph).

## PR Lens

PASS — local comprehension artifact, independently reviewed; no correctness or human-acceptance inference. CLI0.11.0 validate and render exit0. Exact snapshot: base `34fd88caee29e3c467e709b5bbb2b52bcf67f38b` (`dev` after concurrent E016 merge), head `f0eec2b75c6bce3233eb4466531569b45c65df1b` (three normal E021 topics). `git diff --find-renames base...head` has48 added planned E021 files only. Subsequent docs/publication commits are outside this historical map snapshot; it is not presented as the latest PR head.

External outputs: `/private/tmp/coami-e021-review/pr-lens/graph.json`, `revisions.json`, `changes.patch`, `rendered/manifest.json`, `rendered/runtime-light-25dd9d026dc370f4d198398716563cc6.svg`. 4lanes/8nodes/8edges/3walkthrough steps; one architecture SVG14002bytes. Includes original unchanged IMU/recognizer/Event and added raw provider, real monotonic clock wrapper, MOD and feedback. No repository correction config existed; used --theme light --no-config. No .pr-lens workspace, integration, installation, provider, upload, PR comment/publication or server.

Independent Reviewer verified actual diff bytes, revisions/graph/manifest consistency, SVG byte count, original SDK neighbours/locations, unchanged SDK gitlink and remote identity: APPROVED, no blocking findings. Local artifact paths require this workstation; no hosted URL is implied.
