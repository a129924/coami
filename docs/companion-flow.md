# Companion 對話流程（概念基線）

這張圖描述預期職責與交接，不表示已實作或已決定要拆成圖中數量的模型、服務。實線是本次要為下一個文字實驗提出的決策鏈；虛線是未驗證的長期產品接入邊界。

```mermaid
flowchart TD
    Voice["孩子語音／裝置<br/>未驗證的未來接入"] -.-> Input["文字輸入"]
    Input --> InputJev["Input Policy · Jev<br/>結構化分流判斷"]
    InputJev --> InputRules{"程式路由規則"}
    InputRules -->|Companion| Collector["Context Collector<br/>近期對話／活動／情境／相關記憶候選"]
    InputRules -->|Parent| Parent["Parent 交接"]
    InputRules -->|Safety| Safety["Safety 交接"]
    Collector --> Context["Context LLM 職責<br/>整理情境並判斷是否足以回應"]
    Context --> Sufficient{"足以合宜回應？"}
    Sufficient -->|是| Answer["Companion LLM 職責<br/>擬定簡短回答"]
    Sufficient -->|否| Question["Context LLM 職責<br/>擬定簡短追問"]
    Answer --> Proposed["提議輸出：回答或問題"]
    Question --> Proposed
    Proposed --> OutputJev["Output Policy · Jev<br/>結構化輸出判斷"]
    OutputJev --> OutputRules{"程式放行規則"}
    OutputRules -->|放行| TextOut["文字回應"]
    OutputRules -->|重新提議| Revise["LLM 重新提議文字<br/>重試策略待實驗"]
    Revise --> Proposed
    OutputRules -->|交接| Parent
    OutputRules -->|安全交接| Safety
    TextOut -.-> Spoken["機器人語音／動作<br/>未驗證的未來接入"]
    TextOut --> Child["孩子收到回答或問題"]
    Spoken -.-> Child
    Child -->|下一輪輸入| Input
```

Jev 的定位參考 [TypeSafe 的公開介紹](https://typesafe.ai/blog/introducing-system-one-models-and-jev)：它給出結構化判斷，不生成給孩子的句子。圖中由程式規則決定路由與放行，LLM 擬定文字。這是待驗證的 Coami 設計假設，不是模型效果或安全性的保證。

「情境足夠」表示足以給出當下合宜的回應，不表示必須有所有可能的記憶資料。Parent／Safety 方塊只代表交接；觸發閾值、交接後流程、重新提議上限及故障處理均未在本基線定案。下一步的驗證方式見[文字對話實驗提案](experiments/text-companion-loop.md)。

交接的最小可觀察結果是記下目的地和原因，並停止 Companion 的一般回答。需要照顧者決定的要求（例如購買）交給 Parent，不能由 Coami 先作承諾；疑似受傷或危險的輸入交給 Safety，不能當成一般遊戲對話。孩子與照顧者實際收到什麼提示，仍須由各自的後續流程驗證。
