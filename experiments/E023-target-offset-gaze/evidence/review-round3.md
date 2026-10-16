# PR #23 第三輪 review 修正（2026-10-16）

Reviewed head：`e4238030eb04718ab74d453f1f3c60f89bac5bf9`。兩項 P2 均接受並修正；僅修改 E023 建置驗證、touch傳遞與對應測試，不改 SDK、Server行為或驗收判準。

| Thread | 判斷與修正 | Commit |
| --- | --- | --- |
| [Include vendor imports in the build manifest](https://github.com/a129924/coami/pull/23#discussion_r4291412185) | 既有Vite啟動檢查不足以涵蓋建置期間及之後的變更。沿用 `verifyVendor`，在clean build前後及每次 `assertBuildCurrent` 前後，核對checkout HEAD、repo gitlink與tracked／untracked cleanliness；新manifest記錄已驗證vendor commit。採review建議的固定來源gate，不另建vendor檔案白名單。 | `38f20fc` |
| [Recheck freshness before sending the commit touch](https://github.com/a129924/coami/pull/23#discussion_r4291412191) | 每筆touch began處理返回後、送出ended前再呼叫 `isValid()`；過期即abort，不送出可完成frame的ended。1000ms含邊界的期限與MOD獨立5秒組裝期限不變。 | `8168faa` |

## 驗證

- TS TDD：先新增可重現「began處理將clock從999推進至1001ms，ended仍送出」的測試，red因`ended`已送出而失敗（`review-round3-ts-red.txt`）。最小修正後，早期point與最後commit point兩種情境均不送出expired ended、FrameDecoder無完整frame；既有正常傳遞與1000ms邊界測試保持通過。
- `npm test`：11項通過；`npm run test:tools`：12項通過，新增真實隔離Git／gitlink fixtures，驗證vendor在建置前、中、後被修改均拒絕；沒有修改實際vendor checkout。
- `npm run test:mod`：2項通過；`npm run typecheck`：strict TS／MOD通過；`node --check scripts/run-build.mjs`及`git diff --check`通過。Commit hook仍缺lefthook，以上checks另行明示執行。
- 對目前實際vendor執行預設gate：固定commit `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`、gitlink與clean tree通過。
- 目前checkout的歷史 `python3 evidence/audit-wasm.py`仍PASS；原15案、source-inputs與receipts保持原樣。

終端證據：`review-round3-ts-red.txt`、`review-round3-ts.txt`、`review-round3-tools.txt`、`review-round3-mod.txt`、`review-round3-typecheck.txt`。

## 真正 WASM smoke

Code commit `38f20fc` 後執行 `E023_CASES=0 npm run test:runtime`，run為 `WASM-2026-10-16T06-26-29-613Z`。新runner clean build並通過vendor gate；中心案成功、6筆非運動probe、SDK修正0筆、Browser exceptions=0；suite正確為 **partial**。另核對report已驗證vendor commit及全部source／dist hashes均符合實際檔案。

此smoke支持正常touch glue及vendor build gate整合；期限跨越情境由局部虛擬clock測試證明，不宣稱在實機重現或已重跑完整15案。原11成功／4失敗與SDK限制結論不變，原始完整run未修改。

交付：topic commits → push → 在兩個原threads回覆修正及測試 → resolve；PR保持Ready，停於human review，不merge／release。
