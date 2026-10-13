# E017 操作證據

日期：2026-10-13。pinned SDK／實際產物見 runtime-provenance.json。

## 自動操作
CDP headless Chrome 驅動實際 pointer UI，經 C/WASM → pinned recognizer → MOD。17個自動案例PASS、12次Swipe、2個sessions；結果與原始 traces 由 scripts/runtime-smoke.mjs 寫入 runtime-automated.json；其 PASS 只屬自動操作，不能改填下表。

## 真人操作
| 案例 | 狀態 | 人工觀察／證據 |
|---|---|---|
| 左→右獨立3次 | PASS | 真人 session1 ops1/3/4，forwardSwipe，count1/3/4；human-acceptance-session-1.json |
| 右→左獨立3次 | PASS | 真人 session1 ops2/5/6，backwardSwipe，count2/5/6 |
| 持續按住、反向與放開只一次 | PASS | 真人 op7：9492ms、664筆 raw、15次非零位移方向轉折，僅forwardSwipe一筆，count7；release不追加 |
| 連續兩次獨立滑動 | PASS | 真人 ops3/4 各forwardSwipe一筆，count3/4 |
| Tap／小幅移動／長按無Swipe | PASS | 真人 ops8/9/10：124ms點按、位移1、7216ms長按，全部只有press/release，count維持7 |
| 門檻前取消／移出與恢復 | PASS | 真人 op11：位移1、outside取消、zero/release無Swipe；後續op13正常forwardSwipe，count8 |
| 辨識後取消保留一次 | PASS | 真人 op14：forwardSwipe後outside、zero/release，count9不追加；後續op16正常count10 |
| 重啟與舊操作隔離 | PASS | 真人 session1最後count10 → session2 zero handshake、第一筆forwardSwipe count1；普通重啟，非操作途中重啟 |
| 操作途中切分頁與恢復 | PASS | owner完成指定Ctrl+Tab程序；session2 op2 zero/release、count1不變；op3 backwardSwipe count2；human-acceptance-page-leave-session-2.json |
| 事件回饋一致 | PASS | 真人trace的MOD方向與單步計數一致；UI核對session2 op1 forwardSwipe/count1及op3 backwardSwipe/count2、ready |
| 初始化失敗與恢復 | PASS（自動） | 獨立5188故障頁：來源503，error/count0且拒絕拖曳；恢復來源重啟後ready、forwardSwipe/count1。不是真人或硬體證據 |

需記錄 browser/OS、日期、session/operation/sample、MOD gesture/count、UI direction/count、具名操作者及 trace 路徑。不得把 automated traces 或這份操作程序當成人工觀察。

本次 simulator-only 假設：成功。真人操作案例驗證任務完成：是；初始化故障由自動操作驗證並分開標示。Draft PR 等待 human review，不代表 production 採用或實機通過。下文保留先前失敗與當時未完成狀態，供追溯。

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

## 2026-10-13 完整操作案例核對

owner 提供 Downloads (4)/(5)/(9)，原樣保存為 human-acceptance-session-1.json、human-acceptance-restart-session-2.json、human-acceptance-page-leave-session-2.json。前三筆成功並非全部新增：session1 ops1/2 與既存真人trace重疊，不重複計次。各三次使用 ops1/3/4 與 ops2/5/6。三份trace dropped0、無input-error，MOD event ticks符合metadata，count只於Swipe遞增，相關sample都有consuming紀錄。輸入來源沿SDK recognizer → MOD，沒有直接注入手勢名稱。hash與限制見acceptance-summary.json。

(9) owner 回報完成切分頁程序，op2 position -3不移動，terminal sample51 ticks293863 → MOD release/count1，隨後op3 sample128 ticks313173 → backwardSwipe/count2，terminal203不追加，UI ready/count2/2/3。此trace沒有active blur理由紀錄；visibilitychange handler本來不記錄原因，因此以owner操作回報加上清理/恢復軌跡判定結果，不聲稱有active blur事件。

獨立自動故障頁以相同web/dist產物於127.0.0.1:5188供應，暫使/runtime-provenance.json回503，其餘路徑正常。實際UI先顯示來源錯誤，5秒後既有timeout覆蓋為initialization exceeded 5 seconds；兩者皆error/count0，拖曳沒有press或Swipe，見runtime-init-failure-automated.json（owner指定Downloads (6)，但輸入由agent執行）。恢復端點後按重啟，新的session2完成zero acknowledgement；agent拖曳得到forwardSwipe/count1、release不追加與ready，見runtime-init-recovery-automated.json（Downloads (7)）。此兩項與真人證據分開，故障頁沒有改動operator的5187頁面。

限制：單一Chrome/macOS、版本未記；普通重啟隔離已驗證，active操作途中重啟未另做人測；provider-missing unavailable分支未另注入，初始化失敗分支已實測；歷史17案例自動套件沒有冒稱修正後重跑。核心任務結果支持本次simulator-only實驗，人類PR審查與正式採用仍分開。
