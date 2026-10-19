# Robot Listening／Saying：SDK 互斥來源驗證

## Inputs

- Accepted baseline: owner 核可的 source-first 對話計畫；2026-10-19 授權 create-feature-worktree → bounded delivery → topic commit → push → Draft PR → human review。不 merge。
- Topic: `robot-audio-exclusion`；payload label: `ts-implementation`，僅條件式實驗；selected `step_profile=base-plan`，不是新 profile。
- Base: `93a1a7d62d739a2e936d4fa43d993683e4a02f46`；SDK: `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`。
- Selector: `topic=robot-audio-exclusion; branch=chore/andrew/robot-audio-exclusion; managed-path-intent=/private/tmp/coami-robot-audio-exclusion-worktree; primary-worktree=false`。
- Optional analysis-layer warning: `analysis/robot-audio-exclusion/requirements.md` 與 `technical-spec.md` 缺少；analysis completeness 為 INCOMPLETE，以已接受對話計畫為 baseline，非 SDK 證據 blocker。

## Goal / Outcome

驗證固定 pin 的 stock simulator SDK 是否為 `audio.record()`（Listening）與 `audio.say()`（Saying）提供交叉互斥判斷。交付來源報告、版本證據與本機檢視圖，供後續 Robot State 定義引用。

## Scope

| Label | Contract |
| --- | --- |
| In-Scope | 指定 runtime → WASM → stock browser Host 來源核對；有具體、來源無法消除且影響 SDK 判斷的疑點才進原定最小實驗。 |
| Out-Of-Scope | 真機、ASR、remoteSession、production、全庫調查；單純為取得 browser 實際重疊證據擴大任務。 |
| ReadOnly | vendor、既有 experiments、server/src、device/src、治理、skills、工具／既有設定及 graph。 |
| Written | 下列新 topic plan、tracker、來源報告、review-log 與 evidence；限定外部 Archify／PR Lens 產物。來源報告由外部輸出同時保存為 repo-visible 文件，以承載本次已授權 topic commit；未新增實驗或能力。 |
| Deleted | 無；不刪既有檔案、branch 或 worktree。 |
| Modify | 只修訂本 topic 新增工件；不改既有 baseline。 |
| Goal | 可追溯的 SDK 互斥結論供原決策使用。 |
| Non-Goal | 定義 Robot State、state machine、修 SDK 或加互斥 guard。 |
| TestCase | TC-SOURCE 必做；TC-AUX 依真實產物；TC-TS 僅 fallback 觸發，否則未啟動／未適用。 |

Tracker 另記九欄 Actual 與 evidence，不以複製 Planned 作完成證據。

## Locked Decisions

1. 保留上述語義、pin、stock WASM stackchan-voice TTS、Host 與 source-first 範圍。沒有 existing public API／type／consumer 變更。
2. 已查來源未發現 record／say 交叉 guard；不將此表述成瀏覽器實際並行、所有版本或真機的保證。來源足夠就完成本輪。
3. `ts-implementation` 僅條件式 payload；未有具體 source-unresolved 疑點不啟動、不占 E025，不為填 README 而實驗。
4. 若 fallback 真正必要，先記疑點，再重查編號（E025 預定但未保留）。fresh pinned runtime／MOD、stock bridge、被動觀測同時鐘與 ID，不保存音訊、不加共用 busy guard。
5. Fallback 固定 2 個單項基線及 record→say／say→record 各 3 個有效案例，record 5 秒、已知日文重複句。依真正 capture 及 AudioContext 排程／前進時鐘／source 區間判讀，分段聯集不補空隙；Promise／start 呼叫本身不是區間證據。無重疊且控制可歸因 SDK 才支持假設；一次完整有效重疊且錄音非空可否定；權限／裝置／窗口／歸因不足則無法判定。
6. Fallback 準備最多 60 分鐘、單案例 30 秒、未撞窗口最多重試一次；需改 SDK 或擴能力時停止並回報。若真的觸發，先補齊精確 Written paths 與審查，不在本來源交付偷偷加入程式。
7. 本 topic 無 stable-library surface、release、VERSION 或 README 變更。保留 branch／worktree，停 human review。

## Boundaries / Exclusions

來源、圖示驗收與動態行為分開。E007／E018 只作背景，E018 自有 busy guard／strict bridge 不作 SDK 證據。

- Graphify: pinned 0.9.73；每次 CLI 設 `GRAPHIFY_NO_AUTO_REFRESH=1`。無可用 graph 採 rg／source fallback，不 build／extract／refresh／provider／install；有 graph 才核版本、budget≤1500 bounded query、重要關係回 source。
- Archify: 一張靜態 sequence，只畫來源路徑，不畫 Robot State。繁中作者內容，Viewer UI／HTML language 回退英文；showcase 9/9、0 errors/warnings、deliver hashes、四 desktop visual-check 與人工明暗視覺檢查。外部檔不傳 repo-root；不啟 preview／server。
- PR Lens: pinned 0.11.0；只有實際 diff 才製圖，真實 commit IDs、unchanged neighbors、file refs；外部 local validate／render。既存 config 若有才讀，不修改；不上傳／發布，不用 PR Lens CLI 做 GitHub 操作。
- 輔助工具失敗如實記錄，不代替或推翻已成立的來源事實。

