# Robot State 語義與控制政策

本文件定義 Robot 自身的活動、資源生命週期、持續屬性與輸入觀測，供後續實作使用。State 採可並行維度；單一 idle/busy 無法表達錄音、播放、頭部及 camera 各自的狀況。

本次為文件交付，`ts-implementation` 是 delivery label，沒有新增 TypeScript runtime、API、wire schema、timeout、scheduler 或 production 架構。執行範圍與角色交接見 [topic plan](../plan/robot-state-semantics/robot-state-semantics.plan.md)。

## 證據與閱讀約定

- 來源基準為 Coami `d7ff0368a4e7d3ecd36d79a955745baae8b3c756`；SDK pin 為 `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`。升級來源後須重新確認適用範圍。
- **已觀測事實**限各實驗的 browser／WASM simulator、provider 與條件，沒有實體 Robot 驗證。真 webcam、scratch raw input、synthetic sample、純測試分開記錄。
- **新控制政策**是本文件的設計決策，尚未實作，也不是 SDK 既有保證。**待驗證行為**不能升格成已驗證 State。
- SDK 有宣告、要求已接受、已有開始證據、操作回傳、實際效果及實驗整體結論，是不同層級。Promise、trace、Server command result 不自動成為 SDK Event。
- 穩定能力／行為 ID 對應 [Action／Event catalog](robot-action-event-catalog.md)。下列各組附原始證據；完整條件以原紀錄為準，不在此重判實驗。

## 執行活動：需要到什麼粒度

錄音、音訊輸出、頭部執行各自持有下列四態。Camera 單次 capture 亦使用同一活動語義，但與 camera session 分開。

| State | 定義與資源處理 |
| --- | --- |
| `inactive` | 已確認沒有該活動，沒有該活動的資源保留。 |
| `requested` | 已接受要求並保留資源，尚未確認開始。 |
| `active` | 同一操作已有開始證據，持有資源。 |
| `unknown` | 是否開始或終結無法確認，保留資源。 |

**新控制政策／語義：**已確認 inactive 才能接受新的同資源活動，接受後為 requested；同操作的開始證據使其 active。可靠證據確認未開始或已終結時才能 inactive；開始或終結不明則 unknown。成功、失敗、取消只是操作結果，不能單靠名稱釋放資源。Timeout、Server cancel、重新要求或時間經過，均不能自動解除 unknown。這裡不定義新的復原命令。

