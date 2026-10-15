# E022 Context Sufficiency 門檻研究

來源 run：`20261008T035450Z-010364d7`；commit：`a855b451b6fe1c24d02caf67c569ffa90a9ea732`。

研究候選：79%；research 假設：成功；驗證任務完成：是。

排序：最少採用 I→S → 最多保留正確 → 最低整數百分比。比較 probabilities[raw choice] >= k/100；confidence 不參與，BLOCK 不改 raw accuracy。

| Group | N | Raw correct | Adopted | Retained correct | Rejected correct | Adopted I→S | Adopted S→I |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| research | 40 | 35/40 | 24/40 | 24/35 | 11/35 | 0/17 | 0/23 |
| holdout | 20 | 17/20 | 13/20 | 13/17 | 4/17 | 0/8 | 0/12 |
| v0 | 15 | 14/15 | 12/15 | 12/14 | 2/14 | 0/10 | 0/5 |

完整 101 點取捨與各項分母見 research-summary.json；逐案決策及來源 hashes 見相應 JSONL。無候選時 research 表僅為診斷性最優點。

## 全部原始 I→S 案例

| Group | Case | Raw choice probability | Fixed-point result |
| --- | --- | ---: | --- |
| research | cs_v1_016 | 0.78 | BLOCK |
| research | cs_v1_031 | 0.53 | BLOCK |
| research | cs_v1_053 | 0.51 | BLOCK |
| holdout | cs_v1_040 | 0.65 | BLOCK |
| v0 | toy_car_ambiguous_001 | 0.73 | BLOCK |

## 被拒絕的原本正確判斷

- research/cs_v1_003: SUFFICIENT, p=0.71 → BLOCK
- research/cs_v1_011: INSUFFICIENT, p=0.67 → BLOCK
- research/cs_v1_012: INSUFFICIENT, p=0.65 → BLOCK
- research/cs_v1_013: INSUFFICIENT, p=0.62 → BLOCK
- research/cs_v1_021: SUFFICIENT, p=0.66 → BLOCK
- research/cs_v1_032: INSUFFICIENT, p=0.63 → BLOCK
- research/cs_v1_033: INSUFFICIENT, p=0.64 → BLOCK
- research/cs_v1_035: INSUFFICIENT, p=0.6 → BLOCK
- research/cs_v1_044: SUFFICIENT, p=0.63 → BLOCK
- research/cs_v1_051: INSUFFICIENT, p=0.52 → BLOCK
- research/cs_v1_052: SUFFICIENT, p=0.67 → BLOCK
- holdout/cs_v1_009: SUFFICIENT, p=0.51 → BLOCK
- holdout/cs_v1_019: INSUFFICIENT, p=0.66 → BLOCK
- holdout/cs_v1_039: INSUFFICIENT, p=0.68 → BLOCK
- holdout/cs_v1_057: INSUFFICIENT, p=0.55 → BLOCK
- v0/food_clear_001: SUFFICIENT, p=0.78 → BLOCK
- v0/toy_car_irrelevant_001: INSUFFICIENT, p=0.77 → BLOCK

## 限制與 Owner 決策

公開 holdout，非 unseen/blind；有限樣本與未校準機率不構成安全或產品採納證明。

樣本僅 research 40、holdout 20、v0 15。結果不能外推 Input／Output Policy 或其他情境；零觀察誤採用不是安全達標。Owner 尚須決定產品可接受的誤採用風險與候選採納，產品設定未修改。

holdout 僅是候選固定後的一次描述性檢查，未用來選值；同候選重播是輸出一致性驗證。工具圖／測試通過不核准產品採用。
