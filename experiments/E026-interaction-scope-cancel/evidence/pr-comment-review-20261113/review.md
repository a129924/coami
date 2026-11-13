# PR #30 comment review and fix

兩個未解決 P2 均接受並修正；沒有略過的 actionable inline thread。Copilot quota 訊息不是程式建議或 inline thread，不變造可 resolve 的 thread。

1. `4559481297`：斷線先隔離並清 queue，再至多一次啟動既有本機 stop dependency。已由 cancel 啟動者不重啟；成功、失敗、pending 與遲到 ACK 均不解除隔離。開新 Scope 重設 stop ownership。記錄 requested／effects-stopped／settled／failed，不把 cleanup callback 當作重新開放依據。
2. `4559481304`：Message 的 work-only validator 拒絕 omitted／empty id，沿既有 ValidationError handler 回 rejected invalid-envelope。其他控制訊息仍允許省略 id，E025 core 保持 byte-identical。

驗證：53 TS tests、16 Server tests、strict build、Ruff／Pyright 均通過；先前 red 證據與修正前來源保留。新增 6 個實際 simulator WebSocket close 案例，TTS／greet 各 3 次，保持原 1000／5000 ms、0.02 rad、300 ms／2000 ms 判準；效果停止、SDK 排空、AudioContext closed、MOD invalidation、queue 丟棄、B Ping 與持續隔離均有證據。

此次自動 browser 版本另錄在 disconnect-final/result.json，並非真人 Chrome 環境；全部 human=unobserved。既有真人觀察不重做、不改寫為在本修正 commit 上新增通過。此為主 agent bounded review／修正，不宣稱獨立 reviewer gate 或實機保證。

threads-before.json 保存原建議。推送後在原 threads 以 commit 與測試證據回覆，再 resolve，最終狀態以 GitHub thread readback 為準。本次不 merge 或部署。
