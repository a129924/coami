# 具乾淨依賴安裝與來源建置綁定的完整 WASM 再驗證

Run：`WASM-2026-10-16T07-46-32-258Z`；runtime tooling來源：`fd49f79b24c20583a6bd9d5e9f07d14d0937b68d`。主結果 **失敗**，11成功、4失敗、0無法判定、0未執行。這是目前正式證據入口。

runner先執行lockfile驗證的npm ci，記錄完整installed-tree SHA並於build／每案查核重驗；清除dist、建置並保存自動source-inputs與完整dist manifest，核對vendor pin與來源／輸出穩定性。audit驗證固定Git blobs、完整來源集合、資產／public／runtime provenance、dependency attestation與15案raw關聯。正常／錯誤teardown皆有有界SIGTERM→SIGKILL及close等待。

依賴基線見 [dependency-attestation.json](dependency-attestation.json)，查核receipt見 [wasm-evidence-audit-current.json](wasm-evidence-audit-current.json)。90筆非運動probe與90次真正SDK呼叫完成，Browser exceptions=0；中心修正0筆，成功案末3筆在雙軸±0.1內。未放寬20次上限或原判準。

| 案例 | SDK控制次數 | 最後偏差 | 結果 |
| --- | ---: | --- | --- |
| TC-E2E-01 | 0 | [0, 0] | 成功 |
| TC-E2E-02 | 1 | [-0.00015612802498056927, 0] | 成功 |
| TC-E2E-03 | 1 | [0.00015612802498056927, 0] | 成功 |
| TC-E2E-04 | 1 | [0, -0.00015612802498056927] | 成功 |
| TC-E2E-05 | 1 | [0, 0.00015612802498056927] | 成功 |
| TC-E2E-06 | 1 | [-0.0003123810408340368, -0.00020679169966467248] | 成功 |
| TC-E2E-07 | 1 | [-0.0003123810408340368, 0.00020679169966467248] | 成功 |
| TC-E2E-08 | 1 | [0.0003123810408340368, -0.00020679169966467248] | 成功 |
| TC-E2E-09 | 1 | [0.0003123810408340368, 0.00020679169966467248] | 成功 |
| TC-E2E-10 | 20 | [0.11, 0] | 失敗 |
| TC-E2E-11 | 20 | [-0.11, 0] | 失敗 |
| TC-E2E-12 | 20 | [0, 0.11] | 失敗 |
| TC-E2E-13 | 20 | [0, -0.11] | 失敗 |
| TC-E2E-14 | 1 | [-8.837992900505607e-05, -0.00043698817960065143] | 成功 |
| TC-E2E-15 | 1 | [4.405996209492613e-05, 0.0004020426096348562] | 成功 |

查核：從E023目錄執行 `python3 evidence/audit-wasm.py`。完整report／source-inputs、逐案raw JSON與截圖在上述run目錄；[第五輪review](review-round5.md)保留測試、實際建置與修正範圍。

四個近中心案例20次後姿態與±0.11偏差未變，對應約6.28°修正，未觸發原版SDK嚴格30°門檻。SDK、Server、相機模型與驗收判準均未改，本結論不外推實機。

原2026-10-15 run缺clean-build manifest；第四輪run具source/build綁定但無本輪dependency attestation。兩者原始資料與receipt保留作歷史，不能追溯宣稱通過新依賴完整性查核。第四輪摘要見 [manifest-run-round4.md](manifest-run-round4.md)。
