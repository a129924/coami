# 具MOD編譯／Python環境驗證與來源建置綁定的完整 WASM 再驗證

Run：`WASM-2026-10-16T08-20-00-487Z`；runtime tooling來源：`e9915ec49cf762e2d32a61f427036345a1b1670d`。主結果 **失敗**，11成功、4失敗、0無法判定、0未執行。這是目前正式證據入口。

MOD prepare先執行npm ci，清除舊emitted輸出；編譯後重驗dependency tree、vendor與來源，記錄compiler dependency／source／archive attestation。Runtime再次乾淨安裝並要求編譯依賴吻合，清除dist、建置、保存完整source-inputs／dist manifest，逐案重驗。

Python由runner先移除舊venv，再固定3.12.12重建及locked reinstall。記錄真正interpreter、完整base／stdlib、venv、lock與project hashes，以-I -B啟動，suite前後及child teardown後重驗。此為本機固定安裝樹的前後一致性證據，未宣稱驗證Python發行封存檔。

Audit使用明確require／AuditError；正常與-O且繼承PYTHONOPTIMIZE=2均產生相同PASS receipt。查核固定Git blobs、完整來源／dist、runtime provenance、MOD compiler／Python／npm attestation及15案raw身分／SDK／觀測關聯。

基線：[dependency-attestation.json](dependency-attestation.json)、[python-attestation.json](python-attestation.json)；receipt：[wasm-evidence-audit-current.json](wasm-evidence-audit-current.json)。90筆非運動probe、90次真正SDK呼叫、Browser exceptions=0。中心0筆修正；成功案末3筆在雙軸±0.1內。未放寬20次上限或原判準。

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

從E023目錄執行 `python3 evidence/audit-wasm.py`。完整report／source-inputs、逐案raw JSON與截圖見 [run目錄](wasm-runs/WASM-2026-10-16T08-20-00-487Z/)。[第六輪review](review-round6.md)記錄實際注入、測試及修正範圍。

四個近中心案例20次後姿態與±0.11偏差未變，對應約6.28°修正，未觸發原版SDK嚴格30°門檻。SDK、Server、相機模型與驗收判準均未改，本結論不外推實機。

舊run與receipts保留各輪驗證範圍，不追溯宣稱具本輪MOD compiler／Python runtime attestation。第五輪摘要見 [manifest-run-round5.md](manifest-run-round5.md)。本輪沿用固定host bytes，未重編host。
