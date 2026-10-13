# E018 TTS Action：指定日文文字、可聽語音與同次結果

## Inputs

- Payload: `ts-implementation`; tracker profile: `base-plan` (不是新 workflow profile)。
- Base: `d3eee648351837e391422e73c299cdae8d03a875`; vendor: `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`。
- Selector: `topic=E018-tts-action; branch=feat/andrew/e018-tts-action; managed-path-intent=/private/tmp/coami-e018-tts-action; primary-worktree=false`。
- Branch 符合 git-branch-naming 的 `<type>/<username>/<short-description>`；本次 owner 已授權 create-feature-worktree、實作、topic commit、push、Draft PR，停在 human review，不 merge。
- Semantic warning: optional `analysis/E018-tts-action/requirements.md`、`technical-spec.md` 缺漏；analysis completeness INCOMPLETE，以已接受對話計畫為 baseline，不代表 runtime blocker。

## Goal / Outcome

操作者選擇已知日文，MOD 透過 audio.say() 合成與播放，取得同筆完成、失敗或結果未確認。成功假設需要正確真人聽辨與同筆播放結束證據。程式、工具與 TTS 結果分開。

## Scope

| Label | Planned |
| --- | --- |
| In-Scope | 固定兩句、手動觸發／音訊解鎖、SDK TTS、strict bridge、single-flight、結果／busy／失敗／未知、fresh runtime、測試、真人程序；Archify sequence、實際 diff PR Lens、既存 Graphify navigation；E018 Vite serving。 |
| Out-Of-Scope | 中文／多語言、唱歌、LLM、外部 TTS、錄音、嘴型、實機、取消／佇列／並行、production；工具安裝／升級／integration／config 修改、graph build、provider／upload／hosted canvas、輔助工具 server／preview。 |
| ReadOnly | vendor、其他 experiments、server/src、device/src、治理／skills、工具設定/runtime、既存 graphs。 |
| Written | Artifact Paths 所列新 E018 工件、ignored outputs 及限定外部 review artifacts。 |
| Deleted | none；不刪既有檔案、branch、worktree。 |
| Modify | 僅本 topic 新建檔案及外部工件後續修訂；範圍外先回修計畫。 |
| Goal | 指定日文 → SDK 合成 → 可聽語音 → 同筆結果；輔助理解與追溯。 |
| Non-Goal | production adoption、工具成效實驗、用圖／trace／build 代替真人與 runtime。 |
| TestCase | TC-TTS 與 TC-AUX 分開記錄。 |

每個 bounded step 在 tracker 有上述九個精確標籤的 Planned／Actual 表；Planned 可引用全域契約並列 bounded override。Actual 初始未執行，之後填實際路徑與證據，不能複製計畫當完成證據。

## Locked Decisions

1. A=`こんにちは。`、B=`おやすみなさい。`，A→B→A；離線 stackchan-voice，不用預錄音檔。
2. UI A/B -> engine.pushButton('a'/'c')；先建 pending 再 dispatch。MOD accepted runSeq 每 boot 從 1 起，busy 不增序號、不呼叫 SDK、不排隊。
3. MOD 先 trace started/句子，再 say。Engine-bound onTrace closure 附加 sessionId；驗證預期序號及文字後綁定 bridge token。每次播放/callback 保存 immutable sessionId+runSeq，拒絕不合關聯事件。
4. audio.say(): Promise<Maybe<string>>，檢查 success、成功文字、reason，捕捉 throw。UI/MOD 雙 guard；busy 不算接受的請求。
5. engine.start 前替換 audioOutBridge 和 hostBridge.AudioOut；vendor/WASM 不改，不使用 stock duration+250ms success fallback。
6. play(ArrayBuffer): Promise<boolean> 只在有效非空音訊開始後自然 onended 回 true。decode/start error、context interruption、close/stop 不能成功；startup tone 與 TTS 分開。
7. completed = 同 request/文字 + SDK success/相同文字 + 有效 natural ended。startup/request watchdog 各 30s；SDK success 無 bridge play/zero samples 等至 watchdog -> 唯一 unconfirmed，鎖至整頁 reload。
8. 逾時/中斷不宣稱停止；late/duplicate/舊 session 僅診斷，不改終態。completed 或可確認無播放殘留的 failed 後才接受下一筆。
9. Fresh build 未修改 pinned runtime，參照 E015 toolchain/provenance，不用 E006 Pages 或 E016/E017 patched artifact。
10. 無 stable-library/release/production adoption；branch 保留，不刪 worktree。

