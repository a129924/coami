# E015 recording evidence — 2026-10-13

## Actual engineering environment

- Feature worktree `/private/tmp/coami-e015-manual-video-recording`, branch `feat/andrew/e015-manual-video-recording`, base dev `9155139d34ad94379a246c5d31c29e86fed52ed1`.
- macOS arm64; Node 26.10.0, npm 11.19.1.
- Vendor `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`, isolated submodule initialized from the existing local checkout. Dev tracked files not modified.
- `npm run assets` attempted: blocked at missing `MODDABLE 9.5.0`; EMSDK/fontbm also unconfigured. No live simulator/video recording attempt. No raw pixels or videos saved.
- Pure test fakes represent asynchronous recorder/run/player behavior, not camera success. Actual engineering commands and results are in validation.txt.

## Owner cases — current progress

| Case | Actual start/stop T | Playback ended time | Unique webcam/MOD digests | Owner motion observation | Cleanup evidence | Result |
| --- | --- | --- | --- | --- | --- | --- |
| TC1 shorter segment (nominal ~3s; actual ~5.9s) | 5.911s | 5.754008s (DOM) | 39 pairs / 39 distinct | owner confirms playback/replay and motion/content correctness | webcam/canvas ended, captures stationary at 39; ready ~39ms | measured end/playback criteria met; full live verdict pending |
| TC2 longer segment (nominal ~8s; requested ~10–12s; actual ~29.5s) | 29.473s (page recording clock) | 29.316s (ended event) | 185 pairs / 185 distinct | owner confirms motion/content correctness and no old/cancelled content | webcam/canvas ended, captures stationary at 185; ready ~50ms | observed timing/motion/cleanup criteria met; original audio event unavailable |
| TC3 ~3s cancel | ~2.790s from displayed recording/cancel transitions | owner confirms no cancelled output | 19 pairs / 19 distinct | not applicable | webcam/canvas ended, captures stationary at 19; returned idle | observed cancellation/no-output/cleanup criteria met |
| TC4 restart (nominal ~3s; actual ~5.95s) | 5.950s (ended event recording clock) | 5.888015s (DOM ended=true) | 38 pairs / 38 distinct | owner confirms motion/content correctness and no old/cancelled content | webcam/canvas ended, captures stationary at 38; ready ~16ms | observed restart/playback/timing/isolation/cleanup criteria met |
| TC5 physical errors | pending | not applicable | pending | pending | pending | 未執行 |

Before updating: record browser/version, webcam/device condition, timestamp, exact operation, actual metadata and named owner observation. Check motion/end-time/cleanup criteria in README. No success may be inferred from simulated tests or a nonempty Blob.

## Status / decision

- Current main experiment: **無法判定** for the full hypothesis: both shorter/longer recording clocks and ended playback, cancellation cleanup, and restart output are observed. Restart ended timing is now observed; applicable physical error cases remain pending; owner has confirmed motion/isolation/no-cancelled-output observations. Original long-segment audio event remains unavailable. Feasibility-validation task complete: **no**. Preserve the earlier startup timeout as historical evidence.
- Required next evidence: applicable physical error observations; restarted ended timing has now been recovered. Do not repeat the already observed length comparison or request reconfirmation of the supplied motion/isolation/no-output observations.
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

### Owner shorter-segment rerun — 2026-10-13

Owner says “沒有問題 我也重新放一次 是可以的” and supplies the transcript below. This confirms playback and repeated replay; exact physical motion/order was not separately described. Agent independently read the existing page DOM without taking screenshots or exporting media: status=影片已就緒, result=錄製 5.91 秒 · 110363 bytes, player ended=true, readyState=4, currentTime=duration=5.754008s.

