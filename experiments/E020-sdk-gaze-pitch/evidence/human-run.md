# E020 真人驗證：PASS

- 日期：2026-10-14（Asia/Taipei）；操作者／視覺判定者：Andrew。
- Run：`E020-2026-10-14T02-19-22-568Z`，localhost:5200；implementation commit `a5abe683a5ab90686fdbcc7412f5f944f7ade992`。
- 原始匯出：`human-final.json`，與 Downloads 同名 run 檔案逐位元組複製；SHA256 `76f0025c140c0c6dab48d0e32bf132bfaac923a1552af47f4a9fcef6dc0b8b81`。
- 核對 JSON 的 sdkPatch、操作順序、每個 look 的唯一 driver rotation、人工判定、解除無新旋轉及中間無 prepare；全部符合。沒有改寫原始 JSON。
- 觀察整個黑色螢幕面的轉向，不以眼睛圖案位置判定。相同預設座標：上 `[.5,0,.5]`、下 `[.5,0,-.5]` 公尺。

| 操作 | 實際 driver pitch | 人工結果／對話回報 |
|---|---|---|
| #1 prepare | 0 | 符合；「直立朝前」 |
| #2 上 | −π/4 | 符合；「有抬頭」 |
| #3 解除 | 無新旋轉 | 未確認；清除語意見契約測試 |
| #4 下 | +π/4 | 符合；「有從抬頭轉成低頭」 |
| #5 解除 | 無新旋轉 | 未確認 |
| #6 上 | −π/4 | 符合；「有從低頭轉成抬頭」 |
| #7 解除 | 無新旋轉 | 未確認 |
| #8 下 | +π/4 | 符合；「第二輪兩個方向都符合」 |
| #9 解除 | 無新旋轉 | 未確認 |
| #10 上 | −π/4 | 符合；「第二輪兩個方向都符合」 |

## 判讀

- 上 → 解除 → 下：#2→#3→#4 與 #6→#7→#8，2/2 PASS。
- 下 → 解除 → 上：#4→#5→#6 與 #8→#9→#10，2/2 PASS。
- #1 之後沒有執行 prepare；trace 中曾選到 prepare 選項，但沒有呼叫它。這不是以回正繞過重新指定。
- 所有 look 均有 begin／returned／window-ended 與同 seq 的單次相反 pitch 命令；沒有把同步返回稱為動作完成。
- 四次 lookAway 的觀察保持未確認；清除目標由真 controller 契約測試支持，不用畫面不動證明清除。

## 證據邊界與決策

真人視覺判定來自使用者回報與使用者在頁面的紀錄。`human-final.png` 僅為 #10 已判定後的最終畫面，未取得逐步錄影或每個操作的截圖；不可把單張畫面當完整動畫證據。自動驗證另見 runtime-automated.json 與 red/green 測試，不混稱真人測試。

歷史真人觀察在本 run 為 4/4 PASS；此 run 未保留 host attestation 與當時的 web bundle，因此完整 pinned-host 來源無法追溯確認，新 gate 真人驗收仍未執行。提交 PR #20 供 human review。E019 原失敗結論不回寫為 PASS。vendor pin、正式 SDK、production 與硬體未採用或驗證。
