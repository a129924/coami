# Robot Action／Event 能力與驗證目錄

本文件供 Agent 查詢目前 Robot 能力及其證據。**SDK 有宣告、實驗有呼叫、程式 completed、實際效果成功，是不同層級。** 使用能力前必須閱讀對應條件、環境與 EXXX；此目錄不授權新增能力或升級 production。

- 盤點日期：2026-10-19。
- Coami 基準 HEAD：`ddef30883df3b2f7b2bba84bb7278c1502eb8d08`（本文件撰寫前的來源快照）。
- pinned Stack-chan SDK：`b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`，對應 `vendor/stack-chan` submodule。SDK 連結須先以此 pin 初始化 submodule；不表示其他上游版本可用。
- 範圍：E001–E024 及 Robot 公開動作、聲音、表情、畫面、燈光、感測輸入／callback。設定、工具、網路及資源管理只記必要邊界。此批證據**沒有證明實體 Robot 硬體能力**；真 webcam／真人聽辨仍屬 browser simulator。

## 分類及閱讀方式

| 欄位／標記 | 定義 |
| --- | --- |
| Action | 公開操作要求 Robot 執行行為或取得感測資料；實驗組合行為也列為 Action，但不冒充 SDK 原生方法。 |
| Event | callback／訂閱提供的輸入、狀態或執行通知。Promise 回傳、trace、Server robot.command_result 不自動成為 SDK Event。 |
| 能力／行為結果 | 成功、部分成功、失敗、無法判定、未驗證；均限該列條件。部分成功必須指出成功及未達標部分。未驗證表示本盤點未找到足夠對應證據，不表示 SDK 不支援。 |
| 實驗整體結論 | 保留最新正式紀錄原有判定層級。局部成功不得覆蓋整體失敗；review-ready、approved、驗證任務完成均不等同假設成功。 |
| simulator | 真正 browser／WASM runtime，仍不代表實機；真人或 agent UI automation 在直接證據中分列。 |
| synthetic／mock | synthetic 為受控合成樣本／目標，可能走真 WASM；mock 為純替身。兩者不能證明真實硬體感測。 |
| 原版／patch | 原版指指定 SDK source 未改；實驗 UI、WebAudio bridge、synthetic provider 仍須另讀限制。scratch patch 只限該實驗，不是 vendor 已修復。 |
| — | 無對應實驗、環境或正式結論；不能讀作成功。 |

能力表每列以穩定 `SDK-*` ID 連到行為表 `EXP-*`。每個公開方法／事件種類列一項；相同委派的 legacy flat aliases 合併。`setEmotion`、`lookAt` 因變體結果或條件不同分列。來源代碼連到下方公開型別與 runtime／實作；不是僅憑 API 文件推定支援。

## SDK 能力表