```text
33835 ms · 完整回放 currentTime=5.754s · 錄製=5.911s · 差=0.157s
21154 ms · 停止後 250ms：captures=39, stationary=true
20930 ms · finalizing → ready
20902 ms · canvas tracks=ended
20902 ms · 停止取像：pairs=39, distinct=39, tracks=ended, captures=39
20891 ms · recording → finalizing
20889 ms · MOD #39 webcam matched · digest=90b37465 · luma=134 · pairs=39 · distinct=39
20726 ms · MOD #38 webcam matched · digest=dce07f3b · luma=134 · pairs=38 · distinct=38
20578 ms · MOD #37 webcam matched · digest=ef8e8904 · luma=134 · pairs=37 · distinct=37
20428 ms · MOD #36 webcam matched · digest=727e5d9b · luma=134 · pairs=36 · distinct=36
20251 ms · MOD #35 webcam matched · digest=522f9252 · luma=135 · pairs=35 · distinct=35
20098 ms · MOD #34 webcam matched · digest=12a49730 · luma=135 · pairs=34 · distinct=34
19948 ms · MOD #33 webcam matched · digest=14e6a786 · luma=136 · pairs=33 · distinct=33
19799 ms · MOD #32 webcam matched · digest=7096af18 · luma=138 · pairs=32 · distinct=32
19649 ms · MOD #31 webcam matched · digest=4b0d983d · luma=140 · pairs=31 · distinct=31
19499 ms · MOD #30 webcam matched · digest=c0bff9c0 · luma=137 · pairs=30 · distinct=30
19347 ms · MOD #29 webcam matched · digest=532f29b9 · luma=130 · pairs=29 · distinct=29
19189 ms · MOD #28 webcam matched · digest=6bc7d427 · luma=128 · pairs=28 · distinct=28
19031 ms · MOD #27 webcam matched · digest=173bba90 · luma=137 · pairs=27 · distinct=27
18881 ms · MOD #26 webcam matched · digest=ef7f16bf · luma=144 · pairs=26 · distinct=26
18728 ms · MOD #25 webcam matched · digest=fa1619e3 · luma=147 · pairs=25 · distinct=25
18563 ms · MOD #24 webcam matched · digest=478e1e34 · luma=136 · pairs=24 · distinct=24
18416 ms · MOD #23 webcam matched · digest=67f2e81a · luma=132 · pairs=23 · distinct=23
18265 ms · MOD #22 webcam matched · digest=2a85564c · luma=130 · pairs=22 · distinct=22
18113 ms · MOD #21 webcam matched · digest=55210d48 · luma=134 · pairs=21 · distinct=21
17944 ms · MOD #20 webcam matched · digest=6e90548c · luma=140 · pairs=20 · distinct=20
17778 ms · MOD #19 webcam matched · digest=8a79dc04 · luma=119 · pairs=19 · distinct=19
17613 ms · MOD #18 webcam matched · digest=dd4a8395 · luma=131 · pairs=18 · distinct=18
17445 ms · MOD #17 webcam matched · digest=7b83dfaf · luma=126 · pairs=17 · distinct=17
17280 ms · MOD #16 webcam matched · digest=5c9e7b46 · luma=121 · pairs=16 · distinct=16
17115 ms · MOD #15 webcam matched · digest=6facc802 · luma=130 · pairs=15 · distinct=15
16958 ms · MOD #14 webcam matched · digest=490bc79f · luma=131 · pairs=14 · distinct=14
16808 ms · MOD #13 webcam matched · digest=2416b3ed · luma=131 · pairs=13 · distinct=13
16656 ms · MOD #12 webcam matched · digest=0fdf96f3 · luma=131 · pairs=12 · distinct=12
16503 ms · MOD #11 webcam matched · digest=389ca4be · luma=131 · pairs=11 · distinct=11
16351 ms · MOD #10 webcam matched · digest=f243b205 · luma=131 · pairs=10 · distinct=10
16200 ms · MOD #9 webcam matched · digest=4c55efbe · luma=133 · pairs=9 · distinct=9
16050 ms · MOD #8 webcam matched · digest=b015cb3a · luma=133 · pairs=8 · distinct=8
15899 ms · MOD #7 webcam matched · digest=5b3dae04 · luma=131 · pairs=7 · distinct=7
15747 ms · MOD #6 webcam matched · digest=102fc411 · luma=130 · pairs=6 · distinct=6
15599 ms · MOD #5 webcam matched · digest=e340aa1a · luma=129 · pairs=5 · distinct=5
15446 ms · MOD #4 webcam matched · digest=3f8157ed · luma=128 · pairs=4 · distinct=4
15290 ms · MOD #3 webcam matched · digest=755bb0e8 · luma=127 · pairs=3 · distinct=3
15136 ms · MOD #2 webcam matched · digest=90a88185 · luma=124 · pairs=2 · distinct=2
14980 ms · starting → recording
14971 ms · recorder mime=video/webm;codecs=vp8, audioTracks=0
14968 ms · MOD #1 webcam matched · digest=71f398e0 · luma=122 · pairs=1 · distinct=1
9639 ms · runtime ready：prepared
9638 ms · MOD 安裝狀態：installed
9628 ms · 固定 digest 探針一致
1548 ms · MOD 安裝狀態：prepared
1506 ms · MOD 安裝狀態：saved
1365 ms · idle → starting
245 ms · initial → idle
```

Observed recording clock=5.911s, ended playback=5.754s (display precision), difference=0.157s ≤1s; 39 unique webcam/MOD pairs, VP8 WebM, zero audio tracks. Finalizing at 20891ms and Ready at 20930ms (~39ms, within 5s); webcam/canvas tracks ended; capture count remained 39 after 250ms. This supports normal recording/end/replay and cleanup on the tested runtime. It does not yet prove variable-length comparison, cancel or restart.

Input deviation: the nominal shorter example was ~3s, but the owner actually controlled it to ~5.9s. Keep the actual measurement; do not relabel it as 3s. For the next longer trial, request ~10–12s so it can discriminate the unchanged ≥3s playback-length difference criterion. Acceptance criteria are unchanged; the next concrete input is fixed before execution. No media saved.

