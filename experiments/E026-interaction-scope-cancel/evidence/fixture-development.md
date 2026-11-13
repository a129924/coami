# Fixture 開發紀錄

- 原始 WebSocket 前置錯誤無 Action 執行；已補固定 transport 依賴。
- 第一筆實際 Action 失敗與唯一效果修正保留於 round-2；final source 的正常矩陣另存 round-final。
- 開啟窗口最初 fixture 假定必然 quarantine，但實際快速清理成功並 restartable；此假定錯誤不是產品失敗。下一個 fixture 的 URL glob 漏掉 WASM query 參數，未到 gate。初次 fixture failure JSON 被下一次同名 fixture attempt 覆寫，不能據其宣稱首次完整 trace 已保留；僅第二次檔案仍在 faults/。
- 最終使用 URL pathname predicate，明確 hold 第二次 WASM fetch 超過固定期限；三次結果保存於 faults/opening-gated-1/。
- helper 改用全新 run 目錄並拒絕重用，避免再覆寫；production source 沒有為這些 fixture 假定／路徑修正而改動。
- reconstructed audio source snapshot 明標不是 pre-run served-source attestation。
