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
