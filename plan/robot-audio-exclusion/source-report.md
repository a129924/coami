# Listening／Saying：模擬器 SDK 交叉互斥來源驗證

> 歷史階段說明：下列 source-only 結論與未執行狀態保存先前交付當時的事實。Owner 後續要求真人驗證，已另啟動 [E025](../../experiments/E025-listening-saying-exclusion/README.md)；新階段結果不得倒填為本報告當時已測。

## 問題、版本與結論

2026-10-19，核對 stack-chan `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`。
本輪 Listening 專指 `audio.record()` 錄音，Saying 專指 `audio.say()` TTS；不指 ASR、remoteSession 的 listening／speaking 或抽象 Robot State。

**此 pin 的已查 stock 模擬器路徑，未發現 record／say 的 SDK 交叉互斥判斷。後續定義 Robot State 時，不能將 SDK 保證兩者互斥視為既有事實。**

這是來源結論，並非瀏覽器實際同時錄放的執行證據。沒有執行錄音、TTS、並行測試或真機測試，也沒有建立實驗目錄、改 SDK 或新增應用互斥鎖。

## 方法與可追溯性

以 Coami base `93a1a7d62d739a2e936d4fa43d993683e4a02f46` 的 vendor gitlink 為準，唯讀檢視既存 pinned checkout。Feature worktree 的 submodule 未初始化；沒有複製或使用其他實驗的 generated runtime。每個已查來源均與 `git show <sdk-pin>:<path>` 位元組比較，再記錄 SHA-256：[來源清單](evidence/source-inventory.json)。下列連結固定至同一 SDK commit。

流程為：確認 WASM manifest 綁定與預設 TTS → 公開 capability → runtime → WASM microphone／TTS → JS native binding → C bridge → stock simulator Host。來源檢查旨在確認控制路徑，不以關鍵字搜尋未命中取代完整函式閱讀。

## 觀察事實

