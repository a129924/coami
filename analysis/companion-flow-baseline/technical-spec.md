# Companion flow baseline — 文件執行契約

## Artifact contract

- `docs/product.md`：以簡短章節寫目標、受眾、成功訊號、範圍與延後原則；不包含私人家庭背景。
- `docs/companion-flow.md`：只有一張可渲染的 Mermaid 流程圖，附最少量的職責與證據狀態說明。從文字輸入出發，顯示 Jev Input Policy、程式路由、Companion 情境收集與充分性判斷、回答／追問、Jev Output Policy、程式放行／重新提議／交接、文字輸出及孩子下一輪輸入。Parent／Safety 是交接邊界，語音／裝置是未驗證的外圍邊界。
- `docs/experiments/text-companion-loop.md`：只提出下一個文字輸入／輸出實驗的問題、程序、預期證據與決策標準；所有觀察和結論維持「尚未執行」。

## Conceptual responsibilities

圖中的方塊表示職責，不宣告獨立服務或模型數量。依 [TypeSafe 對 Jev 的公開介紹](https://typesafe.ai/blog/introducing-system-one-models-and-jev)，Jev 是結構化判斷模型，不生成給孩子的句子；程式規則負責路由和輸出放行，LLM 負責擬定回答或追問。這些在 Coami 的適用性都尚未實驗驗證。

「Context sufficient?」指目前資訊是否足以給出合宜回應，不要求收齊圖上每一種可能的 context。記憶來源、判斷閾值、重試次數、資料 schema 和 Parent／Safety 內部處理留待後續實驗，不在本文件鎖定。

## Verification contract

人工檢查 Mermaid 可渲染，且圖文能追蹤四種情境：有足夠情境時回答、資訊不足時追問、Parent／Safety 交接、提議輸出未放行時重新提議或交接。檢查未驗證能力有明確標示，實驗提案沒有宣稱結果，tracked changes 只落在 topic plan 列出的路徑。