### Owner longer segment, cancel and restart — 2026-10-13

Owner supplied a metadata transcript covering a longer completed segment, a cancelled segment and a restarted completed segment. Selected supplied lines below preserve the reported values; the UI retains only its latest 150 events, so earlier long-segment setup/frame events were not available. Actual long input was ~29.5s rather than the requested ~10–12s; acceptance criteria remain unchanged. No media exported or screenshots taken.

```text
54842 ms · 完整回放 currentTime=29.316s · 錄製=29.473s · 差=0.156s
41884 ms · 停止後 250ms：captures=185, stationary=true
41672 ms · finalizing → ready
41633 ms · canvas tracks=ended
41633 ms · 停止取像：pairs=185, distinct=185, tracks=ended, captures=185
41622 ms · recording → finalizing
129977 ms · ready → starting
139724 ms · recorder mime=video/webm;codecs=vp8, audioTracks=0
139731 ms · starting → recording
142514 ms · 停止取像：pairs=19, distinct=19, tracks=ended, captures=19
142514 ms · canvas tracks=ended
142514 ms · recording → idle · 本段已取消
142765 ms · 停止後 250ms：captures=19, stationary=true
145841 ms · idle → starting
155434 ms · MOD #1 webcam matched · digest=f1a2deae · luma=25 · pairs=1 · distinct=1
155434 ms · recorder mime=video/webm;codecs=vp8, audioTracks=0
155441 ms · starting → recording
161391 ms · recording → finalizing
161393 ms · 停止取像：pairs=38, distinct=38, tracks=ended, captures=38
161393 ms · canvas tracks=ended
161407 ms · finalizing → ready
161645 ms · 停止後 250ms：captures=38, stationary=true
```

Long ended playback exceeds the first 5.754008s clip by ~23.562s (≥3s). The logged duration error is 0.156s (subtracting rounded displayed clocks gives 0.157s), both ≤1s. Stop-to-ready ~50ms meets the 5s bound. The long segment's original recorder/audio/start event is outside the supplied transcript; do not infer those missing fields from another segment.

Cancellation returned to idle and released webcam/canvas tracks, with count 19 stationary at the delayed check; no finalizing/ready transition appears for that segment before restart. This supports cancellation lifecycle, but does not substitute for the owner's direct observation of no cancelled output. Restart resets MOD sequence to #1 and produces 38 new matched pairs; this alone does not prove visual content isolation.

Agent independently read current DOM: status=影片已就緒; result=錄製 5.95 秒 · 83019 bytes; player currentTime=0, duration=5.888015s, ended=false, readyState=4, error=null. The restarted result is loaded/error-free; its metadata duration is not an ended playback observation. Await owner playback to end and motion/isolation confirmation. No additional recording is needed for TC4 at this point.

### Owner motion, isolation and no-output confirmation — 2026-10-13

Owner explicitly confirms both requested observations: “你說的 1 2 我能確保 但是 完整回放紀錄 log 他有上限 已經被截斷了”. The referenced items were (1) playback motion matches the recorded action and does not contain previous/cancelled content, and (2) cancelling produces no video. Record these as owner observations, not agent visual inspection. This resolves those observation gaps; do not ask for them again.

Source inspection confirms main.ts retains 150 event entries and prepends new entries, discarding oldest; absent older events are an evidence retention limitation, not a recording failure. Earlier pasted short/long ended events have already been preserved here. At the follow-up DOM read, the current restarted clip remained loaded (5.95s / 83019 bytes), currentTime=2.434059s, duration=5.888015s, ended=false, readyState=4, error=null. Its ended timing was not yet observed in that read; metadata duration alone does not replace it. Replay the existing clip if needed rather than creating a new recording or loosening the criterion.

### Restarted segment fully replayed — 2026-10-13

Owner says “播完了”. Agent read the existing DOM without altering playback or exporting media:

```text
768585 ms · 完整回放 currentTime=5.888s · 錄製=5.950s · 差=0.062s
```

Player currentTime=duration=5.888015s, ended=true, paused=true, readyState=4, error=null; result=錄製 5.95 秒 · 83019 bytes. Combined with 38 distinct webcam/MOD pairs, zero audio tracks, stop-to-ready ~16ms, released tracks/stationary count and owner's prior motion/isolation confirmation, this supports the tested cancel→restart→end→complete playback path. The ≤1s timing criterion is met (0.062s). No further normal/restart recording is required for these observations.

TC5 permission denial, Starting cancellation, repeated operations and camera interruption remain unexecuted physically; retain the overall incomplete verdict. The long clip's original zero-audio event was truncated and cannot be reconstructed from another clip. Documentation-only evidence update; git diff --check passed; no application code changed or additional code tests required.
