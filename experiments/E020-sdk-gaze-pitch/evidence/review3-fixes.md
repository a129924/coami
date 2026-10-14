# PR comment review and fix — round 3 (2026-10-14)

## 修正

- Python：核對 pinned emsdk manifest 的官方 Python 3.13.3 arm64 套件，固定 interpreter SHA256 與 python3→bin/python3.13 的 realpath；在 emcc 執行前拒絕不符檔案。受控 wrapper 使用已核對的 COAMI_PYTHON，provenance 記錄 path／digest。見 review3-python-attestation.txt。
- Mesh：shell.stl 納入固定 host-pin 與 runtime asset hashes。Vite startup/build/HMR 同時驗證 served mesh bytes 與其 provenance；browser 啟動時也 fetch/hash served bytes 並對照固定 pin。
- MOD：mod-pin.json 固定 reviewed mod.ts／gaze-control.ts 與可重現 archive 的 hashes。build-mod 在 SDK import／compile 前驗證來源；Vite 拒絕本地 source edits、舊或偽造來源 provenance、非固定 archive；browser 也比對固定 sources／archive pin，不能僅靠 self-reported hash。
- Driver evidence：只接受本次 begin→returned 之間、yaw/pitch/roll 全部符合本次目標的 dispatch；prepare 只接受零姿勢，away 不接受 rotation 作確認。錯方向、NaN、post-return polling／延遲 trace 不會放行「符合」。這是保守 evidence gate，不宣稱 SDK 完成；不能確認就保留未確認。
- Reply watchdog：每 send 重新 arm／取消舊 timer、收到回覆 acknowledge；token 使已排程舊 callback 不能誤判新 pending send。fatal 亦取消 reply timer。
- Operation watchdog：序號仍需對應 current busy operation，另檢查 ledger.blocked，已有具體 fatal 時不再寫 generic timeout。
- E019 README：typecheck 移到 prepare:poc 之後，先建立 ignored staged host 再型別檢查。scripts tests 也須在工具／runtime 已準備後執行。

## 證據與限制

- review3-red.txt／review3-python-red.txt：新增 gate／延遲 trace／interpreter 替換測試先失敗。review3-green.txt 與 review3-unit.txt／review3-scripts.txt／review3-contract.txt：修正後通過。E019 為 19 unit、9 script、4 contract；E020 為 19 unit、8 script、6 contract。
- review3-build.txt：加入 Python path/digest gate、mesh provenance、fixed MOD source gate 後完整 prepare:poc 成功；review3-runtime-provenance.json／review3-mod-provenance.json 保留來源。
- review3-mesh-rejection.txt：真 Vite build 在 served mesh 暫時被改時拒絕；finally 還原原 bytes，review3-web-build.txt 為還原後成功。fixture 另測 current MOD source edits、偽造 mp.sources 與 mesh drift 的拒絕。
- 本輪沒有重新做真人驗收。WASM／JS／MOD bytes 相同比對只證明 executable artifacts 相同，不證明舊 run 的 host 或 mesh。human-final.json 未含 host attestation，舊 web bundle 未保存；後來取得的 pinned host hashes 不能追溯證明舊 renderer。
- E020 歷史人工 4/4 PASS 是當時觀察；完整新 gate 下真人驗收未執行，現在將整體來源可驗收結論限定為無法判定。README、human-run.md、review2-fixes.md 與 PR 描述更正這一點，保留原始 JSON／截圖不改。review 要求可選 rerun 或 qualify，本輪採 qualify，不冒稱已 rerun。
- E019 原 SDK 缺陷仍由原版 controller characterization／離線診斷支持，失敗結論保留；其歷史視覺證據也不追溯補證。
- 新 gate 的 browser code 有型別／建置與單元證據，未宣稱這次重新操作畫面或看過新動畫。Vite bundle-size warning 保留。

## Threads

- discussion_r4266448674 reviewed MOD authentication
- discussion_r4266448680 historical-host qualification
- discussion_r4266448684 per-send timeout
- discussion_r4266448688 blocked operation watchdog