## Boundaries / Exclusions

SDK 合成、bridge 觀察、session 結果、真人聽辨，各層證據不互代。換供應商/vendor/runtime/path 先 scope gap review。

- Graphify: pinned0.9.73；目前無可用 Coami graph，用 rg/source fallback，不建圖。若有已驗 freshness graph 才 bounded query/path/explain；每次 CLI 皆 GRAPHIFY_NO_AUTO_REFRESH=1，query budget<=1500，重要邊核對 source；不 refresh/provider/install/stamp。
- Archify: 一張靜態 sequence，<=12 primary nodes，繁中作者文字，Viewer UI/html lang English fallback。執行時讀 sequence/common schema + example，next tool action 寫 candidate。showcase9/9、0 errors/warnings，deliver freeze/hash；四 desktop containment/light-dark 視覺檢查。外部檔不傳 Coami --repo-root；兩輪未改善最佳診斷數即停止。如實記 partial，不啟 preview/server/motion。
- PR Lens: pinned0.11.0 `/Users/andrew/.local/share/pr-lens-runtime/bin/pr-lens`，實際 diff/真實 base/head、unchanged SDK/vendor neighbors、file refs。local validate/render；無 config 用 --no-config，有既存 overlay 讀後 --config，不改 config；讀 manifest 引 SVG。不 npx/install/provider/upload/hosted/PR 操作。
- 工具失敗記具體 limitation 與允許 source/text fallback；aux incomplete 與 TTS 結果分開。

## Status / Allowed Transitions

- **Current**: `pr-open`
- **Next actor**: `Human Reviewer`
- **Stage-local action**: Review Draft PR #18；依 README 進行真人聽辨並回報 evidence。Agent 停止，不 merge。
- **Execution model**: Plan review -> preflight -> Implementer -> Tester -> independent Reviewer -> topic commit/push/Draft PR -> human review；不 merge。
- **Allowed transitions**: planned -> creator-in-progress; creator-in-progress -> review-ready; review-ready -> reviewer-in-progress; reviewer-in-progress -> approved | needs-rework; needs-rework -> creator-in-progress; approved -> creator-in-progress | publish-in-progress; publish-in-progress -> pr-open | merged; pr-open -> needs-rework | merged; merged -> terminal。
- Review readiness 只涵蓋程式交付。真人未驗證維持 human-check；runtime/provenance 不成立記 blocked，不猜測成功。Aux failure 不覆寫 TTS 判定。

## Artifact Paths

| Exact path | Owner |
| --- | --- |
| `plan/E018-tts-action/E018-tts-action.plan.md` | Plan-Creator |
| `plan/E018-tts-action/E018-tts-action.step.md` | Plan-Creator |
| `plan/E018-tts-action/review-log.md` | Plan-Reviewer / Reviewer |
| `experiments/E018-tts-action/README.md` | Implementer / Tester |
| `experiments/E018-tts-action/evidence/validation.txt` | Implementer / Tester |
| `experiments/E018-tts-action/evidence/runtime-provenance.json` | Implementer / Tester |
| `experiments/E018-tts-action/evidence/tts-run.md` | Implementer / Tester |
| `experiments/E018-tts-action/evidence/tts-trace.jsonl` | Implementer / Tester |
| `experiments/E018-tts-action/evidence/auxiliary.md` | Implementer / Tester |
| `experiments/E018-tts-action/mod/mod.ts` | Implementer / Tester |
| `experiments/E018-tts-action/mod/host.d.ts` | Implementer / Tester |
| `experiments/E018-tts-action/mod/tsconfig.json` | Implementer / Tester |
| `experiments/E018-tts-action/web/index.html` | Implementer / Tester |
| `experiments/E018-tts-action/web/package.json` | Implementer / Tester |
| `experiments/E018-tts-action/web/package-lock.json` | Implementer / Tester |
| `experiments/E018-tts-action/web/tsconfig.json` | Implementer / Tester |
| `experiments/E018-tts-action/web/vite.config.ts` | Implementer / Tester |
| `experiments/E018-tts-action/web/.gitignore` | Implementer / Tester |
| `experiments/E018-tts-action/web/scripts/prepare-assets.mjs` | Implementer / Tester |
| `experiments/E018-tts-action/web/scripts/build-mod.mjs` | Implementer / Tester |
| `experiments/E018-tts-action/web/src/main.ts` | Implementer / Tester |
| `experiments/E018-tts-action/web/src/style.css` | Implementer / Tester |
| `experiments/E018-tts-action/web/src/browser-runtime.ts` | Implementer / Tester |
| `experiments/E018-tts-action/web/src/tts-session.ts` | Implementer / Tester |
| `experiments/E018-tts-action/web/src/tts-session.test.ts` | Implementer / Tester |
| `experiments/E018-tts-action/web/src/strict-audio-bridge.ts` | Implementer / Tester |
| `experiments/E018-tts-action/web/src/strict-audio-bridge.test.ts` | Implementer / Tester |

