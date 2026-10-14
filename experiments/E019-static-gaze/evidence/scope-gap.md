# E019：上 → 解除 → 下無新旋轉

## 觀察事實

2026-10-13，真實 pinned WASM simulator 自動操作：

- 從正面準備後，四方向各兩次取得SDK預期 yaw/pitch ±π/4；自動紀錄全部標「未確認」，未冒充人工判定。
- 左 → lookAway → 右取得新的向右 driver rotation。
- 上 → lookAway → 下：lookAway 呼叫返回；新的下目標 begin／returned／window-ended 齊備，但同序號沒有 applyRotation；畫面保留向上姿勢。
- 第一次run：#22上、#23解除、#24下；#24無driver trace。完整原始匯出見runtime-first-transcript.json，固定驗收assert失敗見runtime-first-failure.txt。
- pinned controller 契約測試可重現：上目標applyRotation後解除gazePoint為null，再指定下目標時gazePoint正確更新，但moves計數仍為1。這是已知限制的characterization PASS，不是再次指定成功。

## 有界來源推論

在body pitch=-π/4時，`writeBodyRelativeVector3`對下目標[.5,0,-.5]得到相對z約0，`writeRotationFromVector3`算出的相對pitch約0，未超過controller門檻，因此不送出新的向下rotation。來源為pinned `stackchan-util.ts:211`與`motion-controller.ts:194`。這支持相對pitch換算／門檻路徑的限制定位，沒有修改算法或推論實機精度。

## 決策

- 固定再次指定判準被否定，實驗狀態記「失敗」。
- Owner已選「保留失敗結論，完成commit／push／Draft PR，交human review」。
- 不插入額外setPose讓「解除→再次指定」改判成功；setPose仍只用在獨立起始準備。
- 後續v2真人四方向各兩次判定已完成且8/8符合；真人上→解除→下也重現失敗。原始同次真人畫面檔未完整保存，保留證據限制，不聲稱全部Acceptance Criteria通過。
- SDK修正不在E019範圍，交owner另立工作或接受此限制；此PR不merge、不production升級。

## 真人重現

Andrew於v2 run E019-2026-10-13T07-53-36-719Z完成#22上、#23解除、#24下；#24 begin/returned/window-ended完整但無applyRotation，2154339ms判定不符合，口頭回報「仍抬頭」。詳見human-final.json與human-run.md。原SDK失敗結論維持。

## 後續處置（2026-10-14）

Owner 已授權另立 SDK 修正 topic E020；[PR #20](https://github.com/a129924/coami/pull/20) 的隔離 runtime 修正完成控制器／共享眼神回歸、fresh WASM 與真人雙向各兩次驗證。原 scope gap 已有有界修正證據，但 E019 原版仍失敗；E020 未更新正式 SDK 或 vendor pin。

E019 [PR #19](https://github.com/a129924/coami/pull/19) 作為失敗實驗與證據紀錄送 Ready for review，並非宣稱原驗收通過。兩個 PR 都保留，交 human review 決定是否合併實驗紀錄；正式採用另作決策。
