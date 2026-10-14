# E020 PR comment review and fix：第九輪（2026-10-14）

## Finding 與判定

Thread 4267845847 指出 squashed `3745bfd...` 與 production bundle pin 的來源 `b565e7e...` 不符，要求重新產生 pin。

判定：目前 PR 狀態下不需要修改 pin。重新 fetch 後 GitHub PR HEAD、remote branch 與 feature checkout 皆為 `83c8d991e14424f067db331c0960f987345f70a1`。Git log 的最後 harness-pin 修改提交為 `b565e7e41d24cde1e3fcca5df5c688821abbc6d5`，與 production-bundle-pin.sourceCommit 相同，merge-base ancestry 檢查 exit 0。完整本地 history 沒有 `3745bfd`；GitHub commit API 亦回覆 HTTP 422、No commit found for SHA。

## 實際驗證

在 clean feature checkout 重跑 npm run build（含 strict typecheck）通過；新 dist/harness-provenance.json 的來源嚴格等於固定 pin，全部 bundle hashes 相符。實際 strict-port Vite preview 在 5206 啟動，HTTP 取得的 manifest 與 JS/CSS/HTML 均符合 Git pin。暫時 server 已關閉。

證據：review9-verification.json、review9-build.txt、review9-reported-commit.json。這是本輪 fresh web build／HTTP probe，不是新的 browser UI／真人方向驗收，也沒有重建 WASM。來源程式／SDK／runtime／bundle pin 未改，原本人工證據限制保留。

## History 邊界

若之後實際進行 squash/rebase，或使用缺少固定來源提交的 history，必須在該實際 history 的乾淨 checkout 重跑 build／preview，確認 input revision；必要時重新產生與提交 production bundle pin 及證據。不得把本次完整 history 的驗證結果當成已驗證未來 squash 結果，也不得替不存在的 commit 預填來源。合併時保留已審核 history 可保留現有來源追溯；任何改寫後的 pin 更新須另作可審查變更。

本 thread 以目前可查證的 history、fresh build 與 HTTP 結果回覆並 resolve，沒有宣稱未來 history rewrite 已解決。