External-only: `/private/tmp/coami-e018-review-artifacts/archify/tts-sequence.json`、`tts-sequence.html`、`validate.json`、`delivery.json`；同目錄 visual-check sidecars 名稱依 receipt。PR Lens `/private/tmp/coami-e018-review-artifacts/pr-lens/graph.json`、`rendered/manifest.json`，SVG 依 manifest。Ignored E018 web/generated、web/dist、web/node_modules。Root README/VERSION/.github/copilot-instructions.md 不變。

## Implementation Steps

- [X] 1. 建立 E018 MOD／web、strict TS／build 設定、fresh pinned runtime／MOD scripts 與 provenance 檢核。
- [X] 2. 實作 button transport、accepted sequence、engine session、文字驗證、immutable token 及雙層 busy guard。
- [X] 3. 實作 strict bridge、SDK 判定、唯一終態、30 秒 watchdog、zero-sample 無 play 及 reload 鎖定。
- [X] 4. 串接音訊解鎖、文字／結果／trace，加入明示下一次播放失敗測試注入。
- [X] 5. 完成 TC-TTS pure tests、typecheck、MOD／web build，記錄結果與 blockers。
- [X] 6. 完成可重現程序、served bytes provenance 與分層真人／模擬器證據表。
- [X] 7. 完成 bounded navigation、Archify、實際 diff PR Lens 與 TC-AUX 紀錄；未成功明記 auxiliary incomplete。

## Validation / Acceptance Checks

- TC-TTS pure: pending-before-dispatch、mapping/seq/busy、SDK false/throw/text mismatch、token/session mismatch、late/duplicate/old session、正常重做。
- TC-TTS bridge: 非空音訊、decode/start error、natural ended、中斷、close/teardown；timer 不能 completed；zero-sample SDK success -> watchdog unconfirmed/reload lock。
- TC-TTS build: npm ci/test/typecheck/prepare:poc/build；source/toolchain/runtime/MOD/bridge/served bytes hashes；失敗重建不能服務舊產物。
- TC-TTS simulator: A→B→A、一次SDK、同文同request、ended後completed、busy不排隊、播放失敗注入、timeout/reload隔離。
- TC-TTS human: Tester/日期/browser/OS/音量/輸出/解鎖/句子/request/聽辨/程式結果；三次內容正確。trace 不算聽辨PASS。
- TC-AUX: Archify structural/delivery/containment/實際visual、PR Lens actual diff/validate/render/manifest、Graphify freshness/refresh optout/source check 或 rg fallback。
- 所有項目分 PASS/FAIL/未執行/無法判定；pure/build/圖不能代替 runtime/human。Actual/checkbox 要有路徑與 evidence。

## Reviewer Handoff

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

無 release/VERSION/tag/deploy/production adoption。本次停 human review，不 merge。External artifacts 不上傳或附加PR。Branch/worktree 保留，刪除另授權。

## Open Questions / Unresolved Items

無未決產品決策。待 runtime/toolchain/provenance、真人聽辨及 independent review。Optional analysis 缺漏為具名 soft fail；不能因純測試通過宣稱可聽 TTS 通過。
