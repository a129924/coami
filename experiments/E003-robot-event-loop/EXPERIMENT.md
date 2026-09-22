# E003：Robot 事件到 bridge，再到 Server 與動作

## 問題
Stack-chan simulator 的 A 按鍵事件能否經 runtime Context、MOD trace 到達 browser bridge？若可行，Server 能否根據最小事件摘要回傳可見招呼並收到結果？

## 程序
第一階段依 `README.md` 啟動 simulator，只按一次 A，保存同次操作的 Host.Button、MOD trace、bridge 接收與 release 證據。第一階段不連 Server、不觸發招呼。獨立 Reviewer 確認第一階段證據後，才可開始第二階段。

## Stage 1 狀態
PASS（2026-09-22）。Tester 在獨立 Chrome run 重現同一次 A → Host.Button A → MOD trace → bridge 接收，release 後仍為一筆；獨立 Reviewer 確認證據足夠且無 blocker。Stage 2 可依計畫啟動。

## Stage 1 證據
同次 A 操作與 release、MOD trace、bridge 接收及建置證據見 [phase-1-event-bridge.md](evidence/phase-1-event-bridge.md)。

## 決定
Stage 1 已達成，證據見 [phase-1-event-bridge.md](evidence/phase-1-event-bridge.md)。獨立 Reviewer verdict：approved；無需 TS mock。未擷取 network trace；第一階段無 Server transport 由 source inspection 與未啟動 Server 的程序證明。若阻斷，記環境、重現步驟、預期／實際訊號、錯誤與阻斷位置，停止並交 owner 決定是否改走 TS mock。


## Stage 2 狀態
PASS（2026-09-22）。獨立 Tester 重現完整迴路、無 C→A 回圈與 B 中斷；獨立 Reviewer 判定 approved、無 blocking issue。完整實測見 [phase-2-full-loop.md](evidence/phase-2-full-loop.md)，執行中畫面見 [phase-2-greet.png](evidence/phase-2-greet.png)。

## Stage 2 結果
一次 A 事件 `666bce09-0f89-4f46-a53b-38fa8f1e0913` 經 Server 固定規則產生命令 `74e3fce7-29d5-4b3b-894d-9ce8c7367200`，bridge 以 C 執行，MOD 回報 `completed`，GET 查得同一 event/command ID 與 `completed`。另一次 A 在 B 中斷後查得 `cancelled`。Python 3 測試通過，Ruff、Pyright、TS typecheck、MOD archive 與 Vite build 通過。Stage 1 可用 `/?stage=1` 獨立重做。

## 限制
目前證據只涵蓋 browser simulator；未驗證實機網路、真實伺服馬達、多設備、持久化或對話情境。可見動作沿用 E001 的笑臉和點頭；本次新增的判斷為固定規則。

## 最終決定
Stage 1 與 Stage 2 simulator 驗證通過；本次不啟用 TS mock，也不把 POC 移入 production src。若 B 的回中立姿勢動作本身失敗，現有 MOD 會回 stop failed，greet 可能暫留 pending；此為 Reviewer 記錄的非阻斷限制，後續 topic 再評估。
