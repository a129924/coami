# robot-audio-exclusion — 實際驗證記錄

日期：2026-10-19。執行 worktree：`/private/tmp/coami-robot-audio-exclusion-worktree`；branch：`chore/andrew/robot-audio-exclusion`。這是來源驗證紀錄，沒有執行錄放實驗。

## Source 與 workspace

- `git worktree add -b chore/andrew/robot-audio-exclusion /private/tmp/coami-robot-audio-exclusion-worktree dev`：exit 0；新 worktree 由 base `93a1a7d62d739a2e936d4fa43d993683e4a02f46` 建立。
- `git worktree list --porcelain`：dev 與 topic 為不同路徑、不同 attached branch。所有新檔在 topic worktree；來源是既存 vendor checkout 的唯讀讀取。
- inventory 建立程序逐檔比較 working bytes 與 `git -C <existing-sdk> show b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322:<path>`，11 檔均相同，再計 SHA-256。見 [source-inventory.json](source-inventory.json)。
- 完整來源觀察與決策見 [source-report.md](../source-report.md)。TC-SOURCE-01／02／03 已完成；來源足以回答，不觸發實驗。
- TC-TS 單項基線、兩種啟動順序、重疊判讀：未啟動／未適用。瀏覽器錄放及真機均未執行。沒有建立 E025 或將 SDK success 當成播放證據。

## Graphify

- `GRAPHIFY_NO_AUTO_REFRESH=1 /Users/andrew/.local/bin/graphify --version`：exit 0，`graphify 0.9.73`。
- bounded repo hidden-file 搜尋未找到可用 graph／metadata；graph freshness 不可建立。採 `rg` 與逐檔 source fallback，未執行 query、build、extract、refresh、provider 或 installer。
- TC-AUX-01：PASS（允許的來源搜尋 fallback），不是 graph completeness 或效率驗證。

## Archify

本機 root：`/private/tmp/coami-robot-audio-exclusion/archify/`。內容為來源 sequence，繁中作者文字；Viewer UI／HTML lang 為英文。未啟 server、preview 或 motion。

實際命令：

```sh
node /Users/andrew/.codex/skills/archify/bin/archify.mjs validate sequence /private/tmp/coami-robot-audio-exclusion/archify/sdk-audio-sequence.json --quality showcase --json
node /Users/andrew/.codex/skills/archify/bin/archify.mjs deliver sequence /private/tmp/coami-robot-audio-exclusion/archify/sdk-audio-sequence.json /private/tmp/coami-robot-audio-exclusion/archify/sdk-audio-sequence.html --quality showcase --json
node /Users/andrew/.codex/skills/archify/bin/archify.mjs visual-check /private/tmp/coami-robot-audio-exclusion/archify/sdk-audio-sequence.html --json
```

- 初稿因 desktop readability 調整寬度；第一次 Chrome sandbox 啟動 SIGABRT，於允許的外部本機 Chrome 重跑後取得診斷；初次視覺檢查顯示垂直溢出，壓縮 authored Y spacing。期間候選稿曾超過 readable timeline，修正後重新 validate／deliver。
- 最終 validate 與 deliver exit 0：showcase 9/9、0 errors、0 warnings。最終 visual-check exit 0：1440×900、1600×1000、1920×1080、2048×1320 containment／readability／viewer chrome 均通過。
- 已用 image reader 檢視最小與最大尺寸的 light／dark 四張實際截圖：文字、箭頭、區段、圖例與必要結論卡可讀，沒有 clipping 或不合理下方空帶。`visual_review: passed`；自動 receipt 的 `visualReview: pending` 保持原值，不冒充自動人工判定。
- 最終規格與 HTML 的 SHA-256／bytes 見本機 `delivery.json`；final receipt 摘要將於驗證完成後記入下方。

## PR Lens、文件與 publication

已建立真實 staged bounded diff；初次 PR Lens validate 明確失敗：provenance.head 必填，且 generatedAt 不接受 Python +00:00 格式。未編造 head commit 或同值 base/head，保留 failed receipt；改於 topic commit 後以真實 base/head 與 ISO Z 時間重建。PR Lens final 驗收屬 publication 工件，目前尚未通過。獨立審查仍待完成。PR Lens 產物只在外部本機路徑，不上傳 GitHub；GitHub Draft PR 由 owner 授權的 gh 流程處理，不由 PR Lens CLI 操作。

### Final Archify receipt

- specification: SHA-256 `17b11b3a985c95e4dd8d04fe9adb1f5f864e4b094d138e1b468d31cfe39174d8`; 2885 bytes.
- artifact: SHA-256 `974c01f3150b5fd78e2de639ead3b90d614dbbc6528a24a010d58ac699dd56dc`; 701805 bytes.
- `visual_review: passed`; bounded visual correction rounds: 2（compact composition，含 timeline constraint 修正）；最終交付後未修改規格或 HTML。

