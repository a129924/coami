# PR #23 第五輪 review 修正（2026-10-16）

Reviewed head：`e8e156b8a0e84f155a3a50304c7a4b245381ccbc`。三項P2皆接受；修改限E023驗證工具、測試與文件，不改SDK、Server、相機模型或驗收判準。

| Thread | 修正 | Commit |
| --- | --- | --- |
| [Reinstall or attest build dependencies before bundling](https://github.com/a129924/coami/pull/23#discussion_r4291906005) | 每次cleanBuild先執行lockfile驗證的 `npm ci --ignore-scripts --no-audit --no-fund`，記錄lock SHA及完整installed-tree SHA（含檔案、symlink與可執行位元），於build後與每次manifest查核前後重驗。固定案例ID不再於install前載入Three。 | `fd49f79` |
| [Escalate children that survive normal teardown](https://github.com/a129924/coami/pull/23#discussion_r4291906015) | 正常／錯誤finally共用startup的termination helper；Chrome、Vite、Uvicorn給予原三秒SIGTERM grace，仍存活即SIGKILL並等待close，之後才清除profile。 | `4e519c0` |
| [Recheck compiler sources after rebuilding tools](https://github.com/a129924/coami/pull/23#discussion_r4291906019) | Moddable與fontbm rebuild前後皆核對固定HEAD及tracked／untracked狀態，驗證後才記錄binary hashes及tool provenance。 | `496a510` |

## 依賴基線及實際準備

首次offline clean install因cache缺source-map-js tarball而fail closed，見 `review-round5-build.txt`。改採固定lock integrity的正常npm ci下載，沒有沿用dirty node_modules或忽略安裝錯誤。Vite會建立空 `.vite-temp`，第一次嚴格tree核對因此拒絕（`review-round5-build-clean.txt`）；現在於install後先建立這個空目錄，再取digest，完整納入查核，沒有排除該目錄或其中檔案。`review-round5-build-green.txt`為實際clean install／build成功與attestation。

確切依賴基線見 `dependency-attestation.json`。這是本次固定環境的安裝樹，不能假設跨平台／工具版本有相同digest；不同基線需重新驗證，不得靜默放寬hash。舊第四輪run與receipt保留，但沒有本輪新增的dependency attestation，不宣稱已通過此較強查核。

## 回歸與範圍

- 工具17項：新增實際npm ci清除dirty installed module、安裝後tree／lock／scratch-file注入拒絕、bundle中與之後的dependency修改拒絕；正常teardown的ready child忽略SIGTERM仍被清除；真實Git fixtures在重建期間修改tracked／untracked／HEAD皆拒絕。
- TS11項、MOD contract2項與strict TS／MOD通過；audit新增缺install attestation與錯誤tree／lock的回歸。
- compiler post-build guards由上述真實Git fixtures驗證；本輪沒有重建原WASM host，不將新guard追溯宣稱為舊host編譯時的檢查。實際host bytes與SDK pin保持不變。

新的完整run為 `WASM-2026-10-16T07-46-32-258Z`，runtime tooling來源 `fd49f79b24c20583a6bd9d5e9f07d14d0937b68d`。完整run已完成：**11成功、4失敗、0無法判定、0未執行**，90筆probe、90次真正SDK呼叫、Browser exceptions=0。Audit PASS，明列`dependency_tree_verified=true`；實際source、dist及installed dependencies亦於run後重新核對通過。

34項Python測試（25 Calculator＋9 audit）、strict Python與Ruff通過；完整17項工具回歸、TS11項、MOD2項與strict TS通過。終端與raw證據在`review-round5-*.txt`及上述run目錄。舊run與receipts不覆寫，第四輪結果／receipt另存`results-round4.json`、`wasm-evidence-audit-round4.json`。

目前正式結論與限制文件改指向[新完整run](manifest-run.md)。本輪完整run使用既有固定host bytes，未重新編譯host；compiler新post-build guards僅依前述回歸驗證，不追溯作出舊host的更強宣稱。

交付：topic commits → push → 原threads回覆修正與證據 → resolve；PR保持Ready，停於human review，不merge／release。
