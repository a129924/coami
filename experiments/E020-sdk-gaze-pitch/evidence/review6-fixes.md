# E020 PR comment review and fix：第六輪（2026-10-14）

## 問題與決定

- 修改 harness 與重算 harness-pin 可繞過原 gate。現在 build/dev/HMR/preview 要求整個 E020 experiment checkout clean（staged、unstaged、untracked 均拒絕；ignored generated/node_modules/dist 不算來源），並以 Git HEAD blob 中的 manifest 驗證磁碟 manifest 與各個 input。新 provenance 記錄 build sourceCommit。
- 修改 dist 與同步重算 dist/harness-provenance.json 可繞過自我雜湊。新增 configurePreviewServer gate：先驗證來源，再讀 Git HEAD 中 scripts/production-bundle-pin.json，核對 production mode、build sourceCommit、完整 sources、完整 bundle hash set 及每一檔案實際 bytes。preview 的 mutable manifest 不再擁有最終判定權。
- 正式流程仍為 build → strict-port preview；Git CLI 與可讀 HEAD 為必要條件，Git 缺失／dirty／pin 缺失均 fail closed。這是實驗來源管理 gate，並非防禦可任意重寫 Git／驗證器的主機攻擊者。

## 維護程序

修改經授權的 source 後，更新 harness inputs pin，執行純測試／strict checks並提交修正；在 clean checkout 執行 production build。將產生的 sourceCommit + bundleSha256 保存為 production-bundle-pin.json，連同驗證證據另行提交，再於 clean checkout 驗證 preview。pin 不包含自身或 evidence docs，因此記錄 evidence 的提交不會改變 bundle bytes；正式採用仍需 human review。

本輪測試／建置 logs 先寫入 worktree 外，避免 gate 因新增未追蹤 evidence 而污染 build 條件；最終才加入證據提交。兩個提交均 push 並驗證後才 resolve review。

## 限制

本輪不重跑真人方向驗收，不更改 SDK patch／vendor pin／runtime／MOD。舊真人紀錄缺少同次 host/harness attestation，完整驗收仍為「無法判定」，不能由新 gate 回溯補證。最終檢查與 evidence 檔案見後續同 topic 證據提交。

## 建置證據

19 項純測試、10 項 scripts、6 項 patched controller 契約測試、strict checks 通過。clean `facb569` build 通過，production-bundle-pin.json 記錄其 sourceCommit 與 JS/CSS/HTML digest；review6-harness-provenance.json 保存實際 build manifest。原始 SDK/runtime/MOD 不變。
