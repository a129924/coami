# E020 PR comment review and fix：第五輪（2026-10-14）

問題：canonical 重現流程在 production build 後卻啟動 dev server，與正式驗收需要 bundle attestation 的程序不一致。

決定：兩份 README 均改為 `npm exec -- vite preview --host 127.0.0.1 --port 5200 --strictPort`。preview 提供 dist 內的 production bundle 與 harness-provenance.json；strictPort 避免埠被既有 dev server 占用時默默改埠。保留開發功能，但正式重現入口使用 preview。

驗證：以已安裝 Vite 的 `preview --help` 核對命令與 strictPort 選項（見 E019 evidence/review5-preview-help.txt）。本輪未啟動新的 browser 操作或真人驗收，不宣稱新 run 的 production bundle 已由真人觀察。

E020 本輪只修改正式重現文件，未更改執行程式，未重跑測試／WASM／真人驗收。既有 4/4 人工觀察仍為未具同次 host/harness attestation 的歷史紀錄；完整驗收維持「無法判定」，等待正式 preview run 與 human review。
