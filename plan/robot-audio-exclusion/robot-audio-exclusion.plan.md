# Robot Listening／Saying：SDK 互斥來源驗證

## Inputs

- Accepted baseline: owner 核可的 source-first 對話計畫；2026-10-19 授權 create-feature-worktree → bounded delivery → topic commit → push → Draft PR → human review。不 merge。
- Topic: `robot-audio-exclusion`；payload label: `ts-implementation`，owner 後續要求已啟動 E025 真人驗證；selected `step_profile=base-plan`，不是新 profile。
- Base: `93a1a7d62d739a2e936d4fa43d993683e4a02f46`；SDK: `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`。
- Selector: `topic=robot-audio-exclusion; branch=chore/andrew/robot-audio-exclusion; managed-path-intent=/private/tmp/coami-robot-audio-exclusion-worktree; primary-worktree=false`。
- Optional analysis-layer warning: `analysis/robot-audio-exclusion/requirements.md` 與 `technical-spec.md` 缺少；analysis completeness 為 INCOMPLETE，以已接受對話計畫為 baseline，非 SDK 證據 blocker。

## Goal / Outcome

驗證固定 pin 的 stock simulator 直接 audio API 是否為 `audio.record()`（Listening）與 `audio.say()`（Saying）提供交叉互斥判斷。交付來源報告、版本證據與本機檢視圖；owner 後續要求啟動 E025 browser 動態與真人聽辨，供後續 Robot State 定義引用。

## Scope

| Label | Contract |
| --- | --- |
| In-Scope | 來源階段已完成；owner 後續明確要求真人驗證，新增 E025 stock simulator 的兩方向錄放觀測與真人聽辨。 |
| Out-Of-Scope | 真機、ASR、remoteSession、production、全庫調查與 SDK／bridge 行為修改。 |
| ReadOnly | vendor、既有 experiments、server/src、device/src、治理、skills、工具／既有設定及 graph。 |
| Written | 下列 topic plan、tracker、來源報告、review-log 與 evidence；新增 E025 指定工件；限定外部 Archify／PR Lens 產物。來源報告由外部輸出同時保存為 repo-visible 文件，以承載已授權 topic commit；現在新增 E025 實驗，沒有 production 能力變更。 |
| Deleted | 無；不刪既有檔案、branch 或 worktree。 |
| Modify | 只修訂本 topic 新增工件；不改既有 baseline。 |
| Goal | 可追溯的 SDK 互斥結論供原決策使用。 |
| Non-Goal | 定義 Robot State、state machine、修 SDK 或加互斥 guard。 |
| TestCase | TC-SOURCE 已完成歷史；TC-AUX 分層；本輪 TC-TS harness／build 與真人案例明確啟動，不因來源充分而省略。 |

Tracker 另記九欄 Actual 與 evidence，不以複製 Planned 作完成證據。

## Locked Decisions

1. 保留上述語義、pin、stock WASM stackchan-voice TTS、Host 與 source-first 範圍。沒有 existing public API／type／consumer 變更。
2. 已查來源未發現 record／say 交叉 guard；不將此表述成瀏覽器實際並行、所有版本或真機的保證。來源足夠已完成原 source-only 階段；新增真人階段另依動態／human 證據判定。
3. source-only 階段已完成；owner 後續明確要求真人驗證，現啟動 E025 的 `ts-implementation` payload。這是新增動態目標，不倒填原來源結論。
4. owner 真人要求已明確啟動 E025；編號已查未占用，先固定判準再執行。使用經官方 metadata／archive digest 核對的同 pin CI runtime 與本次新 MOD、stock bridge、被動觀測同時鐘與 ID；不保存音訊、不加共用 busy guard。
5. E025 固定 2 個單項基線及 record→say／say→record 各 3 個有效案例，record 5 秒、已知日文重複句。依真正 capture 及 AudioContext 排程／前進時鐘／source 區間判讀，分段聯集不補空隙；Promise／start 呼叫本身不是區間證據。無重疊且控制可歸因 SDK 才支持假設；一次完整有效重疊且錄音非空可否定；權限／裝置／窗口／歸因不足則無法判定。
6. E025 準備最多 60 分鐘、單案例 30 秒、未撞窗口最多重試一次；需改 SDK 或擴能力時停止並回報。本輪 Written paths 已明列；新 scope 先獨立審查，再實作及交真人執行。
7. 本 topic 無 stable-library surface、release、VERSION 或 root README 變更。保留 branch／worktree，停 human review。

## Boundaries / Exclusions

來源、圖示驗收與動態行為分開。E007／E018 只作背景，E018 自有 busy guard／strict bridge 不作 SDK 證據。

- Graphify: pinned 0.9.73；每次 CLI 設 `GRAPHIFY_NO_AUTO_REFRESH=1`。無可用 graph 採 rg／source fallback，不 build／extract／refresh／provider／install；有 graph 才核版本、budget≤1500 bounded query、重要關係回 source。
- Archify: 一張靜態 sequence，只畫來源路徑，不畫 Robot State。繁中作者內容，Viewer UI／HTML language 回退英文；showcase 9/9、0 errors/warnings、deliver hashes、四 desktop visual-check 與人工明暗視覺檢查。外部檔不傳 repo-root；不啟 preview／server。
- PR Lens: pinned 0.11.0；只有實際 diff 才製圖，真實 commit IDs、unchanged neighbors、file refs；外部 local validate／render。既存 config 若有才讀，不修改；不上傳／發布，不用 PR Lens CLI 做 GitHub 操作。
- 輔助工具失敗如實記錄，不代替或推翻已成立的來源事實。

