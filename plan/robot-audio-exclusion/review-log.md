# robot-audio-exclusion — Review log

## Baseline

Owner 已核可對話計畫並授權 worktree／bounded delivery／topic commit／push／Draft PR，停 human review。此次 repo-visible artifacts 仍需獨立審查，不把先前對話 verdict 當成本次檔案審查證據。

## Initial handoff

- Status: pending independent review。
- Scope: 本 topic 新文件、source report 的事實／推論界線、tracker 與 Written set；production／SDK 無變更。
- Review evidence: 尚未取得，不宣稱 approved。

## Independent review — round 1

- Verdict: needs-rework。
- 唯一 blocker: base-plan tracker Contextual Actions 保留舊 Creator action，未與目前 source plan 的 Independent Reviewer／stage-local action 對齊。
- 修正: tracker 已改為 pending Independent Reviewer — Review bounded source delivery and evidence before topic publication；Creator 完成證據留在 implementation／validation。
- Source report 無新增阻斷；仍待本輪修正後獨立覆核，不能沿用前次對話核可。

## Independent review — round 2

唯一 tracker actor／action blocker 已修正，獨立 Plan-Reviewer 回傳：

```json
{
  "verdict": "approved",
  "blocking_issues": [],
  "copilot_feedback_triage": {
    "ADDRESS": [],
    "DISCUSS": [],
    "SKIP": []
  }
}
```

Scope、來源判讀與 Written set 均無其他 blocker。核可後轉 publish-in-progress，publication 動作保持 pending，未宣稱已 push 或已開 PR。

## Publication handoff

- Source delivery commit: `7d5b6a9180c0381e565ca98fe512ba4536e7153c`；獨立核可後已 push。
- Draft PR: https://github.com/a129924/coami/pull/27；base dev；OPEN／Draft 已 gh 讀回。
- PR Lens 在真實 committed diff 上 local validate／render PASS；Graphify source fallback、Archify final validation 皆已另記證據。
- 後續本 topic commit 只保存 publication／aux evidence 與目前 actor Human Reviewer，不修改已核可來源結論、SDK、inventory 或實驗範圍。
- Human review／merge decision pending；CI 與 review comments 以實際 PR snapshot 為準。保留 branch／worktree，沒有 merge／cleanup 授權。

## Owner-requested human validation

Owner 在 source-only Draft PR 交付後要求真人驗證。新增 E025 的 browser overlap／human listening；官方 pinned CI artifact 取代缺失的本地 compiler，明示 provenance 修訂。原 source-only 結論保留。新 scope 尚待獨立審查，不沿用 source-only verdict 作 TS 實作核可。

## E025 scope review — round 1

needs-rework：canonical 契約仍殘留 source-only 未啟動條件。已把 Inputs／Scope／Locked Decisions／Validation／Open Questions 同步為 owner 明確啟動 E025；舊 Actual 與 stop point 明標歷史，tracker 新增目前 E025 九欄 Planned／Actual，不沿用舊 verdict。

## E025 scope review — round 2

獨立 Plan-Reviewer 已核可同步後的 canonical 契約。

```json
{
  "verdict": "approved",
  "blocking_issues": [],
  "copilot_feedback_triage": {
    "ADDRESS": [],
    "DISCUSS": [],
    "SKIP": []
  }
}
```

此核可只涵蓋人工作業新增 scope／事前判準／provenance；不代替新 TS tests 或真人結果。

## E025 runtime / human result checkpoint — 2026-10-19

Creator依原始事件重算9筆區間均一致；兩方向各至少3筆，非空錄音／成功SDK terminals／自然播放與回放。Owner於對話回報「我剛剛測是都有聽到」。原頁面8筆逐筆欄位未保存，未倒填，整批事後回報分開記錄。依原判準否定互斥假設，詳見E025 evidence/validation.md。

Tests9/9、strict typecheck／build重新通過；bundle-size warning保留。這是Creator檢查與human聽辨，非獨立TS code review verdict。Draft PR需人工作業審查實作、儲存介面限制與證據邊界；不宣稱review-approved或merge gate通過。

## E025 Draft PR handoff

Commit2da7f13已push，Draft PR#27已更新並讀回OPEN／Draft，reviews=[]。原始資料、整批真人回報與逐筆保存缺口均可review；PR Lens新committed diff validate／render PASS。Creator未自行宣稱獨立TS code review核可，交Human Reviewer；停STOP POINT2，不merge。

## Owner final conclusion and scope lock — 2026-10-19

Owner鎖定四點結論並要求Ready for review。Creator補充固定pin XiaoZhi startListening／stopListening／TTS start之uploading與encoder控制的唯讀引用，區分直接record／say反例與對話輪流控制。沒有執行XiaoZhi／真機新實驗，原始human-run／trace保持不變。真機錄放、喇叭回音與插話是獨立後續驗證，不阻擋本PR。此為範圍收斂，不是新增code review核可；Human Reviewer pending，不merge。
