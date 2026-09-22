---
name: typescript-tdd
description: 以測試驅動方式實作或修正明確的 strict TypeScript 行為。適用於需要 red-green-refactor、typecheck 與局部驗證的工作，不預設 runtime 或工具鏈。
---

# TypeScript TDD

## 使用時機

在需求或 bug 對應到可觀察的 strict TypeScript 行為，且可識別目標 module 與測試邊界時使用。

## 最小輸入

- 明確的行為需求或 bug。
- 目標 module／test 範圍，或可供探索的 repository。
- 適用的 package manager、測試、typecheck、format、lint 或 coverage 設定。

## 工作方式

1. 確認 package scripts、TypeScript compiler options 與測試工具。
2. 新增或調整一個可代表需求的 failing test，並確認失敗可歸因於目標行為尚未實作。
3. 以最小實作使測試通過，並維持 strict typecheck。
4. 只在測試持續通過時進行必要重構。
5. 執行受影響測試、typecheck 與 caller 指定的 format、lint、coverage 驗證。

## 輸出

回報：

- 測試邊界。
- red test 與其可歸因的失敗證據。
- green 後已執行的驗證結果。
- 若停止，僅回報本次工作的局部 blocker 與缺少資訊。

## 停止條件

遇到下列情況時停止，不自行猜測：

- 需求、可觀察行為或測試邊界不明。
- runtime、module format、target 或資料契約不明。
- 需要未授權的 public contract、架構、bridge、API 或 infrastructure 變更。
- 無法區分測試失敗是安裝／工具鏈問題或目標行為問題。

## 邊界

- 不預設 package manager、Bun、Node、browser runtime、module format、target、測試工具、formatter 或 coverage 門檻。
- 不得以 unconstrained `any` 或關閉 strict 設定規避型別問題。
- 不執行或要求 commit、push、PR、branch、worktree 或其他 Git workflow。