## Status / Allowed Transitions

- **Current**: `review-ready`
- **Next actor**: `Human Reviewer`
- **Stage-local action**: Review E025 implementation, original runtime metadata, aggregate human confirmation and per-trial save limitation; no independent TS approval is claimed.
- **Execution model**: 原來源階段已至 Draft PR #27；owner 新增真人要求 → scope 修訂獨立審查 → E025 TS harness／檢查 → independent review → human-check → 記錄真人結果。不 merge，不在真人未回報前 commit 假結果。
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

| `experiments/E025-listening-saying-exclusion/README.md` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/mod/mod.ts` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/mod/host.d.ts` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/mod/tsconfig.json` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/web/.gitignore` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/web/index.html` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/web/package.json` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/web/package-lock.json` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/web/tsconfig.json` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/web/vite.config.ts` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/web/scripts/prepare-assets.mjs` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/web/scripts/build-mod.mjs` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/web/src/main.ts` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/web/src/style.css` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/web/src/observed-audio.ts` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/web/src/overlap.ts` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/web/src/overlap.test.ts` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/web/src/mod.test.ts` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/evidence/runtime-provenance.json` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/evidence/validation.md` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/evidence/human-run.md` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/evidence/trace.jsonl` | Creator／Tester |
| `experiments/E025-listening-saying-exclusion/evidence/official-artifact.json` | Creator／Tester |

External-only roots：`/private/tmp/coami-robot-audio-exclusion/archify/` 的 `sdk-audio-sequence.json`、`sdk-audio-sequence.html`、`validate.json`、`delivery.json`、`visual-check.json` 與 receipt 指定 sidecars；`/private/tmp/coami-robot-audio-exclusion/pr-lens/` 的 `graph.json`、`validate.json`、`render.json`、`rendered/manifest.json` 與 manifest 指定 SVG。外部同 root `source-report.md`、`pr-body.md`、`publication.json` 為來源報告副本及 GitHub 交付記錄。Root README／VERSION／.github／.codex／除 E025 外其他 experiments 不變。新增範圍外變更先回報。

## Implementation Steps

- [X] 1. 核對 fixed SDK path 與 committed bytes，完成來源報告及 SHA-256 inventory。
- [X] 2. 記錄來源充分性、TC-SOURCE、未啟動 TC-TS 與 Graphify fallback 的實際證據。
- [X] 3. 完成 Archify sequence 的結構／交付／四尺寸及人工視覺驗收；如失敗分別記限制。
- [X] 4. 驗證 Written set、文件連結及 tracker 一致性，完成 PR Lens bounded diff 準備；其真實 commit provenance 驗收交由 publication 階段完成。

- [X] 5. 記錄 owner 真人驗證修訂與事前判準，核驗官方同 pin runtime archive／metadata 並新建 MOD。
- [X] 6. 先撰寫 failing behavior tests，再實作無跨錄放 guard 的 MOD、被動觀測、interval 判讀與真人操作頁。
- [X] 7. 完成受影響 pure tests、strict typecheck／build 及不冒充真人的 browser smoke，記錄 actual evidence。
- [X] 8. 完成可重現啟動方式、served-bytes provenance、真人程序與未執行結果表，交人工作業確認。

- [X] 9. 依真人實際保存的 metadata／聽辨與 interval 證據判讀 E025，寫回結果與限制並更新 Draft PR 交接。

## Validation / Acceptance Checks

- TC-SOURCE-01: gitlink／SDK pin 一致；inventory 每個檔案 hash 與 `git show` 內容一致，來源固定 commit URL 與行號可追溯。
- TC-SOURCE-02: manifest／compose／public capability／runtime／WASM／native／engine／Host 連結完整；區分 TTS 重入、webRadio guard、teardown 與 record／say 交叉互斥。
- TC-SOURCE-03: 原 source-only 結論維持歷史，不能倒填為 dynamic PASS；本輪 TC-TS 明確啟動，真人／runtime 結果另判，真機始終未驗證。
- TC-AUX-01: Graphify version／graph availability 與 fallback 如實記錄；不 build／refresh。
- TC-AUX-02: Archify receipt 的 bytes/hash、9/9、containment 四尺寸、人工明暗檢查與限制一致。
- TC-AUX-03: PR Lens actual diff／commit IDs、unchanged SDK neighbors、file refs、validate／render／manifest；外部工件不隨 PR 上傳。
- TC-DOC-01: canonical plan sections、base-plan tracker／Implementation Steps mirror、九欄 Planned／Actual、相對連結與 inventory hashes；`git diff --check`。本輪以 E025 pure behavior tests／strict typecheck／build 驗證新 TS，仍不新增 source-mirroring tests 或執行無關 production tests。
- TC-WRITTEN-01: topic 唯一非 primary worktree；所有 tracked 新檔只在 Artifact Paths；dev HEAD／tracked tree unchanged。Commit 後再以真實 base/head 更新 PR Lens，不編造 provenance。

## Reviewer Handoff

原來源階段與 E025 scope 修訂分別審查；E025 scope round 2 已獨立 approved。這是 planning scope verdict，非 TS 正確性或真人 runtime 判定。

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

沒有未決產品設計。原 source-only 階段已核可／push 至 Draft PR #27，該停點為歷史。現在 E025 真人任務已啟動；新 scope review 已核可；harness／automated readiness及真人執行已完成；E025兩順序共9筆均有有效重疊與自然回放，owner另於對話整批確認都有聽到。原逐筆聽辨8筆未保存的缺口保留；不能沿用舊source-only approved當作本輪TS code review通過。其他 provider／真機不在本輪。Optional analysis 缺漏仍為具名 soft fail；CI 依實際 PR head 觀察。

## Owner-requested human-validation revision — 2026-10-19

Owner 隨後明確要求「可以真人驗證」，新增 browser 真實錄放與真人聽辨，不是來源有未解疑點。原 source-only 結論保留為已完成歷史；Locked Decisions 3 的「未要求動態不啟動」現在由此明示要求解除。PR #27 原有 source-only 文件不冒充新實驗結果。

- Goal / In-Scope: E025 固定 pin stock simulator，單項錄音／TTS 基線及 capture→say、say→record 各三案例；真人聽辨與有效 interval 證據分開。
- Non-Goal / Out-Of-Scope: 仍無真機、ASR、remoteSession、production、SDK 修正、狀態機或互斥政策。
- ReadOnly: 所有既有實驗、vendor、治理、skills、工具配置；不修改 dev worktree。
- Written / Modify: 本 topic 計畫／tracker／review-log／source-report 的 follow-up note；新增 E025 README、evidence、MOD 與 web harness，僅修訂本 topic 新工件。
- Deleted: 無。
- TestCase: pure interval／correlation／trigger policy、MOD 無跨 record／say guard、strict typecheck/build；真人 baseline 與兩順序動態測試；權限／clock／fallback／timeout 不足必須 unknown。
- Runtime provenance decision: 本機 fixed toolchain 已不在。改用官方同 SDK pin CI run 35444663129 的 web-dist artifact 10585271971，核 metadata head_sha 與官方 archive SHA-256；記錄為 official pinned CI build，不假稱 fresh local build。不採其他實驗 generated runtime；MOD 為本次新編譯。
- Exact new paths: experiments/E025-listening-saying-exclusion/README.md；mod/{mod.ts,host.d.ts,tsconfig.json}；web/{.gitignore,index.html,package.json,package-lock.json,tsconfig.json,vite.config.ts}；web/scripts/{prepare-assets.mjs,build-mod.mjs}；web/src/{main.ts,style.css,observed-audio.ts,overlap.ts,overlap.test.ts,mod.test.ts}；evidence/{runtime-provenance.json,validation.md,human-run.md,trace.jsonl,official-artifact.json}。generated/node_modules/dist ignored，不提交 build outputs／audio。
- Budget: 環境 60 分鐘、case 30 秒、窗口最多一次重試；重大邊界或不能證明 runtime provenance 時停止。
- Routing: owner 新增範圍使 pr-open 需回修，記為 pr-open → needs-rework → creator-in-progress；先獨立 scope review，再 TS TDD／build、開頁交人工作業。未取得真人觀察前，停 human-check，不 commit 假結果。

## E025 observed result and review handoff — 2026-10-19

主要假設被否定：record→say5筆／say→record4筆，有效重疊3055.3～3689.2ms；SDK terminals均成功，錄音非空，9筆均有自然回放。原頁面僅最後1筆完整保存heard／heard，其餘8筆保留unconfirmed；owner隨後回報「我剛剛測是都有聽到」，另記為整批事後聽辨。詳見E025 evidence/validation.md；不倒填原始trace或逐筆簽認。

事前任一有效重疊即足以否定互斥，故主要技術問題可判讀；逐筆保存程序缺口作human review限制。範圍／判準不因結果改動，不外推真機或制定Robot State。獨立TS code review未完成，現交既有Draft PR供human review，不宣稱implementation-approved／merge gate通過。

## Owner final scope lock / Ready for review — 2026-10-19

- 模擬器直接 `record()`／`say()` 已觀察到重疊。
- XiaoZhi 對話路徑有輪流控制，不能概括成整個 SDK 都不互斥。
- 真機錄放、喇叭回音與插話能力待驗證。
- 逐筆儲存缺口如實保留。

本PR到此鎖定：直接record／say模擬器證據與XiaoZhi來源輪流控制分層。真機錄放、喇叭回音及插話移交獨立驗證，非本PR的review／merge硬體依賴；本輪不啟動硬體實驗。原始逐筆保存缺口不補造。Owner明確授權由Draft轉Ready for review；Human Reviewer仍是next actor，未宣稱code review通過，不merge。
