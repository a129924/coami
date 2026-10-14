# PR comment review and fix — round 2 (2026-10-14)

## 採納項目

這輪兩個 PR 各三項 inline 建議全部採納。僅修改各自 feature worktree 的建置與來源核對；不修改 SDK gaze patch、正式程式、vendor checkout 或歷史真人證據。

- fontbm：先核對 source root／pinned commit／clean tracked files，清除整個 build 目錄與 CMake cache，再以 system C++ compiler 重新 configure Release 並 build fontbm target。FONTBM 僅可選這個新建 target；來源與 build 方式納入 provenance。
- Compiler：產生 `generated/controlled-emscripten.py`，LLVM_ROOT／BINARYEN_ROOT 固定至已通過原有完整性檢查的 upstream，NODE_JS 固定至 SDK Node 22.16.0；清掉 EM_*／EMCC_*／EMSDK_*、LLVM／Binaryen／Node／Python 覆寫，再設定受控 EM_CONFIG、cache 與自行產生的 Python -B wrapper。emcc --version、npm ci 與 build:wasm 都使用此 env。記錄 config SHA256、路徑與 Node SHA256，不執行使用者舊 .emscripten。
- Node：由官方 22.16.0 mac arm64 archive 對照官方 SHASUMS256.txt，再比對兩個 SDK 內的 node binary；固定 binary SHA 驗證寫入 helper。來源及 archive／binary digest 見 review2-node-attestation.txt。
- Simulator host：網頁只 import generated/pinned-stack-chan 的 staged engine，不再 import live vendor。四個 host module 的 SHA256 固定在 host-pin.json，逐一對照 pinned Git commit 的 blob；prepare-assets 將 host hashes 記入 runtime provenance。Vite startup、build、HMR 都檢查 staged host，修改任一檔即拒絕。動態載入的 mc.js／WASM 仍走原頁面雜湊驗證；Three 依賴仍由 lockfile 固定。

## 驗證與證據

- review2-red.txt：新 helper 缺失時回歸先失敗。review2-green.txt／review2-scripts.txt：控制 env、拒絕被替換 Node、fontbm 舊 cache 清除、staged host 被修改時拒絕等測試通過。
- review2-build.txt：實際將 EM_CONFIG、EM_LLVM_ROOT、EM_BINARYEN_ROOT、EM_NODE_JS 指到不存在的外部位置，仍以受控 env 完成 clean tools／fontbm／WASM／MOD 建置。沒有放寬既有來源／compiler tree 完整性檢查。
- review2-host-rejection.txt：暫時在 ignored staged bridge 加一行變更，Vite build 確實因 host source mismatch 失敗；finally 還原原 bytes。review2-web-build.txt 為還原後的 strict typecheck／正式 web build 成功。
- review2-unit.txt、review2-scripts.txt、review2-contract.txt：單元、腳本與原 SDK／patched controller 契約通過。E019 為 14 unit + 8 script + 4 contract；E020 為 14 unit + 7 script + 6 contract。
- review2-runtime-provenance.json／review2-mod-provenance.json：含 controlledConfig、clean fontbm build 與 staged host hashes。比較歷史 provenance：fontbm binary、mc.js、mc.wasm、MOD archive SHA256 全部相同；staged host 四檔也與 pinned Git blobs 相同。因此保留既有真人判定，不宣稱重新做過真人驗證。
- 文字 log 僅去除行尾空白與檔尾空行；原實驗結論與證據限制不變。環境仍限 macOS arm64，需 Homebrew cmake／Freetype 與既有 Xcode compiler。

## Thread 對應

- discussion_r4266350735: fontbm clean rebuild
- discussion_r4266350744: controlled Emscripten config
- discussion_r4266350745: staged simulator host

## 第三輪 review 更正

上述執行檔／目前 staged host 的相同比對不能追溯證明較早真人 run 的 live-vendor renderer。舊 human-final.json 沒有 host attestation，舊 web bundle 未留存；歷史人工觀察只作當時回報，不宣稱新 host gate 已通過真人驗收。見 review3-fixes.md。
