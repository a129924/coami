# E027 human runs

Actual: 未執行。TTS A/B 與六筆成人案例均未開始。無音訊聽辨或 browser native runtime 成功聲明。

## 2026-10-19 continuation

先前的 native runtime blocker 已解除：原 pin 工具鏈建置成功，browser 實際核對 mc.js／mc.wasm／MOD hash，MOD installed／ready 且 TTS 按鈕解鎖。這僅是啟動證據，不是完整 native exchange／SDK-A05 播放證據。

本機 shell 僅將 ignored server/.env 注入 loopback Server process，未顯示／記錄 key；OpenAPI HTTP200 不驗證金鑰。未修改 Server env 載入行為，.env.example 保持空值。Server 尚無 budget ledger，本次已接受操作=0、provider HTTP=0，未 reset ledger。

Owner 回覆「稍後再做真人驗證」，因此未播放 A/B、未錄音、未呼叫 provider。TTS01/02、V01–06、live 播放失敗與 pending reload：**未執行**；真人聽辨／key與鎖定模型存取：**未驗證**。所有模型、timeout、上限及驗收保持原樣，S4／正式 implementation-review 不通過。

voice-trace.jsonl 的新增內容是有來源標記的本機 HTTP／browser AX 觀察。自動化 download-event 等待逾時，完整 browser trace 匯出尚未確認，不以手寫觀察冒充自動匯出檔。
