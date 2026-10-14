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

## E019 額外修正與證據

- pitch diagnostic 在載入 SDK 前核對 vendor gitlink／HEAD／clean 與固定 helper SHA；review-diagnostic-original.txt 仍為預期 3 fail／1 pass，review-diagnostic-candidate.txt 仍為 4 pass。
- runtime-smoke 改用每次獨立 `evidence/smoke-runs/<runId>/`。新 canonical `evidence/runtime-smoke-latest.json` 在任何 browser startup 前先寫 RUNNING 與空 cases；成功／失敗都寫同 run report 與 latest。診斷讀取失敗也會保存原錯誤。每個新畫面只放本次 run，不沿用舊 screenshot。
- `runtime-automated.json` 與原 `automated-*.png` 現在明確為 2026-10-13 的歷史 baseline，保留不覆寫；不得把它們當成本次重跑的最新結果。
- review-smoke-red.txt／smoke-evidence.test.mjs：驗證先前 PASS 被新 RUNNING／FAIL 取代，舊畫面不被引用，歷史 baseline 保留。
- 實際以不存在的 CHROME_EXE 執行 smoke，故意令 browser startup ENOENT；review-smoke-abort.txt 與 runtime-smoke-latest.json 確認最新 FAIL／空 cases 已保存。這是建置／證據失敗路徑測試，不是新一次 gaze 驗收。
- review-build.txt 保留第一次舊 compiler tree digest 被拒的結果。依已驗證官方 archive 重裝，放入 stale sentinel 後確認 cache 不再殘留；見 review-compiler-install.txt。review-build-restored.txt 為重裝後完整 WASM／MOD 成功。

## Review 對應

- discussion_r4266191132：清除 cache（亦強化每次 runtime build）。
- discussion_r4266191137：最新 canonical report 與每 run 圖片隔離；早期 abort 也寫 FAIL，歷史資料不冒充最新。
- discussion_r4266191142：工具從已核對的 pinned source clean rebuild，並納入實際 tools binary 的 hash。
- discussion_r4266191147：diagnostic 在任何 SDK import 前強制 source pin。
- 同一份複用程式的 MOD freshness／vendor gate／watchdog 問題也同步修正，避免兩個獨立實驗產生差異。