| 能力 ID | 類型 | Canonical API／變體 | 用途 | 來源 | 支援條件與限制 | 能力結果 | 實驗整體結論 | 環境／patch | EXXX | 對應行為與直接證據 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| <a id="SDK-F01"></a>`SDK-F01` | Action | `face.setEmotion(NEUTRAL)` | 設定中性表情 | [src-c](#src-c)、[src-r](#src-r)、[src-f](#src-f)、[src-u](#src-u) | Emotion 定義不保證所選臉型可見效果 | 成功 | E005：17 個可見 PASS／3 個 FAIL | simulator／原版 | E005 | [EXP-F01](#EXP-F01) |
| <a id="SDK-F02"></a>`SDK-F02` | Action | `face.setEmotion(ANGRY)` | 設定生氣表情 | [src-c](#src-c)、[src-r](#src-r)、[src-f](#src-f)、[src-u](#src-u) | Emotion 定義不保證所選臉型可見效果 | 成功 | E005：17 個可見 PASS／3 個 FAIL | simulator／原版 | E005 | [EXP-F02](#EXP-F02) |
| <a id="SDK-F03"></a>`SDK-F03` | Action | `face.setEmotion(SAD)` | 設定難過表情 | [src-c](#src-c)、[src-r](#src-r)、[src-f](#src-f)、[src-u](#src-u) | Emotion 定義不保證所選臉型可見效果 | 成功 | E005：17 個可見 PASS／3 個 FAIL | simulator／原版 | E005 | [EXP-F03](#EXP-F03) |
| <a id="SDK-F04"></a>`SDK-F04` | Action | `face.setEmotion(HAPPY)` | 設定開心表情 | [src-c](#src-c)、[src-r](#src-r)、[src-f](#src-f)、[src-u](#src-u) | Emotion 定義不保證所選臉型可見效果 | 成功 | E005：17 個可見 PASS／3 個 FAIL | simulator／原版 | E005 | [EXP-F04](#EXP-F04) |
| <a id="SDK-F05"></a>`SDK-F05` | Action | `face.setEmotion(SLEEPY)` | 設定睏倦表情 | [src-c](#src-c)、[src-r](#src-r)、[src-f](#src-f)、[src-u](#src-u) | Emotion 定義不保證所選臉型可見效果 | 成功 | E005：17 個可見 PASS／3 個 FAIL | simulator／原版 | E005 | [EXP-F05](#EXP-F05) |
| <a id="SDK-F06"></a>`SDK-F06` | Action | `face.setEmotion(DOUBTFUL)` | 設定疑惑表情 | [src-c](#src-c)、[src-r](#src-r)、[src-f](#src-f)、[src-u](#src-u) | Emotion 定義不保證所選臉型可見效果 | 失敗 | E005：17 個可見 PASS／3 個 FAIL | simulator／原版 | E005 | [EXP-F06](#EXP-F06) |
| <a id="SDK-F07"></a>`SDK-F07` | Action | `face.setEmotion(COLD)` | 設定寒冷表情 | [src-c](#src-c)、[src-r](#src-r)、[src-f](#src-f)、[src-u](#src-u) | Emotion 定義不保證所選臉型可見效果 | 失敗 | E005：17 個可見 PASS／3 個 FAIL | simulator／原版 | E005 | [EXP-F07](#EXP-F07) |
| <a id="SDK-F08"></a>`SDK-F08` | Action | `face.setEmotion(HOT)` | 設定炎熱表情 | [src-c](#src-c)、[src-r](#src-r)、[src-f](#src-f)、[src-u](#src-u) | Emotion 定義不保證所選臉型可見效果 | 失敗 | E005：17 個可見 PASS／3 個 FAIL | simulator／原版 | E005 | [EXP-F08](#EXP-F08) |
| <a id="SDK-F09"></a>`SDK-F09` | Action | `face.setColor(key,r,g,b)` | 改變 primary／secondary 臉部配色 | [src-c](#src-c)、[src-r](#src-r)、[src-u](#src-u)、[src-f](#src-f) | RGB 由 state clamp；依所選臉型呈現 | 未驗證 | — | — | — | — |
| <a id="SDK-F10"></a>`SDK-F10` | Action | `face.setEyeOpen(key,value)` | 控制左／右眼張開程度 | [src-c](#src-c)、[src-r](#src-r)、[src-u](#src-u) | left/right；value 0..1 | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [EXP-F09](#EXP-F09)、[EXP-F10](#EXP-F10)、[EXP-F11](#EXP-F11) |
| <a id="SDK-F11"></a>`SDK-F11` | Action | `face.setMouthOpen(value)` | 控制嘴巴張開程度 | [src-c](#src-c)、[src-r](#src-r)、[src-u](#src-u) | value 0..1 | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [EXP-F12](#EXP-F12) |
| <a id="SDK-M01"></a>`SDK-M01` | Action | `motion.setPose(pose,time?)` | 指定姿勢；時間以秒計 | [src-c](#src-c)、[src-r](#src-r)、[src-m](#src-m) | Promise 結束不能直接證明實際到位；驗證限 E005 指定角度 | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [EXP-M01](#EXP-M01)、[EXP-M02](#EXP-M02)、[EXP-M03](#EXP-M03)、[EXP-M04](#EXP-M04)、[EXP-M05](#EXP-M05)、[EXP-M06](#EXP-M06)、[EXP-M07](#EXP-M07) |
| <a id="SDK-M02"></a>`SDK-M02` | Action | `motion.setTorque(torque)` | 啟用／解除致動器扭力 | [src-c](#src-c)、[src-r](#src-r)、[src-m](#src-m) | 需要平台 actuator；實驗內部 trace 不代表獨立硬體驗證 | 未驗證 | — | — | — | — |
| <a id="SDK-M03"></a>`SDK-M03` | Action | `motion.lookAt(position)` | 指定三維注視目標 | [src-c](#src-c)、[src-r](#src-r)、[src-m](#src-m) | 同步返回非到位；yaw/pitch 任一誤差須嚴格 >30° 等條件 | 部分成功 | E019：失敗 | simulator／原版 | E019 | [EXP-G01](#EXP-G01)、[EXP-G02](#EXP-G02) |
| <a id="SDK-M04"></a>`SDK-M04` | Action | `motion.lookAt(position) — 近中心閉環` | 由偏差反覆修正注視方向 | [src-c](#src-c)、[src-r](#src-r)、[src-m](#src-m) | E023 理想 FOV90°／固定底座／靜態合成目標 | 部分成功：11成功／4失敗 | E023：失敗 | WASM simulator＋synthetic 目標／原版 | E023 | [EXP-G04](#EXP-G04)、[EXP-G05](#EXP-G05) |
| <a id="SDK-M05"></a>`SDK-M05` | Action | `motion.lookAt(position) — pitch 修正候選` | 修正垂直再指定策略 | [src-m](#src-m) | E020 scratch SDK patch；不是 pinned 原版支援保證 | 無法判定 | E020：無法判定 | simulator／scratch patch | E020 | [EXP-G03](#EXP-G03) |
| <a id="SDK-M06"></a>`SDK-M06` | Action | `motion.lookAway()` | 清除注視目標；不承諾回正或取消既有運動 | [src-c](#src-c)、[src-r](#src-r)、[src-m](#src-m) | 清除語意由 controller 契約測試支持 | 成功：清除契約；再次指定有失敗 | E019：失敗 | controller 測試＋WASM simulator／原版 | E019 | [EXP-G02](#EXP-G02) |
| <a id="SDK-A01"></a>`SDK-A01` | Action | `audio.say(text,volume?)` | 文字轉語音 | [src-c](#src-c)、[src-r](#src-r)、[src-a](#src-a) | 合併 conversation.say／legacy say；依 TTS provider | 成功 | E018：成功 | browser simulator／E018 strict WebAudio bridge | E018 | [EXP-A04](#EXP-A04) |
| <a id="SDK-A02"></a>`SDK-A02` | Action | `audio.sing(koe,volume?)` | 演唱 koe 樂譜 | [src-c](#src-c)、[src-r](#src-r)、[src-a](#src-a) | 需要 active TTS.streamKoe；不支援時回 failure | 未驗證 | — | — | — | — |
| <a id="SDK-A03"></a>`SDK-A03` | Action | `audio.record(durationMilliSec?)` | 錄製音訊 buffer | [src-c](#src-c)、[src-r](#src-r)、[src-a](#src-a) | 合併 audio.microphone?.record／legacy record；需麥克風／權限 | 成功 | E007：成功 | browser simulator／原版 | E007 | [EXP-A03](#EXP-A03) |
| <a id="SDK-A04"></a>`SDK-A04` | Action | `audio.tone(hz,duration,volume?)` | 播放固定頻率音 | [src-c](#src-c)、[src-r](#src-r)、[src-a](#src-a) | duration 毫秒；需 speaker，無 speaker 可能直接 resolve | 成功 | E006：成功 | browser simulator／原版 | E006 | [EXP-A01](#EXP-A01) |
| <a id="SDK-A05"></a>`SDK-A05` | Action | `audio.playAudio(buffer)` | 播放既有 buffer | [src-c](#src-c)、[src-r](#src-r)、[src-a](#src-a) | 回 boolean；false 含不支援／空 buffer／失敗 | 成功 | E006、E007：成功 | browser simulator／原版 | E006、E007 | [EXP-A02](#EXP-A02)、[EXP-A03](#EXP-A03) |
| <a id="SDK-A06"></a>`SDK-A06` | Action | `audio.tts.stream(text,volume?,callback?)` | 直接呼叫 TTS 串流 | [src-c](#src-c)、[src-r](#src-r)、[src-a](#src-a) | 公開 provider 介面；一般 Agent 優先 audio.say | 未驗證 | — | — | — | — |
| <a id="SDK-A07"></a>`SDK-A07` | Action | `audio.tts.streamKoe?(koe,volume?,callback?)` | 直接呼叫歌唱 provider | [src-c](#src-c)、[src-r](#src-r)、[src-a](#src-a) | optional；一般 Agent 優先 audio.sing | 未驗證 | — | — | — | — |
| <a id="SDK-A08"></a>`SDK-A08` | Action | `audio.webRadio?.start(options)` | 啟動連續 MP3 播放 | [src-c](#src-c)、[src-a](#src-a) | optional；僅支援的平台；start 在其他 audio 操作期間拒絕 | 未驗證 | — | — | — | — |
| <a id="SDK-A09"></a>`SDK-A09` | Action | `audio.webRadio?.stop()` | 停止網路廣播播放 | [src-c](#src-c)、[src-a](#src-a) | optional；僅支援的平台；start 在其他 audio 操作期間拒絕 | 未驗證 | — | — | — | — |
| <a id="SDK-A10"></a>`SDK-A10` | Action | `audio.webRadio?.setVolume(volume)` | 調整廣播音量 | [src-c](#src-c)、[src-a](#src-a) | optional；僅支援的平台；start 在其他 audio 操作期間拒絕 | 未驗證 | — | — | — | — |
| <a id="SDK-A11"></a>`SDK-A11` | Event | `TTSCompletion(error?)` | TTS stream／streamKoe 的完成或錯誤通知 | [src-c](#src-c)、[src-tt](#src-tt)、[src-a](#src-a) | provider callback；audio.say 包裝使用 | 成功：E018 same request SDK success／natural ended | E018：成功 | simulator／strict WebAudio bridge | E018 | [EXP-A04](#EXP-A04) |
| <a id="SDK-A12"></a>`SDK-A12` | Event | `audio.tts.onPlayed?(power)` | 播放能量通知 | [src-c](#src-c)、[src-tt](#src-tt)、[src-a](#src-a) | runtime useTTS 會綁定為嘴型更新；不可假定可並存多 listener | 未驗證 | — | — | — | — |
| <a id="SDK-A13"></a>`SDK-A13` | Event | `audio.tts.onDone?()` | TTS 完成通知 | [src-c](#src-c)、[src-tt](#src-tt)、[src-a](#src-a) | runtime useTTS 會綁定關嘴；非獨立 request 完成協定 | 未驗證 | — | — | — | — |
| <a id="SDK-A14"></a>`SDK-A14` | Event | `WebRadioStartOptions.onStateChanged(state,reason?)` | 廣播 idle/connecting/buffering/playing/stalled/retrying/error 狀態 | [src-c](#src-c)、[src-a](#src-a) | optional webRadio start callback；不是通用 Robot 事件匯流排 | 未驗證 | — | — | — | — |
| <a id="SDK-C01"></a>`SDK-C01` | Action | `camera.start(options?)` | 啟動攝影機 | [src-c](#src-c)、[src-r](#src-r)、[src-ca](#src-ca)、[src-cr](#src-cr) | 需 camera provider／權限；available 及 frame source 必須另核對 | 成功：webcam 與 fallback 分層 | E008：成功 | browser simulator＋真實 webcam／原版來源重建 | E008 | [EXP-C01](#EXP-C01)、[EXP-C02](#EXP-C02)；E015 組合流程見 [EXP-C03](#EXP-C03) |
| <a id="SDK-C02"></a>`SDK-C02` | Action | `camera.capture(options?)` | 取得單張 frame | [src-c](#src-c)、[src-r](#src-r)、[src-ca](#src-ca)、[src-cr](#src-cr) | 需 camera provider／權限；available 及 frame source 必須另核對 | 成功：webcam 與 fallback 分層 | E008：成功 | browser simulator＋真實 webcam／原版來源重建 | E008 | [EXP-C01](#EXP-C01)、[EXP-C02](#EXP-C02)；E015 組合流程見 [EXP-C03](#EXP-C03) |
| <a id="SDK-C03"></a>`SDK-C03` | Action | `camera.stop()` | 停止攝影機 | [src-c](#src-c)、[src-r](#src-r)、[src-ca](#src-ca)、[src-cr](#src-cr) | 需 camera provider／權限；available 及 frame source 必須另核對 | 成功：webcam 與 fallback 分層 | E008：成功 | browser simulator＋真實 webcam／原版來源重建 | E008 | [EXP-C01](#EXP-C01)、[EXP-C02](#EXP-C02)；E015 組合流程見 [EXP-C03](#EXP-C03) |
| <a id="SDK-C04"></a>`SDK-C04` | Action | `camera.close?()` | 關閉 camera 資源 | [src-ca](#src-ca)、[src-cr](#src-cr) | provider close optional；runtime wrapper 先 stop；未將 stop 證據當成 close 驗證 | 未驗證 | — | — | — | — |
| <a id="SDK-L01"></a>`SDK-L01` | Action | `lighting.lightOn(...) / lighting.led[name].on(...)` | 指定RGB亮燈 | [src-c](#src-c)、[src-r](#src-r)、[src-l](#src-l) | 合併 legacy lightOn；需已存在 LED name，缺 name 不報效果錯誤 | 未驗證 | — | — | — | — |
| <a id="SDK-L02"></a>`SDK-L02` | Action | `lighting.lightOff(...) / lighting.led[name].off(...)` | 熄燈 | [src-c](#src-c)、[src-r](#src-r)、[src-l](#src-l) | 合併 legacy lightOff；需已存在 LED name，缺 name 不報效果錯誤 | 未驗證 | — | — | — | — |
| <a id="SDK-L03"></a>`SDK-L03` | Action | `lighting.lightBlink(...) / lighting.led[name].blink(...)` | 依duration閃燈 | [src-c](#src-c)、[src-r](#src-r)、[src-l](#src-l) | 合併 legacy lightBlink；需已存在 LED name，缺 name 不報效果錯誤 | 未驗證 | — | — | — | — |
| <a id="SDK-L04"></a>`SDK-L04` | Action | `lighting.lightRainbow(...) / lighting.led[name].rainbow(...)` | 彩虹燈效 | [src-c](#src-c)、[src-r](#src-r)、[src-l](#src-l) | 合併 legacy lightRainbow；需已存在 LED name，缺 name 不報效果錯誤 | 未驗證 | — | — | — | — |
| <a id="SDK-I01"></a>`SDK-I01` | Event | `input.button?.a?.onEvent(event)` | A 按下／放開通知 | [src-c](#src-c)、[src-i](#src-i)、[src-ie](#src-ie) | kind=button，pressed、ticks；平台可缺按鍵 | 成功 | E003：成功；E005：17 PASS／3 FAIL | simulator／原版 | E003、E005 | [EXP-I01](#EXP-I01) |
| <a id="SDK-I02"></a>`SDK-I02` | Event | `input.button?.b?.onEvent(event)` | B 按下／放開通知 | [src-c](#src-c)、[src-i](#src-i)、[src-ie](#src-ie) | kind=button，pressed、ticks；平台可缺按鍵 | 成功 | E003：成功；E005：17 PASS／3 FAIL | simulator／原版 | E003、E005 | [EXP-I01](#EXP-I01) |
| <a id="SDK-I03"></a>`SDK-I03` | Event | `input.button?.c?.onEvent(event)` | C 按下／放開通知 | [src-c](#src-c)、[src-i](#src-i)、[src-ie](#src-ie) | kind=button，pressed、ticks；平台可缺按鍵 | 成功 | E003：成功；E005：17 PASS／3 FAIL | simulator／原版 | E003、E005 | [EXP-I01](#EXP-I01) |
| <a id="SDK-I04"></a>`SDK-I04` | Event | `input.button?.power?.onEvent(event)` | POWER 按下／放開通知 | [src-c](#src-c)、[src-i](#src-i)、[src-ie](#src-ie) | kind=button，pressed、ticks；平台可缺按鍵 | 未驗證 | — | — | — | — |
| <a id="SDK-I05"></a>`SDK-I05` | Event | `input.touch?.onEvent(event.phase=began)` | 螢幕觸控原始階段、id/x/y/ticks | [src-c](#src-c)、[src-t](#src-t)、[src-ie](#src-ie) | 需 config.Touch；Piu onTouch* 成功不能直接替代此 callback 驗證 | 未驗證 | — | — | — | — |
| <a id="SDK-I06"></a>`SDK-I06` | Event | `input.touch?.onEvent(event.phase=moved)` | 螢幕觸控原始階段、id/x/y/ticks | [src-c](#src-c)、[src-t](#src-t)、[src-ie](#src-ie) | 需 config.Touch；Piu onTouch* 成功不能直接替代此 callback 驗證 | 未驗證 | — | — | — | — |
| <a id="SDK-I07"></a>`SDK-I07` | Event | `input.touch?.onEvent(event.phase=ended)` | 螢幕觸控原始階段、id/x/y/ticks | [src-c](#src-c)、[src-t](#src-t)、[src-ie](#src-ie) | 需 config.Touch；Piu onTouch* 成功不能直接替代此 callback 驗證 | 未驗證 | — | — | — | — |
| <a id="SDK-I08"></a>`SDK-I08` | Event | `input.touchPanel?.onEvent / subscribe: press` | 機頂接觸開始 | [src-c](#src-c)、[src-p](#src-p)、[src-g](#src-g)、[src-ie](#src-ie) | weighted position −100..100；swipe delta 嚴格 >60／<−60；每 contact 至多一次 | 成功：E017；E016 局部成功 | E017：成功；E016：無法判定 | simulator／scratch raw input bridge，非真感測 | E010、E016、E017 | [EXP-I03](#EXP-I03)、[EXP-I04](#EXP-I04)、[EXP-I05](#EXP-I05) |
| <a id="SDK-I09"></a>`SDK-I09` | Event | `input.touchPanel?.onEvent / subscribe: release` | 機頂接觸結束 | [src-c](#src-c)、[src-p](#src-p)、[src-g](#src-g)、[src-ie](#src-ie) | weighted position −100..100；swipe delta 嚴格 >60／<−60；每 contact 至多一次 | 成功：E017；E016 局部成功 | E017：成功；E016：無法判定 | simulator／scratch raw input bridge，非真感測 | E010、E016、E017 | [EXP-I03](#EXP-I03)、[EXP-I04](#EXP-I04)、[EXP-I05](#EXP-I05) |
| <a id="SDK-I10"></a>`SDK-I10` | Event | `input.touchPanel?.onEvent / subscribe: forwardSwipe` | 機頂接觸左→右滑動 | [src-c](#src-c)、[src-p](#src-p)、[src-g](#src-g)、[src-ie](#src-ie) | weighted position −100..100；swipe delta 嚴格 >60／<−60；每 contact 至多一次 | 成功：E017；E016 局部成功 | E017：成功；E016：無法判定 | simulator／scratch raw input bridge，非真感測 | E016、E017 | [EXP-I04](#EXP-I04)、[EXP-I05](#EXP-I05) |
| <a id="SDK-I11"></a>`SDK-I11` | Event | `input.touchPanel?.onEvent / subscribe: backwardSwipe` | 機頂接觸右→左滑動 | [src-c](#src-c)、[src-p](#src-p)、[src-g](#src-g)、[src-ie](#src-ie) | weighted position −100..100；swipe delta 嚴格 >60／<−60；每 contact 至多一次 | 成功：E017；E016 局部成功 | E017：成功；E016：無法判定 | simulator／scratch raw input bridge，非真感測 | E016、E017 | [EXP-I04](#EXP-I04)、[EXP-I05](#EXP-I05) |
| <a id="SDK-I12"></a>`SDK-I12` | Event | `input.imu?.onEvent(event.motion=shake)` | 晃動辨識通知 | [src-c](#src-c)、[src-im](#src-im)、[src-ir](#src-ir)、[src-ie](#src-ie) | kind=imu、motion、ticks；需 IMU provider 與 start | 成功：受控 synthetic matrix | E021：成功（synthetic-only） | WASM simulator／scratch provider＋clock patch | E021 | [EXP-I06](#EXP-I06) |
| <a id="SDK-I13"></a>`SDK-I13` | Event | `input.imu?.onEvent(event.motion=fallenForward)` | 前倒辨識通知 | [src-c](#src-c)、[src-im](#src-im)、[src-ir](#src-ir)、[src-ie](#src-ie) | kind=imu、motion、ticks；需 IMU provider 與 start | 成功：受控 synthetic matrix | E021：成功（synthetic-only） | WASM simulator／scratch provider＋clock patch | E021 | [EXP-I06](#EXP-I06) |
| <a id="SDK-I14"></a>`SDK-I14` | Event | `input.imu?.onEvent(event.motion=fallenBackward)` | 後倒辨識通知 | [src-c](#src-c)、[src-im](#src-im)、[src-ir](#src-ir)、[src-ie](#src-ie) | kind=imu、motion、ticks；需 IMU provider 與 start | 成功：受控 synthetic matrix | E021：成功（synthetic-only） | WASM simulator／scratch provider＋clock patch | E021 | [EXP-I06](#EXP-I06) |
| <a id="SDK-I15"></a>`SDK-I15` | Event | `input.imu?.onEvent(event.motion=fallenLeft)` | 左倒辨識通知 | [src-c](#src-c)、[src-im](#src-im)、[src-ir](#src-ir)、[src-ie](#src-ie) | kind=imu、motion、ticks；需 IMU provider 與 start | 成功：受控 synthetic matrix | E021：成功（synthetic-only） | WASM simulator／scratch provider＋clock patch | E021 | [EXP-I06](#EXP-I06) |
| <a id="SDK-I16"></a>`SDK-I16` | Event | `input.imu?.onEvent(event.motion=fallenRight)` | 右倒辨識通知 | [src-c](#src-c)、[src-im](#src-im)、[src-ir](#src-ir)、[src-ie](#src-ie) | kind=imu、motion、ticks；需 IMU provider 與 start | 成功：受控 synthetic matrix | E021：成功（synthetic-only） | WASM simulator／scratch provider＋clock patch | E021 | [EXP-I06](#EXP-I06) |
| <a id="SDK-I17"></a>`SDK-I17` | Event | `input.imu?.onEvent(event.motion=upsideDown)` | 倒置辨識通知 | [src-c](#src-c)、[src-im](#src-im)、[src-ir](#src-ir)、[src-ie](#src-ie) | kind=imu、motion、ticks；需 IMU provider 與 start | 成功：受控 synthetic matrix | E021：成功（synthetic-only） | WASM simulator／scratch provider＋clock patch | E021 | [EXP-I06](#EXP-I06) |
| <a id="SDK-I18"></a>`SDK-I18` | Action | `input.touchPanel?.start()` | 開始機頂取樣 | [src-c](#src-c)、[src-p](#src-p) | polling 控制；host 可管理 lifecycle；成功條件限對應實驗 | 成功：限定實驗 start/stop | E017：成功 | simulator／scratch input | E017 | [EXP-I05](#EXP-I05) |
| <a id="SDK-I19"></a>`SDK-I19` | Action | `input.touchPanel?.stop()` | 停止機頂取樣 | [src-c](#src-c)、[src-p](#src-p) | polling 控制；host 可管理 lifecycle；成功條件限對應實驗 | 成功：限定實驗 start/stop | E017：成功 | simulator／scratch input | E017 | [EXP-I05](#EXP-I05) |
| <a id="SDK-I20"></a>`SDK-I20` | Action | `input.imu?.start()` | 開始 IMU 取樣辨識 | [src-c](#src-c)、[src-im](#src-im) | polling 控制；host 可管理 lifecycle；成功條件限對應實驗 | 成功：限定實驗 start/stop | E021：成功（synthetic-only） | simulator／scratch input＋clock patch | E021 | [EXP-I06](#EXP-I06) |
| <a id="SDK-I21"></a>`SDK-I21` | Action | `input.imu?.stop()` | 停止 IMU 取樣辨識 | [src-c](#src-c)、[src-im](#src-im) | polling 控制；host 可管理 lifecycle；成功條件限對應實驗 | 成功：限定實驗 start/stop | E021：成功（synthetic-only） | simulator／scratch input＋clock patch | E021 | [EXP-I06](#EXP-I06) |
| <a id="SDK-U01"></a>`SDK-U01` | Action | `ui.setFace(face)` | 替換臉部 Piu component | [src-c](#src-c)、[src-r](#src-r)、[src-u](#src-u) | 由 RobotUI/Piu renderer 提供；showBalloon/hideBalloon 合併 legacy alias | 未驗證 | — | — | — | — |
| <a id="SDK-U02"></a>`SDK-U02` | Action | `ui.setHandAnimation(animation)` | 臉周圍手部畫面動畫：none／rock-paper-scissors／clap／thinking | [src-c](#src-c)、[src-r](#src-r)、[src-u](#src-u)、[src-h](#src-h) | 由 RobotUI/Piu renderer 提供；showBalloon/hideBalloon 合併 legacy alias | 未驗證 | — | — | — | — |
| <a id="SDK-U03"></a>`SDK-U03` | Action | `ui.setFaceMotionEnabled?(enabled)` | 啟停週期臉部動畫，不替換／隱藏臉 | [src-c](#src-c)、[src-r](#src-r)、[src-u](#src-u) | 由 RobotUI/Piu renderer 提供；showBalloon/hideBalloon 合併 legacy alias | 未驗證 | — | — | — | — |
| <a id="SDK-U04"></a>`SDK-U04` | Action | `ui.setMain(content)` | 切換主畫面並保留 AppBar／Drawer | [src-c](#src-c)、[src-r](#src-r)、[src-u](#src-u) | 由 RobotUI/Piu renderer 提供；showBalloon/hideBalloon 合併 legacy alias | 成功 | E009：主路徑通過；E011：approved | simulator／原版＋實驗 UI | E009、E011 | [EXP-U01](#EXP-U01) |
| <a id="SDK-U05"></a>`SDK-U05` | Action | `ui.showFace()` | 回到臉部主畫面 | [src-c](#src-c)、[src-r](#src-r)、[src-u](#src-u) | 由 RobotUI/Piu renderer 提供；showBalloon/hideBalloon 合併 legacy alias | 成功 | E009：主路徑通過；E011：approved | simulator／原版＋實驗 UI | E009、E011 | [EXP-U01](#EXP-U01) |
| <a id="SDK-U06"></a>`SDK-U06` | Action | `ui.addEffect(effect,key?)` | 加入畫面特效 | [src-c](#src-c)、[src-r](#src-r)、[src-u](#src-u) | 由 RobotUI/Piu renderer 提供；showBalloon/hideBalloon 合併 legacy alias | 未驗證 | — | — | — | — |
| <a id="SDK-U07"></a>`SDK-U07` | Action | `ui.removeEffect(effect)` | 移除畫面特效 | [src-c](#src-c)、[src-r](#src-r)、[src-u](#src-u) | 由 RobotUI/Piu renderer 提供；showBalloon/hideBalloon 合併 legacy alias | 未驗證 | — | — | — | — |
| <a id="SDK-U08"></a>`SDK-U08` | Action | `ui.showBalloon(text,option?)` | 顯示文字氣泡 | [src-c](#src-c)、[src-r](#src-r)、[src-u](#src-u) | 由 RobotUI/Piu renderer 提供；showBalloon/hideBalloon 合併 legacy alias | 未驗證 | — | — | — | — |
| <a id="SDK-U09"></a>`SDK-U09` | Action | `ui.hideBalloon()` | 隱藏文字氣泡 | [src-c](#src-c)、[src-r](#src-r)、[src-u](#src-u) | 由 RobotUI/Piu renderer 提供；showBalloon/hideBalloon 合併 legacy alias | 未驗證 | — | — | — | — |
| <a id="SDK-U10"></a>`SDK-U10` | Action | `ui.openDrawer()` | 展開 Drawer | [src-c](#src-c)、[src-r](#src-r)、[src-u](#src-u) | 由 RobotUI/Piu renderer 提供；showBalloon/hideBalloon 合併 legacy alias | 未驗證 | — | — | — | — |
| <a id="SDK-U11"></a>`SDK-U11` | Action | `ui.closeDrawer()` | 收合 Drawer | [src-c](#src-c)、[src-r](#src-r)、[src-u](#src-u) | 由 RobotUI/Piu renderer 提供；showBalloon/hideBalloon 合併 legacy alias | 未驗證 | — | — | — | — |
| <a id="SDK-U12"></a>`SDK-U12` | Action | `ui.toggleDrawer()` | 切換 Drawer 展開狀態 | [src-c](#src-c)、[src-r](#src-r)、[src-u](#src-u) | 由 RobotUI/Piu renderer 提供；showBalloon/hideBalloon 合併 legacy alias | 未驗證 | — | — | — | — |
| <a id="SDK-U13"></a>`SDK-U13` | Event | `ui.bindDrawerAction(key,callback)` | Drawer 操作／選擇值通知 | [src-c](#src-c)、[src-r](#src-r)、[src-u](#src-u) | callback(value?)；drawer.addDrawerButton 的 callback(context,value?) 為較高層入口；配置非已驗證效果 | 未驗證 | — | — | — | — |
| <a id="SDK-U14"></a>`SDK-U14` | Event | `Piu Behavior.onTouchBegan` | 裝置畫面 Piu 元件觸控 callback | [src-c](#src-c)、[src-r](#src-r)、[src-piu](#src-piu) | 透過 ui.setMain 的實驗 Piu component；不是 InputEvent 型別 | 成功：螢幕開始接觸 | E009：主路徑通過；E011：approved | browser simulator／實驗 UI與移出取消橋接 | E009、E011 | [EXP-U01](#EXP-U01) |
| <a id="SDK-U15"></a>`SDK-U15` | Event | `Piu Behavior.onTouchMoved` | 裝置畫面 Piu 元件觸控 callback | [src-c](#src-c)、[src-r](#src-r)、[src-piu](#src-piu) | 透過 ui.setMain 的實驗 Piu component；不是 InputEvent 型別 | 成功：選單純捲動／移出判斷 | E009：主路徑通過；E011：approved | browser simulator／實驗 UI與移出取消橋接 | E009、E011 | [EXP-U01](#EXP-U01) |
| <a id="SDK-U16"></a>`SDK-U16` | Event | `Piu Behavior.onTouchEnded` | 裝置畫面 Piu 元件觸控 callback | [src-c](#src-c)、[src-r](#src-r)、[src-piu](#src-piu) | 透過 ui.setMain 的實驗 Piu component；不是 InputEvent 型別 | 成功：點選派送與busy拒絕 | E009：主路徑通過；E011：approved | browser simulator／實驗 UI與移出取消橋接 | E009、E011 | [EXP-U01](#EXP-U01) |
| <a id="SDK-U17"></a>`SDK-U17` | Event | `Piu Behavior.onTouchCancelled` | 裝置畫面 Piu 元件觸控 callback | [src-c](#src-c)、[src-r](#src-r)、[src-piu](#src-piu) | 透過 ui.setMain 的實驗 Piu component；不是 InputEvent 型別 | simulator callback 是否送達：無法判定；取消 handler／offset 還原：純 TS 測試支持 | E009：主路徑通過；E011：approved | browser simulator／實驗 UI與移出取消橋接；handler 驗證為純 TS／mock | E009、E011 | [EXP-U01](#EXP-U01) |
| <a id="SDK-S01"></a>`SDK-S01` | Action | `conversation.remoteSession?.requestStart()` | 請求開始遠端語音 session | [src-c](#src-c)、[src-r](#src-r) | optional host delegate；未執行網路或實機驗證 | 未驗證 | — | — | — | — |
| <a id="SDK-S02"></a>`SDK-S02` | Action | `conversation.remoteSession?.requestStop()` | 請求停止遠端語音 session | [src-c](#src-c)、[src-r](#src-r) | optional host delegate；未執行網路或實機驗證 | 未驗證 | — | — | — | — |
| <a id="SDK-S03"></a>`SDK-S03` | Action | `conversation.remoteSession?.activate()` | 啟用語音 session | [src-c](#src-c)、[src-r](#src-r) | optional host delegate；未執行網路或實機驗證 | 未驗證 | — | — | — | — |
| <a id="SDK-S04"></a>`SDK-S04` | Action | `conversation.remoteSession?.deactivate()` | 停用語音 session | [src-c](#src-c)、[src-r](#src-r) | optional host delegate；未執行網路或實機驗證 | 未驗證 | — | — | — | — |
| <a id="SDK-S05"></a>`SDK-S05` | Event | `conversation.remoteSession?.subscribe(listener)` | standby/connecting/listening/recognizing/speaking/blocked 及 error 通知 | [src-c](#src-c)、[src-r](#src-r) | optional session；unsubscribe 函式為資源控制 | 未驗證 | — | — | — | — |
| <a id="SDK-S06"></a>`SDK-S06` | Event | `conversation.remoteSession?.subscribeTransport(listener)` | disconnected/unsupported/ready 通知 | [src-c](#src-c)、[src-r](#src-r) | 僅補充語音 session 可用性，非網路 API 盤點 | 未驗證 | — | — | — | — |

### SDK 介面邊界與非獨立行為

- `motion.pose`、`camera.available`、`touchPanel.sample`、`webRadio.state`、remote session 的 state／activationState／transportState／lastError 是讀值，並非 Event。raw IMU sample 不由公開 IMU 物件提供讀取方法。
- `audio.useTTS`／legacy `useTTS` 是 provider 設定；runtime 會重綁 `onPlayed`／`onDone`。不能擅自覆寫為應用多訂閱或把口型更新當作已辨識語音。
- `touchPanel.configure` 與 recognizer constructor options 屬設定。`Touch.close`、`TouchPanel.close`、`IMU.close`、`lifecycle.close`、frame.close、unsubscribe 屬資源管理；沒有獨立實機效果驗證。camera.close 因直接影響相機生命週期另列。
- `ui.update(interval,faceState)` 是 renderer 更新入口，`ui.controller`／`ui.application` 為底層存取；E009／E011 的 Piu callback 由實驗 component 提供，不代表 `input.touch.onEvent` 已驗證。Piu callback 並非 `InputEvent` union；onTouchCancelled 也不是其 touch phase。
- Drawer 的 `setDrawerButtons`、`addDrawerButton`、`removeDrawerButton`、`setDrawerButtonState`、`bindDrawerAction`／`unbindDrawerAction`，以及 `ui.drawer`／legacy `drawer` 的 add/remove/clear/state 方法是畫面配置／綁定管理，均未有本次對應行為證據。其操作 callback 列為 SDK-U13。`miniApps` registry、i18n、connectivity/network/localPeer 不屬本目錄 Robot 效果 API 盤點。
- SDK 沒有 `greet`、`head.nod`、`head.shake` 或通用 `stop` 原生方法，也沒有影片錄製 API。機頂 tap 是 `release.tap` metadata；IMU shake Event 與 `head.shake` Action 不是同一能力。

## 實驗行為表

以下每筆結果均與列出的實驗、環境及證據配對；同一 SDK 方法在不同條件下不互相覆蓋。

| 行為 ID | 類型 | 行為名稱 | 用途／組合 | 對應 SDK | 行為／條件結果 | 實驗整體結論 | 環境／patch | EXXX | 直接證據及限制 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| <a id="EXP-F01"></a>`EXP-F01` | Action | `face.neutral` | 顯示指定情緒 | [SDK-F01](#SDK-F01) | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [逐項 matrix](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；1.5 s 可辨識效果 |
| <a id="EXP-F02"></a>`EXP-F02` | Action | `face.angry` | 顯示指定情緒 | [SDK-F02](#SDK-F02) | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [逐項 matrix](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；1.5 s 可辨識效果 |
| <a id="EXP-F03"></a>`EXP-F03` | Action | `face.sad` | 顯示指定情緒 | [SDK-F03](#SDK-F03) | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [逐項 matrix](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；1.5 s 可辨識效果 |
| <a id="EXP-F04"></a>`EXP-F04` | Action | `face.happy` | 顯示指定情緒 | [SDK-F04](#SDK-F04) | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [逐項 matrix](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；1.5 s 可辨識效果 |
| <a id="EXP-F05"></a>`EXP-F05` | Action | `face.sleepy` | 顯示指定情緒 | [SDK-F05](#SDK-F05) | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [逐項 matrix](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；1.5 s 可辨識效果 |
| <a id="EXP-F06"></a>`EXP-F06` | Action | `face.doubtful` | 顯示指定情緒 | [SDK-F06](#SDK-F06) | 失敗 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [逐項 matrix](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；1.5 s 無可辨識的中性差異；不得以 completed 當視覺成功 |
| <a id="EXP-F07"></a>`EXP-F07` | Action | `face.cold` | 顯示指定情緒 | [SDK-F07](#SDK-F07) | 失敗 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [逐項 matrix](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；1.5 s 無可辨識的中性差異；不得以 completed 當視覺成功 |
| <a id="EXP-F08"></a>`EXP-F08` | Action | `face.hot` | 顯示指定情緒 | [SDK-F08](#SDK-F08) | 失敗 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [逐項 matrix](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；1.5 s 無可辨識的中性差異；不得以 completed 當視覺成功 |
| <a id="EXP-F09"></a>`EXP-F09` | Action | `face.blink` | 雙眼 0→1 | [SDK-F10](#SDK-F10) | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [matrix 與錄影時間點](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；組合序列；非獨立 SDK 方法 |
| <a id="EXP-F10"></a>`EXP-F10` | Action | `face.wink_left` | 左眼 0→1 | [SDK-F10](#SDK-F10) | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [matrix 與錄影時間點](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；組合序列；非獨立 SDK 方法 |
| <a id="EXP-F11"></a>`EXP-F11` | Action | `face.wink_right` | 右眼 0→1 | [SDK-F10](#SDK-F10) | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [matrix 與錄影時間點](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；組合序列；非獨立 SDK 方法 |
| <a id="EXP-F12"></a>`EXP-F12` | Action | `face.mouth_open` | 嘴巴 0.8→0 | [SDK-F11](#SDK-F11) | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [matrix 與錄影時間點](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；組合序列；非獨立 SDK 方法 |
| <a id="EXP-M01"></a>`EXP-M01` | Action | `head.left` | yaw +π/6→0 | [SDK-M01](#SDK-M01) | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [matrix 與 dwell](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；具名序列不是 SDK 原生 Action；不證明任意姿勢或實機角度 |
| <a id="EXP-M02"></a>`EXP-M02` | Action | `head.right` | yaw −π/6→0 | [SDK-M01](#SDK-M01) | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [matrix 與 dwell](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；具名序列不是 SDK 原生 Action；不證明任意姿勢或實機角度 |
| <a id="EXP-M03"></a>`EXP-M03` | Action | `head.up` | pitch −π/6→0 | [SDK-M01](#SDK-M01) | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [matrix 與 dwell](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；具名序列不是 SDK 原生 Action；不證明任意姿勢或實機角度 |
| <a id="EXP-M04"></a>`EXP-M04` | Action | `head.down` | pitch +π/32→0 | [SDK-M01](#SDK-M01) | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [matrix 與 dwell](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；具名序列不是 SDK 原生 Action；不證明任意姿勢或實機角度 |
| <a id="EXP-M05"></a>`EXP-M05` | Action | `head.nod` | pitch +0.28→0 | [SDK-M01](#SDK-M01) | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [matrix 與 dwell](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；具名序列不是 SDK 原生 Action；不證明任意姿勢或實機角度 |
| <a id="EXP-M06"></a>`EXP-M06` | Action | `head.shake` | yaw +0.25→−0.25→0 | [SDK-M01](#SDK-M01) | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [matrix 與 dwell](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；具名序列不是 SDK 原生 Action；不證明任意姿勢或實機角度 |
| <a id="EXP-M07"></a>`EXP-M07` | Action | `head.center` | 自身建立 yaw +π/6 偏移後回0 | [SDK-M01](#SDK-M01) | 成功 | E005：17 PASS／3 FAIL | simulator／原版 | E005 | [matrix 與 dwell](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；具名序列不是 SDK 原生 Action；不證明任意姿勢或實機角度 |
| <a id="EXP-A01"></a>`EXP-A01` | Action | `tone` | A：440 Hz 短音 | [SDK-A04](#SDK-A04) | 成功 | E006：成功 | browser simulator＋真人聽辨；原版 | E006 | [操作與聽辨](../experiments/E006-audio-output/EXPERIMENT.md)；E006 首份錯誤 tab 錄影已拒收，採 replacement capture |
| <a id="EXP-A02"></a>`EXP-A02` | Action | `playAudio WAV` | C：660 Hz WAV；E007 同 buffer 回放另列 | [SDK-A05](#SDK-A05) | 成功 | E006：成功 | browser simulator＋真人聽辨；原版 | E006 | [操作與聽辨](../experiments/E006-audio-output/EXPERIMENT.md)；E006 首份錯誤 tab 錄影已拒收，採 replacement capture |
| <a id="EXP-A03"></a>`EXP-A03` | Action | `record + playAudio` | 2000 ms 錄「一、二、三」並辨認回放 | [SDK-A03](#SDK-A03)、[SDK-A05](#SDK-A05) | 成功 | E007：成功 | browser simulator＋真人聽辨；原版 | E007 | [操作與聽辨](../experiments/E007-microphone-recording/evidence/recording-run.md)；28,310 bytes；未保存聲音、不證明 ASR |
| <a id="EXP-A04"></a>`EXP-A04` | Action | `audio.say 日文` | こんにちは。／おやすみなさい。五筆同次聽辨 | [SDK-A01](#SDK-A01)、[SDK-A11](#SDK-A11) | 成功 | E018：成功 | browser simulator＋真人聽辨；E018 strict bridge | E018 | [操作與聽辨](../experiments/E018-tts-action/evidence/tts-run.md)；非中文、實機、stock bridge 完成保證 |
| <a id="EXP-C01"></a>`EXP-C01` | Action | `webcam capture` | 三筆96×96 frame，實景 open→covered→open | [SDK-C01](#SDK-C01)、[SDK-C02](#SDK-C02)、[SDK-C03](#SDK-C03) | 成功 | E008：成功 | simulator＋真實 webcam／attested runtime | E008 | [同次 frame／checksum](../experiments/E008-camera-input/evidence/camera-run.md)；主實機 Robot 未驗證；未保存 raw image |
| <a id="EXP-C02"></a>`EXP-C02` | Action | `camera synthetic fallback` | unsupported／no-device／permission denial 保持 synthetic 分類 | [SDK-C01](#SDK-C01)、[SDK-C02](#SDK-C02)、[SDK-C03](#SDK-C03) | 成功：僅 fallback | E008：成功 | simulator／synthetic frames | E008 | [fallback 實測](../experiments/E008-camera-input/evidence/camera-run.md)；不得當作 webcam 成功 |
| <a id="EXP-X01"></a>`EXP-X01` | Action | `greet` | HAPPY＋點頭＋回中立 | [SDK-F01](#SDK-F01)、[SDK-F04](#SDK-F04)、[SDK-M01](#SDK-M01) | 成功 | E001、E003、E004：simulator 通過；E005：17 PASS／3 FAIL | simulator／原版 | E001、E003、E004、E005 | [E001 紀錄](../experiments/E001-visible-greet/EXPERIMENT.md)、[E003 完整迴路](../experiments/E003-robot-event-loop/evidence/phase-2-full-loop.md)、[E004 派送](../experiments/E004-named-action-dispatch/evidence/full-loop.md)、[E005 matrix](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)；各實驗自有 command/result 契約；greet 非 SDK 原生方法 |
| <a id="EXP-X02"></a>`EXP-X02` | Action | `stop / reset` | 本實驗取消 generation 並回中立 | [SDK-F01](#SDK-F01)、[SDK-M01](#SDK-M01) | 成功：限定實驗 | E001、E003：通過；E005：selector 可行 | simulator／實驗控制 | E001、E003、E005 | [E001 stop](../experiments/E001-visible-greet/EXPERIMENT.md)、[E003 B 中斷](../experiments/E003-robot-event-loop/evidence/phase-2-full-loop.md)、[E005 中斷與重設](../experiments/E005-robot-action-catalog/EXPERIMENT.md)；SDK 沒有對應通用 stop Action；Server timeout 不證明已停止 |
| <a id="EXP-I01"></a>`EXP-I01` | Event | `button A/B/C` | A 事件上報、B 中斷、C 派送／選取 | [SDK-I01](#SDK-I01)、[SDK-I02](#SDK-I02)、[SDK-I03](#SDK-I03) | 成功 | E003：Stage1/2 PASS；E005：selector 可行 | simulator／原版 | E003、E005 | [同次 A/release](../experiments/E003-robot-event-loop/evidence/phase-1-event-bridge.md)、[E005 A/C/B](../experiments/E005-robot-action-catalog/EXPERIMENT.md)；不是實體按鍵品質或 power 按鍵證據 |
| <a id="EXP-I03"></a>`EXP-I03` | Event | `top tap → greet` | 機頂三區 release.tap 經 subscribe 啟動招呼 | [SDK-I08](#SDK-I08)、[SDK-I09](#SDK-I09)、[SDK-F04](#SDK-F04)、[SDK-M01](#SDK-M01) | 部分成功：owner 左中右＋busy 操作通過 | E010：accepted visible POC／review-ready | simulator／scratch top-touch patch | E010 | [人工與建置邊界](../experiments/E010-virtual-top-touch-greet/evidence/top-touch-greet-run.md)；tap 是 release 的 metadata，不是第五種 gesture；現行 patch 完整 WASM 重建待執行，歷史hash不證明現行patch |
| <a id="EXP-I04"></a>`EXP-I04` | Event | `top swipe E016` | raw samples→原 SDK→MOD 雙向滑動 | [SDK-I08](#SDK-I08)、[SDK-I09](#SDK-I09)、[SDK-I10](#SDK-I10)、[SDK-I11](#SDK-I11) | 部分成功：已執行雙向與leave恢復；完整判準無法判定 | E016：無法判定 | simulator／scratch native ABI＋poll wrapper | E016 | [正式修正與逐項 TC](../experiments/E016-top-touch-swipe/README.md)、[原始驗證](../experiments/E016-top-touch-swipe/evidence/verification.json)；舊完整 PASS 已撤回：TC05 reset／不可用初始化未執行，TC07歷史工具／installed tree attestation缺口；operation15失敗保留 |
| <a id="EXP-I05"></a>`EXP-I05` | Event | `top swipe E017` | 原 SDK press/release 與雙向 swipe | [SDK-I08](#SDK-I08)、[SDK-I09](#SDK-I09)、[SDK-I10](#SDK-I10)、[SDK-I11](#SDK-I11)、[SDK-I18](#SDK-I18)、[SDK-I19](#SDK-I19) | 成功：限定 pinned simulator | E017：成功 | simulator／scratch raw input bridge；合成強度 | E017 | [人工與失敗歷史](../experiments/E017-top-swipe-event/evidence/swipe-run.md)、[驗收摘要](../experiments/E017-top-swipe-event/evidence/acceptance-summary.json)；原 recognizer／threshold不改；active-input restart與provider-missing分支未單獨示範，不外推K151實機 |
| <a id="EXP-I06"></a>`EXP-I06` | Event | `IMU 六種 motion` | 受控向量經原 SDK 辨識六種事件 | [SDK-I12](#SDK-I12)、[SDK-I13](#SDK-I13)、[SDK-I14](#SDK-I14)、[SDK-I15](#SDK-I15)、[SDK-I16](#SDK-I16)、[SDK-I17](#SDK-I17)、[SDK-I20](#SDK-I20)、[SDK-I21](#SDK-I21) | 成功：53/53 automated＋53/53 owner synthetic cases | E021：成功（synthetic-only） | WASM simulator／scratch raw driver＋monotonic clock patch | E021 | [分層摘要](../experiments/E021-imu-event/evidence/acceptance-summary.json)、[操作紀錄](../experiments/E021-imu-event/evidence/imu-run.md)、[owner exports](../experiments/E021-imu-event/evidence/operator-session.json)；原辨識器／threshold／Event不改；不證明實體方向、單位、靈敏度、誤報或 upstream native support |
| <a id="EXP-U01"></a>`EXP-U01` | Event | `Piu screen tap / scroll → action` | 螢幕內點選招呼或捲動選單派送 | [SDK-U04](#SDK-U04)、[SDK-U05](#SDK-U05)、[SDK-U14](#SDK-U14)、[SDK-U15](#SDK-U15)、[SDK-U16](#SDK-U16)、[SDK-U17](#SDK-U17)、[SDK-F04](#SDK-F04)、[SDK-M01](#SDK-M01) | 成功：主路徑；forced-failure/cancel callback部分僅純測試 | E009：creator檢查通過；E011：獨立Reviewer approved | simulator／實驗Piu UI、限定移出取消轉送 | E009、E011 | [E009 同次錄影／trace](../experiments/E009-screen-touch-greet/evidence/touch-greet-run.md)、[E011 捲動選取](../experiments/E011-screen-action-menu/evidence/action-menu-run.md)、[修正回歸](../experiments/E011-screen-action-menu/evidence/pr-review-fix.md)；E011 17項來自 E005 snapshot；實測捲入 head.center，不另宣稱17項都在E011逐一驗證；非 input.touch.onEvent 的直接證據 |
| <a id="EXP-G01"></a>`EXP-G01` | Action | `四方向獨立 lookAt` | 各從正面起始看左／右／上／下 | [SDK-M03](#SDK-M03) | 成功：四方向各兩次；畫面保存有限制 | E019：失敗 | WASM simulator／原版、v2觀察鏡頭 | E019 | [真人同次與失敗](../experiments/E019-static-gaze/evidence/human-run.md)、[原始匯出](../experiments/E019-static-gaze/evidence/human-final.json)；8/8局部符合；真人同次畫面檔未完整保存；非動作已完成保證 |
| <a id="EXP-G02"></a>`EXP-G02` | Action | `lookAt → lookAway → lookAt` | 解除後左右／上下直接再指定 | [SDK-M03](#SDK-M03)、[SDK-M06](#SDK-M06) | 部分成功：左→右成功；上→下失敗且單次重測仍失敗 | E019：失敗 | WASM simulator／原版 | E019 | [同次程序與重測](../experiments/E019-static-gaze/evidence/human-run.md)、[controller 證據](../experiments/E019-static-gaze/evidence/simulator-run.md)；lookAway不回正屬既有語意，不能把維持姿勢直接當解除失敗；上→下無新rotation |
| <a id="EXP-G03"></a>`EXP-G03` | Action | `patched pitch 再指定` | E020 候選 pitch 符號修正與雙向再指定 | [SDK-M05](#SDK-M05)、[SDK-M06](#SDK-M06) | 無法判定：歷史真人4/4 PASS不符新完整來源gate | E020：無法判定 | WASM simulator／scratch SDK pitch patch | E020 | [正式狀態](../experiments/E020-sdk-gaze-pitch/README.md)、[patch provenance](../experiments/E020-sdk-gaze-pitch/evidence/sdk-patch.json)、[歷史真人](../experiments/E020-sdk-gaze-pitch/evidence/human-run.md)；歷史run缺host attestation；後來hash不可追補renderer來源；不改判E019，也不宣稱原版已修復 |
| <a id="EXP-G04"></a>`EXP-G04` | Action | `target-offset 閉環大偏移／非零起點` | 中心、四軸大偏移、斜向、非零起點 | [SDK-M04](#SDK-M04) | 成功：TC-E2E-01..09、14..15 共11案 | E023：失敗 | WASM simulator＋synthetic目標／原版 | E023 | [正式完整15案](../experiments/E023-target-offset-gaze/evidence/manifest-run.md)、[逐案結果](../experiments/E023-target-offset-gaze/evidence/results.json)；中心0修正；其他成功案1次控制後置中，不外推動態目標／真攝影機 |
| <a id="EXP-G05"></a>`EXP-G05` | Action | `target-offset 近中心 ±0.11` | 四軸近中心修正至雙軸≤0.1 | [SDK-M04](#SDK-M04) | 失敗：TC-E2E-10..13 各20次仍未置中 | E023：失敗（11成功／4失敗） | WASM simulator＋synthetic目標／原版 | E023 | [限制與四案直接證據](limitations/robot-gaze.md)、[source-bound 完整run](../experiments/E023-target-offset-gaze/evidence/manifest-run.md)；30°嚴格門檻；SDK返回不等於到位，重跑工具／partial smoke不推翻正式結果 |
| <a id="EXP-C03"></a>`EXP-C03` | Action | `manual video recording` | MOD確認frame的host副本→browser MediaRecorder→回放／取消 | [SDK-C01](#SDK-C01)、[SDK-C02](#SDK-C02)、[SDK-C03](#SDK-C03) | 部分成功：短／長／取消有觀察；全判準無法判定 | E015：無法判定 | browser simulator＋webcam／browser encoder | E015 | [正式狀態與缺口](../experiments/E015-manual-video-recording/README.md)、[人工程序](../experiments/E015-manual-video-recording/evidence/recording-run.md)；長段原始零音軌事件截斷；不是SDK原生video／MOD encoder；任務完成非假設成功 |

## E001–E024 相關性與排除紀錄

「收錄」指對應能力或行為已交叉引用，不表示整個實驗成功；「排除」只排除於 Robot 能力驗證。

| 實驗／原紀錄 | 相關性與理由 | 行為入口 |
| --- | --- | --- |
| [E001](../experiments/E001-visible-greet/README.md) | 收錄：greet、stop | [EXP-X01](#EXP-X01)、[EXP-X02](#EXP-X02) |
| [E002](../experiments/E002-agent-skills-validation/EXPERIMENT.md) | 排除：Agent skill／TDD fixture，非 Robot 行為 | — |
| [E003](../experiments/E003-robot-event-loop/README.md) | 收錄：A事件、greet／B中斷 | [EXP-I01](#EXP-I01)、[EXP-X01](#EXP-X01)、[EXP-X02](#EXP-X02) |
| [E004](../experiments/E004-named-action-dispatch/README.md) | 收錄：具名greet派送；Server contract不列SDK能力 | [EXP-X01](#EXP-X01) |
| [E005](../experiments/E005-robot-action-catalog/README.md) | 收錄：20候選，17可見成功、3失敗與selector | [EXP-F01](#EXP-F01)、[EXP-M01](#EXP-M01)、[EXP-X01](#EXP-X01)、[EXP-X02](#EXP-X02) |
| [E006](../experiments/E006-audio-output/README.md) | 收錄：tone、WAV | [EXP-A01](#EXP-A01)、[EXP-A02](#EXP-A02) |
| [E007](../experiments/E007-microphone-recording/README.md) | 收錄：錄音＋同buffer回放 | [EXP-A03](#EXP-A03) |
| [E008](../experiments/E008-camera-input/README.md) | 收錄：webcam及synthetic fallback分開 | [EXP-C01](#EXP-C01)、[EXP-C02](#EXP-C02) |
| [E009](../experiments/E009-screen-touch-greet/README.md) | 收錄：Piu螢幕選項 | [EXP-U01](#EXP-U01) |
| [E010](../experiments/E010-virtual-top-touch-greet/README.md) | 收錄：release.tap與組合greet；現行patch來源限制保留 | [EXP-I03](#EXP-I03) |
| [E011](../experiments/E011-screen-action-menu/README.md) | 收錄：Piu捲動與選取 | [EXP-U01](#EXP-U01) |
| [E012](../experiments/E012-jev-text-policy/README.md) | 排除：文字政策的Action為應用決策，未執行Robot SDK | — |
| [E013](../experiments/E013-jev-context-sufficiency/README.md) | 排除：Jev情境充分性／證據研究，非Robot輸入或效果 | — |
| [E014](../experiments/E014-ws-usage-expiry/README.md) | 排除：Node Robot是WS client／期限POC，非Stack-chan硬體能力 | — |
| [E015](../experiments/E015-manual-video-recording/README.md) | 收錄：browser MediaRecorder組合流程，非原生video | [EXP-C03](#EXP-C03) |
| [E016](../experiments/E016-top-touch-swipe/README.md) | 收錄：局部滑動；整體無法判定 | [EXP-I04](#EXP-I04) |
| [E017](../experiments/E017-top-swipe-event/README.md) | 收錄：受控raw top-touch→SDK Event | [EXP-I05](#EXP-I05) |
| [E018](../experiments/E018-tts-action/README.md) | 收錄：日文TTS＋聽辨 | [EXP-A04](#EXP-A04) |
| [E019](../experiments/E019-static-gaze/README.md) | 收錄：獨立四方向及再指定失敗 | [EXP-G01](#EXP-G01)、[EXP-G02](#EXP-G02) |
| [E020](../experiments/E020-sdk-gaze-pitch/README.md) | 收錄：scratch SDK修正候選，整體無法判定 | [EXP-G03](#EXP-G03) |
| [E021](../experiments/E021-imu-event/README.md) | 收錄：六種synthetic IMU Events | [EXP-I06](#EXP-I06) |
| [E022](../experiments/E022-jev-context-threshold/README.md) | 排除：離線門檻研究，非Robot能力／感測 | — |
| [E023](../experiments/E023-target-offset-gaze/README.md) | 收錄：11成功／4失敗；未達精細置中 | [EXP-G04](#EXP-G04)、[EXP-G05](#EXP-G05) |
| [E024](../experiments/E024-mock-target-offset/README.md) | 排除：Mock Python calculator，沒有攝影機／SDK／Robot執行 | — |

## SDK 原始碼依據

共同根目錄為 pinned `vendor/stack-chan/firmware/host/`。公開 surface 以 capabilities、runtime-context 及以下實作交叉確認；不因宣告存在而標成已驗證。

| 來源 ID | 檔案 |
| --- | --- |
| <a id="src-c"></a>`src-c` | [app/capabilities.ts](../vendor/stack-chan/firmware/host/app/capabilities.ts) |
| <a id="src-r"></a>`src-r` | [app/runtime-context.ts](../vendor/stack-chan/firmware/host/app/runtime-context.ts) |
| <a id="src-f"></a>`src-f` | [modules/ui/state/face-state.ts](../vendor/stack-chan/firmware/host/modules/ui/state/face-state.ts) |
| <a id="src-u"></a>`src-u` | [app/runtime-ui.ts](../vendor/stack-chan/firmware/host/app/runtime-ui.ts) |
| <a id="src-m"></a>`src-m` | [modules/motion/motion-controller.ts](../vendor/stack-chan/firmware/host/modules/motion/motion-controller.ts) |
| <a id="src-a"></a>`src-a` | [app/runtime-audio.ts](../vendor/stack-chan/firmware/host/app/runtime-audio.ts) |
| <a id="src-i"></a>`src-i` | [app/runtime-input.ts](../vendor/stack-chan/firmware/host/app/runtime-input.ts) |
| <a id="src-t"></a>`src-t` | [modules/input/touch.ts](../vendor/stack-chan/firmware/host/modules/input/touch.ts) |
| <a id="src-p"></a>`src-p` | [modules/input/touch-panel.ts](../vendor/stack-chan/firmware/host/modules/input/touch-panel.ts) |
| <a id="src-g"></a>`src-g` | [modules/input/touch-panel-gesture.ts](../vendor/stack-chan/firmware/host/modules/input/touch-panel-gesture.ts) |
| <a id="src-im"></a>`src-im` | [modules/input/imu.ts](../vendor/stack-chan/firmware/host/modules/input/imu.ts) |
| <a id="src-ir"></a>`src-ir` | [modules/input/imu-motion.ts](../vendor/stack-chan/firmware/host/modules/input/imu-motion.ts) |
| <a id="src-ie"></a>`src-ie` | [modules/input/input-event.ts](../vendor/stack-chan/firmware/host/modules/input/input-event.ts) |
| <a id="src-ca"></a>`src-ca` | [modules/camera/camera.ts](../vendor/stack-chan/firmware/host/modules/camera/camera.ts) |
| <a id="src-cr"></a>`src-cr` | [app/runtime-camera.ts](../vendor/stack-chan/firmware/host/app/runtime-camera.ts) |
| <a id="src-l"></a>`src-l` | [app/runtime-lighting.ts](../vendor/stack-chan/firmware/host/app/runtime-lighting.ts) |
| <a id="src-tt"></a>`src-tt` | [modules/audio/tts-types.ts](../vendor/stack-chan/firmware/host/modules/audio/tts-types.ts) |
| <a id="src-h"></a>`src-h` | [modules/ui/components/hands/hands.ts](../vendor/stack-chan/firmware/host/modules/ui/components/hands/hands.ts) |
| <a id="src-piu"></a>`src-piu` | [modules/ui/components/foundation/controls.ts](../vendor/stack-chan/firmware/host/modules/ui/components/foundation/controls.ts)（pinned UI 實作含四種 Piu touch callbacks；宣告／handler 存在不證明 simulator 已送達） |

## Agent 使用及維護規則

1. 使用前先核對 repo／SDK revision，從 SDK ID 找到 EXP ID，再讀原始來源、條件、最新正式結論及直接證據。若 revision 改變，舊結果僅是歷史，不自動適用。
2. 區分 SDK 支援、傳遞成功、SDK 返回、實際效果及完整實驗判準。需要實機能力時，本文件不足以證明；不要把 simulator、synthetic、mock 或 build 成功改寫為實機驗證。
3. 複合行為必須保留對應 SDK 操作與實驗控制條件。應用 trace／command result 是實驗協定，不是 SDK 新 Event；不要讓 device 依賴 FastAPI／Python 內部實作。
4. 新增實驗或升級 SDK 後，更新 pin、相關能力／行為、環境及直接證據。穩定 ID 保留；新條件／不同結果另列，無證據的 EXXX 填「—」並標未驗證。
5. 已撤回的 PASS 保留修正原因與原紀錄，不把已修正歷史當成未解矛盾。只有同對象、同條件、同層級仍互相衝突且無正式解決依據時，結果標為無法判定並連到衝突證據。不得自行重判實驗。
6. 保留 E005 三項失敗、E019整體失敗、E016／E020正式無法判定、E023近中心失敗與工具／人工證據缺口。補充圖、code review、測試數及任務完成不替代行為證據；原始 EXXX 紀錄仍是判定來源。

## 變更紀錄

| 日期 | 內容 |
| --- | --- |
| 2026-10-19 | 依 pinned SDK 公開型別、runtime及E001–E024既有紀錄建立能力／行為對照；僅文件化，未重跑Robot、build或刷寫。 |
