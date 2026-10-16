# PR #23 第四輪 review 修正（2026-10-16）

本頁保留第四輪紀錄；該run尚無第五輪新增的dependency attestation，現行audit與正式入口已更新至[第五輪](review-round5.md)。

Reviewed head：`b4d224116726d704a144f3e456d0a6bce27b7d12`。接受 [Bind the audited historical bundle to its recorded sources](https://github.com/a129924/coami/pull/23#discussion_r4291587717)：舊完整run只有source hashes與當時dist/assets hashes，沒有clean-build manifest；固定Git blobs查核不能補造來源到bundle的歷史綁定。

## 修正方式

以目前manifest-aware runner重新執行完整15案。原run `WASM-2026-10-15T07-05-48-980Z`、所有raw資料與原receipt保留作歷史參考，不再是現行完整audit的對象。

新版audit固定來源commit `b4d224116726d704a144f3e456d0a6bce27b7d12`，對象為 `WASM-2026-10-16T07-00-00-630Z`。必須有實際runner產生的clean-build manifest；查核自動source-inputs與build來源相等、完整預期來源集合與immutable Git blobs、全部dist的資產／public集合、runtime pin／provenance bytes／MOD來源、vendor gitlink及來源，以及15個唯一case的raw身分／結果／runtime一致性。只保存來源但沒有manifest的舊run會被拒絕。

這不是用新metadata追溯證明舊bundle，也沒有修改SDK、Server、相機模型或0.1／20次／連續3筆判準。實際程式未改動；本輪只改audit、測試與證據文件。

原 `wasm-evidence-audit-round4.json` 另存 `wasm-evidence-audit-legacy.json`，表示第三輪以前來源查核的歷史receipt；其PASS不代表符合本輪新增的bundle綁定查核。舊 `results.json` 另存 `results-pre-manifest.json`；最早的 `results-initial.json` 也保留。

## 驗證紀錄

- Audit負向回歸涵蓋缺manifest、資產hash不符、缺index.html manifest、來源集合缺漏、runtime pin變更、錯誤source hash與重複／缺漏case。
- 實際完整run終端為 `review-round4-runtime.txt`；source-inputs、report（含build manifest）、各案raw JSON與同次截圖位於新run目錄。
- 完整run：**11成功、4失敗、0無法判定、0未執行**；90筆probe與90次真正SDK呼叫均完成分層查核。Browser exceptions=0。
- `python3 evidence/audit-wasm.py`：PASS；`wasm-evidence-audit-round4.json`明列新run／固定source commit及`build_manifest_match=true`。
- 32項Python測試通過（25 Calculator＋7 audit）；audit針對legacy缺manifest、錯誤來源／bundle、runtime變更及案例完整性的回歸均通過。Strict Python、Ruff lint／format與diff／連結查核通過，原runtime程式未修改，不重複跑無關TS測試。
- 限制文件與E023 README改指向[具來源綁定的完整再驗證](manifest-run-round4.md)，舊run／receipt保留且明示限制；主假設仍以實際新結果判讀。

交付：commit by topic → push → 在原thread回覆新完整run與manifest查核 → resolve；PR保持Ready，停於human review，不merge／release。
