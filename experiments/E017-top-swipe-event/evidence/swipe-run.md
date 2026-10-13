# E017 操作證據

日期：2026-10-13。pinned SDK／實際產物見 runtime-provenance.json。

## 自動操作
CDP headless Chrome 驅動實際 pointer UI，經 C/WASM → pinned recognizer → MOD。17個自動案例PASS、12次Swipe、2個sessions；結果與原始 traces 由 scripts/runtime-smoke.mjs 寫入 runtime-automated.json；其 PASS 只屬自動操作，不能改填下表。

## 真人操作
| 案例 | 狀態 | 人工觀察／證據 |
|---|---|---|
| 左→右獨立3次 | 未執行 | 待 operator |
| 右→左獨立3次 | 未執行 | 待 operator |
| 持續按住、反向與放開只一次 | 未執行 | 待 operator |
| 連續兩次獨立滑動 | 未執行 | 待 operator |
| Tap／小幅移動／長按無Swipe | 未執行 | 待 operator |
| 門檻前取消／移出與恢復 | 未執行 | 待 operator |
| 辨識後取消保留一次 | 未執行 | 待 operator |
| 重啟與舊操作隔離 | 未執行 | 待 operator |
| 不可用／初始化錯誤 | 未執行 | 待 operator |

需記錄 browser/OS、日期、session/operation/sample、MOD gesture/count、UI direction/count、具名操作者及 trace 路徑。不得把 automated traces 或這份操作程序當成人工觀察。

整體假設：無法判定。真人驗證任務完成：否。Draft PR 可交 human review；不代表整體驗收通過。
