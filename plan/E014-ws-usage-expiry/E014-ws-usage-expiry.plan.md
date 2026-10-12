# E014 WebSocket 使用期限 POC

## Goal / Outcome

**Goal**：Node Robot 主動連 FastAPI WebSocket，啟動取得 Success；到期禁止操作但保持連線，雙端持久紀錄可配對。

## Scope

- **In-Scope**：單 Robot／單 Server worker、loopback `/ws`、Python＋strict TypeScript、無副作用 probe、重連／client 重啟、雙端 log、fake clock／5 秒真實 smoke、限定 Archify／PR Lens／Graphify。
- **Out-Of-Scope**：真機、續期、帳號、支付、auth 平台、DB、browser bridge、跨 Server 重啟期限保存、生產 deployment diagram、Graphify 建圖。
- **ReadOnly**：既有 topic／實驗、production、vendor、治理文件、skills／工具 runtime、既有 graph、PR Lens config 與既有 ignore。

## Locked Decisions

- Python 3.12／獨立 uv project；FastAPI WebSocket。Node 24／內建 WebSocket／原生 TS stripping，另跑 strict typecheck，無 runtime WS 套件。
- TS dev pins：TypeScript 7.0.2、@types/node 26.1.2；NodeNext／ES2024／strict／noEmit／erasableSyntaxOnly／verbatimModuleSyntax／allowImportingTsExtensions。實際 Node 24 相容性須驗證。
- `USAGE_MS` 正整數，預設 5000。Server 第一次建立 grant 固定起算、deadline 與 grant ID；送達失敗不重算。UTC anchor＋monotonic clock；`now < deadline` 允許，`now >= deadline` 拒絕。
- `robot.start → robot.start_result` 回 Success／Expired 與授權時間／剩餘時間；`operation.probe → operation.result` 回 allowed／not_started／expired；`usage.status → usage.state` 到期後仍可查；Server 主動 `usage.expired` 不關 WS。完整 frame 欄位見實驗 README。
- 授權依 robot_id 留在 Server 記憶體；重送 start／重連／Robot 重啟均沿用原 grant／deadline，禁止同 Robot 並行連線，不無限重試。Client 啟動／斷線預設停用，保守 monotonic 計時；舊回覆不得重新啟用。
- 雙端 append-only JSONL、逐筆 flush／fsync，以 run／connection／message／reply／grant IDs 配對；區分 attempt／sent／failed／received；白名單 frame、不記密鑰。每 connection reader／expiry task、序列化 send、首次授權保護；shutdown 取消並 await task。
- Archify：本 topic sequence candidate → showcase validate 9/9、零錯誤／警告 → deliver → visual-check／人工核對；繁中文案、Viewer English fallback，無 preview／動畫。Owner 2026-10-12 明確接受兩輪修正仍垂直溢出作為 Draft PR 已知限制；保留可信 artifact／失敗證據，不宣稱 visual pass。
- PR Lens：真實 base/head 或可核對 bounded working-tree diff 任一路徑；未提交來源包含新檔並如實標示，不能捏造 head 或為產圖 commit。固定 CLI 0.11.0，本地 external output、unchanged neighbors／source refs，不發布／上傳／改 config。
- Graphify：只查 revision 可核對的既有圖，budget 1500；固定 CLI 0.9.73，每次 `GRAPHIFY_NO_AUTO_REFRESH=1`。無可用圖則 targeted source fallback，不建圖／快取／stamp／reflection。

## Boundaries / Exclusions

- **Non-Goal**：使用期限不是測試或工程 timeout；正常 expiry 不是 WebSocket 不可用。固定 robot_id 不是防偽身份；不自動批准 production。
- **Modify**：無既存 tracked files；後續修訂僅限本 topic 新增工件。
- **Deleted**：無。工具不可自動安裝／刷新／整合；PR Lens 不得用 repo `.pr-lens`、provider／analyze／canvas／npx。

## Status / Allowed Transitions

- Current status: `publish-in-progress`.
- Next actor: Main Agent.
- Stage-local action: 依核准範圍完成 topic commit、push 與 Draft PR，交人工 review。
- Allowed transitions: `creator-in-progress → review-ready → reviewer-in-progress → approved|needs-rework`；`needs-rework → creator-in-progress`；`approved → publish-in-progress → pr-open`。
- Profile: `base-plan`，不是 Python specialized profile；四步一對一鏡像。Selector: topic=E014-ws-usage-expiry; branch=feat/andrew/ws-usage-expiry; managed-path-intent=/private/tmp/coami-e014-ws-usage-expiry; primary-worktree=false。
- Baseline `7b5772483a8cc62cdcb959d475a1a15ebbe98053`，不聲稱最新遠端。Owner 已批准實作及無重大問題時 topic commit／push／Draft PR；人工 review 為停點，不 merge。

