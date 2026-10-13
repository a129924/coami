# E017 操作證據

日期：2026-10-13。pinned SDK／實際產物見 runtime-provenance.json。

## 自動操作
CDP headless Chrome 驅動實際 pointer UI，經 C/WASM → pinned recognizer → MOD。17個自動案例PASS、12次Swipe、2個sessions；結果與原始 traces 由 scripts/runtime-smoke.mjs 寫入 runtime-automated.json；其 PASS 只屬自動操作，不能改填下表。

## 真人操作
| 案例 | 狀態 | 人工觀察／證據 |
|---|---|---|
| 左→右獨立3次 | 未執行 | 修正後真人 1/3 次成功；先前 overflow FAIL 保留於下文 |
| 右→左獨立3次 | 未執行 | 修正後真人 1/3 次成功；尚需2次 |
| 持續按住、反向與放開只一次 | 未執行 | 待 operator |
| 連續兩次獨立滑動 | PASS | 修正後真人 session 1 operations 1/2，各一筆 Swipe，count 1/2；見 human-post-fix-session-1.json |
| Tap／小幅移動／長按無Swipe | 未執行 | 待 operator |
| 門檻前取消／移出與恢復 | 未執行 | 待 operator |
| 辨識後取消保留一次 | 未執行 | 待 operator |
| 重啟與舊操作隔離 | 未執行 | 待 operator |
| 不可用／初始化錯誤 | 未執行 | 待 operator |

需記錄 browser/OS、日期、session/operation/sample、MOD gesture/count、UI direction/count、具名操作者及 trace 路徑。不得把 automated traces 或這份操作程序當成人工觀察。

整體假設：無法判定。真人驗證任務完成：否。Draft PR 可交 human review；不代表整體驗收通過。

## 2026-10-13 真人初次嘗試判讀

操作者：本次對話 owner（自述實際作動）；Chrome / macOS，browser/OS 精確版本未紀錄。owner 回報畫面 ready、MOD Swipe 0、最近 SDK 方向 —。原始匯出：human-session-6.json，capturedAt 2026-10-13T06:19:19.873Z，dropped 0。

| Session / operation | 起點 → 最遠位置 | 最大位移 | MOD |
|---|---|---|---|
| 6 / 1 | -92 → -67 | 25 | press / release，count 0 |
| 6 / 2 | -93 → -64 | 29 | press / release，count 0 |
| 6 / 3 | -93 → -56 | 37 | press / release，count 0 |
| 6 / 4 | +92 → +60 | 32 | press / release，count 0 |
| 6 / 5 | +94 → +53 | 41 | press / release，count 0 |
| 6 / 6 | +93 → +59 | 34 | press / release，count 0 |

每次 raw 與 consumed 的位置範圍相同，輸入與 MOD press/release 路徑有證據；沒有任何 Swipe。pinned touch-panel-gesture.ts 預設 threshold 60，判斷為相對初始位置嚴格 >60 / <-60。這六次未達門檻，count 0 符合規則；不足以判定有效雙向 Swipe 通過或通路故障。操作提示缺少明確距離，下一次限定在觸控帶內由 20% 拖到 80%（預期 -60 → +60、位移 120），放開後待 ready，核對一筆 forwardSwipe / count 1。保留原門檻，不變更 recognizer。整體真人驗證仍未完成。

## 2026-10-13 真人 operation 7 與修正

owner 依擴大距離提示操作仍無 Swipe。human-session-6-overflow.json 保存原始 trace（capturedAt 06:25:17.302Z、dropped 0）：session 6 / operation 7，162 筆非零 raw，位置 -85 → +12，已超過 60；但 consumer 落後至 -74 附近即觸發 input FIFO exceeded 128 entries，cleanup 丟棄尚未消費 move，MOD 僅 press/release、count 0。這是實作失敗證據，不能以距離不足解釋，亦不能標有效 Swipe PASS。雙向驗收目前 FAIL / needs-rework，修正後真人重測待執行。

修正：尚未消費的同方向 move 合併成最新端點，保留 press、方向轉折與 zero 順序；每筆 raw 與 coalesced replacement 關聯仍進 trace。取消仍丟棄未消費 moves，SDK threshold / recognizer / runtime / MOD 不變。大量轉折仍有 128 筆安全限制。

23 項 source tests PASS（含 120Hz / 20Hz 慢拖與原始 operation 7 軌跡自動重播），strict typecheck / web build PASS。修正後 CUA 自動雙向 pointer 操作：runtime-coalesced-automated.json，capturedAt 06:27:23.748Z，session 1 operations 1/2，MOD forwardSwipe=1、backwardSwipe=2，release 不追加、ready 恢復；UI 與 MOD 一致。此兩筆為 agent 自動操作，即使 owner 貼回同一 trace 也不轉為 human PASS。舊 runtime-automated.json 保留為修正前歷史，不冒稱新版本全套重跑。真人需以新 session 重試。

## 2026-10-13 修正後真人雙向成功

owner 在對話中回報「可以了」，並指定 /Users/andrew/Downloads/e017-swipe-trace (3).json；已原樣保存為 human-post-fix-session-1.json。capturedAt 2026-10-13T06:32:29.618Z，dropped 0，無 input-error。Chrome / macOS（精確版本未紀錄），原 runtime/MOD provenance 不變，web 輸入修正 commit b408039。

| 真人操作 | SDK → MOD | 事件 ticks / sampleId | 計數 |
|---|---|---|---|
| session 1 / operation 1 | forwardSwipe | 20121 / 53 | 1 |
| session 1 / operation 2 | backwardSwipe | 29499 / 257 | 2 |

每次均有 press 與 release，release 不追加 Swipe。唯讀 UI 核對為 ready、count 2、最近 backwardSwipe、session/operation 1/2；配合 owner 成功回報，支持這兩次真人雙向成功與事件回饋一致。這是新的真人軌跡（sampleIds 2–420），不同於 agent 自動 sampleIds 2–23，不混用證據。每方向僅一次，尚未滿足各三次；Tap/小幅移動、指定持續按住與反向、取消/恢復、重啟隔離及不可用案例仍待執行。整體驗收維持無法判定／未完成。
