# E020 PR comment review and fix：第十輪（2026-10-14）

## Finding 與範圍

新增 thread 再次指出 squash history 的來源 pin 失配。第九輪對實際 PR `83c8d99` 的查證仍成立；本輪增加真正單一 commit、缺少原始 Git objects 的測試，重現既有 builder／ancestry gate 對 squash 的依賴。針對這個可重現根因修正，而不替目前 PR 中不可得的 f267bd7 預填 pin。

## 身分契約

- production-bundle-pin 與 harness provenance 新增 sourceManifestSha256：Git HEAD 中完整 harness-pin.json bytes 的 SHA256。clean-checkout gate 驗證磁碟 manifest 與每個 input，preview 再要求 committed pin 的 manifest digest、實際 provenance digest、當前 Git manifest digest 三者相同，及完整 bundle bytes 相符。
- sourceCommit 明確代表「已審核輸入的原始來源參照」，不是執行這次 build 的 checkout SHA。只要輸入 manifest digest 等於既有 reviewed pin，builder 保留該來源參照；preview 仍要求 sourceCommit 嚴格等於 pin。原始 commit object 不必存在於 squash checkout，內容可由固定 manifest／逐檔 digest 追溯，不以 ancestry 代替內容驗證。
- 輸入改變時，builder 使用目前 manifest input revision 作候選來源，必須更新與提交 digest、bundle pin 及證據才可 preview，不能把新內容默認為既有 reviewed source。
- 此規則取代第八／九輪對原始來源 commit 必須存在於當前 history 的要求；仍保留 commit reference equality、Git HEAD pin anchor、clean checkout、runtime/MOD authenticity 與 immutable preview snapshot。未加入聲稱當次 checkout SHA 的可變 metadata。

## 回歸

單一 commit 的 fixture 刻意不包含 pinned sourceCommit object；red 證明舊 builder 改寫來源，green 證明相同 reviewed tree 可重建並驗證，篡改 sourceManifestSha256 則拒絕。原有替換 sourceCommit、篡改 bundle/provenance 與 dirty source tests 持續通過。最終 clean build／完整實驗 squash fixture 的實際 HTTP 結果另記於本輪 evidence。

本輪不重建 SDK/WASM/MOD，不執行 browser UI／真人方向驗收，既有人工證據限制不變。Squash fixture 是獨立測試 repo，不改寫 PR branch 或 dev history。

最終驗證：22 unit／12 scripts／6 patched-controller contract、strict checks、clean production build PASS。將完整 tracked tree archive 到獨立 repo 並只建立單一 commit，確認原始 sourceCommit object 不存在，複製相同已驗證 runtime 與依賴後重跑 web build／strict checks；來源參照、sourceManifestSha256、所有 bundle hashes 與 committed pin 相同，實際 preview HTTP 檢查通過。見 review10-squash-build.txt 與 review10-squash-verification.json。測試 server 已停止，沒有改寫 PR/dev history，沒有重建 WASM 或執行 browser UI／真人驗收。
