---
name: git-branch-naming
description: 依工作類型與識別名稱提供可讀、可追溯的 Git branch 名稱建議；不執行 Git 操作。
---

# Git Branch 命名

使用此 skill 依呼叫端提供的工作識別名稱與工作類型建議 branch 名稱。只在輸入足以命名時提出單一建議；命名使用小寫 ASCII、以連字號分隔，避免空白、模糊日期或未驗證的 issue 編號。

偏好格式為 `<type>/<owner>/<work-item>`；`type` 使用與工作性質相符的簡短值，例如 `feat`、`fix`、`docs` 或 `chore`。`owner` 僅在 repository 已有既定慣例時使用。

若已提供工作類型與工作識別名稱，但 repository 沒有既定 owner 慣例，回傳 `<type>/<work-item>`；不得捏造 owner。若工作識別名稱或工作類型不明，說明缺少的輸入，不自行假設或產生名稱。

此 skill 只處理呼叫端提供的命名輸入。僅提供建議；不建立、切換、刪除或推送 branch，不執行 worktree、commit、tag、release、post-merge 或其他 Git 操作。
