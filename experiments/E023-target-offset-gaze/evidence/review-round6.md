# PR #23 第六輪 review 修正（2026-10-16）

Reviewed head：`4084f1ab80f1bb82cb426a22de0c949cb9248281`。三項建議均接受，範圍限E023驗證工具、測試與證據。SDK、Server應用行為、相機模型及驗收判準不變。

| Thread | 修正 |
| --- | --- |
| [Clean-install dependencies before compiling the MOD](https://github.com/a129924/coami/pull/23#discussion_r4292258981) | prepare在執行tsc前先npm ci，清除舊emitted目錄；編譯後重驗依賴、vendor與MOD來源。記錄compiler dependency／source／archive attestation，runtime拒絕與本次clean build不同的編譯依賴或產物。 |
| [Attest Python runtime environment before each suite](https://github.com/a129924/coami/pull/23#discussion_r4292258986) | 在uv可檢視舊venv前移除它；重建固定Python3.12.12並uv sync --locked --reinstall。記錄真正interpreter、完整base installation／stdlib、venv及lock／project hashes。用-I -B啟動Uvicorn，suite前後及child teardown後重驗，不使用可變命令值作證據。 |
| [Replace optimized-away audit assertions](https://github.com/a129924/coami/pull/23#discussion_r4292258993) | 所有audit assert改為require及AuditError；正常與最佳化Python都明確拒絕不符證據。新增-O且繼承PYTHONOPTIMIZE=2的負向子程序回歸。 |

## 實際注入與驗證

- 在本實驗ignored node_modules內替換tsc shim為留下marker並退出的假編譯器。真正prepare先清除它，marker未產生；MOD archive仍重現固定SHA `dc2beed357de80aa1c11bdbb76c869e8b07ac68eaa4797ee7bacd6338a3ed63e`。見 `review-round6-mod-prepare.txt`。
- 同樣替換本實驗ignored venv的python shim。preparePython在任何uv指令前移除舊venv，marker未產生，locked recreation及tree重驗成功；見 `review-round6-python-prepare.txt`、`python-attestation-initial.json`。
- 工具20項、TS11項、MOD2項與strict TS通過。新增fixtures涵蓋MOD compiler dependency／source／archive修改，以及Python package／interpreter／stdlib／lock修改拒絕。
- Python基線是本機選定的3.12.12實際安裝樹；完整hash用於本輪前後一致性查核，不宣稱已驗證Python發行封存檔或跨平台樹相等。
- 本輪沿用已固定的WASM host bytes，沒有重編host；新增MOD compiler guard只歸屬本輪重新prepare，不追溯提升舊MOD或host的編譯時保證。

## 完整閉環

Runtime tooling來源：`e9915ec49cf762e2d32a61f427036345a1b1670d`。本輪raw run：`WASM-2026-10-16T08-20-00-487Z`。完成後以[目前摘要](manifest-run.md)、[結果](results.json)及[查核receipt](wasm-evidence-audit-current.json)記錄結果，舊第五輪資料另存 `manifest-run-round5.md`、`results-round5.json`、`wasm-evidence-audit-round5.json`，不追溯宣稱具本輪Python或MOD compiler attestation。

Git hook仍回報找不到lefthook；以下明列的測試與型別查核由本輪直接執行，不宣稱hook通過。交付維持commit by topic → push → threads回覆及resolve → human review；不merge或release。

完成結果：**11成功、4失敗、0無法判定、0未執行**；90筆probe、90次真正SDK呼叫、0 browser exceptions。四個近中心案例各20次控制後偏差與quaternion未變。正常及最佳化audit輸出逐byte相同；36項Python測試（25 Calculator＋11 audit）、20工具、11 TS、2 MOD及strict checks通過。Run後另重驗實際dependency／source／dist／vendor／MOD／Python bytes一致，見 `review-round6-postrun.txt`。

首次從E023根目錄直接pytest，誤收集ignored工具鏈附帶測試，遇IDLE user config權限錯誤；紀錄在 `review-round6-pytest-discovery-error.txt`。改以明確 `python -B -m pytest tests` 完成36項，沒有修改工具鏈、使用者設定或測試判準。
