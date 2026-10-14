# E020 PR comment review and fix：第七輪（2026-10-14）

三項新建議均採納：

1. Preview 在 listen 前將 reviewed bundle、harness provenance、runtime／MOD provenance、runtime／MOD bytes 與 mesh 讀為 memory snapshot；再針對 snapshot bytes 驗證 Git bundle pin、來源及完整 public inputs，避免先驗證磁碟卻讀到稍後替換的檔案。middleware 只提供這些捕獲且驗證過的 bytes，GET/HEAD、no-store，不向可變 dist fallback；未知檔案 404。重新建置或修改 dist 不改變已開啟 preview，更新產物需重啟並重新通過 gate。
2. 新 provenance-pin.json 固定完整 runtime 與 MOD provenance 原始 bytes。Vite/public inputs、preview snapshot 與 browser json() 都核對整份文件，不能只保留輸出 SHA 並偽造 compiler／Python／fontbm／host 等欄位。runtime 內容與已提交 review4-runtime-provenance.json 完全相符；本輪保存相同原始 bytes，未重建 WASM 或宣稱新的工具鏈 run。新 checkout 路徑／重新建置若產生不同 provenance，必須明確檢查及提交新 pin，不能默默接受。
3. render 使用 stabilityState：busy、pending、awaiting observation、blocked 或未 ready 均停用並清除 stable checkbox；unlock 後仍未勾選，必須在上一輪觀察記錄完成後重新確認。選擇目標造成 pending 時也清除，防止把先前目標的確認帶至另一目標。

Red/green：新增 stability module 與 snapshot middleware 的缺少實作 red；public-inputs red 同時重現保留輸出 hashes 的偽造 runtime provenance 未被拒絕。最終 unit/scripts/contract/strict checks、clean build 與 HTTP probe 結果在同 topic evidence 後續記錄。unit middleware 測試會替換原 Map 與原 Buffer，確認提供的仍為副本。

此輪不執行 browser UI 或真人方向驗收，不修改 SDK patch／vendor／runtime／MOD。既有人工紀錄缺少同次 attestation 的限制保留，完整驗收仍無法判定。
