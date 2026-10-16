# PR #23 第七輪 review 修正（2026-10-16）

Reviewed head：`5b9a0634396b8f1e7c979fc8a0e8a899e8332620`。三項建議均接受；修改限E023接收邊界、驗證工具與證據。Python Calculator／Server、SDK、相機模型及原驗收判準不變。

| Thread | 修正 | Commit |
| --- | --- | --- |
| [Revalidate Emscripten after the WASM build](https://github.com/a129924/coami/pull/23#discussion_r4292574974) | `buildWithVerifiedCompiler`在真正WASM build前後均核對emsdk固定HEAD、tracked／untracked cleanliness及完整upstream installed-tree SHA；通過後才可複製產物及發布provenance。重用既有tree digest演算法。 | `e4266f4` |
| [Align command bounds with the server's rotation tolerance](https://github.com/a129924/coami/pull/23#discussion_r4292574977) | TS接收端允許元件的1e-6 roundoff，仍執行既有unit-norm tolerance檢查；以副本正規化至單位球後才編碼，避免合法近單位target在量化前被拒絕，wire物件不被修改。 | `e96ad70` |
| [Sanitize the environment used for the attested web build](https://github.com/a129924/coami/pull/23#discussion_r4292574985) | 拒絕非空NODE_OPTIONS／NODE_PATH及Node preload flags；npm ci、MOD tsc、web build使用明確allowlist環境，清除VITE_*、NODE_ENV及任意npm設定。另建立兩份不同路徑的空user／global npm configs，將build環境值記入manifest。 | `52ba646` |

## 回歸與實際邊界驗證

- TS先red，確認 `[±1.0000004,0,0]`被舊接收端拒絕；green後12項通過。容差內target正規化後可完成frame roundtrip；超出容差仍拒絕，wire資料維持原值。
- 真正Python Session接收合法、略有roundoff的rotation，產生 `[1.0000004,0,0]`；TS parse與MOD codec得到 `[1,0,0]`，見 `review-round7-server-command.json`、`review-round7-contract.txt`。未修改Python計算或旋轉驗證。
- 環境先red，舊build沒有拒絕NODE_OPTIONS。修正後禁止preload並確認不啟動builder；child實際執行時VITE_UNRECORDED／NODE_ENV／NODE_OPTIONS／NODE_PATH皆不在環境，保存allowlist manifest。見 `review-round7-env-red.txt` 與工具green紀錄。
- 真實Git與installed-tree fixtures分別注入upstream compiler修改、tracked source修改、untracked input與HEAD變更，WASM build後查核全數拒絕；build前dirty compiler也不執行builder。當前真正emsdk tree與固定baseline不符，被新guard拒絕，見 `review-round7-emsdk.txt`。
- 初版空npm configs同用/dev/null被npm拒絕double-loading；改為本實驗generated目錄兩份獨立空檔後實際npm ci／prepare成功，見 `review-round7-tools-initial.txt`、`review-round7-prepare.txt`。沒有採用使用者npm設定或忽略install錯誤。
- 22工具、12 TS、2 MOD、36 Python及strict TS通過；既有完整15案audit仍PASS。

## 證據適用範圍

本輪runtime tooling固定於 `52ba646921b3a68d17cce740ad9cbc1f98cf4f30`，只跑中心與近中心兩案的真正WASM smoke：`WASM-2026-10-16T08-51-58-817Z`。此為partial，不宣稱本輪重新完成15案；完成結果見 `review-round7-smoke.json` 及raw run目錄。

目前完整15案正式證據仍為[第六輪run](manifest-run.md)，來源 `e9915ec`，11成功／4失敗；不將本輪接收端或環境防護追溯描述為舊run已執行的檢查。SDK限制結論與原0.1判準保留。當前ignored emsdk安裝樹未通過固定SHA查核，未追查或修復其差異；未嘗試新的host編譯。已驗證的既有host bytes保持不變。本輪沒有重新編譯WASM host，新的Emscripten post-build guard以真實Git／installed-tree fixtures驗證，不提升舊host編譯時的保證。

Git hook仍缺lefthook；上述明列checks直接執行。交付為topic commits、push、threads回覆與resolve，停於human review，不merge／release。

Smoke完成：中心案成功、0次修正；近中心案20次SDK呼叫後iteration_limit，姿態及[0.11,0]偏差未變；共12筆probe、20次SDK呼叫、0 browser exceptions，suite明確為partial。以固定Git blobs查核本輪來源，run後另外重驗實際dependency／source／dist／vendor／Python／MOD bytes通過。完整15案摘要、results及audit receipt保持第六輪run，不覆寫成兩案結果。

重現：E023 web目錄執行 `E023_CASES=0,9 npm run test:runtime`；需要既有固定host及prepare:poc產物。對當前emsdk tree執行固定SHA查核會拒絕；此情況不可繼續host編譯或發布新的runtime provenance。
