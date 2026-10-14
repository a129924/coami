# E019 PR comment review and fix：第五輪（2026-10-14）

問題：canonical 重現流程在 production build 後卻啟動 dev server，與正式驗收需要 bundle attestation 的程序不一致。

決定：兩份 README 均改為 `npm exec -- vite preview --host 127.0.0.1 --port 5199 --strictPort`。preview 提供 dist 內的 production bundle 與 harness-provenance.json；strictPort 避免埠被既有 dev server 占用時默默改埠。保留開發功能，但正式重現入口使用 preview。

驗證：以已安裝 Vite 的 `preview --help` 核對命令與 strictPort 選項（見 E019 evidence/review5-preview-help.txt）。本輪未啟動新的 browser 操作或真人驗收，不宣稱新 run 的 production bundle 已由真人觀察。

## E019 smoke 前置條件

- 問題：prepare 被排除於 analyzer，缺少 zero-rotation dispatch 仍可繼續方向取樣；clear/reassign 只等待固定窗口，不能證明先前 motion 已穩定。
- 決定：analyzeDispatches 包含 prepare，沿用 Ledger 要求 synchronous zero-angle trace；smoke 在準備窗口後、下一次 look 前檢查，不符合即中止。最終統計明示 directionAttempts，避免把嘗試次數當有效樣本數。
- 新 readyForReassignment 依 trace 次序識別最新 motion 的 matching dispatch，再要求該旋轉後出現 torque-off；clear 必須已同步 returned，且之後沒有新的 torque-on / rotation。較早操作的 torque-off 不能充當本次證據，MotionController error 會拒絕。clear 後、select/apply 第二個目標前等待此條件，10 秒內無證據即 FAIL。這是 pinned simulator 的保守 driver 證據，不宣稱 lookAway 本身停住／回正或提供完成 callback；人工視覺核對仍另列。
- live smoke 只使用現有 readonly 事件面板；若最近 120 行不足以包含 operation 起點，條件無法成立即 timeout，不補造穩定證據。
- Red：review5-red.txt 為缺少 stability helper export；加入 helper 後 review5-red-prepare.txt 明確重現 prepare 未被判失敗（actual 0 / expected 1）。Green：22 項 unit、10 項 scripts、4 項 controller contract 通過，strict typecheck 與 production build 通過。另以 node --check 驗證 runtime-smoke.mjs 語法。沒有更改 runtime／MOD／browser harness，無需重建 WASM。
- review5-historical-replay.json 僅離線重算保留的 runtime-automated.json：#24 down 缺少 dispatch 仍 FAIL；#19 與 #23 clear 的先前 motion 在舊 trace 具有 torque-off。這不代表執行過本輪新版 browser smoke。
- 原始歷史 JSON／PNG 不修改；新增文字 logs 僅正規化行尾空白。
