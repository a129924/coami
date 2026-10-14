# E019 simulator 與人工驗證

日期：2026-10-13。實作commit：`ec22a4a`。run ID：`E019-2026-10-13T07-37-02-670Z`。

**整體實驗狀態：失敗。** 固定再次指定判準已被真實WASM操作否定；純測試與characterization通過不改變此結論。

| 項目 | 狀態 | 證據／限制 |
|---|---|---|
| 11項純測試 | PASS | validation.txt；fake capability/trace |
| 4項真實 pinned controller 契約／限制characterization | PASS | 真實source，fake Timer/driver；含上下轉換限制重現，非WASM成功 |
| strict web/MOD typecheck | PASS | validation.txt |
| MOD archive / web build | PASS | validation.txt |
| fresh pinned runtime build | PASS | runtime-provenance.json；原固定工具鏈SHA維持 |
| simulator 載入 | PASS | runtime-automated.json；Chrome實際WASM，零page exceptions |
| 自動四方向各兩次 | PASS（driver角度） | 8個樣本從獨立正面準備開始；automated-方向-次數.png含run ID/seq；不是人工PASS |
| 左→解除→右 | PASS（driver路徑） | #18左、#19解除、#20右；人工視覺未執行 |
| 上→解除→下 | FAIL | #22上、#23解除、#24下；#24接受目標但無新driver rotation；automated-final.png仍向上 |
| v1自動run的人工欄位 | 未執行 | 所有自動觀察維持未確認；不回改成真人PASS |

## 執行與重現

1. `npm run prepare:poc`：PASS；fresh unmodified pinned runtime。官方archive與工具鏈驗證見toolchain-validation.md。
2. `npm run dev -- --port 5199`：localhost server。
3. `node scripts/runtime-smoke.mjs`：預期驗收判準實際失敗，exit 1；完整輸出見runtime-smoke.txt。最終report `status=FAIL`，唯一記錄failure為seq24/down/no driver rotation。
4. Browser為隔離headless Chrome（版本見JSON），使用真實UI與WASM；8個四方向樣本及2組解除／再次指定，共24項MOD操作。未使用直接網頁模型旋轉或注視替代setPose。
5. 首輪亦重現seq24失敗，保留runtime-first-transcript.json與runtime-first-failure.txt。第二輪只補畫面run/seq標示及完整失敗report保存，不修改SDK或固定判準。

## v2 真人驗證（完成）

觀察者Andrew；實作commit `5ef0fcf`；run ID `E019-2026-10-13T07-53-36-719Z`。僅改E019鏡頭及顯示區，不改SDK、目標或驗收判準。詳細逐案紀錄見human-run.md，完整原始匯出見human-final.json。

| 真人案例 | 方向判定／結果 | 操作序號與限制 |
|---|---|---|
| Robot左兩次 | 符合 2/2 | #2、#4，各有獨立零姿勢準備與SDK trace |
| Robot右兩次 | 符合 2/2 | #6、#8，同上 |
| 上兩次 | 符合 2/2 | #10、#12，同上；窗口後仍重複發送同一向上rotation |
| 下兩次 | 符合 2/2 | #14、#16，同上；窗口後仍重複發送同一向下rotation |
| 左→解除→右 | 符合 | #18→#19→#20，中間無prepare/setPose；解除只記返回 |
| 上→解除→下 | FAIL | #22→#23→#24，中間無prepare/setPose；#24正常返回但無applyRotation，Andrew回報仍抬頭 |

真人操作與判定完成，整體實驗仍失敗。8個原始同次真人畫面檔未完整保存，不能宣稱全部證據驗收完成；此缺口不改變由真實trace與真人判定共同支持的垂直再指定失敗。本輪不要求重做已否定的實驗，SDK修正交另行scope決策。

## 判讀與停點

- `lookAway()`清除gaze point有真實controller契約測試；simulator本次呼叫另有seq23返回紀錄。畫面不動不作為清除證據。
- SDK新目標設定與可見運動分離；seq24正常返回沒有冒充成功，頁面保留方向待確認。
- Scope Gap與有界來源推論見scope-gap.md。
- Owner已選擇保留失敗結論並交付Draft PR human review。不修改SDK，不merge、不release、不production採用。
