# E020 PR comment review and fix：第四輪（2026-10-14）

本輪 #19 的 5 項與 #20 的 3 項新增建議均採納；共用保護同步至兩份獨立實驗。

## 本輪問題與決定

- 固定 reviewed `mc.js` / `mc.wasm` SHA-256，Vite 的 build/dev/HMR 與 browser 啟動同時驗證。mutable runtime-provenance 的雜湊即使與替換檔案一致，也不能通過固定 pin。
- Python 驗證涵蓋完整 install tree：路徑、目錄、symlink target、檔案內容與 executable bit。官方 emsdk manifest 所選 `python-3.13.3-0-macos-arm64.tar.gz` SHA-256 為 `2b0899d7ade9463b0c909ef23aeea27546a4f412637998d817a49718bc2bac19`；解壓後按 pinned emsdk.py 的安裝程序加入 `.emsdk_version`，內容為 `python-3.13.3-64bit\n`。完整 tree SHA-256 為 `a8c4f3a2be714ebb6fdd01cf4200c177f78d8ff63b57141982f49426250dff61`，兩個隔離安裝均相符。來源 URL：https://storage.googleapis.com/webassembly/emscripten-releases-builds/deps/python-3.13.3-0-macos-arm64.tar.gz 。prepareCompilerEnvironment 在執行 compiler 前拒絕修改／額外檔案，並將 tree digest 記入 controlledConfig。
- 新的 `harness-pin.json` 固定操作 UI、Ledger、HTML/CSS、watchdogs、啟動模組、Vite 設定、驗證腳本與 dependency manifests。build/dev/HMR 核對來源；production build 另產生各 emitted JS/CSS/HTML 的 digest，browser 啟動核對後才開放操作，下載紀錄包含 `harnessProvenance`。development 模式明示只有固定來源 attestation、`bundleSha256: null`，不冒充 production bundle。下一次正式人工驗收應使用 `npm run build` 後的 `npm exec -- vite preview --host 127.0.0.1 --port PORT`，保存同次 JSON 與畫面；PORT 沿用本實驗埠號。
- 解除操作在 Ledger 拒絕「符合」與「不符合」，UI 同時停用兩個方向按鈕，只能記「未確認／解除僅記錄」。不將保持原方向當成解除失敗，也不新增 stop／recenter 語意。
- README 的重現流程在 prepare:poc 後包含 `npm run test:scripts`。

## 程序與證據

- TypeScript 行為先加 red test。共享修正在 E019 完成 red/green，再同步 E020；`review4-red-unit.txt` 證明解除的錯誤入口，`review4-red-analysis.txt` / `review4-red-harness.txt` 記錄尚未建立的分析／harness module。第一版 Python fixture 的 symlink copy 未保留相對連結，導致 path mismatch，不能當成需求 red；修正 fixture 後，`review4-red-python.txt` 明確為 injected site-packages 未被拒絕的 assertion failure，再加完整 tree check 通過。
- `review4-build.txt`：兩個 feature worktree 各自 fresh prepare:poc；`review4-runtime-provenance.json` 保存本輪 provenance，reviewed runtime 與 MOD 雜湊均未變。
- `review4-scripts.txt`：替換 runtime 並偽造 matching provenance、注入 Python package、改寫標準庫、修改 main／Ledger／HTML 都被拒絕。
- `review4-harness-rejection.txt`：真正 Vite build 拒絕未審核的 Ledger edit，還原後 `review4-web-build.txt` 通過；`review4-harness-provenance.json` 記錄新的 production inputs 與 bundle hashes，逐一對照 dist bytes 相符。
- 僅新增文字 build logs 以移除行尾空白正規化，原始歷史 JSON／PNG 不修改。

## 限制

本輪未執行新 browser 操作或真人方向驗收；純測試、fresh WASM 建置、production bundle verification 不等於可見方向完成。新增 attestation 只適用新紀錄，不能回溯認證舊 renderer／harness。維持原實驗限定結論；SDK／vendor pin／production 未改，正式採用仍交 human review。

E020 舊真人 4/4 觀察保留；同次 host/harness attestation 缺失，完整驗收維持「無法判定」，新 gate 人工重跑未執行。

最終驗證：19 項純測試、9 項 scripts、6 項契約測試 PASS；strict typecheck、fresh prepare:poc、web production build PASS。