- PR Lens 時序調整只反映 CLI 0.11.0 的真實 provenance 需求：來源交付先獨立審查／commit，再製作本機 change map，成功後補入 topic evidence。沒有放寬 SDK 問題、增加實驗，或把失敗寫成通過。

## 文件完整性與隔離驗證

- 實際 Python integrity check exit 0：11 source hashes／committed bytes、gitlink pin、所有相對 Markdown links、plan／step 四個 Implementation Steps 一對一、六檔 Written set、dev HEAD／clean tracked tree、SDK clean 均 PASS。
- `git diff --check` 與先前 staged diff whitespace check：exit 0。
- 尚未執行 TS build／錄放測試：本次沒有 TS 變更，TC-TS 未觸發；這不是 runtime 測試 PASS。
- Implementation step 4 的 creator 工作為 bounded-diff 準備與文件完整性；PR Lens 需要真實 commit head 的 final validate／render 在 publication 階段補驗收。工具限制不冒充完成。

## Independent review 與 completion query

- 本次獨立 Plan-Reviewer round 1 needs-rework（tracker actor／action）；修正後 round 2 approved，完整 JSON 見 review-log.md。
- `python3 .codex/skills/plan-step-tracker/scripts/step_tracker.py check_impl_steps_succeeded robot-audio-exclusion`：exit 0，All 4 implementation steps complete。僅查 implementation checkboxes，未宣稱全 lifecycle 完成。
- Publication preflight：遠端 dev 為 base `93a1a7d62d739a2e936d4fa43d993683e4a02f46`；ls-remote 未見同名 topic branch；gh pr list 未見既存此 head PR。GitHub API 讀取成功，Draft PR 目標為 dev（不是 default main）。
- Topic commit 使用 owner 本輪明確直接 commit／push／Draft PR 授權；沒有請求新的重複批准。提交前檢查 staged 六檔同一個來源驗證 topic；不含 SDK／production／其他實驗變更。

## PR Lens committed-diff 驗收與 publication

- Source topic commit: `7d5b6a9180c0381e565ca98fe512ba4536e7153c`，`docs(robot): document simulator audio exclusion limits`。Commit exit 0；hook 顯示 `Can't find lefthook in PATH`，未安裝／繞改 hook，也未宣稱 hook 成功。實際本 topic 手動完整性檢查已分開記錄。
- `git diff --find-renames 93a1a7d62d739a2e936d4fa43d993683e4a02f46...7d5b6a9180c0381e565ca98fe512ba4536e7153c`：真實六檔新增、427 insertions／0 deletions；外部 committed.diff 與 diff-provenance.json 保存對應內容。
- 修正 generatedAt 為真實 UTC ISO Z 格式，head 採上述真實 commit；不虛構 PR provenance。
- `/Users/andrew/.local/share/pr-lens-runtime/bin/pr-lens validate /private/tmp/coami-robot-audio-exclusion/pr-lens/graph.json`：exit 0；2 lanes、5 nodes、4 edges、0 flows、3 walkthrough steps。
- `/Users/andrew/.local/share/pr-lens-runtime/bin/pr-lens render /private/tmp/coami-robot-audio-exclusion/pr-lens/graph.json --theme light --no-config --out /private/tmp/coami-robot-audio-exclusion/pr-lens/rendered`：exit 0；1 SVG／1 diagram。Repo 沒有既存 PR Lens overlay。
- 已讀 rendered/manifest.json：headSha=7d5b6a9180c0381e565ca98fe512ba4536e7153c；asset=`topic-change-light-5b0accc382cfd16859aee7f9eb7b5eab.svg`，8987 bytes、860×388。本機圖包含 unchanged SDK gitlink／catalog，未稱它們有程式變更；upstream 精確檔案來源仍以 source-report 為準。
- TC-AUX-03：PASS。為避免 metadata commit 使圖的 provenance 過時，publication 結束會對最終真實 HEAD 重新 validate／render，最終 receipts 留外部；此處明確保存已驗 snapshot，不使用自我引用的 final commit hash。
- `git push -u origin chore/andrew/robot-audio-exclusion`：exit 0，建立 origin tracking branch。
- `gh pr create --repo a129924/coami --base dev --head chore/andrew/robot-audio-exclusion --draft --title 'docs(robot): document simulator listening/saying exclusion limits' --body-file /private/tmp/coami-robot-audio-exclusion/pr-body.md`：exit 0，https://github.com/a129924/coami/pull/27。
- gh 讀回：PR #27 OPEN、isDraft=true、base=dev、head=topic branch、headOid=7d5b6a9180c0381e565ca98fe512ba4536e7153c；尚無 reviews／comments。當時部分自動 CI 成功、部分仍 IN_PROGRESS，不宣稱最終 head CI 全過。
- 本次補入 handoff metadata 後會再次 topic commit／push，最終 remote head、Draft／CI snapshot 見本機 publication.json；不 merge、不發送評論或上傳圖示。
