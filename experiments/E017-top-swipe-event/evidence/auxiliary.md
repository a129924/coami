# E017 TC-AUX

工具結果不替代 SDK／runtime／真人核心驗收。

## Graphify — COMPLETE via source fallback

- `GRAPHIFY_NO_AUTO_REFRESH=1 /Users/andrew/.local/bin/graphify --version`：graphify 0.9.73。
- 未找到本 topic 可用且版本可核對的 graph；採 bounded `rg`／source reads，核對 SDK recognizer、TouchPanel 派送、WASM host、MOD resolver 與預設8秒 onLaunch。
- 未 build/extract/refresh graph，未使用 provider、install、config、hook 或 .graphify_version。

## Archify — PASS

- diagram_type: sequence；spec/output: ../diagram/swipe-sequence.json / swipe-sequence.html。
- specification_sha256: `775f3c0f8b86045a0e1ca3ee6def3b1a29fae461b13e3781375ff254a7d2b70d`
- artifact_sha256: `3f330042dfb0e8bad04fbf3017a44e8362e8d1bced29fbd5c1a35d3b9a6d5a30`
- validation: 9/9 showcase、0 errors、0 warnings；見 swipe-sequence.delivery.json。
- visual-check: 1440×900、1600×1000、1920×1080、2048×1320 全部 containment/readability PASS；receipt 的 visualReview=pending 是工具固定值，不改寫。
- visual_review: passed；實際檢視1440×900 light與2048×1320 dark截圖，主通路、文字、legend/card完整、無遮擋，大小螢幕皆平衡。
- correction_rounds: 2。修正圖寬可讀性與垂直timeline／first-screen overflow；沒有修改 renderer、隱藏 overflow 或縮小字型來偽造通過。
- 繁中 authored content；固定 viewer UI／HTML lang fallback English。無 motion、preview、upload。

## PR Lens — PASS, local only

- CLI: `/Users/andrew/.local/share/pr-lens-runtime/bin/pr-lens`，固定0.11.0。
- graph: `/private/tmp/coami-e017/pr-lens/graph.json`；render: `/private/tmp/coami-e017/pr-lens/rendered/manifest.json` 與2個SVG。
- 已讀實際 `git diff --find-renames <base>...<head>`；base=`9155139d34ad94379a246c5d31c29e86fed52ed1`，head為生成時的真實feature commit。最終生成的完整SHA見graph provenance與manifest，不捏造PR號碼。
- 3 lanes、7 nodes、8 edges、1 flow、4 walkthrough steps；包含 unchanged pinned recognizer、來源file refs，以及E017 scratch副本的明確標示，沒有宣稱vendor被修改。
- validate／render成功。沒有適用repo overlay，使用 --no-config；未改config／.gitignore，未寫repo .pr-lens，未使用API、upload、hosted canvas或server。
- PR Lens只提供變更理解；correctness來自獨立review與另列驗證。Draft PR由一般GitHub工作流程建立，不透過PR Lens發布或附加資產。
