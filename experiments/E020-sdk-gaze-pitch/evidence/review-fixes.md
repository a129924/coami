# PR comment review and fix — 2026-10-14

## 範圍與結果

逐項核對 GitHub inline review，全部採納；在各自 feature worktree 修正，未修改 dev worktree、vendor checkout、gaze patch、MOD 操作語意或歷史真人證據。

- 安裝 compiler 與每次 runtime build 都先刪除 external em-cache，再從固定完整性檢查涵蓋的 upstream cache 複製，避免 overlay 留下舊 library。
- prepare-assets 在核對 Moddable checkout／tracked source／版本後，清除 release binaries 與 object cache，依 pinned makefiles 重新編譯 xsc／xsid／xsl／tools；記錄實際 tools binary 與 wrapper 雜湊，PATH 必須對應新建的 mcconfig／xsc。既有 compiler 完整性檢查保留。
- 直接執行 build-mod 也會先清除 public archive／provenance 與暫存編譯目錄，再核對 vendor gitlink／HEAD／clean status，通過才載入 editor tools；MOD provenance 加入 vendorCommit。
- 啟動 watchdog 在 start 拒絕時取消；另一路徑已 blocked 時不再發出 generic timeout，保留具體啟動錯誤。

## 驗證

- review-red.txt：新 build-safety／startup 模組缺失時測試失敗；review-green.txt：修正後通過。
- review-unit.txt、review-scripts.txt、review-contract.txt、review-web-build.txt：操作與啟動回歸、檔案清理與來源 gate、真 controller 契約、strict typecheck／Vite build。
- review-runtime-provenance.json 與 review-mod-provenance.json：重新建置工具與清空 cache 後的產物來源。對比歷史 runtime-provenance.json／mod-provenance.json，mc.js、mc.wasm 與 MOD archive 三者 SHA256 均逐位元組相同，既有真人證據仍對應同一 executable artifact。
- 不宣稱重新執行真人驗證；web 啟動錯誤處理有單元回歸，gaze／UI 實驗結論維持原樣。Vite bundle-size warning 仍在。
- 文字 log 僅移除行尾空白與檔尾空行。

## Review 對應

- discussion_r4266185945：任何 MOD build fallible step 前清除舊 archive／provenance／compiled modules。
- discussion_r4266185951：直接 npm run mod 也核對 vendor，驗證通過才 import builder/tools。
- discussion_r4266185955：清除 external cache；runtime build 亦重新 seed。
- discussion_r4266185959：startup 拒絕時取消 watchdog，blocked 時不覆蓋原錯誤。
- discussion_r4266185963：Moddable clean source build 取代接受任意既有 binary，並記錄 tools 本體雜湊。

review-build.txt 為清理後工具、patched WASM、MOD 完整建置成功。14 項 unit、4 項 build-safety、6 項 patched contract 通過。原上下切換 4/4 真人 PASS 與 patch SHA 不變。
