# E011 PR #10 comment review and fix

## Question

在非整列捲動位置，部分列是否遮住結果標題？螢幕空白區或水平拖曳是否會誤派送動作？

## Procedure

2026-09-30 逐則核對 PR #10 的三個 inline review threads，均判為 ADDRESS。在 E011 純 TypeScript 邊界先加入失敗測試，再將列放入 `clip: true` 的選單 viewport，讓命中測試使用實際可見列矩形，並以 x/y 雙軸位移判定點選。執行 tests、strict typecheck、MOD archive 與 Vite build；以 in-app Browser 在 `http://127.0.0.1:4173/` 操作 pinned Robot 螢幕。

## Evidence

- Red：新增測試引用尚未提供的列幾何 helper，`npm test` 因 `rowTopInViewport` 缺少 export 而失敗。Green：13/13 tests PASS；`npm run typecheck`、`npm run mod`、`npm run build` PASS。
- Browser：於側邊留白觸碰，trace 為 `action_id:null`、`run_seq:null`；從可見 `face.neutral` 水平拖曳後，`touch ended` 仍為 `run_seq:null`。
- Browser：向上滑到 offset 98，畫面標題完整、列從 viewport 起點呈現；點選可見「想睡」得到 `face.sleepy #1 started` → `screen completed offset=98` → `face.sleepy #1 completed`。修正後終態見 [pr-review-fix.jpg](pr-review-fix.jpg)。
- Browser：同一 runtime 繼續滑至 offset 280，原本不可見的「回正」點選得到 `head.center #2 started` 與 matching `completed`，沒有額外 run。
- 列間 2px 空白、viewport 邊界及被裁切列的命中排除由純 geometry test 核對；未聲稱這些像素都可由 3D 視角精準手點重現。

## Decision

三項 review suggestions 均屬核心互動正確性，已在本 topic 修正；不修改 E005/E009、vendor 或 production surfaces。等待新 commit 推送後逐 thread 回覆並 resolve。
