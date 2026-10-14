# E019 補充診斷：俯仰角相對座標符號

## 驗證什麼

日期2026-10-13。問題：依SDK pitch正向向下的約定，修正writeBodyRelativeVector3的pitch符號，能否在離線controller中修復上下再指定並避免持續重複同角度命令？假設：將`-bodyRotation.p`改為`bodyRotation.p`後，對齊目標回到body-forward，反向目標正確超過門檻。

## 為什麼

真人#24及單次重測#28均仍抬頭、沒有新的向下rotation。SDK的pitch=-atan2(z,xy距離)，目前相對座標卻用相反符號。來源為pinned Stack-chan b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322，stackchan-util.ts SHA256 d28ad77de7fa759d82167062d67da17f07db422e94b45c8fedc7b6a4b724a141。此helper也被runtime-ui用於眼神換算，不能直接正式採用。需以真實controller的相同測試比較原版與候選，支持是否進入隔離WASM修正實驗。

## 成功與失敗判準

執行前設定4項：自身yaw/pitch對齊目標換成正前方；上→解除→下及反向皆送新rotation；已到同pitch目標不重複發相同rotation；水平再指定及小角度門檻維持。候選全成立為此離線假設成功；前置齊備而任一不成立為失敗；無法載入真實source或證據缺失為無法判定。投入限一組原版／候選比較，不進行WASM或SDK寫入。

## 環境與前置條件

Node26.10.0，真實pinned controller及util；Timer、motion driver及mac-address為fake。候選僅於Node load hook記憶體替換一行；vendor、SDK checkout、runtime二進位皆未改。候選patch另存供review，不視為已套用。source版本與hash如上；git status確認vendor乾淨。

## 重現步驟

在E019 feature worktree根目錄執行：

```sh
node --test experiments/E019-static-gaze/evidence/pitch-diagnostic/pitch.test.mjs
PITCH_DIAGNOSTIC=candidate node --test experiments/E019-static-gaze/evidence/pitch-diagnostic/pitch.test.mjs
```

第一個命令預期exit1，第二個預期exit0；輸出分別保存original.txt與candidate.txt。測試直接載入pinned source，候選只改相對pitch符號。

## 是否成功

**離線診斷狀態：成功。** 原版3 FAIL／1 PASS；候選4 PASS／0 FAIL。**本輪離線診斷任務完成：是。** 僅支持此候選修正的controller／座標契約，不表示修正後WASM、真人或正式SDK已驗證。原E019整體FAIL不變。

## 結果與證據

original.txt、candidate.txt為實際輸出；candidate.patch為唯一候選差異。上→解除→下、下→解除→上均經相同測試比較。此為fake driver／timer，不是實機或新WASM證據。原重測JSON見../human-retry.json，使用者指定下載檔與該副本完全一致，SHA256 0705fcae03c5f96f0ec012874b7728c02329a987bf2549e9317f3e29b57b1299。

## 結論與限制

建議另開SDK修正topic，在隔離runtime副本套用候選patch，補共享眼神路徑回歸、重建WASM並真人驗證兩個上下切換方向；不改lookAway為回正、不關閉30度門檻。原E019明列SDK修改out-of-scope，目前只交付有界診斷，等待owner選擇是否擴大修正範圍，不直接套用vendor或正式採用。
