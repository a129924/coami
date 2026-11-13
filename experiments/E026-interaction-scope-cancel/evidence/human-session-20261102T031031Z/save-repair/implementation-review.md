# 局部保存修正檢查（主 agent 自查，非獨立 reviewer）

- 保存按鈕改用 EvidenceSaver 的獨立錯誤回報，實際 scope controller／audio／MOD／Server owner 不變。
- 每段在原上限內；metadata／records 在送出前序列化。相同未 ACK 段保留原 body 重試，已 ACK cursor 不回退或越過未確認紀錄。
- EvidenceStore append 後才記憶 receipt；重啟可從 JSONL 讀回已接受段。相同段不同 body 拒絕，漏段／範圍錯誤拒絕，同時請求序列化。
- 保存時新增 records 留在下一次；重試先補完原 pending，再保存當次 target 前的新紀錄。兩次同時點擊共享同一個 flight。
- UI 顯示錯誤原因；成功保存不呼叫 Scope 解除隔離，也不填寫 human confirmed。Scope 真正控制錯誤的 guarded／quarantine 邏輯保持原樣。
- 既有 legacy harness JSONL append 保持可用；本次新 envelope 帶 save identity/range，chunk 數不可當作真人重複數。
- 已執行 39 個 TS 測試、strict build、實際 HTTP Unicode／限額／same-origin／重送測試及原始完整 rescue trace 的 6 段 roundtrip。沒有因本修正重跑 Python 或 39 個歷史 Action browser 案例。
- 限制：磁碟／作業系統故障的 crash durability 不作額外保證；不完整或損壞的既有 JSONL 會明確報錯。單筆資料本身超過上限會保留未保存並回報，不切壞一筆 record 或靜默丟棄。實際修正後的真人招呼與保存流程仍待測。
