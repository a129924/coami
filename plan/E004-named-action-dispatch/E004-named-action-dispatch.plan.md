# E004 named Action dispatch — topic plan

## Inputs

- Intent: `analysis/E004-named-action-dispatch/requirements.md`
- Execution contract: `analysis/E004-named-action-dispatch/technical-spec.md`
- Selected worktree: `/private/tmp/coami-e004-named-action-dispatch`, branch `feat/andrew/e004-named-action-dispatch`, primary-worktree=false.

## Goal / Outcome

操作者從 FastAPI Docs 對固定 simulator Robot 提交 Enum `greet`，由 Server 派送一筆命令，Robot 可見地笑臉、點頭、回中立，並以同一 ID 查得終止結果。實驗記錄須明確說明驗證責任、程序、證據、結論與未驗證範圍。

## Scope

- **In-Scope / Goal**: E004 的 analysis、topic plan、step、獨立 Python Server、TypeScript bridge/MOD、wire contract、測試和 PNG／Markdown 證據。
- **Out-Of-Scope / Non-Goal**: 實機、多 Action／參數、取消 API、佇列、持久化、認證、TLS、production source、E001/E003 原處修改與 release。
- **ReadOnly**: `AGENTS.md`、shared workflow／topic-plan contract、E001/E003 契約與程式、`vendor/stack-chan/`、`server/src/`、`device/src/`。
- **Written**: 僅本計畫 `Artifact Paths` 的 E004 新工件。
- **Modify**: 無既存檔案。**Deleted**: 無。

## Locked Decisions

- 首版固定 `coami-sim-001` 和單一 `greet`；Python `StrEnum Action` 與 bridge TypeScript `Action` Enum 對應，MOD 不解析 Enum。
- 直接命令 `event_id: null`，wire 省略；事件命令保留 E003 ID 與 ack。HTTP 與 A event 共用 Server 命令 store、busy、session、result 處理。
- HTTP `422/unsupported_action`、`404/unknown_device`、`409/device_offline|device_busy` 不建立命令；接受為 `202` 與可查詢 ID。重連本機忙碌可先接受，再終結 `failed/bridge_busy`。
- Session ready 成功後才派送；under-lock sends 有上限。直接命令建立起 10 秒 deadline；未送達為 `failed/delivery_failed`，已送達無結果為 `failed/result_timeout`。終止狀態不可覆寫；late result 不關閉目前 session。
- B 中斷直接命令回 `failed/local_interrupted`，E003 事件命令仍 `cancelled`。不因 Server timeout 假定 MOD 已停止或回中立。
- Archify 只交付 `evidence/dispatch-flow.png`；HTML／JS／JSON 渲染中介不提交。`EXPERIMENT.md` 另寫文字流程及受限結論。
- 本 topic 是 review-ready experiment，不觸及 root README、VERSION 或 release metadata。

## Boundaries / Exclusions

- E001/E003、vendor、shared workflow、`server/src/` 和 `device/src/` 唯讀。新能力只在 E004 實驗中驗證；若需要表列外檔案，先修訂計畫。
- Creator 實作與留證；Tester 驗證；Reviewer 獨立檢查契約及結果；Main Agent 處理獲授權的 commit、push 和 ready PR，human 負責最終 review／merge。

## Status / Allowed Transitions

- **Current**: `approved`
- **Next actor**: Main Agent
- **Stage-local action**: 核對 E004 暫存範圍，依已獲 owner 確認的訊息 commit、push 並開 ready PR，交 human review。
- **Execution model**: planned → creator → reviewer → publish → PR／human merge；merge 後無 release。
- **Allowed transitions**: `planned` → `creator-in-progress`; `creator-in-progress` → `review-ready`; `review-ready` → `reviewer-in-progress`; `reviewer-in-progress` → `approved` or `needs-rework`; `needs-rework` → `creator-in-progress`; `approved` → `creator-in-progress` or `publish-in-progress`; `publish-in-progress` → `pr-open` or `merged`; `pr-open` → `needs-rework` or `merged`; `merged` terminal.
- **Routing notes**: owner 已要求 feature worktree、若無重大問題則 topic commit、push、ready PR 後交 human review。提交前仍依 `AGENTS.md` 檢查 staged diff 並取得 proposed message 的 owner 明確確認。Worktree 不在 dev 目錄。
- **Review round 1**: 獨立 Plan-Reviewer 判定 topic plan `approved`；獨立實作 Reviewer 判定 `needs-rework`，因宣告的 B 中斷、斷線、重連本機 busy 與卡住 command send 缺少逐項驗證。Creator 隨後在相同 artifact paths 補上 Python 及 TS 測試與證據文字，再交 Reviewer 複查。
- **Review round 2**: 獨立實作 Reviewer 複查後判定 `approved`，`blocking_issues=[]`；確認新增測試覆蓋前述缺口、29 個暫存檔均在 E004 artifact paths 且 staged diff clean。最終 bridge 修訂後又重跑 Docs 與 E003 event 成功；browser 實際斷線／重連仍列為未驗證邊界。

## Artifact Paths

