# E026 實驗契約

僅限本實驗，非正式 Robot／Server protocol。Browser bridge 擁有雙方清理屏障；Robot 擁有本機效果與 SDK 工作，Server 擁有受管理 synthetic 工作。

## 識別與 wire

Token 為 immutable `{runEpoch, robotId, scopeId}`；Operation 再加 `cancelId`。同一 Scope 的重複取消沿用第一個 Operation 與 t0。所有業務命令、結果及 callback 保留原 Token，不重新標記。

- `open {token}` → `opened {token}`；已開 Scope 即使尚無工作，也須取消成功後才能開下一個。
- `work {token,id,mode}` → `accepted/rejected/result {token,id}`。mode 是本機 fixture：blocked、quick、cleanup_hold、cleanup_timeout、cleanup_error。
- `cancel {operation}` → `server-cleaned {operation,okay}`，僅證明 Server 清理。
- `ping` → `pong`，不排入業務 queue。
- `release {key}` 僅為本機 fixture gate，不是業務或產品控制 API。

Server 未採用新 EventBus。`server/e025_core.py` 是 E025 原始碼逐字快照，保留其 managed TaskGroup、generation 與 writer 邊界。新 envelope 不讓 Robot 依賴 Python 或 FastAPI internals。

## 取消與重新開始

1. Robot 接受取消的 browser monotonic time 為 t0；同步失效舊 Scope、丟棄 queue，開始本機停止並通知 Server。
2. TTS source 必須收到實際 ended；disconnect 與 stop request 不是完成證據。等待 owned decode/play 排空後才 await AudioContext.close，避免 Chrome 關閉 render thread 後不送 ended。
3. 招呼阻止後續步驟、回中立。採實際 rendered driverRotation，各軸 ≤0.02 rad，1 秒內完成 300ms 穩定，再觀察 2 秒。
4. stop ≤1 秒；Robot cleaned（含 SDK drain／觀察尾段）及 Server ACK 收到均 ≤5 秒。不能跨程序相減時鐘。
5. 雙方完成才 restartable；任一失敗／超時／必要斷線均隔離，晚到 ACK 不解鎖。故障注入也遵守同一 runtime 規則。
6. 新 Scope 使用新 Token、新 AudioContext 及新 simulator instance。舊 Host audio port 固定綁舊 adapter；舊 SDK 工作排空後才 dispose 舊 instance，不把遲到播放導向新 Scope。

opening 每個 async stage 前後查 token；取消後停止後續初始化，排空並 dispose 本次資源。底層 fetch／WASM startup 並無通用 abort 能力；不能在 5 秒內證明清理時保持隔離，不能宣稱所有 startup races 均成功。

## 結論

成功須有全部適用案例、真人聽辨與畫面觀察。自動化完成不等於整體成功；無觀察或矩陣缺項為無法判定。預期故障正確隔離可通過該故障案例。
