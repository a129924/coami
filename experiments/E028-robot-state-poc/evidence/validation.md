# E028 驗證與決策

## Automated pass

- Genuine assertion RED先於production：kernel typed nonfunctional stub得到17項行為assertion fail；adapter另先跑nonfunctional stub。最初Node strip-only parameter property語法失敗保留於red.txt，但**不算行為RED**，修語法後才採assertion證據。
- 後續late newsource、record stop-before-bytes、successful producer缺可靠end亦有先RED後fix原始紀錄。沒有重造歷史RED。
- 最終 **35/35 Node24 unit tests** pass，strict browser/MOD typecheck與Vite production build exit0，fresh MOD compiler exit0。完整命令／exits見 [checks.txt](checks.txt)。Node v24.19.0；default shell為Node26，實際命令使用task-localNode24 PATH。
- 覆蓋原子完整資源、錄放雙向互斥、同資源requested/active/unknown拒絕、record/head獨立、say/head appearance衝突、timeout/failure不釋放、可靠end、immutable snapshot、wrong/stale/duplicate/tombstone、外部實際重疊的模型保留與unknown優先、不明occupancy、multi-source producer終結、clock停滯、中斷、異步decode/getUserMedia身份、同recorder stop事件先於bytes、full adopted neutral副作用與manifest、finished display eviction後late新來源。
- Fake-host／stock-factory注入測試是程式契約，**不證明真人效果或實機**。Vite既有Three.js bundle >500kB warning保留，Node stripTypeScriptTypes experimental warning保留；未為此引入新lint或改strict。

## Simulator evidence actually observed

- Official pinned archive固定digest、metadata及expected entries核對成功；E028 MOD freshly compiled且browser served mc.js/mc.wasm/STL/MOD hashes相符。No E027 cache或vendor patch。
- 實際Chrome boot／COAMI28 ready／engine-ready、head requested→active→reliable sequence-end inactive、say source clock-active→natural reliable end+producer terminal inactive，以及Say requested期間後到record拒絕均有28行原始metadata；見 [smoke](simulator-smoke.md)、[trace](trace.jsonl)。
- 最後producer缺end→unknown bounded修正在上述browser smoke之後，只由自動回歸覆蓋，沒有假稱final來源browser重跑。MOD bytes與observer source未因該adapter分支修正改變；最終source hashes已記provenance。
- CUA download等待timeout，檔案其實已下載；owner指定路徑的原始bytes副本已保存，不改原檔、不填人類結果。

## Awaiting-human

[H1–H6](human-run.md)全部awaiting-human：自己的口述被錄到及回放可辨、固定TTS可聽、nod/reset可見、live雙向拒絕／獨立活動對照、真權限／中斷條件。Agent沒有填heard、seen或人類pass。Owner可直接在5198操作並下載metadata。

## Unverified / capability gaps

- 本次沒有實際microphone capture/replay smoke；程式接口與ordering有unit測試，效果須人類實作。未用fake mic假裝真錄音。
- H6中斷只有自動模型／fake-host驗證，實際瀏覽器權限變更若無法重現則保持unverified。外部record/output overlap只在unit受控觀測，沒有宣稱本次live overlap。
- Tone明確unsupported reject；沒有tone Action。ASR、general stop/cancel、camera/touch/IMU、gaze、Server整合、其他provider、硬體、馬達物理停止、回音消除／插話未驗證。
- Kernel finished rows128、diagnostics256與UItrace2000有界；adapter callback索引及identity tombstones按session保留，長時間高量session記憶體成長未最佳化。Reload是新managed epoch，不是device停止證據。
- Optional analysis層缺失依批准plan明示；未補造需求。PR31僅作revision-bound唯讀語義基準，不搬入其docs/plan或改PR。

## Decision

實作與可執行交接已準備供**獨立 implementation review**；作者不自批gate。自動契約通過，實際simulator證據與人類pending分開。依批准scope可在H1–H6 awaiting-human時交Draft PR human review；不宣稱整體真機／人類效果通過，不merge、不production promotion。Root負責正式gate、topic commit/push與Draft PR。