## Artifact Paths

**Written**：封閉 allowlist；下列 P=`plan/E014-ws-usage-expiry/`，E=`experiments/E014-ws-usage-expiry/`，均在 feature worktree。

| Root | Files |
| --- | --- |
| P | `E014-ws-usage-expiry.plan.md`, `E014-ws-usage-expiry.step.md`, `review.md` |
| E | `app.py`, `test_app.py`, `pyproject.toml`, `uv.lock`, `robot.ts`, `robot.test.ts`, `smoke.ts`, `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`, `README.md`, `EXPERIMENT.md` |
| E | `evidence/server.jsonl`, `evidence/robot.jsonl`, `evidence/validation.txt`, `evidence/smoke.jsonl`, `evidence/navigation.md` |
| E | `diagram/sequence.candidate.json`, `diagram/sequence.html`，visual-check receipt 列出的四 PNG／contact-sheet HTML／JSON sidecars |

PR Lens external allowlist：`/private/tmp/e014-ws-usage-expiry/pr-lens/graph.json` 及 `rendered/` manifest 列出的產物。工具 receipts／hashes 寫入 validation evidence。依賴／測試 cache 是忽略本機產物；表外 tracked writes 須回 review。

## Implementation Steps

1. 建立 README／EXPERIMENT、依賴與 strict TS 設定、append logger；記錄既有圖或 targeted source fallback。
2. 完成 Python clock／授權／WebSocket／通知／cleanup 與邊界／失敗測試。
3. 依 TypeScript TDD 完成 Robot、關聯驗證、停用 guard／timer；留下可歸因 red／green 與 strict typecheck 證據。
4. 完成雙程序 smoke、重啟／pairing、Archify delivery／視覺證據與 actual-diff PR Lens map；記錄結果與限制。

## Validation / Acceptance Checks

- **TestCase**：啟動 Success；deadline−1／等於／+1；未啟動／非法訊息；到期停用但 status round-trip 成功；重連／重啟不續期；舊回覆／通知競爭／斷線／send／log failure 不假成功；雙端 log 配對／不覆寫／去密鑰。
- Fake／real 證據分開。5 秒真實期限、啟動上限 5 秒、訊息上限 2 秒、smoke watchdog 30 秒；harness 完成後 cleanup 才關 WS，非 expiry 關 WS。
- `uv sync --locked`、`uv run pytest -q`、`uv run ruff check .`、`uv run pyright`；`npm ci`、`npm run typecheck`、`npm test`、`npm run smoke`。Red 必須是目標行為 assertion failure，不是 import／工具鏈錯誤。
- Archify 9/9 showcase／receipt hashes／四 desktop sizes／light-dark／人工核對；PR Lens validate／render manifest／source refs／unchanged neighbors；工具失敗或來源不可核對如實記錄，不假通過。
- 只有 implementation steps 全完成才能 review-ready；獨立 Reviewer 決定 routing，不以圖取代 code review。

## Reviewer Handoff

```json
{"verdict":"approved|needs-rework","blocking_issues":[],"copilot_feedback_triage":{"ADDRESS":[],"DISCUSS":[],"SKIP":[]}}
```

## Post-merge / release actions

本次獲授權 topic commit／push／Draft PR，停在 human review；不 merge。未來 merge 為 terminal，無 release／VERSION bump／tag。保留 worktree／branch，cleanup pending；rollback 僅撤除本 topic 新增工件。

## Open Questions / Unresolved Items

無未答 owner 設計問題。Optional analysis pair 缺失為 INCOMPLETE，不新增 specialized Python plan／spec。缺少 graph 採已批准 fallback；PR Lens 只在兩種來源均不可核對或工具實際失敗時記錄未生成。2026-10-12 GitHub 查證 default main、遠端 dev `189ee5b56471f2386dd0aad21c6ca00f9b201e63`；本 topic PR 以 dev 為 base，不移動 primary dev。Archify visual_review failed 為 owner 已接受的 Draft PR 限制；30 分鐘 soak 未執行。
