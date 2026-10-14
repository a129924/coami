# E020 PR comment review and fix：第八輪（2026-10-14）

## 兩項建議與決定

1. Preview 要求 harness-provenance.sourceCommit 嚴格等於 Git production-bundle-pin.sourceCommit；僅同 ancestry／相同 manifest 不足。Builder 使用最後修改 src/harness-pin.json 的提交作為 sourceCommit（固定 harness input revision），不將純證據提交冒充新的來源版本。保留 ancestry 與 manifest 相符檢查。這取代第六輪允許替換 commit identity 的判定，並維持 evidence-only commit 後的重建可用。
2. Runtime provenance 使用 stableRuntimeProvenance + canonicalJson 的固定 digest。只移除本機 location 欄位：Moddable root／各 tool path、emsdk／emcc path、controlled config path／各工具 path／Python binary path、fontbm path，以及內容包含這些路徑的 configSha256。保留工具與 source commits、各 executable／installation tree SHA、Node／Python 身分、host／patch／output digests、build method，及所有未列出的 metadata 欄位。新配置或額外欄位仍改變 digest 並被拒絕。固定 builder 的 config 生成／工具驗證流程未變；本機 path 與 path-derived config digest 不再當作可攜工具身分。

Node public gate 與 browser 共用同一 strict TypeScript normalization；browser 只保存／匯出正規化後的 provenance，不將排除欄位冒充 authenticated data。raw generated record 留作本機建置診斷，preview snapshot 仍固定該次 served bytes。MOD provenance 無 location data，維持完整原始 bytes pin。此規則取代第七輪固定 runtime 全檔 raw SHA 的路徑限制。

## 驗證程序

Red：scripts regression 先證明替換為相同 manifest 的 ancestor commit 未被拒絕；unit red 為缺少 normalization module。Green：搬動所有 checkout 路徑並改變 path-derived config digest 後穩定 identity 相同，匯出不含這些值；竄改 tool／Python／host／WASM／額外 config field 均改變 digest。最終 clean build 與第二個 checkout 路徑的 HTTP 驗證於同 topic evidence 另記。

本輪不執行真人方向驗收，不更改 SDK／vendor／WASM／MOD；搬動 runtime 測試使用已驗證的相同 binaries，不宣稱在搬動目錄重編譯整套 WASM。舊真人 evidence 缺少同次 attestation，完整驗收仍無法判定。