| Artifact | Path | Owner | Role |
| --- | --- | --- | --- |
| Requirements | `analysis/E004-named-action-dispatch/requirements.md` | Planning actor | Intent guardrail |
| Technical spec | `analysis/E004-named-action-dispatch/technical-spec.md` | Planning actor | Execution contract |
| Topic plan | `plan/E004-named-action-dispatch/E004-named-action-dispatch.plan.md` | Planning actor | Topic contract |
| Step tracker | `plan/E004-named-action-dispatch/E004-named-action-dispatch.step.md` | Step-Creator | Gate tracking |
| Procedure | `experiments/E004-named-action-dispatch/README.md` | Creator | Reproduction |
| Experiment record | `experiments/E004-named-action-dispatch/EXPERIMENT.md` | Creator / Tester | Question, procedure, evidence, decision |
| Protocol | `experiments/E004-named-action-dispatch/contracts/protocol.md` | Creator | Language-neutral wire contract |
| Server | `experiments/E004-named-action-dispatch/server/app.py` | Creator | API and command lifecycle |
| Server tests | `experiments/E004-named-action-dispatch/server/test_app.py` | Creator | Behavior checks |
| Server package | `experiments/E004-named-action-dispatch/server/pyproject.toml` | Creator | Dependencies |
| Server lock | `experiments/E004-named-action-dispatch/server/uv.lock` | Creator | Reproducibility |
| MOD | `experiments/E004-named-action-dispatch/mod/mod.ts` | Creator | A event, C greet, B interruption |
| MOD typing | `experiments/E004-named-action-dispatch/mod/host.d.ts` | Creator | Runtime declarations |
| MOD config | `experiments/E004-named-action-dispatch/mod/tsconfig.json` | Creator | Typecheck |
| Web ignore | `experiments/E004-named-action-dispatch/web/.gitignore` | Creator | Generated assets ignored |
| Web entry | `experiments/E004-named-action-dispatch/web/index.html` | Creator | Simulator UI |
| Web package | `experiments/E004-named-action-dispatch/web/package.json` | Creator | Build commands |
| Web lock | `experiments/E004-named-action-dispatch/web/package-lock.json` | Creator | Reproducibility |
| Web config | `experiments/E004-named-action-dispatch/web/tsconfig.json` | Creator | Typecheck |
| Vite config | `experiments/E004-named-action-dispatch/web/vite.config.ts` | Creator | Simulator assets |
| Bridge | `experiments/E004-named-action-dispatch/web/src/main.ts` | Creator | Enum and command execution |
| Wire decoder | `experiments/E004-named-action-dispatch/web/src/protocol.ts` | Creator | TypeScript Action Enum and origin-aware decode |
| Wire decoder tests | `experiments/E004-named-action-dispatch/web/src/protocol.test.ts` | Creator | Direct/event command contract tests |
| Style | `experiments/E004-named-action-dispatch/web/src/style.css` | Creator | Console display |
| Asset script | `experiments/E004-named-action-dispatch/web/scripts/prepare-assets.mjs` | Creator | Pinned WASM |
| MOD script | `experiments/E004-named-action-dispatch/web/scripts/build-mod.mjs` | Creator | Archive build |
| Sequence PNG | `experiments/E004-named-action-dispatch/evidence/dispatch-flow.png` | Creator | Archify flow image |
| Full-loop evidence | `experiments/E004-named-action-dispatch/evidence/full-loop.md` | Tester | Same-run ID chain |
| Greet screenshot | `experiments/E004-named-action-dispatch/evidence/greet.png` | Tester | Visible action |

No root README, VERSION, `.github/copilot-instructions.md`, E001/E003, vendor or production source changes. Any new repo-visible path needs plan review first.

## Implementation Steps

- [X] 1. 建立 E004 protocol、Python `Action` Enum、POST／GET、共享命令與 session lifecycle，在 `server/app.py` 和 `server/test_app.py` 驗證成功、拒絕、失敗及 E003 回歸。
- [X] 2. 在 `web/src/main.ts` 以 TypeScript Enum 處理有／無 `event_id` 的 `greet`，保留 `mod/mod.ts` 的 C greet／B 中斷和重連本機 busy；完成 TS typecheck 與 build。
- [X] 3. 完成 `README.md`、`EXPERIMENT.md`、`evidence/full-loop.md`、`evidence/greet.png` 與 Archify `evidence/dispatch-flow.png`，留下同次 API、wire、動作、結果證據和明確結論邊界。

## Validation / Acceptance Checks

- **TestCase**: `server/test_app.py` 驗證 Enum 未知值、未知裝置、offline、Server busy、成功 ID 關聯、delivery／execution failure、result timeout、late result、disconnect、reconnect bridge busy、B interruption、E003 event regression；`web/src/protocol.test.ts` 驗證 direct/event wire 與未知 Action。
- Python pytest、Ruff、Pyright 與 web TS typecheck、MOD archive、Vite build 通過；從 FastAPI Docs 實際提交並目視 simulator greet，GET 查得相同 ID。
- Archify showcase 驗證與 PNG 目視檢查完成；圖片與 Markdown 文字流程一致。實驗記錄明確區分 simulator 證據與未驗證的 production／實機議題。
- 只有 E004 artifact paths 出現新的 tracked changes；dev worktree 保持乾淨。

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

Human review 後才 merge。本實驗沒有 VERSION bump、tag、release note 或 repository release；`merged` 為 topic terminal。Worktree／branch 清理由後續明確流程處理。

## Open Questions / Unresolved Items

None for the single simulator route.
