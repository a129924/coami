# E015：手動錄影長短、結束輸出與取消

## 驗證什麼

- 編號：E015-manual-video-recording；設計日期：2026-10-13。建立前已核對兩個 worktree、可達歷史及 reflog，既有 E001–E014，不覆寫舊實驗。
- 主要問題：電腦 webcam 經 pinned Stack-chan simulator 的 MOD capture 確認後，能否由瀏覽器編碼為長度受人工開始／結束控制的可播放無聲影片，並可靠取消及重開？
- 假設：連續 MOD-confirmed frame 可由本機 canvas／MediaRecorder 形成符合下列判準的影片。

## 為什麼

- E008 已有單張 webcam→MOD 證據，沒有手動影片錄製；RobotCamera 只公開 start/capture/stop/close。E015 不修改 E008、vendor 或正式程式。
- 依據：vendor `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`、E008 observer／ledger、[DOM Capture](https://w3c.github.io/mediacapture-fromelement/)、[MediaStream Recording](https://www.w3.org/TR/2026/WD-mediastream-recording-20260316/)。規格不能代替指定環境的動態回放／時間／取消實測。
- 成立只支持 simulator 主機編碼路徑的後續決策；不成立則定位 frame、encoder 或生命週期缺口。不外推真機、不核准正式採用。

## 成功與失敗判準

- 執行前固定：TC1 約3秒、TC2 約8秒、TC3 約3秒取消、TC4 取消後重開約3秒；各正常結果完整回放並由 owner 辨識該段動作，至少2個不同 digest 的有效 webcam/MOD 配對。
- 播放 ended currentTime 與 `stopRequestedAt − recorderStartedAt` 差≤1秒；TC2 比 TC1 至少長3秒。
- 正常結束5秒內清理完成且播放器 loadeddata／readyState≥HAVE_CURRENT_DATA、無media error；沒有音軌。取消無當段輸出；tracks ended，250ms後capture計數不增，重開無舊段。
- 環境／權限／有效frame已成立後，違反上述判準為「失敗」；已嘗試但缺 runtime、裝置、API、frame或人工觀察則「無法判定」；未實測為「未執行」。Synthetic、非空Blob、build/test通過均非主假設成功。
- 主實驗上限90分鐘（含owner操作15分鐘），最多一輪定位修正與重跑；單段60秒資源上限，超限取消。輔助圖工具不占用／延長主實驗、不增加錄影 gate。

## 環境與前置條件

- 本次工程環境：macOS arm64、Node 26.10.0、npm 11.19.1。直接依賴版本沿用E008，E015 lockfile 的 source-map-js 已修補至1.2.2，MOD使用vendor內建WASM compiler；web與MOD strict TypeScript。
- 完整 runtime build 需要 pinned Moddable 9.5.0 source `b6e06ba70506a7381ffb28e09e3175bf4e99f305`、emsdk 5.0.1 `14c18b569f55138fe4963924162244251f454fb0`、fontbm `7677b908523e909679f67cd5c170396bb9def1aa`。請依 E008 README 的相同工具鏈設定 MODDABLE、EMSDK、FONTBM、FONTBM_SOURCE 和 PATH。初次交付時工具鏈未配置，`npm run assets` 曾停止於 `BLOCKED: MODDABLE 9.5.0 is not configured`。2026-10-13 owner 授權後已於本 feature worktree 的 ignored `web/generated/toolchain-verified/` 安裝 pinned sources、完成 `npm run prepare:poc` 並核對 HTTP 與 provenance 雜湊；其後真人操作結果見下節及 evidence。
- 必須在 localhost、支援 MediaRecorder／canvas.captureStream 的瀏覽器，給予 webcam 權限。驗證執行前頁面核對 served runtime provenance 與mc.js/mc.wasm SHA-256；缺失時不要求相機、不使用舊二進位替代。
- 影格為96×96 RGB565LE。錄製source是MOD已確認的host副本，不是MOD encoder。純測試用fake recorder／run／clock，明確屬模擬，不含真人相機證據。

## 重現步驟

只在feature worktree操作。從本實驗 `web/`：

```sh
npm ci
npm test
npm run typecheck
# 設定上述 pinned 工具鏈後才可產生完整 runtime：
npm run prepare:poc
npm run build
npm run dev
```

`npm run mod` 可單獨編譯MOD；不會產生完整simulator runtime。`assets` 先清舊public與provenance，前置失敗不保留可誤用的runtime。`prepare:poc` 依序assets→mod，不能並行。

1. 開啟Vite印出的localhost URL，以無人入鏡的移動色塊／玩具作測試物。頁面只有開始、結束並輸出、取消與最近一段播放器。
2. TC1：開始後等待「錄影中」，移動測試物，約3秒按結束；播放到底，記動作順序、配對digests、錄製時間與ended時間。
3. TC2：換順序錄約8秒，確認只有新段內容，記同樣資料與長度差。開始新段會清前段結果。
4. TC3：錄約3秒取消，確認無影片、tracks ended、250ms計數靜止；TC4：重開約3秒結束回放，沒有取消段。
5. TC5：權限拒絕、Starting取消、快速重複按鈕、camera track中斷，記原因與清理。Finalizing三按鈕停用；「暫停」語意是結束，不支援pause/resume。
6. 在 `evidence/recording-run.md` 逐案寫實際環境、時間、metadata、具名人工觀察及限制；未做項保持pending。不要保存影片、截圖或raw pixels。

工程局部驗證、實際約5.9秒與29.5秒的錄製／完整回放、取消清理及取消後重開輸出已有證據；實際命令見 `evidence/validation.txt`，owner transcript見 `evidence/recording-run.md`。實際異常案例仍待補證；owner已確認動作一致、無舊段／取消段內容，以及取消無輸出。

## 是否成功

- 真人驗證日期：2026-10-13；啟動逾時修正後已有短段39、長段185、取消段19及重開段38個不同有效配對。
- **實驗狀態：無法判定（整體假設尚缺完整案例）。** 短段錄製5.911秒、播放5.754秒、差0.157秒；長段錄製29.473秒、播放29.316秒、頁面誤差0.156秒。回放長度差約23.562秒，符合至少3秒。兩段停止後均在5秒內ready，tracks ended且計數靜止。取消回到idle、tracks ended且計數靜止；重開錄製5.950秒、完整回放5.888015秒、差0.062秒，loaded/error-free且ended=true。owner已確認動作一致、無舊段／取消段及取消無輸出；實際異常仍需補證。
- **本輪可行性驗證任務完成：否。** 工程程式與局部驗證可交Draft PR；實際TC5尚未執行；長段原始零音軌事件已截斷，保留此證據缺口。兩種完成語意分開。

## 結果與證據

- `evidence/validation.txt`：初始red缺少目標實作、局部green tests、strict checks、MOD/web build、runtime前置失敗；工具鏈缺失不是假設失敗。
- `evidence/recording-run.md`：環境、source hashes、owner實測紀錄、人工觀察缺口與待執行案例。
- 頁面驗證資訊只顯示monotonic時間、狀態、配對digest/luma/count、MIME、bytes、track state與回放時間差。影片只在記憶體，開始新段／取消／離頁清除。
- Archify與PR Lens是外部理解工件；Graphify無可用graph時採targeted-source fallback。任何工具PASS都不支持錄影成功。

## 結論與限制

目前支持指定simulator上手動長短錄製、結束、完整回放與清理的已測量部分，以及取消清理與重開輸出；尚不足判斷全部假設。owner已確認動作順序一致、沒有舊段／取消段內容，以及取消當下無輸出。取消後重開段已完整回放，差0.062秒，符合時間判準。下一步是實際TC5；長段原始零音軌事件已截斷，不能憑其他片段補造。保留原始操作範例與實際輸入偏差，不事後改判準。

此為無聲、低解析度、指定simulator／browser的有限實驗；不保證fps、跨瀏覽器、真機或正式採用。Draft PR停在人類審查，不merge、不release。
