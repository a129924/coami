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

## Human listening — 未執行 / human-check

| Tester / date | OS / browser / output / volume | Session + request | Expected | Heard | Program result | Listening result |
| --- | --- | --- | --- | --- | --- | --- |
| 未執行 | 未記錄 | 待執行 | A: こんにちは。 | 未記錄 | 待執行 | 未執行 |
| 未執行 | 未記錄 | 待執行 | B: おやすみなさい。 | 未記錄 | 待執行 | 未執行 |
| 未執行 | 未記錄 | 待執行 | A: こんにちは。 | 未記錄 | 待執行 | 未執行 |

Decision: engineering delivery may advance after independent review; audible-content hypothesis and production adoption are withheld. Trace is not listening PASS.
