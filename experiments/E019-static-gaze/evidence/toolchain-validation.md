# E019 工具鏈完整性與建置

日期：2026-10-13。所有安裝、編譯與cache位於 E019 feature worktree 的 ignored generated 目錄。

- E017 工具鏈副本最初的 installed-tree SHA 為 `7bf9bd77be812b164864de4b74f01b8e6a0c9473511074ae143336886cdf1809`，未通過 E015 原固定值。初次 runtime build 因此停止，未使用舊runtime。
- 曾提議移除固定 tree 比對；自動審核拒絕，命令未執行。最終實作保留原比對，沒有放寬固定雜湊／版本檢查。
- 安全替代：由 pinned emsdk manifest 及 release mapping 確認官方 URL，下載 `https://storage.googleapis.com/webassembly/emscripten-releases-builds/mac/bf32ae8b61ac8efeb7eca01b54c8307f992724f7/wasm-binaries-arm64.tar.xz`。
- Archive SHA-256：`76bcc261810a6facb482c6314711c7bb429ad52f7ed0af6285a278478aa27f21`。`install-compiler.mjs` 在解壓前固定比對。
- raw archive 自報5.0.1-git；依 pinned `emsdk.py:2178–2186` 官方流程寫入 `emscripten-version.txt`（"5.0.1"與newline）及 `.emsdk_version`。
- 安裝後 tree SHA 精確符合原固定值 `42ce84c65e00be2818a7733704b9f0217f4c3ee9c7f2bb3366293f60c8e47295`。來源commit及 emcc source commit 亦通過比對。
- emcc使用Python -E，會忽略PYTHONDONTWRITEBYTECODE；由generated/python-no-bytecode wrapper明確傳-B。EM_CACHE放generated/em-cache，防止再次建置改動已核對工具鏈。
- 命令順序：npm ci --ignore-scripts → node scripts/install-compiler.mjs → 配妥 E019 內的 MODDABLE/EMSDK/EM_CONFIG/FONTBM/FONTBM_SOURCE/PATH → npm run prepare:poc。
- runtime build：PASS。真實來源與二進位SHA見 runtime-provenance.json；MOD來源與archive SHA見 mod-provenance.json。完整build log在ignored web/generated/runtime-build.log。
- 未修改 vendor checkout、其他 feature worktree 或dev worktree；無實機或production採用證據。

Git commit hook顯示Can't find lefthook in PATH；未宣稱hook通過。npm測試、契約characterization、strict typecheck、MOD/web build已手動執行，見validation.txt。