| 層級與固定版本來源 | 觀察 | 對互斥的意義 |
| --- | --- | --- |
| [WASM platform manifest L5–18、L56–63、L81–90](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/firmware/host/platforms/wasm/manifest.json#L5-L18)；[audio manifest](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/firmware/host/modules/audio/manifest_wasm.json) | platform 包含 WASM audio manifest、preload native bridge，預設 TTS 為 stackchan-voice；microphone／tts-stackchan-voice 對應 WASM 實作。 | 查的是 simulator 選用的實作，不能套用硬體 microphone 的 guard。 |
| [compose.ts L194–209、L255–272](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/firmware/host/app/compose.ts#L194-L209) | 建立 TTS 與 microphone，交給 runtime context。 | 此結論限定 stock WASM 配置；自訂 TTS/provider 不在範圍內。 |
| [runtime-context.ts L227–242、L439–469](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/firmware/host/app/runtime-context.ts#L439-L469) | 公開 audio capability 經 context 直接呼叫 audio runtime 的 say／record。 | 公開委派路徑未增加錄放交叉 guard。 |
| [runtime-audio.ts L78–97、L120–125](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/firmware/host/app/runtime-audio.ts#L78-L125) | say 停止 webRadio、增加 activeOperations，再呼叫 TTS.stream；record 僅確認 microphone 存在後委派。 | say 沒有先停止／拒絕錄音；record 沒有查 TTS 或 activeOperations。 |
| [runtime-audio.ts L38–60](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/firmware/host/app/runtime-audio.ts#L38-L60) | webRadio.start 會因 activeOperations > 0 回 `audio busy`。 | 這是 webRadio 啟動限制，不是 record／say 交叉鎖。 |
| [WASM microphone.ts L19–45、L58–79](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/firmware/host/modules/audio/wasm/microphone.ts#L58-L79) | record 呼叫 startRecord，輪詢 recordStatus；fallback 直接委派 Host.AudioIn.record。 | 沒有檢查 TTS streaming 或播放狀態。 |
| [WASM tts-stackchan-voice.ts L82–134](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/firmware/host/modules/audio/wasm/tts-stackchan-voice.ts#L82-L134) | streaming 為 true 時回 `already playing`；否則合成後 startPlayBuffer，輪詢 playStatus。 | guard 限制同一 TTS 實例重入，不檢查錄音；零樣本可直接完成，不能以 SDK success 代表曾播放。 |
| [audio-bridge.js L3–22](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/firmware/host/modules/audio/wasm/audio-bridge.js#L3-L22)；[audio-bridge.c L34–96](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/firmware/host/modules/audio/wasm/audio-bridge.c#L34-L96) | JS 綁定 native startRecord／startPlayBuffer；C 分開使用 state.audioIn／audioOut，呼叫 Host.AudioIn.record／AudioOut.play。 | 啟動與狀態路徑沒有交叉拒絕、排隊或停止。 |
| [simulator-engine.mjs L767–778](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/web/src/services/simulator/simulator-engine.mjs#L767-L778) | 分別建立 stock audioOutBridge／audioInBridge 並交給 Host。 | 沒有在 engine 建立共享錄放 busy 狀態。 |
| [bridge.mjs L129–209、L398–430](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/web/simulator/bridge.mjs#L398-L430) | AudioOut 使用 WebAudio；AudioIn 使用 getUserMedia／MediaRecorder；各 factory 無共享錄放互斥狀態。 | 兩個 Host 入口沒有交叉 guard；瀏覽器權限、裝置及實際播放仍是另外的條件。 |

## 容易誤判的既有控制

- **TTS 自身重入**：`already playing` 不是錄音／說話互斥，也不保證跨 TTS 實例或 provider 的行為。
- **webRadio**：say 停止 webRadio，且 webRadio.start 有 busy 判斷；不可拿來推導 record／say 的關係。
- **明確 teardown**：[audio-bridge.c L23–31](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/firmware/host/modules/audio/wasm/audio-bridge.c#L23-L31) 的 close 會嘗試關閉 AudioOut 與 AudioIn；這是顯式生命週期操作，不是 record 或 say 啟動時的互斥判斷。stock AudioIn 亦未提供 close，不能從 native close 推導瀏覽器錄音已停止。
- **播放完成 fallback**：[bridge.mjs L185–203](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/web/simulator/bridge.mjs#L185-L203) 的 duration + 250ms timer 也能完成 Promise；resolve 不單獨證明自然 ended。
- **既有實驗**：[既有 SDK 動作目錄](../../docs/robot-action-event-catalog.md) 中 E007 的單次錄音證據與 E018 的 TTS 證據不構成並行證據；E018 自有 busy guard／strict bridge 也不是 stock SDK 的交叉互斥能力。

## 判讀與原決策影響

觀察事實是已查路徑沒有共享 guard、錄放分別委派；推論是**目前沒有依據將 SDK 互斥當作後續 Robot State 的 invariant**。本輪不選定狀態模型，也不決定應用是否應新增排程或互斥政策。

來源已能回答本輪 SDK 控制問題，沒有留下會改變此判斷且必須執行才能解除的路徑疑點。因此依 feasibility-validation 的來源優先規則完成本輪，不啟動 `ts-implementation` 實驗，也不占用 E025。若未來任務明確要求 browser 實際重疊、聲音回授或真機行為，需另取得對應動態證據，不能引用本報告當作已測結果。

## 狀態與限制

| 項目 | 結果 |
| --- | --- |
| 固定版本／來源路徑核對 | 已完成；各來源 SHA-256 與 committed bytes 一致。 |
| 本輪來源驗證任務 | 完成；足以回答已界定的 SDK 互斥問題。 |
| 實驗四狀態 | 未執行；未建立實驗，不標成功或失敗。 |
| ts-implementation／錄放 TestCase | 未啟動／未適用；不是跳過失敗測試。 |
| 瀏覽器實際錄放重疊、真人聽辨、真機 | 未驗證。 |
| 其他版本、provider、自訂 Host／bridge | 不在結論適用範圍。 |

## 本機檢視產物

Archify 只呈現來源路徑，兩段不是執行時間線，也不證明互斥或重疊。PR Lens 只呈現本 topic 的實際文件 diff；兩者留在本機、不上傳。Graphify 未見可用 graph，已採 bounded 搜尋與直接來源核對，沒有 build／refresh。命令、版本與驗收見 [validation.md](evidence/validation.md)。

## E025 human/runtime follow-up — 2026-10-19

原來源階段結論保留為歷史；E025新增動態反例：Chrome153、耳機40%、固定同pin官方CI runtime。record→say5筆、say→record4筆，均非空錄音且SDK終態成功、自然播放與回放，capture／TTS保守區間重疊3055.3～3689.2ms。Owner回報「我剛剛測是都有聽到」。

因此本次stock simulator 的 Listening／Saying 不由SDK強制互斥。動態證據、原頁面逐筆未保存缺口及整批事後真人回報分開記錄，見 [E025驗證](../../experiments/E025-listening-saying-exclusion/evidence/validation.md#human-execution-and-interpretation--2026-10-19)。此結論不外推真機／其他provider，不在本topic定義Robot State。