## Status / Allowed Transitions

- **Current**: `pr-open`
- **Next actor**: `Human Reviewer`
- **Stage-local action**: Review Draft PR #27 and decide whether changes may be merged.
- **Execution model**: 已接受對話計畫 → feature worktree → bounded source delivery → independent review → bounded topic commit／push／Draft PR → human review。不 merge。
- **Allowed transitions**: planned -> creator-in-progress; creator-in-progress -> review-ready; review-ready -> reviewer-in-progress; reviewer-in-progress -> approved | needs-rework; needs-rework -> creator-in-progress; approved -> creator-in-progress | publish-in-progress; publish-in-progress -> pr-open | merged; pr-open -> needs-rework | merged; merged -> terminal。
- Owner 本輪明確授權直接 topic commit／push／Draft PR；不重複請求已給予的批准。仍須查 staged diff、語義 commit 與真實檢查證據。

## Artifact Paths

| Exact path | Owner |
| --- | --- |
| `plan/robot-audio-exclusion/robot-audio-exclusion.plan.md` | Creator |
| `plan/robot-audio-exclusion/robot-audio-exclusion.step.md` | Creator／Main Agent |
| `plan/robot-audio-exclusion/source-report.md` | Creator |
| `plan/robot-audio-exclusion/evidence/source-inventory.json` | Creator |
| `plan/robot-audio-exclusion/evidence/validation.md` | Creator／Main Agent |
| `plan/robot-audio-exclusion/review-log.md` | Independent Reviewer／Main Agent |

External-only roots：`/private/tmp/coami-robot-audio-exclusion/archify/` 的 `sdk-audio-sequence.json`、`sdk-audio-sequence.html`、`validate.json`、`delivery.json`、`visual-check.json` 與 receipt 指定 sidecars；`/private/tmp/coami-robot-audio-exclusion/pr-lens/` 的 `graph.json`、`validate.json`、`render.json`、`rendered/manifest.json` 與 manifest 指定 SVG。外部同 root `source-report.md`、`pr-body.md`、`publication.json` 為來源報告副本及 GitHub 交付記錄。Root README／VERSION／.github／.codex／其他 experiments 不變。新增範圍外變更先回報。

## Implementation Steps

- [X] 1. 核對 fixed SDK path 與 committed bytes，完成來源報告及 SHA-256 inventory。
- [X] 2. 記錄來源充分性、TC-SOURCE、未啟動 TC-TS 與 Graphify fallback 的實際證據。
- [X] 3. 完成 Archify sequence 的結構／交付／四尺寸及人工視覺驗收；如失敗分別記限制。
- [X] 4. 驗證 Written set、文件連結及 tracker 一致性，完成 PR Lens bounded diff 準備；其真實 commit provenance 驗收交由 publication 階段完成。

## Validation / Acceptance Checks

- TC-SOURCE-01: gitlink／SDK pin 一致；inventory 每個檔案 hash 與 `git show` 內容一致，來源固定 commit URL 與行號可追溯。
- TC-SOURCE-02: manifest／compose／public capability／runtime／WASM／native／engine／Host 連結完整；區分 TTS 重入、webRadio guard、teardown 與 record／say 交叉互斥。
- TC-SOURCE-03: 結論不超出 source 證據；動態重疊、真機未驗證；TC-TS 未啟動且不偽標成功。
- TC-AUX-01: Graphify version／graph availability 與 fallback 如實記錄；不 build／refresh。
- TC-AUX-02: Archify receipt 的 bytes/hash、9/9、containment 四尺寸、人工明暗檢查與限制一致。
- TC-AUX-03: PR Lens actual diff／commit IDs、unchanged SDK neighbors、file refs、validate／render／manifest；外部工件不隨 PR 上傳。
- TC-DOC-01: canonical plan sections、base-plan tracker／Implementation Steps mirror、九欄 Planned／Actual、相對連結與 inventory hashes；`git diff --check`。本輪不新增低價值 source-mirroring tests，不執行與文件變更無關的 TS build 或 production tests。
- TC-WRITTEN-01: topic 唯一非 primary worktree；所有 tracked 新檔只在 Artifact Paths；dev HEAD／tracked tree unchanged。Commit 後再以真實 base/head 更新 PR Lens，不編造 provenance。

## Reviewer Handoff

2026-10-19 本次 repo-visible artifacts 經獨立審查 round 2 核可；詳 review-log.md。這不是 browser 動態驗證。

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

## Post-merge / release actions

無 release、VERSION、tag、deploy 或 production adoption；terminal at merged。本次只開 Draft PR 至 human review，不 merge、不做 merge 後同步、不刪 branch／worktree。Cleanup／merge 後作業需新授權。

## Open Questions / Unresolved Items

沒有未決產品設計；browser 實際重疊、其他 provider 與真機均明確未驗證。Optional analysis layer 缺漏為具名 soft fail，不阻擋此已授權 bounded source-only 驗證。獨立審查已 approved；來源交付已 push，Draft PR #27 已開啟且 PR Lens committed-diff 驗收通過。等待 human review；CI 狀態另以實際 PR head 讀回，不預先宣稱通過。
