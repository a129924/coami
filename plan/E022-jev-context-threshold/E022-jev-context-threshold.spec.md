# E022 — Context Sufficiency Threshold Specification

## Acceptance Criteria

1. Source revision/run/case version 全部鎖定；75 案以 isolated local clone 的原 authenticated committed verifier 驗證；canonical path、sys.prefix、SDK inventory 不放寬。任何 gaps 都阻斷正式候選。
2. research 40 案只使用 probabilities[raw choice]，對 k=0..100 Python float k/100 原值 >= 重播；不 rounding／epsilon／Decimal／confidence，raw correctness 不變，拒絕為 BLOCK。
3. 依 accepted I→S 最少、retained correct 最多、同效用最低門檻排序；最優點 retained correct=0 時 candidate=null，只給診斷點，不放寬排序。
4. research 假設成功須較0% baseline嚴格減少 accepted I→S且保留至少一個 correct；完整但不成立為失敗（baseline zero註無降低空間），缺證據為無法判定。這與候選可用性／任務完成否分開。
5. candidate freeze 先於 holdout 門檻分析，exclusive不可覆寫，綁 source revision/run/hashes、integrity及research artifacts hashes、實際執行analysis source SHA-256、UTC、排序與候選理由；不能只記base HEAD。
6. holdout20／v0 15只查同一固定候選、分組報告，無candidate則skip；不以holdout調值、不得稱unseen/blind、不設hypothesis或安全gate。相同候選重播允許且不覆寫歷史。
7. 各案包含group/run/case/oracle/raw choice/probability/hash/threshold/adoption/raw correctness/error direction。各組counts、分母與zero=null依plan Requirements；所有I→S及拒絕correct列可追溯。
8. report／八段README列有限樣本、公開保留組、非校準機率與拒絕correct成本，不外推Input/Output Policy或其他情境，不把zero observed false adoption稱安全達標／產品採納。
9. 僅feature worktree的新topic路徑與明列external環境/tool paths可寫；既有E012/E013/evaluation/contracts/runtime/config唯讀。freeze與研究檢查歷史不可刪改，僅tool-owned暫存和sidecars有受控清理例外。
10. 三工具沿plan限定交付：Archify showcase9/9與deliver/SHA/bytes、四viewport及真實visual review；PRLens真bounded diff provenance或directdiff fallback；Graphify無圖targetedsource fallback，不build/refresh。工具缺口不改研究判準，不虛稱輔助完成。
11. unittest／Ruff／source verifier與固定候選重播證據分開；無credential/Jev/provider呼叫。完成獨立review後direct topic commits/push/DraftPR停Owner humanreview；不merge/release/產品採納。

## Behavioral Scenarios

### 完整來源與候選
- Given pinned source/run的75案驗證零gaps，research-only入口可用。
- When 比較101點並依鎖定順序選最優點。
- Then 保存全部research決策與統計，retained correct>0才輸出可用candidate，並在任何holdout門檻分析前exclusive freeze。

### 固定候選的描述性檢查
- Given freeze與source／integrity／research／實際analysis source hashes全部吻合。
- When check-heldout重新核對完整source inventory／integrity／research summary及decisions／analysis source hashes，並由research重算候選確認freeze一致。
- Then 僅對固定候選重播holdout／v0，分開報raw模型正誤與adoption結果，不給安全通過分數，不事後選新值。

### 無可用候選
- Given 鎖定排序的最優點沒有保留任何原本正確choice。
- When research結束。
- Then candidate=null，診斷性最優點明標非建議，check-heldout記skip，不用其他排序找可用值。

### Baseline 已無 I→S
- Given research raw baseline的I→S為0且來源完整。
- When 判讀主要假設及候選。
- Then 明示無可降低空間，主要假設不成立；可用候選仍依retained correct條件分開判定，不誤記無法判定或產品安全通過。

### 來源或環境不足
- Given 缺raw／case／hash不符或原SDK inventory無法重現。
- When verify-source／後續入口嘗試前置檢查。
- Then 非零退出、保留gaps／environmentblocked與缺證據，不以subset選正式候選，不改verifiercontract。

### 工具缺口
- Given Graphify無可用圖、PRLensschema不能表達實際diff或Archifycapture失敗。
- When 產輔助交付。
- Then 依plansource／directdiff fallback並如實記工具缺口；未完成的圖／視覺審查不稱passed，不重選研究門檻。

## Error / Edge Cases

- p等於門檻採用；剛低／剛高、0%／100%、float binary邊界保持原值>=，confidence不能改決策。
- I→S、S→I、正確採用、正確拒絕、錯誤拒絕分開，BLOCK不改raw accuracy。
- 同accepted I→S先比較retained correct；同效用選最低k；全拒絕／只採錯誤是candidate=null。
- 零分母為null；N/V/A/rawcorrect/label分母明列，不將missing／invalid算correct。
- research可逐列掃mixed analysis.jsonl但只處理research decision，不開holdout/v0 raw body；合成測試變更其probabilities/correctness不影響research選值；freeze缺失／hash變動／source revision變動／analysis source變動或freeze候選與research重算不一致阻斷holdout。
- existing freeze／研究檢查歷史不可覆寫；同候選驗證用外部scratch，不冒稱重新調值或新independentholdout。
- isolated clone不是worktree/shared/hardlinkedobjects；必須完整history供原runrevision驗證；原repo E013不得sync，缺runtime／lockedbytes屬environmentblocked。
- tool temp／sidecar清理不得刪研究歷史；OS temp例外僅toolowned，不放寬全repo；未提交diff無真headcommit不得自造schema provenance。
