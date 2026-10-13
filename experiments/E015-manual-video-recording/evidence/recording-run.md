# E015 recording evidence — 2026-10-13

## Actual engineering environment

- Feature worktree `/private/tmp/coami-e015-manual-video-recording`, branch `feat/andrew/e015-manual-video-recording`, base dev `9155139d34ad94379a246c5d31c29e86fed52ed1`.
- macOS arm64; Node 26.10.0, npm 11.19.1.
- Vendor `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`, isolated submodule initialized from the existing local checkout. Dev tracked files not modified.
- `npm run assets` attempted: blocked at missing `MODDABLE 9.5.0`; EMSDK/fontbm also unconfigured. No live simulator/video recording attempt. No raw pixels or videos saved.
- Pure test fakes represent asynchronous recorder/run/player behavior, not camera success. Actual engineering commands and results are in validation.txt.

## Owner cases — NOT EXECUTED

| Case | Actual start/stop T | Playback ended time | Unique webcam/MOD digests | Owner motion observation | Cleanup evidence | Result |
| --- | --- | --- | --- | --- | --- | --- |
| TC1 ~3s end | starting timed out before recording | not obtained | 0 | not obtained | tracks none; captures stationary at 0 | 無法判定（待修正後重跑） |
| TC2 ~8s end | pending | pending | pending | pending | pending | 未執行 |
| TC3 ~3s cancel | pending | no output required | pending | pending | pending | 未執行 |
| TC4 restart ~3s | pending | pending | pending | pending | pending | 未執行 |
| TC5 physical errors | pending | not applicable | pending | pending | pending | 未執行 |

Before updating: record browser/version, webcam/device condition, timestamp, exact operation, actual metadata and named owner observation. Check motion/end-time/cleanup criteria in README. No success may be inferred from simulated tests or a nonempty Blob.

## Status / decision

- Current main experiment: **無法判定** after the owner startup attempt below; feasibility-validation task complete: **no**. Earlier engineering delivery had no live attempt.
- Required next evidence: owner rerun after the bounded startup correction, followed by motion/time/cancel/restart observations; full runtime has been attested locally.
- Draft PR is an engineering handoff only, not adoption or hypothesis approval.

## Engineering publication

Code delivery is available in Draft PR https://github.com/a129924/coami/pull/15. Local PR Lens validate/render passed using actual diff provenance; this is a review aid, not correctness or recording proof. No usable Graphify graph existed, so targeted source fallback was used without building one. Archify structural showcase passed but desktop visual containment failed; its artifact is partial. Git hook runner lefthook was unavailable; explicit checks were run separately.

## Live validation preparation — 2026-10-13

- Owner resumed with “我們開始 真人驗證” and then explicitly allowed installing pinned Moddable/EMSDK/fontbm in feature-local ignored generated output and rebuilding within the existing 90-minute limit.
- Setup started about 03:15 UTC. Xcode, CMake, pkg-config and FreeType are available; arm64, ample local disk space.
- Existing E001 runtime was checked and rejected for reuse: mc.js SHA-256 93008fd8c767b2c5ccb8950c0ef290453e900224197420abbc4cfc940907600f, mc.wasm b3bb666cc67c3e2f039b86be59c4a0d1a551b6bffe4e64a5e867380fa3bbbe83, both differ from the E008 attested artifacts. No bypass of E015 provenance checks.
- E015 localhost server is running at http://127.0.0.1:5175/ ; Chrome page is open in Idle. No camera permission requested and no live recording yet.
- Toolchain source download/build in progress. TC1–TC5 remain unexecuted.

### Runtime ready — 2026-10-13

- All three pinned sources installed feature-locally. Moddable CLI tools and fontbm compiled; official Emscripten 5.0.1 arm64 package installed and activated without shell-profile changes.
- npm run prepare:poc: PASS. Emscripten fresh-tree SHA-256 42ce84c65e00be2818a7733704b9f0217f4c3ee9c7f2bb3366293f60c8e47295 matched the required pin before compilation.
- Vite restarted after regenerated public assets. HTTP payloads matched disk and runtime provenance:

```json
[
  {
    "path": "runtime-provenance.json",
    "status": 200,
    "mime": "application/json",
    "bytes": 2268,
    "sha256": "0fbfec8961fff35923fb72934e0199e15c73cc359efc41de50f5bcd1b2991536"
  },
  {
    "path": "simulator/mc.js",
    "status": 200,
    "mime": "text/javascript",
    "bytes": 73325,
    "sha256": "32e567967266d2bbba83fa0fd0ed601ae668eef70292479dce41cacce71944e2"
  },
  {
    "path": "simulator/mc.wasm",
    "status": 200,
    "mime": "application/wasm",
    "bytes": 5104648,
    "sha256": "3752ea85d7fc134b01a132e1ceff6dd728444ee3e5c9a6a3efc82723f7dad8e4"
  },
  {
    "path": "coami-mod.xsa",
    "status": 200,
    "mime": "",
    "bytes": 3945,
    "sha256": "8410ff275e2495028c2ccb9d2069cd43554790bbc21ff60cd8a84a1702e6e4f6"
  }
]
```

- Runtime preparation is complete; actual camera permission, MOD/webcam delivery and TC1–TC5 recordings are not yet attempted. No live success claim.

### Owner attempt — installed readiness timeout

Owner clicked Start twice and reported no camera permission prompt. Exact supplied metadata:

```text
73863 ms · 停止後 250ms：captures=0, stationary=true
73612 ms · starting → idle · installed timeout (5 秒)
73612 ms · 停止取像：pairs=0, distinct=0, tracks=none, captures=0
68396 ms · idle → starting
50920 ms · 停止後 250ms：captures=0, stationary=true
50670 ms · starting → idle · installed timeout (5 秒)
50669 ms · 停止取像：pairs=0, distinct=0, tracks=none, captures=0
45367 ms · idle → starting
407 ms · initial → idle
```

Observation: no valid webcam frame or track was established; browser console reached firmware MOD override/startup, not app-behaviors-ready. Source fact: pinned WASM default onLaunch splash waits 8000ms, exceeding E015's initial 5000ms installed wait. Classification for this attempt: **無法判定**, not successful recording or disproved recording hypothesis.

One bounded correction: use 30s installed readiness matching the pinned engine's own bound; retain 5s frame/finalization criteria. Regression tests first failed on early settlement at 5s and 5000!=30000, then passed after correction. Owner rerun is required.
