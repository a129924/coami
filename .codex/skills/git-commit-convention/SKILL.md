---
name: git-commit-convention
description: 依 staged diff 檢查單一 commit 的語意邊界並建議 commit message；只支援 human-confirmed commit。
---

# Git Commit 慣例

只讀取 staged diff 與適用的 repository commit 慣例。檢查變更能否構成單一語意 commit、是否混入無關變更、是否需要拆分，以及 message 是否準確描述變更。

建議格式為：

```text
<type>(<scope>): <繁體中文摘要>
```

`type` 應反映變更性質，例如 `feat`、`fix`、`docs`、`chore` 或 `refactor`。若 staged diff 不完整、混入不明變更或需要拆分，說明原因並要求 human 決定如何調整 staged diff；不得自行處理。

## Human boundary

只輸出檢查結果與建議 message，並明確等待 human 確認。未獲 human 明確確認前，不得執行 commit；即使獲確認，本 skill 也不自行執行 commit、push、tag、release、post-merge 或任何遠端 Git 操作。
