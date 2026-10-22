# E028 — Robot State POC

## 問題與決策

在固定 browser/WASM simulator 上，能否以獨立 recording/output/head 維度保留 requested/active/unknown/inactive、完整資源原子准入及可靠生命週期關聯，而不把 Promise 或 Server cancel 當停止？

本實驗是**可執行 strict TypeScript POC**，不是 production promotion。語義基準唯讀引用 PR #31 `eb1b4b7beb8a0eea4fff05d086c4de66c0d42f13:docs/robot-state-semantics.md`；不修改該 PR 或 dev。計畫及 exact allowlist 見 [E028 topic plan](../../plan/E028-robot-state-poc/E028-robot-state-poc.plan.md)。

## 執行程序

需 Node 24、npm、已登入的 GitHub CLI，以及 pinned SDK submodule。以下命令從此 feature worktree 執行：

```sh
cd experiments/E028-robot-state-poc/web
PATH=/opt/homebrew/opt/node@24/bin:$PATH npm ci --ignore-scripts --no-audit --no-fund
PATH=/opt/homebrew/opt/node@24/bin:$PATH npm test
PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run typecheck
PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run build
PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run prepare:poc
PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run dev
```

macOS 的 Node24 路徑如不同，改用實際 Node24；不能由預設 Node26 冒充。開 `http://127.0.0.1:5198/`，按啟動／解鎖音訊，等待約8秒 startup chooser。只有 MOD ready 才開放操作。來源與 served asset hashes 驗證在 boot 前完成；official artifact 過期／下載失敗時直接停止，不替換 runtime。錄音與 host replay 只用本頁記憶體，不上傳音訊；下載按鈕只輸出 metadata。詳見 [人工步驟](evidence/human-run.md)。

## POC 行為

- Kernel 同步原子保留全資源；record=麥克風、say=output+appearance、host replay=output、head.nod=head+appearance。錄放互斥，say/head亦因appearance互斥；record/head可獨立共存。
- 被拒絕不派送、不排隊、不搶占。按鈕在活動中仍能按，顯示具體拒絕與衝突 identity。
- 接受只是 requested。MediaRecorder start／同操作播放區間內前進的 AudioContext／MOD sequence-start 才是開始證據。MediaRecorder stop **事件**才是 capture end；stop呼叫、buffer bytes、record Promise 不代替。
- Output 要成功 producer terminal、至少一個已確認開始 source，以及全部 source 可靠自然結束才釋放。Clock停止、interrupt、無 source、錯token、producer失敗保留unknown。每次stock factory呼叫在await前固定身份，避免晚到decode/getUserMedia套到最新要求。
- Head 的最後neutral依 E005 完整寫expression、左右眼、mouth及head；只有全序列結束才 inactive，pose arrival/motor stop 始終unknown。
- 外部 overlap unit觀測保留各operation與policy violation；未在本次live simulator製造或宣稱真實overlap。無法歸屬的輸入保留unknown occupancy，阻擋後續准入。30秒診斷只markunknown，不停止。
- Kernel最多顯示128筆finished operation、256筆diagnostic；UI metadata trace最多2000筆並附droppedEvents。身份tombstones及adapter callback索引為session生命週期保留，不以淘汰畫面歷史重新接受晚到來源；長時間高量session的記憶體成長尚未最佳化。

## 證據分類

[validation](evidence/validation.md) 分列 automated pass、實際 simulator evidence、awaiting-human、unverified gaps。RED原始紀錄見 [red.txt](evidence/red.txt)，GREEN／strict/build見 [checks.txt](evidence/checks.txt)，固定工具與runtime bytes見 [runtime-provenance](evidence/runtime-provenance.json)。

E005/E025只作來源基準，舊真人觀測不是E028新結果。音訊可聽、自己的口述被錄到、nod視覺符合，均須真人另填；程式metadata不宣稱這些效果。ASR、generic stop/cancel、gaze、camera/touch/IMU、Server整合、硬體均不在本次範圍；tone不整合，adapter明確reject，不回成功noop。
