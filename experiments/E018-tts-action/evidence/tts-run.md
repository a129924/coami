# E018 verification record

## Automated actual runtime — 2026-10-13T07:23:59.713Z

Tester: Codex automated CDP input; NOT human listening.
Browser: Chrome/155.0.8059.40; macOS arm64 build host.
Fresh vendor source: b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322.
Runtime/MOD served hashes: runtime-provenance.json and tts-trace.jsonl.
Trusted mouse click unlocked AudioContext; headless output device/content was not assessed.

| Case | Result | Observation |
| --- | --- | --- |
| A-B-A-1 | PASS | #1 「こんにちは。」→ completed · SDK 成功且已自然播放結束；內容仍待真人聽辨 |
| A-B-A-2 | PASS | #2 「おやすみなさい。」→ completed · SDK 成功且已自然播放結束；內容仍待真人聽辨 |
| A-B-A-3 | PASS | #3 「こんにちは。」→ completed · SDK 成功且已自然播放結束；內容仍待真人聽辨 |
| busy-no-later-queue | PASS | No extra accepted request/playback after busy clicks |
| injected-playback-failure | PASS | #4 「こんにちは。」→ failed · Error: stackchan-voice browser playback failed |
| retry-after-confirmed-failure | PASS | #5 「おやすみなさい。」→ completed · SDK 成功且已自然播放結束；內容仍待真人聽辨 |

Five accepted requests, four completed and one injected failed; zero browser runtime exceptions. Each completed followed matching natural ended and SDK success. Unknown/interruption/zero sample/late result paths were pure-test verified; not claimed as actual simulator fault runs.

## Human listening — PASS / Andrew / 2026-10-13

- Session: `50377760-1108-46ae-a2cb-940bc1513778`; browser Chrome/153.0.0.0 on macOS (browser user-agent; exact OS release not supplied).
- Operator: Andrew. Output: 耳機. Volume: 「有音量」 (reported qualitatively; no percentage supplied). Five utterances were audible by operator report.
- Operator content confirmation: 「五次都有聽到，且內容全部相符」.
- Environment report verbatim: 「Andrew / 耳機 有音量」.
- Live trace window: 2026-10-13 08:19:12–08:19:30 UTC (16:19:12–16:19:30 Asia/Taipei).
- Original browser download SHA-256: `e0d0e54d368c0d479bde68bc576dc14c4d85691fa07ddd1a42c2f11f6d66dc9b`; records appended to tts-trace.jsonl under the distinct session ID, preserving previous automated evidence.

| Request | Expected | Program result | Heard (operator report) | Listening result |
| --- | --- | --- | --- | --- |
| #1 | こんにちは。 | completed after matching natural ended + SDK success | 相符 | PASS |
| #2 | おやすみなさい。 | completed after matching natural ended + SDK success | 相符 | PASS |
| #3 | こんにちは。 | completed after matching natural ended + SDK success | 相符 | PASS |
| #4 | おやすみなさい。 | completed after matching natural ended + SDK success | 相符 | PASS |
| #5 | こんにちは。 | completed after matching natural ended + SDK success | 相符 | PASS |

The first three accepted requests satisfy the required A→B→A listening sequence; requests4/5 additionally confirm repeatability in this session. Browser trace independently confirms matching request/text, SDK success and natural playback ended before the unique terminal result for all5.

Decision: the bounded hypothesis is supported in the tested pinned browser simulator with the E018 strict bridge and Andrew's headphone output. This is not a stock bridge completion claim, Chinese/hardware verification, universal pronunciation guarantee or production adoption.

Busy/failure injection were verified in the prior automated actual-browser session; interruption/timeout/zero-sample/late-result paths were pure-test verified. No claim that this human session tested those faults. Draft PR remains for human code review; no merge is authorized.