| 維度 | 開始與解除依據 | 已有能力及直接證據 |
| --- | --- | --- |
| 錄音 | Capture 開始才 active；同次 capture 可靠終結才 inactive。取得音訊 buffer 不表示已辨識語音。 | [SDK-A03](robot-action-event-catalog.md#SDK-A03)、[EXP-A03](robot-action-event-catalog.md#EXP-A03)；[E007 操作與聽辨](../experiments/E007-microphone-recording/evidence/recording-run.md)：2000 ms、28,310 bytes，同 buffer 回放，未保存聲音、不證明 ASR。 |
| 音訊輸出 | 確認播放開始才 active；同操作可靠播放終結才 inactive。Say 開始合成不等於播放。 | [SDK-A01](robot-action-event-catalog.md#SDK-A01)、[SDK-A04](robot-action-event-catalog.md#SDK-A04)、[SDK-A05](robot-action-event-catalog.md#SDK-A05)、[SDK-A11](robot-action-event-catalog.md#SDK-A11)；[EXP-A01](robot-action-event-catalog.md#EXP-A01)、[EXP-A02](robot-action-event-catalog.md#EXP-A02)、[EXP-A04](robot-action-event-catalog.md#EXP-A04)；[E006](../experiments/E006-audio-output/EXPERIMENT.md)、[E018](../experiments/E018-tts-action/evidence/tts-run.md)。 |
| 頭部執行 | MOD 開始受管理序列才 active；序列可靠終結即 inactive。姿勢到位與馬達停止另記觀測；只有序列終結本身不明才保留該活動 unknown。 | [SDK-M01](robot-action-event-catalog.md#SDK-M01)、[EXP-M01](robot-action-event-catalog.md#EXP-M01)–[EXP-M07](robot-action-event-catalog.md#EXP-M07)；[E005 matrix](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)、[執行序列](../experiments/E005-robot-action-catalog/mod/mod.ts)。 |

`say/tone/playAudio` 是音訊輸出的 Action 種類；`nod/shake/greet` 是具名 Action／組合，不各建一個活動 State。頭部序列 inactive 不能推導 Pose 已確認，亦不能推導 gaze 已解除。

E006 使用 replacement capture，首份錯誤 tab 錄影已拒收。E018 的五筆同次日文聽辨及 SDK completion／natural ended，僅支持該次 **strict WebAudio bridge**；不外推 stock bridge、中文、其他 provider 或實機。TTS `onPlayed/onDone` 不是通用的多 listener 或每次 request 完成協定。

## 資源生命週期與單次 capture

Camera、top-touch sampling、IMU sampling 各自持有 `off / start-requested / on / stop-requested / unknown`。

**新控制政策：**主路徑是 off → start-requested → on → stop-requested → off。接受 start/stop 僅進入對應 requested；可靠開始／停止證據才確認 on/off。失敗後依確定結果更新，結果不明為 unknown。初始化先 unknown；只有本次初始化確認尚未啟動，或取得可靠停止證據，才能 off。

| 現況 | start | stop |
| --- | --- | --- |
| `off` | 接受，進入 start-requested | 無需執行，維持 off |
| `start-requested` | 拒絕 busy | 拒絕 busy |
| `on` | 拒絕 busy | 接受，進入 stop-requested |
| `stop-requested` | 拒絕 busy | 拒絕 busy |
| `unknown` | 拒絕 | 拒絕，不假設可安全停止 |

矩陣尚未實作／驗證；相關既有能力的範圍如下：

| Session | 能力／行為 ID | 直接證據與限制 |
| --- | --- | --- |
| Camera | [SDK-C01](robot-action-event-catalog.md#SDK-C01)、[SDK-C02](robot-action-event-catalog.md#SDK-C02)、[SDK-C03](robot-action-event-catalog.md#SDK-C03)、[EXP-C01](robot-action-event-catalog.md#EXP-C01)、[EXP-C02](robot-action-event-catalog.md#EXP-C02) | [E008 camera-run](../experiments/E008-camera-input/evidence/camera-run.md)：simulator 真 webcam 三筆 96×96 frame，未保存 raw image；unsupported/no-device/permission denial 的 synthetic fallback 分開成功，不算 webcam 成功。 |
| Top-touch sampling | [SDK-I18](robot-action-event-catalog.md#SDK-I18)、[SDK-I19](robot-action-event-catalog.md#SDK-I19)、[EXP-I05](robot-action-event-catalog.md#EXP-I05) | [E017 swipe-run](../experiments/E017-top-swipe-event/evidence/swipe-run.md)、[acceptance-summary](../experiments/E017-top-swipe-event/evidence/acceptance-summary.json)：scratch raw input bridge、合成強度；active-input restart 與 provider-missing 分支未單獨示範，不外推實機。 |
| IMU sampling | [SDK-I20](robot-action-event-catalog.md#SDK-I20)、[SDK-I21](robot-action-event-catalog.md#SDK-I21)、[EXP-I06](robot-action-event-catalog.md#EXP-I06) | [E021 imu-run](../experiments/E021-imu-event/evidence/imu-run.md)、[acceptance-summary](../experiments/E021-imu-event/evidence/acceptance-summary.json)：scratch raw driver＋monotonic clock patch，synthetic-only，不證明 upstream native support。 |

Camera **單次 capture**有獨立活動四態；來源另記 webcam／synthetic／unknown。僅 session=on 且沒有既有 capture 才接受。Capture requested／active／unknown 時，新 capture 與 stop 均拒絕、不排隊；capture 可靠終結後須重新要求 stop。舊 session 晚到 frame／結果不得更新新 session；本文件不鎖其 wire 或識別欄位。這些也是新政策，不能從 E008 推定已存在。

## 持續屬性

每項區分**要求值、最後確認值、目前是否未知**。新的確認取代前值；來源失效或效果不明時，舊確認值只能保存歷史，不能冒充目前實況。持續屬性保存本身不永久占執行資源；gaze 持續控制另依資源政策處理。

| 屬性 | 第一版粒度及證據 |
| --- | --- |
| 表情 | neutral／angry／sad／happy／sleepy；[SDK-F01](robot-action-event-catalog.md#SDK-F01)–[SDK-F05](robot-action-event-catalog.md#SDK-F05)、[EXP-F01](robot-action-event-catalog.md#EXP-F01)–[EXP-F05](robot-action-event-catalog.md#EXP-F05)，見 [E005 matrix](../experiments/E005-robot-action-catalog/evidence/action-matrix.md)。Sleepy 不等於睡眠。Doubtful／cold／hot（[EXP-F06](robot-action-event-catalog.md#EXP-F06)–[EXP-F08](robot-action-event-catalog.md#EXP-F08)）均失敗，不列為已驗證效果。 |
| 眼睛／嘴巴 | 左右眼與嘴巴張開程度；[SDK-F10](robot-action-event-catalog.md#SDK-F10)、[SDK-F11](robot-action-event-catalog.md#SDK-F11)、[EXP-F09](robot-action-event-catalog.md#EXP-F09)–[EXP-F12](robot-action-event-catalog.md#EXP-F12)。SDK 值域 0..1 不代表所有值都實測；確認限 E005 已觀察的 0→1 與嘴 0.8→0 序列。Blink／wink 是修改屬性的 Action。 |
| 主畫面 | 臉部／已驗證實驗 Piu 主畫面；效果確認才更新。[SDK-U04](robot-action-event-catalog.md#SDK-U04)、[SDK-U05](robot-action-event-catalog.md#SDK-U05)、[EXP-U01](robot-action-event-catalog.md#EXP-U01)；[E009](../experiments/E009-screen-touch-greet/evidence/touch-greet-run.md)、[E011](../experiments/E011-screen-action-menu/evidence/action-menu-run.md)。不推定所有 Piu component 可用。 |
| Pose | 要求姿勢與確認姿勢分開。SetPose Promise 不證明到位，E005 指定角度的可見效果不外推任意姿勢或實機；見 SDK-M01 與上述 matrix。 |
| Gaze target | 要求目標、確認已設定／已清除、未知；[SDK-M03](robot-action-event-catalog.md#SDK-M03)、[SDK-M04](robot-action-event-catalog.md#SDK-M04)、[SDK-M06](robot-action-event-catalog.md#SDK-M06)、[EXP-G01](robot-action-event-catalog.md#EXP-G01)、[EXP-G02](robot-action-event-catalog.md#EXP-G02)。LookAway 清除目標，不證明回正、取消既有運動或馬達停止；[E019 human-run](../experiments/E019-static-gaze/evidence/human-run.md)、[controller 證據](../experiments/E019-static-gaze/evidence/simulator-run.md)。 |

## 輸入快照與瞬間 Event

| 輸入 | State／Event 歸類 | 證據與限制 |
| --- | --- | --- |
| A/B/C button | Press/release 更新各自最後觀測 pressed／released／unknown。 | [SDK-I01](robot-action-event-catalog.md#SDK-I01)–[SDK-I03](robot-action-event-catalog.md#SDK-I03)、[EXP-I01](robot-action-event-catalog.md#EXP-I01)；[E003 A/release](../experiments/E003-robot-event-loop/evidence/phase-1-event-bridge.md)、[E005 A/C/B](../experiments/E005-robot-action-catalog/EXPERIMENT.md)。C release 僅來源支持，不宣稱獨立實測。 |
| Top contact | Press/release 更新最後觀測；tap 是 release.tap metadata。Forward/backward swipe 為瞬間 Event。 | [SDK-I08](robot-action-event-catalog.md#SDK-I08)–[SDK-I11](robot-action-event-catalog.md#SDK-I11)、[EXP-I05](robot-action-event-catalog.md#EXP-I05)，直接來源見 E017。不能把 scratch 證據當硬體接觸品質。 |
| IMU | shake、fallenForward、fallenBackward、fallenLeft、fallenRight、upsideDown 都是瞬間 Event。 | [SDK-I12](robot-action-event-catalog.md#SDK-I12)–[SDK-I17](robot-action-event-catalog.md#SDK-I17)、[EXP-I06](robot-action-event-catalog.md#EXP-I06)，E021 為 53/53 automated＋53/53 owner synthetic cases；不證明真實方向、單位、靈敏度或誤報率。 |
| Piu 畫面互動 | began／moved／ended 是互動 Event，不建永久活動 State。 | [SDK-U14](robot-action-event-catalog.md#SDK-U14)–[SDK-U17](robot-action-event-catalog.md#SDK-U17)、[EXP-U01](robot-action-event-catalog.md#EXP-U01)；[E011 修正回歸](../experiments/E011-screen-action-menu/evidence/pr-review-fix.md)。Cancelled handler／offset 還原有純 TS/mock 測試支持，simulator 實際 callback 送達無法判定。 |

來源中斷後，button／contact 的目前狀況為 unknown，不補造 release。沒有復原證據，不建立可自動解除的 fallen State；沒有新 Event 也不代表已復原。`input.touch.onEvent`（[SDK-I05](robot-action-event-catalog.md#SDK-I05)–[SDK-I07](robot-action-event-catalog.md#SDK-I07)）仍未驗證，不能以 Piu 成功替代。

## 資源與衝突政策

本節全為**新控制政策，尚未實作，不是 SDK 保證**。資源分為麥克風、音訊輸出、頭部、外觀、主畫面、camera、top sampling、IMU sampling；表情、雙眼、嘴共用外觀。

- 錄音與音訊輸出互斥，拒絕後來要求；同資源 requested／active／unknown 亦拒絕新要求。不排隊、不自動搶占。
- 複合 Action 啟動前檢查全部資源，任一衝突整組拒絕；不能先執行可用部分。
- 資源依完整執行內容判定，不只看 Action 名稱。Camera／sampling 的合法 stop 是同 session 轉移，依矩陣處理。

| 操作 | 完整資源 |
| --- | --- |
| Record | 麥克風；與音訊輸出互斥。 |
| Tone／playAudio | 音訊輸出；與麥克風互斥。 |
| Say | 音訊輸出＋外觀；runtime 嘴型更新依 [SDK-A12](robot-action-event-catalog.md#SDK-A12)、[SDK-A13](robot-action-event-catalog.md#SDK-A13) 及 catalog src-a 保守納入，不宣稱 callback 已獨立驗證。 |
| SetPose／lookAt | 頭部；lookAt 的持續控制見下文。 |
| 表情／眼嘴直接寫入 | 外觀。 |
| 主畫面切換 | 主畫面。 |
| E005 全部具名序列 | 外觀＋頭部；正常路徑末尾 `neutral()` 寫表情、雙眼、嘴並 setPose；參見 [E005 mod](../experiments/E005-robot-action-catalog/mod/mod.ts)。 |
| Greet、實驗 stop/reset | 按各實驗完整步驟計算；E005 回中立涉及外觀＋頭部。[EXP-X01](robot-action-event-catalog.md#EXP-X01)、[EXP-X02](robot-action-event-catalog.md#EXP-X02)、[E001](../experiments/E001-visible-greet/EXPERIMENT.md)、[E003](../experiments/E003-robot-event-loop/evidence/phase-2-full-loop.md)。實驗 generation 取消不創造通用 SDK stop。 |

Gaze 從接受要求持有頭部，直到確認 lookAway 已清除；期間拒絕外部 setPose、頭部序列與新 gaze。同一 gaze 工作內修正仍屬原工作。頭部序列 inactive 不代表 gaze 已釋放頭部；lookAway 清除目標也不證明物理停止。

**觀測仍須如實表達政策以外的實際重疊。** [E025 listening/saying](../experiments/E025-listening-saying-exclusion/evidence/validation.md) 的固定 pin／stock simulator 路徑，record-say 五筆、say-record 四筆，共九筆有效錄放重疊，否定該路徑的互斥假設。不能為符合新政策而把其中一方改寫 inactive。原頁面八筆逐筆聽辨仍 unconfirmed；owner 後來的整批回報與當時逐筆保存分開，不倒填。此結論不外推整個 SDK；XiaoZhi 的輪流控制僅有來源支持，沒有該路徑動態驗證，亦不證明麥克風物理停止、回音消除或插話。

## 既有失敗、不確定與排除能力

| 來源 | 必須保留的結論 |
| --- | --- |
| [E005 matrix](../experiments/E005-robot-action-catalog/evidence/action-matrix.md) | 17 個可見成功、3 失敗；completed 不替代可見差異。 |
| [E015](../experiments/E015-manual-video-recording/README.md)、[EXP-C03](robot-action-event-catalog.md#EXP-C03) | 正式無法判定：長段原始零音軌事件截斷。Browser MediaRecorder 組合不是 SDK 原生 video，不建已驗證原生錄影 State。 |
| [E016](../experiments/E016-top-touch-swipe/README.md)、[EXP-I04](robot-action-event-catalog.md#EXP-I04) | 正式無法判定；TC05 reset／不可用初始化未執行、TC07 歷史 attestation 缺口，operation15 失敗保留。E017 局部／後續證據不回填該實驗。 |
| [E020](../experiments/E020-sdk-gaze-pitch/README.md)、[EXP-G03](robot-action-event-catalog.md#EXP-G03) | 正式無法判定；scratch SDK pitch patch 的歷史真人 4/4 不具 host attestation，後來 hash 不能追補當時 renderer 來源，不宣稱原版已修復。 |
| [E019 human-run](../experiments/E019-static-gaze/evidence/human-run.md) | 整體失敗；四方向各兩次局部成功但畫面未完整保存，解除後上→下再指定失敗。 |
| [E023 完整 run](../experiments/E023-target-offset-gaze/evidence/manifest-run.md)、[gaze 限制](limitations/robot-gaze.md)、[EXP-G04](robot-action-event-catalog.md#EXP-G04)、[EXP-G05](robot-action-event-catalog.md#EXP-G05) | 整體失敗，11 成功／4 失敗；近中心 ±0.11 四案各 20 次未置中。原版門檻嚴格 >30°，固定底座、靜態 synthetic 目標、FOV90° 的理想模型，不外推真攝影機或實機。 |
| [E025 server async event bus](../experiments/E025-server-async-event-bus/README.md) | 與上述錄放 E025 是不同實驗。12 節點×20=240/240 為 server synthetic Cancel／隔離測試，不含語音或意圖辨識，timeout／cancel 不證明 Robot 已停止。 |

ASR、睡眠、remoteSession、原生 video、通用 stop 不列為已驗證 State。未驗證的 lighting、扭力、配色、sing、WebRadio、其他 UI 效果不新增已驗證維度；完整未驗證 API 範圍以 catalog 為準。Server、FastAPI 或 Python 內部狀態不能代替 Robot 端證據。

## TestCase：後續實作驗收契約

這些是語義案例，**不是本輪已執行的 runtime 測試**。本輪僅核對文件、來源連結與計畫一致性，不重跑 Robot、TS／SDK build 或設備驗證。

| ID | 情境 | 應有結果 |
| --- | --- | --- |
| TC-STATE-01 | 錄音→播放、播放→錄音；同資源 requested／active／unknown 再入。另輸入 E025 既有重疊觀測。 | 控制拒絕後到要求、不排隊；觀測仍可同時記錄錄音／輸出 active，不以政策抹去事實。 |
| TC-STATE-02 | 頭部序列可靠終結但 Pose 未確認；另一次序列終結不明。 | 前者活動 inactive、Pose 未知；後者活動 unknown 保留資源。Promise 或結果名稱不冒充到位／停止。 |
| TC-STATE-03 | 五種 session 狀態逐一 start/stop；capture 中 stop；舊 session frame 晚到。 | 完整符合矩陣；capture requested／active／unknown 拒絕 capture/stop、不排隊，可靠終結後重提 stop；舊 frame 不更新新 session；fallback 不算 webcam 成功。 |
| TC-STATE-04 | E005 任一具名序列遇外觀或頭部衝突；gaze 尚未確認清除時外部頭部要求。 | 全部資源預檢，任一衝突整組拒絕；E005 檢查外觀＋頭部；gaze 不被搶占，同工作修正可繼續。 |
| TC-STATE-05 | Swipe／六種 IMU Event；button/contact 來源失效且沒有 release／復原；舊確認屬性。 | 瞬間 Event 不永久占住活動；現況 unknown，不補造 release／fallen 復原；歷史值不冒充現況。 |
| TC-STATE-06 | Server timeout/cancel 或 server synthetic 240/240；E018 strict completion。 | 不能據此推定 Robot 已停止；E018 保證限其 same-request strict bridge，不外推 stock／中文／實機。 |

## 交付標記與視覺輔助

| Label | 本文件的交付邊界 |
| --- | --- |
| In-Scope | 上述 State、進入／解除依據、Action/Event 對照、資源政策與六組語義驗收。 |
| Out-Of-Scope | Runtime、API/wire、production、整合、新實驗與設備驗證。 |
| ReadOnly | 已批准計畫、catalog、限制、原始實驗、vendor、治理與既有 graphs。 |
| Written | 本語義文件；外部 Archify／PR Lens 產物另依 topic plan。 |
| Deleted | none。 |
| Modify | 僅本語義文件的實作回修；批准計畫由其 owner 管理。 |
| Goal | 讓後續實作者能區分狀態、政策與目前可證明的事實。 |
| Non-Goal | 實作 TypeScript runtime、通用復原、SDK 修復或硬體能力。 |
| TestCase | TC-STATE-01–06；文件與來源核對不替代行為驗證。 |

Archify lifecycle 圖僅為本地外部輔助，內容繁中；固定 Viewer UI／`html lang` fallback English。圖不新增 Robot 證據。PR Lens 僅依真實 diff 產生本地概念變更圖；Graphify 無可用既有 graph 時使用來源搜尋，不自動建圖或 refresh。工具 receipt、code review 或圖通過均不代表 Robot 行為通過。
