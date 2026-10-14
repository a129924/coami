# E020：SDK 注視俯仰座標換算修正

## 驗證什麼
- 編號 E020；建立前查詢目前 experiments 與所有本地分支歷史，未發現占用。設計／自動驗證日期：2026-10-13；真人驗證日期：2026-10-14。
- 問題：E019「上 → 解除 → 下」目標已設定，但頭部仍抬頭，修正 body-relative 俯仰換算能否恢復重新指定？
- 假設：SDK 負 pitch 表示抬頭；既有逆轉換再取負號，使已抬頭的 Robot 把向下目標視為零俯仰誤差。一行符號修正可恢復上下重新指定，且不改變 lookAway 語意。

## 為什麼
- Owner 已明確選擇「另開 SDK 修正 topic」，允許獨立 feature worktree 的隔離 runtime patch 與重跑 WASM／真人驗證。
- 原失敗證據保存在 [E019 PR #19](https://github.com/a129924/coami/pull/19)，包括 commit 2af26dc 的 human-retry.json 與 pitch-diagnostic。
- SDK pin：b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322。來源：`firmware/host/modules/util/stackchan-util.ts:202–227`、`modules/motion/motion-controller.ts`、`app/runtime-ui.ts:157`。
- 唯讀與離線診斷可定位換算錯誤，但不能證明實際 WASM 及可見效果，故建立獨立實驗。通過後仍交 human review 決定採用，不更新 vendor pin 或正式裝置程式。

## 成功與失敗判準
- 執行 WASM 前固定：上下兩種「注視 → 解除 → 反向注視」皆產生新的相反俯仰命令，真人確認整個螢幕面的方向；每種重做兩次。中間不插入 prepare。
- 控制器、共享眼神路徑、已對齊目標不重複轉動、水平切換／小角度門檻、解除清除目標但不回正等回歸需通過。
- 失敗：修正版仍未產生相反旋轉，或任一既有語意被破壞。無法判定：runtime 身分或真人觀察不足；單純 build/test 通過不等於假設成立。
- 上限：一個最小 patch、一次完整 fresh WASM 建置與必要局部修補；若需擴充 SDK 契約、改動其他演算法或硬體即停下回報 scope gap。

## 環境與前置條件
- 新 worktree：`/private/tmp/coami-e020-sdk-gaze-pitch`，分支 `fix/andrew/sdk-gaze-pitch`，base dev b67c423；dev worktree 不實作。
- Simulator-only；預設目標公尺：左 [.5,.5,0]、右 [.5,-.5,0]、上 [.5,0,.5]、下 [.5,0,-.5]；Robot 視角 +X 前、+Y 左、+Z 上。
- Node 26.10.0、npm 11.19.1，strict TS 7.0.2、Vite 8.2.1、Three .185.1；工具鏈 pin 與 SHA 由 prepare-assets 驗證，沿用 E019 已驗證 compiler 安裝流程。
- web/mod 操作與證據收集器自 E019 commit 2af26dc 複用並改為 E020 ID；只改隔離 source 的 pitch 符號，camera 維持正面同高。
- 純測試使用真 SDK helper/controller/runtime-ui；timer、driver、UI 和未用到的 SpeechBalloon 為替身。這些不構成實際 WASM 證據。

## 重現步驟
1. `cd experiments/E020-sdk-gaze-pitch/web; npm ci --ignore-scripts`。
2. `npm run test:original` 對原版應失敗（red）；`npm run source && npm run test:patched` 對實際 patched copy 應通過。patch 位於 `patches/body-relative-pitch.patch`。
3. 依 `scripts/install-compiler.mjs` 安裝驗證過的 compiler，配置 MODDABLE、EMSDK、EM_CONFIG、FONTBM_SOURCE、FONTBM 和 PATH，再 `npm run prepare:poc`。既有工具可複製到本 worktree generated/toolchain，但必須重新通過完整性檢查；cache 放 generated/em-cache。
4. `npm test && npm run test:scripts && npm run typecheck && npm run build`；`npm exec -- vite preview --host 127.0.0.1 --port 5200 --strictPort`。
5. 開 localhost:5200，填觀察者並準備零姿勢；依判準執行雙向切換，每次等待窗口並核對穩定。解除僅記未確認，不把保留姿勢當失敗；匯出本次 JSON 與畫面。
6. 記錄 automation、真人判定各自的結果；不得把操作者寫為真人或代填真人 PASS。

## 是否成功
- 實驗狀態：無法判定（新 host／mesh／MOD 完整核對 gate 下的真人驗收尚未執行）。歷史真人觀察為 4/4 PASS，但該 run 沒有 host attestation，不能據後來的 staged host hashes 追溯證明其 renderer 來源。
- Review 修正與證據判讀完成；原版 red／patched green、fresh WASM 與歷史真人雙向各兩次的紀錄保留。完整來源已核對的新 gate 真人驗收未執行，正式採用仍受此證據缺口限制。

## 結果與證據
- `evidence/red.txt`：原版 6 測試中 4 fail／2 pass；`evidence/green.txt`：實際 patched source 6 pass。
- 原測試 fixture 的 Position 曾誤寫成陣列，更正為 SDK `{x,y,z}` 後重跑 red/green；目前保存的是更正後結果。
- `scripts/prepare-source.mjs` 驗證 vendor clean/pin、原 helper SHA，對 copied source 套用 reviewed patch，核對完整結果恰為一行替換並輸出 patch／before／after SHA。
- `scripts/prepare-assets.mjs` 保留全部工具鏈驗證；runtime provenance 納入 sdkPatch；網頁檢查 patch 與 patched helper 雜湊後才啟動。
- fresh WASM 建置完成，見 build-runtime.txt 與 runtime-provenance.json；首次 prepare:poc 的 MOD 階段因 npm 依賴缺失失敗，重新依 lockfile 安裝後 build-mod.txt 與 build-web.txt 通過。
- 文字執行 log 僅移除行尾空白與檔尾空行，未改結果。
- `evidence/runtime-automated.json`：真 WASM #1 上 −45°、#2 解除無轉動、#3 下 +45°、#4 解除無轉動、#5 上 −45°；每次窗口內一條旋轉。所有 automation 觀察標未確認；不是人類判定。
- 首次頁面操作因說明文字更新而 reload，未匯出完整 JSON；最終保存的是重跑 run E020-2026-10-13T08-59-09-576Z，三張 wasm 畫面皆屬此 run。
- 2026-10-14 Andrew 完成真人驗證，run `E020-2026-10-14T02-19-22-568Z`。`evidence/human-final.json` 保存原始匯出，`evidence/human-run.md` 關聯逐項判定；`evidence/human-final.png` 是 #10 最終畫面。

## 結論與限制
- 原版 red、修正版 green 與相同 WASM／MOD 產物支持換算修正；歷史真人曾觀察雙向各兩次符合。然而舊 run 的 host 來源未留 attestation，新 gate 下的完整可見驗收仍待執行，不宣稱後來的 host hashes 可補證舊 renderer。
- lookAt 同步返回不代表完成；lookAway 清目標，不承諾回正／急停。SDK 門檻與運動策略維持原樣。
- 未測實機、roll、動態追蹤或 production。E019 失敗證據與 vendor checkout 保持不變；正式採用交 human review。

## Topic 交付與審查狀態（2026-10-14）

- [PR #19](https://github.com/a129924/coami/pull/19) 保存原版 SDK 的失敗重現、追加重測與診斷；[PR #20](https://github.com/a129924/coami/pull/20) 保存隔離修正與成功驗證。兩份結論各自適用原 runtime，不互相覆寫。
- E020 純測試、共享 runtime-ui 回歸、strict typecheck、MOD／WASM／web build、自動 WASM 與真人雙向各兩次均已記錄。僅最後真人畫面有截圖，完整逐步動畫未保存，限制見 `evidence/human-run.md`。
- 兩個 PR 都以 dev 為 base，E020 已複用所需操作器，沒有程式上的合併先後依賴；建議先審 #19 問題證據，再審 #20 修正與回歸。
- 本 topic 的實作與驗證完成，兩個 PR 送 Ready for review。Ready 不等於 reviewer 核准、合併或正式採用；仍待 human review／owner 決策，不自動修改 vendor pin、production、硬體或執行 release。

## PR comment review and fix（2026-10-14）

Review 的建置來源、殘留產物、啟動錯誤處理已修正，逐項說明與驗證見 [review-fixes](evidence/review-fixes.md)。重新以 clean-built pinned 工具與清空後 cache 建置，runtime JS／WASM／MOD 雜湊與原驗證產物完全相同；原實驗結論與真人證據保留。

## PR comment review and fix：第二輪（2026-10-14）

三項新增建議已採納：fontbm clean source build、受控 Emscripten config／環境、staged simulator host 雜湊核對。詳見 [review2-fixes](evidence/review2-fixes.md)。prepare:poc 不再信任輸入的 EM_CONFIG 或 compiler path overrides；FONTBM_SOURCE 必須提供 pinned checkout，FONTBM 若提供則必須指向其 build/fontbm。網頁 build/dev 需先準備 generated host，staged source 不符固定 hashes 即拒絕。實際重建與負向測試完成，executable artifacts 與原匯出相同；目前 staged host bytes 對應 pinned commit，但舊真人 run 沒有 host attestation，不能追溯證明其 renderer。

2026-10-14 第三輪 review 校正：前述「成功／驗證完成」為當時判讀，現在以「是否成功」與 review3-fixes 的限定結論為準；歷史 4/4 觀察保留，不能回溯成為新 host gate 的驗收證據。

## PR comment review and fix：第三輪（2026-10-14）

Python interpreter、served mesh、reviewed MOD sources/archive 驗證及 trace／watchdog scope 已修正，見 [review3-fixes](evidence/review3-fixes.md)。舊 run 缺少 host attestation，無法用後來的 staged host hashes 補證；歷史觀察保留，新 gate 真人驗收未執行。E020 的完整來源可驗收結論已限縮，採用仍交 human review。

## PR comment review and fix：第四輪（2026-10-14）

固定 executable runtime、完整 Python install tree、harness source pins 與 production bundle hashes，並限制解除操作只能記錄未確認。重現流程包含 scripts regression suite；逐項決定、驗證與未執行項見 [review4-fixes](evidence/review4-fixes.md)。舊真人紀錄不會因新增 attestation 而改判。

## PR comment review and fix：第五輪（2026-10-14）

正式重現改用 build 後的 preview，提供具 bundle attestation 的 dist；埠占用時直接失敗。本輪僅文件修正，舊人工證據限制保留。程序、證據與未執行項見 [review5-fixes](evidence/review5-fixes.md)。
