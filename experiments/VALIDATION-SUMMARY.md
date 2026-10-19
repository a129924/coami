# E001–E025 可行性驗證總覽

本頁將既有實驗依 feasibility-validation 的八段結構整合，回答「驗證了什麼、證據支持到哪裡、哪些決策仍不能前進」。成功、否定結果、無法判定及工具流程都保留；本頁不是產品能力清單或正式採用核准。

- 整理日期：2026-10-19。
- 來源基準：E001–E024 沿用 Coami `ddef30883df3b2f7b2bba84bb7278c1502eb8d08` 的已提交文件與公開證據；E025 Server工作取消增補依已合併 [PR #29](https://github.com/a129924/coami/pull/29)，merge commit `7985bff1bcb610accfc31009267af6ac8677d6f0` 的紀錄與證據；E025直接錄放重疊增補依已合併 [PR #27](https://github.com/a129924/coami/pull/27)，merge commit `02ee10ea0dd202a20923db4e0d80b25a440b156b`。原 E001–E024 結論不變。
- 方法：唯讀核對 README、EXPERIMENT、相關 evidence 與既有決策入口。本次未重跑實驗、模型、建置或原實驗測試，也未重新計算門檻。
- 來源優先序：先辨認問題、run、版本及後續明示限縮，再判讀；不以較新日期或較樂觀敘述自動取代原結果。原始紀錄與決策文件持有詳細證據，本頁只提供摘要與連結。

## 閱讀與分類規則

1. **歷史原文結論、回溯分類、原輪任務完成否分開。** 實驗四態僅為「未執行／成功／失敗／無法判定」。成功／失敗只表示對應假設成立／不成立，不表示產品已採用或所有工程／人工審查已完成。
2. 回溯分類依原問題、原判準及實際證據；PASS、build、tests、SDK 返回、PR Ready 或 review approved 都不能單獨證明主要假設。多個假設分列，不強加逐主題或逐 E 的單一總狀態。
3. 早期紀錄未一致保存設計日期、判準設定時間、投入上限與「驗證任務完成」欄；缺者記為「歷史紀錄未載」或「未記錄」，不補造事前條件。下列「判準」轉述來源，並非本次追溯新增的事前判準。
4. 真實瀏覽器 runtime、真人觀察、agent 自動操作、純測試／Mock、synthetic 輸入分開。模擬器使用實際 WASM 不代表實體 Robot 已驗證。
5. 重現步驟是原入口與歷史程序，**不是本次執行紀錄或再次執行授權**。日期、版本、run ID、指令與雜湊依各 E 原紀錄，不把本頁來源基準當成舊 run 的執行版本。
6. 未解衝突、缺檔、外部私人路徑或不可得資料，只限制相關結論，不以其他片段補證。原文 PR 狀態是歷史紀錄，本頁沒有重新查核各舊 PR 的即時狀態；兩個E025增補分別核對PR #29（2026-10-19T06:37:20Z）與PR #27（2026-10-19T06:45:48Z）已合併。合併不代替實驗成功證據，也不等於正式採用。

目前共26個實驗目錄，兩個不同實驗沿用E025編號；下列以完整目錄連結區分，不重編原始紀錄，不將Server取消證據與模擬器錄放證據混用。

## 逐 E 對照索引

「未記錄」是完成欄的資訊缺口，不是第五種實驗狀態。表中成功一律限於該列已驗證條件；主要證據及判讀理由在後續八段主題中。

| E／原紀錄與主要問題 | 歷史原文結論 | 本次回溯分類／理由 | 原輪任務完成記載 | 證據條件／主要限制 |
| --- | --- | --- | --- | --- |
| [E001](E001-visible-greet/EXPERIMENT.md)：Server 命令能否觸發可見招呼並查到結果？ | 端到端路徑通過 | 成功：202→笑臉／點頭→同 ID completed；stop 可取消 | 未記錄獨立完成欄 | Browser simulator；未驗證實機 Wi-Fi／馬達 |
| [E002](E002-agent-skills-validation/EXPERIMENT.md)：技能發現、腳本與 TDD 演練是否可用？ | 17 技能可發現、tracker 56 tests；追加 TDD 演練相容 | 發現／腳本成功；實際 skill 載入與獨立因果效果無法判定 | 未記錄獨立完成欄 | CLI／fixture；缺原始 skill-read event、無對照試驗 |
| [E003](E003-robot-event-loop/EXPERIMENT.md)：Robot 事件能否走完 Server 決策與結果迴路？ | Stage 1／2 PASS | 成功：同次事件、命令及終態可關聯 | 未記錄獨立完成欄 | Simulator A→Context→trace→bridge；非實機 transport |
| [E004](E004-named-action-dispatch/EXPERIMENT.md)：Docs Enum 動作能否具名派送？ | Simulator 驗證通過 | 成功：實際 Docs Execute 與同 ID 終態、事件回歸有證據 | 未記錄獨立完成欄 | 單 Robot／greet；send 成功不等於裝置完成 |
| [E005](E005-robot-action-catalog/EXPERIMENT.md)：動作目錄哪些效果可辨識？ | 協定可行；17 visual PASS、3 FAIL | Selector 協定成功；視覺17成功、3失敗，分項保留 | 未記錄獨立完成欄 | 20 個 MOD completed 不等於20個視覺成功 |
| [E006](E006-audio-output/EXPERIMENT.md)：tone 與 WAV 是否可聽辨？ | Audible feasibility PASS | 成功：有效 E006 capture＋非靜音音軌＋owner 聽辨 | 未記錄獨立完成欄 | 指定 simulator 聲音；錯分頁 capture 已拒收 |
| [E007](E007-microphone-recording/EXPERIMENT.md)：兩秒錄音能否辨識回放？ | Microphone feasibility PASS | 成功：28,310 bytes completed＋owner 辨識原短句 | 未記錄獨立完成欄 | 真人 Chrome／耳機；否定路徑部分為 Mock，無 ASR |
| [E008](E008-camera-input/EXPERIMENT.md)：webcam frame 是否真的到 MOD？ | 新 attested runtime 的 webcam／fallback PASS | 成功：三張唯一配對、遮／開觀察及停止／拒絕證據 | 未記錄獨立完成欄 | 真實 webcam 與 synthetic 分開；不保存 raw image |
| [E009](E009-screen-touch-greet/EXPERIMENT.md)：螢幕點選是否只觸發一次招呼？ | Creator simulator 檢查通過 | 成功：同次 touch→run→可見動作／終態；限已測主路徑 | 未記錄獨立完成欄 | Forced failure 僅純測試；視覺曾待 human PR review |
| [E010](E010-virtual-top-touch-greet/EXPERIMENT.md)：虛擬機頂 tap 能否經原生樣本觸發招呼？ | Accepted visible simulator POC | 可見操作成功；現 patch 完整 WASM 重建證據無法判定 | 未記錄獨立完成欄 | Owner 左／中／右 trace；原文仍要求工具可用後完整重建 |
| [E011](E011-screen-action-menu/EXPERIMENT.md)：螢幕捲動選單能否派送並如實回映？ | 主路徑有證據、獨立 approved | 成功：不可見項捲入→選取→可見動作→matching terminal | 未記錄獨立完成欄 | Forced failure／部分 cancel callback 僅純測試 |
| [E012](E012-jev-text-policy/EXPERIMENT.md)：固定案例的三段 Jev 判斷是否全符預期？ | 原 live verdict FAIL，22/23 | 失敗：保留原 mismatch；後續離線 gate 契約另列 | 技術 review 完成；TC08 人審 pending | 真實 Jev＋人工案例；不生成內容，不改 oracle |
| [E013](E013-jev-context-sufficiency/EXPERIMENT.md)：固定75案的判斷與完整原始回應為何？ | 描述性量測，不是 pass decision | 無法判定（回溯分類：未設假設成敗判準）；量測已完成 | summary.complete=true 為量測完整；獨立驗證任務欄未記錄 | 40 research／20 holdout／15 v0；不選採用門檻 |
| [E014](E014-ws-usage-expiry/EXPERIMENT.md)：到期停用是否保留 WS 診斷且重啟不續期？ | 核心 POC 可交付；Archify 視覺 failed | 核心行為成功；輔助圖失敗不改核心結論 | 未記錄獨立完成欄 | 真實 loopback Server／Node；5秒，不是30分鐘 soak |
| [E015](E015-manual-video-recording/README.md)：手動無聲錄影是否可輸出、取消、重開？ | 無法判定；本輪任務完成 | 無法判定：長段原始零音軌事件截斷 | 是：有限實測與判讀完成 | 真人 webcam＋MOD確認 frame；完整固定判準仍缺證據 |
| [E016](E016-top-touch-swipe/README.md)：raw samples 是否保留 swipe 與操作邊界？ | 無法判定；局部操作通過 | 無法判定：TC05 未執行分支、TC07 歷史 attestation 缺口 | 工程／真人操作紀錄完成；完整驗證未齊 | 真人與 agent automation 分列；不追補舊工具內容證明 |
| [E017](E017-top-swipe-event/README.md)：獨立 raw→SDK→MOD Swipe 是否正確且可恢復？ | 成功（pinned simulator） | 成功：真人主案例與自動故障／恢復依原限定判準 | 是：2026-10-13 simulator-only | 強度 synthetic；後續 lifecycle 回歸不冒充新真人 run |
| [E018](E018-tts-action/README.md)：固定日文是否由同次自然播放結束回報？ | 日文 TTS 假設獲支持，聽辨 PASS | 成功：SDK success／natural ended 關聯＋真人五筆聽辨 | 未記錄獨立完成欄 | E018 strict WebAudio bridge；非中文或外部語音服務 |
| [E019](E019-static-gaze/README.md)：四方向及解除後重新指定是否成立？ | 失敗；任務完成 | 失敗：上→解除→下無新向下旋轉 | 是：足以否定主要假設 | 原版 SDK；真人逐步畫面不完整，原失敗仍保留 |
| [E020](E020-sdk-gaze-pitch/README.md)：獨立 pitch 修正是否恢復反向注視？ | 歷史4/4 PASS，後限縮無法判定 | 無法判定：舊 run 缺 host attestation，新 gate 真人未執行 | 修正／判讀完成；新 gate 驗收未執行 | Copied-runtime patch；不能用後來 hashes 補舊 renderer |
| [E021](E021-imu-event/README.md)：raw 向量能否經原 SDK 產生六類 IMU Event？ | Synthetic-only 53/53 成功 | 成功：自動與 owner 操作的固定 synthetic matrix | verificationComplete=true，僅 controlled experiment | Raw vectors＋scratch clock/provider；非真實感測品質 |
| [E022](E022-jev-context-threshold/README.md)：研究候選能否降低誤採用並保留正確？ | Research 成功；79%候選 | 成功：research I→S 3→0、保留24筆正確 | 是：核心研究完成 | 離線固定證據；holdout 描述性，Owner 採納待決 |
| [E023](E023-target-offset-gaze/README.md)：固定模擬目標閉環是否全量置中？ | 主假設失敗；任務完成 | 失敗：完整15案11成功4失敗，原0.1判準未滿足 | 是：第六輪完整再驗證 | 真 WASM／rendered quaternion＋合成目標；非相機／實機 |
| [E024](E024-mock-target-offset/README.md)：Mock 框能否純轉換為當前偏差？ | 成功；任務完成 | 成功：19共同案例及分類／邊界 assertions 符合 | 是：單次 Mock 契約驗證 | Pure Python／自有 VO；無 detector、Tracker 或 Robot |
| [E025 · Server取消](E025-server-async-event-bus/README.md)：現成 bus 能否配合完整取消單一 Robot 舊工作並保留控制與其他 Robot？ | 成功；推薦 bubus 1.5.6 作後續候選 | 成功：修正後 12 節點各 20 次，240／240、0 watchdog，工作終止與 cleanup 可追溯 | 是：synthetic cooperative async／ASGI 驗證 | 短 handlers＋TaskGroup ownership；真 SDK／網路／執行緒／遠端工作／Robot 效果另驗 |
| [E025 · 直接錄放](E025-listening-saying-exclusion/README.md)：stock simulator會阻止直接record／say重疊嗎？ | 假設失敗；主要技術判讀完成 | 失敗：兩方向9筆均有有效重疊，否定直接API互斥假設 | 是：主要問題可判讀；8筆逐筆聽辨未保存的程序缺口保留 | 真人Chrome／耳機、stock同pin官方runtime；XiaoZhi有輪流控制，真機錄放／回音／插話另驗 |

## 命令、事件與動作：E001、E003、E004、E005、E014

### 驗證什麼

E001 問 Server 命令是否能產生可見招呼並取得結果；E003 問 Robot 事件是否經 Server 固定決策走完迴路；E004 問具名 Enum 派送與 command 關聯；E005 分別問 selector 協定和候選的可見效果；E014 問使用期限與重啟是否維持授權邊界。這些是不同假設，不能以其中一個 PASS 代表整個控制系統成立。

### 為什麼

API／SDK 宣告與 send 成功不足以證明可見動作、同筆結果或過期停用。原實驗以實際 simulator／本機網路區分呼叫、傳送、執行及觀察；結論只供後續契約與能力選擇，不核准 production transport。

### 成功與失敗判準

| E | 來源判準／區辨條件 |
| --- | --- |
| E001 | POST 202、笑臉／點頭、同 ID completed；動作中 stop 使 greet cancelled。 |
| E003 | Stage 1 同次 A→Context→MOD→bridge，release 不重複；Stage 2 固定 greet 同 ID 完成、無 C→A 回圈，B 可中斷。 |
| E004 | Docs 實際 Execute Enum greet，動作後同 ID 終態；未知／離線／busy 拒絕及 E003 事件路徑另核對。 |
| E005 | A 選取 pressed／released 匹配後才 C；B 取消／reset 可關聯。視覺逐 action 獨立看錄影，不能只看 MOD completed。 |
| E014 | 真實5000ms grant：重送／重連／Robot重啟不續期；等於 deadline 拒絕，過期同連線 status 仍成功，雙端 exact-frame 配對。 |

E001–E005 未一致明載判準設定時間與投入上限；不追填。完整失敗／無法判定界線依各原紀錄；缺同次動作或關聯證據不能升級為成功。

### 環境與前置條件

E001／E003／E004 為 Python 3.12＋Node 24 browser bridge，固定單 Robot，狀態存記憶體。E005 是 TypeScript-only simulator selector。這些早期 simulator 固定 Stack-chan `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322` 與 Pages runtime `b0bcb60e17336e6bfb4af7466eb21a6ebbde46cd`，各實驗資產腳本核對 SHA-256。E014 是 Python Server＋Node24 Robot 的 loopback WebSocket，不執行硬體。

### 重現步驟

E001／E003／E004 依各 README 啟動 server/web、`npm run prepare:poc`，分別使用 POST greet、A event、Docs Execute；E005 從 web 建置並逐一操作候選，下載 JSONL；E014 依 [README](E014-ws-usage-expiry/README.md) 的 `npm run smoke` 啟動真實兩端與三次 Robot 程序。上述皆是重現入口，本次未執行；需要各自 pinned 依賴，不以現有 dev 環境代替舊 run。

### 是否成功

E001、E003、E004 的限定 simulator 迴路成功；E005 selector 成功，視覺17成功／3失敗。E014 核心5000ms行為成功，Archify 首屏視覺失敗另列。原輪完成記載依索引，不能從 review／PR 狀態補填「任務完成」。

### 結果與證據

- E001，2026-09-22：[EXPERIMENT](E001-visible-greet/EXPERIMENT.md) 保存 command `690a1a87-945e-4f1f-93a1-74ad241121fa`、中斷 ID 與 before/during/after 圖片。
- E003，2026-09-22：[Stage 1](E003-robot-event-loop/evidence/phase-1-event-bridge.md)、[Stage 2](E003-robot-event-loop/evidence/phase-2-full-loop.md)；Stage 2 event `666bce09-0f89-4f46-a53b-38fa8f1e0913` 關聯 command `74e3fce7-29d5-4b3b-894d-9ce8c7367200`。
- E004，2026-09-23：[full-loop](E004-named-action-dispatch/evidence/full-loop.md) 保存 Docs／事件回歸與同筆結果；後續 stale-session 競態修正有測試，未冒充手動 browser 重現。
- E005，2026-09-23／24：[action matrix](E005-robot-action-catalog/evidence/action-matrix.md) 保存逐 action run_seq／timecode。`face.doubtful`、`face.cold`、`face.hot` 視覺失敗；20次 MOD completed 仍不能改成20個視覺 PASS。
- E014：[EXPERIMENT](E014-ws-usage-expiry/EXPERIMENT.md) 保存成功 run `20c1b27d-3094-4a24-86cd-297a8b3fddd4`（18個雙端配對frames）、獨立重跑及失敗 harness run；[smoke](E014-ws-usage-expiry/evidence/smoke.jsonl)／[validation](E014-ws-usage-expiry/evidence/validation.txt) 分開網路行為與純測試。Archify 四尺寸垂直溢出是輔助圖失敗，不能隱去或當核心失敗。

### 結論與限制

已支持單機受控 command/event/result 與使用期限研究；未支持實機網路、伺服機構、多 Robot、持久化或認證。E014 Server 重啟會丟 grant，固定 robot ID 非身分驗證，30分鐘 soak 未執行。SDK／WebSocket 返回不能直接解讀為物理到位。

## 音訊、相機與錄影：E006、E007、E008、E015、E018

### 驗證什麼

E006 問 tone／WAV 可聽辨；E007 問兩秒 record 的同 buffer 回放是否可辨識；E008 問 webcam 是否真的到 MOD；E015 問 MOD-confirmed frame 的手動無聲錄影／取消／重開；E018 問固定日文 TTS 是否自然結束並回報同次結果。Tone、非空 buffer、camera preview 或 Blob 本身不能證明其他問題。

### 為什麼

SDK 接口不證明瀏覽器權限、音訊裝置、host→MOD 配對、編碼與真人聽辨／回放。原實驗加入實際 runtime、同次身分與人工觀察；Mock 只驗證局部錯誤路徑。

### 成功與失敗判準

- E006：440Hz／250ms tone 與660Hz／0.5s WAV 的有效 E006 分頁錄製，音軌可解碼且非靜音，獨立真人聽到兩種聲音。錯分頁或 trace 單獨不算。
- E007：`record(2000)` 非空、原 buffer 回放、真人辨識「一、二、三」；permission／empty／playback failures 另分類。
- E008：fixed checksum probe 一致、三個唯一 host→MOD webcam 配對與遮／開觀察；denial／unavailable 明標 synthetic，stop/restart 不混舊 frame。
- E015：原計畫約3s／8s／取消／重開；實際播放與錄製差≤1s、長段至少多3s、5s內ready、零音軌、取消無輸出、清理後計數靜止。長段缺零音軌原始事件即不足全量判定，不事後改判準以符合實際長度。
- E018：A→B→A 與 busy／failure；同次 SDK success、相同文字及 natural ended 才 completed，真人聽辨另列；watchdog／interruption 保持 unconfirmed。

早期 E006–E008 的完整事前設定時間／投入上限未一致記載；E015 明載90分鐘及有限修正，E018 30秒是 watchdog，不是主假設成功判準。

### 環境與前置條件

E006／E007：2026-09-24、Node26.4.0／npm11.17.0、Chrome、pinned Pages runtime；耳機聽辨記錄與麥克風型號缺口依原文。E008 需 macOS arm64、Moddable9.5.0／emsdk5.0.1／fontbm pinned sources，使用重新 attested runtime。E015／E018：2026-10-13、Node26.10.0／npm11.19.1，隔離工具鏈與實際 served hashes 依各 provenance。E015 是96×96 host副本編碼，不是 MOD encoder；E018 使用自己的 strict WebAudio bridge。

### 重現步驟

依各 README 的 `npm ci`、prepare、tests/build、dev 程序及工具鏈前提。E006 只錄正確分頁並回放；E007 兩秒說短句且不保存語音；E008 執行 probe／開遮開／拒絕／stop；E015 依 [README](E015-manual-video-recording/README.md) TC1–TC5 記 metadata 而不保存影像；E018 依 [README](E018-tts-action/README.md) 解鎖聲音、A/B 與失敗注入並匯出 trace。這些涉及權限與人工操作，本次均未重做。

### 是否成功

E006、E007、E008、E018 在原限定條件成功。E015 原任務完成但整體無法判定：有限操作有支持，不足補長段零音軌證據。任務完成、假設結果與人類 code review 分開。

### 結果與證據

- E006：[EXPERIMENT](E006-audio-output/EXPERIMENT.md) 保存 replacement capture SHA-256 `157d6b3fdef509c7b9f4fb3d1a8b2d92edfaf8b064f841dfda379409193c7076`、5.272s E006畫面與人類 replay 聽辨。先前 YouTube 分頁 capture 已拒收，不當成證據。
- E007：[recording-run](E007-microphone-recording/evidence/recording-run.md) 的 `run_seq=3`、28,310 bytes completed 及 owner 聽辨；permission denial 等 Mock 不當真實權限實測。
- E008：[camera-run](E008-camera-input/evidence/camera-run.md) 保存 pinned tool/runtime hashes、三張96×96配對及 luma 121→47→141；真實 denial 與 simulated unsupported/no-device 分開。未保存 raw pixels。
- E015：[recording-run](E015-manual-video-recording/evidence/recording-run.md) 保存 owner 操作；實際短／長錄製5.911／29.473s，播放5.754／29.316s；重開播放亦有紀錄。長段零音軌事件截斷，不能用其他段補造。後續27項pure tests不冒充新真人錄影。
- E018：[tts-run](E018-tts-action/evidence/tts-run.md)、[trace](E018-tts-action/evidence/tts-trace.jsonl)、[runtime provenance](E018-tts-action/evidence/runtime-provenance.json)；Andrew 2026-10-13 以耳機聽辨五筆 A→B→A→B→A，全部相符，同次 natural ended 關聯另核對。

### 結論與限制

只支持指定 browser/simulator 的有限媒體路徑。未支持真機感測／喇叭品質、ASR、串流PCM、中文TTS、跨瀏覽器、fps保證或production。E015 整體假設仍受證據缺口限制；需要新證據時另限定重跑，不因此改原紀錄。

## 螢幕、頂部觸控、Swipe 與 IMU：E009、E010、E011、E016、E017、E021

### 驗證什麼

E009 問螢幕選項單次招呼；E010 問三區虛擬機頂 tap→原生 TouchPanel 樣本；E011 問螢幕捲動／選取／終態；E016、E017 分別建立獨立 raw swipe 路徑；E021 問 controlled raw IMU 向量能否經原 recognizer 到 MOD 六種事件。不把 named-event 注入、gesture 宣告或 UI 動畫當 runtime輸入證據。

### 為什麼

原 SDK 有事件型別，不代表 browser host/native bridge 提供原始樣本，也不保證取消／busy／時鐘與生命週期正確。各實驗以實際接線及分層證據區分 raw、SDK、MOD 與 UI。

### 成功與失敗判準

| E | 原判準要點 |
| --- | --- |
| E009 | 有效選項觸碰只一個run；選項外／移出／cancel不觸發；matching terminal回映。 |
| E010 | 左／中／右短tap各完成一次；busy不排隊；超過300ms／15CSSpx、跨區／取消等不得發raw sample。 |
| E011 | 初始不可見項捲入後選取，動作與matching terminal同次；純滑動／取消／busy不誤派送。 |
| E016 | 雙向真人各3次、每contact一次、連續操作、tap／短移不Swipe、取消恢復、MOD/UI一致及來源可信；精準±60為raw fixture。 |
| E017 | 雙向真人各3次與保持／反向／取消／恢復，zero consumed後再開操作；缺provider／metadata／初始化故障明確停用，來源可追溯。 |
| E021 | 固定53案六事件、negative／cooldown／邊界／fault／stop/recovery；raw樣本與SDK Event時鐘關聯。跨過cooldown時界者無法判定，不能硬判negative PASS。 |

E016／E017 各自有原投入上限與重建限制，不相互補證；E021 matrix 所有成功只限 synthetic。各未執行分支與缺證據仍保留，不以純測試替代。

### 環境與前置條件

共同 SDK pin 為 `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`，但 patch/runtime/provenance **各自不同，不可交換**。E009／E011 使用指定3D螢幕；E010／E016／E017 需各自 copied-source WASM patch。E016／E017 為macOS、Node26.10.0及pinned Moddable9.5.0／emsdk5.0.1工具鏈；E016 新重現另需可信tool/dependency manifest，不能補證舊run。E021 以scratch `time` alias提供monotonic ticks，SDK IMU／recognizer／threshold／Event bytes未改；向量是configured zxy frame的合成m/s²。

### 重現步驟

從各 E 的 web README 執行依賴、prepare、build與dev；不得改用其他 E binaries。E009 點螢幕選項並做移出；E010 三區短tap；E011 捲入 `head.center` 後點選；E016／E017 按各自真人程序與 trace export 核方向／session／operation。E021 依 [TOOLCHAIN](E021-imu-event/runtime/TOOLCHAIN.md)、[README](E021-imu-event/README.md) 執行 `npm run smoke` 或owner synthetic matrix；diagnostic subset不代表53案完成。本次沒有執行任何上述操作。

### 是否成功

E009／E011 的限定主路徑成功。E010 原可見POC有手動支持，但原文仍要求現patch完整WASM重建，不能宣稱該缺口已解除。E016 整體無法判定；E017 限定pinned simulator成功；E021 成功與完成旗標僅限controlled synthetic matrix。

### 結果與證據

- E009：[touch-greet-run](E009-screen-touch-greet/evidence/touch-greet-run.md) 與同次WebM；初版移出仍誤觸已修正並重跑，forced failure只經純測試。
- E010：[top-touch-greet-run](E010-virtual-top-touch-greet/evidence/top-touch-greet-run.md) 有owner三區completed及busy trace。[EXPERIMENT](E010-virtual-top-touch-greet/EXPERIMENT.md) 保留完整scratch WASM需重建的限制，不以手動trace補版本綁定。
- E011，2026-09-30：[action-menu-run](E011-screen-action-menu/evidence/action-menu-run.md)、[PR修正](E011-screen-action-menu/evidence/pr-review-fix.md)；同次捲動→`head.center`→動作／終態及負向結果。後者13項tests與browser回歸分列。
- E016：[verification](E016-top-touch-swipe/evidence/verification.json)、[owner匯出](E016-top-touch-swipe/evidence/operator-session-1-through-operation-17.json) 與 [README真人表](E016-top-touch-swipe/README.md)。TC05完整initialize/reset／初始化不可用未執行，TC07舊run缺工具／dependency tree hashes。Operation15無新Swipe的FAIL與程序不明項保留；不推測失敗軌跡或用今天hash追補。
- E017：[swipe-run](E017-top-swipe-event/evidence/swipe-run.md)、[acceptance-summary](E017-top-swipe-event/evidence/acceptance-summary.json)、[runtime-automated](E017-top-swipe-event/evidence/runtime-automated.json)。初次真人失敗及高頻coalescing修正前後分開；後續lifecycle mock回歸不重標舊真人版本。原文active途中restart／provider-missing未另真人或故障注入的限制保留。
- E021：[operator-session](E021-imu-event/evidence/operator-session.json)、[acceptance-summary](E021-imu-event/evidence/acceptance-summary.json)、[runtime-automated](E021-imu-event/evidence/runtime-automated.json)；owner操作53案與32份原始匯出、自動53案、先前inconclusive attempts分列。最終2026-10-16T03:28:23.774Z的自動再驗證53/53及56 source tests不是實機證據。

### 結論與限制

可支援指定simulator的互動研究，不能外推實體K151／螢幕觸控品質、IMU安裝方向、靈敏度或誤報率。E016 的TC05／TC07與E010重建限制不因E017成功而解除；E021理想raw vectors與scratch provider／clock亦不證明upstream原生硬體支援。所有事件到產品Action的採用仍需另決策。

## Jev 政策、情境充分性與門檻：E012、E013、E022

### 驗證什麼

E012 問固定案例的 Input／Context Sufficiency／Output 判斷與唯一有限Action；E013 量測凍結75案的Context choices並保存完整回應；E022 問research上選出的採用候選能否嚴格減少I→S且保留至少一筆正確choice。三者不是同一個通過判定。

### 為什麼

SDK schema能確認字段，不能回答模型在固定案例的實際選擇與門檻取捨。E012／E013因此有真實Jev run；E022重播既有證據，沒有新呼叫。不以router BLOCK改寫模型錯誤，不把輸出機率當校準安全風險。

### 成功與失敗判準

- E012：原23案全部符合固定oracle與routing才automatic PASS，且delivery另需TC08人工審查；原mismatch即FAIL。後續 gate=`probabilities[raw choice] >= caller threshold`，無預設、不改raw choice；只驗契約，不選產品值。
- E013：固定40／20／15順序、完整2xx bytes與逐案追溯是量測完整性要求；原文不選pass threshold，沒有假設成立／不成立的事前判準。本次不補造產品成敗標準。
- E022：research的101個整數百分比點，按誤採用I→S最少→保留正確最多→同效用最低排序；成功須比0% baseline嚴格少I→S且保留至少一筆正確。holdout／v0只固定後描述，不選值、不改排序。

### 環境與前置條件

Python3.12、`typesafe-sdk==0.7.2`、`jev-1.13.0`為原live條件；各run的lock／source／freeze／store policy依原manifest。E012原HEAD為base而非runner bytes，事後source association不等於執行時attestation。E013已公開reviewed subset可查，私人local staging原文標未backup／非immutable，本頁不讀私人store或憑證。E022在固定source revision `a855b451b6fe1c24d02caf67c569ffa90a9ea732` 的隔離checkout離線核對，不改凍結oracle。

### 重現步驟

E012／E013的歷史live命令與新run前提依各 README；本頁不複製憑證、live授權或長bootstrap。讀 [E012 summary](E012-jev-text-policy/evidence/run-summary.json)、[E013 reviewed run](E013-jev-context-sufficiency/evidence/runs/20261008T035450Z-010364d7/summary.json) 即可查既有結果。E022 `verify-source`→research→freeze→check-heldout的操作入口在 [README](E022-jev-context-threshold/README.md)；歷史exclusive output不應覆寫，本次不執行重播或重算。

### 是否成功

E012原live失敗，後續offline gate成功不改原FAIL或人審pending。E013量測完整，四態為「無法判定（回溯：缺原成敗判準）」；不將complete=true當假設成功。E022 research主要假設成功且核心研究完成；產品採納尚待Owner決定。

### 結果與證據

- E012 run `20261005T042808Z-1a07e13b`：[live-results](E012-jev-text-policy/evidence/live-results.jsonl)、[run-summary](E012-jev-text-policy/evidence/run-summary.json)、[human-review](E012-jev-text-policy/evidence/human-review.md)。23案／57 stage calls、22/23符合；`toy_car_ambiguous_001` expected INSUFFICIENT而actual SUFFICIENT。最終BLOCK不把該choice改成正確；[source-provenance](E012-jev-text-policy/evidence/source-provenance.json)是事後關聯。
- E013 run `20261008T035450Z-010364d7`：[manifest](E013-jev-context-sufficiency/evidence/runs/20261008T035450Z-010364d7/manifest.json)、[summary](E013-jev-context-sufficiency/evidence/runs/20261008T035450Z-010364d7/summary.json)、[逐案公開審查](E013-jev-context-sufficiency/evidence/runs/20261008T035450Z-010364d7/review.json)。75筆VALID，raw correct research35/40、holdout17/20、v0 14/15；完整性不等於模型全對。後續authorization與dependency guard不追造歷史pre-run授權記錄。
- E022：[integrity](E022-jev-context-threshold/evidence/integrity.json)、[candidate-freeze](E022-jev-context-threshold/evidence/candidate-freeze.json)、[report](E022-jev-context-threshold/evidence/report.md)。79%於2026-10-15T04:01:12.505701+00:00固定；research已採用I→S 3→0、保留正確24/35、拒絕正確11/35；holdout保留13/17、拒絕4/17；v0保留12/14、拒絕2/14。原raw正誤未改。

### 結論與限制

採納狀態以 [Context Sufficiency門檻決策](../docs/decisions/context-sufficiency-threshold.md) 為入口：79%是研究候選，不是產品預設，也不外推Input／Output Policy。有限40／20／15樣本、已公開holdout與零觀察誤採用不能證明安全達標。E012人審、E013儲存保證與後續產品風險選擇不能由本頁宣告完成。

## 注視、SDK 換算與目標偏差：E019、E020、E023、E024

### 驗證什麼

E019 問原版SDK四方向與解除後重新指定；E020問獨立一行pitch修正；E023問真正SDK＋rendered姿態回饋的全量閉環；E024問單次Mock框到TargetOffset的pure轉換。四者的runtime、輸入與成立範圍不互相補證。

### 為什麼

`lookAt()`同步返回只表示呼叫，不能證明姿態或置中。原SDK相對角度嚴格大於30°才進轉動流程；Calculator公式正確也不保證精細控制。E024的文件已足以支持adapter映射問題，執行只驗固定Mock契約，沒有真實OpenCV或Robot。

### 成功與失敗判準

- E019：四方向從固定起始各2次；左→解除→右、上→解除→下均取得新方向；解除契約與實際操作分開。有效環境下違反任一主要判準即失敗。
- E020：上下兩種反向重新指定各2次，期間不prepare；新相反命令與真人方向一致、共享眼神／水平／解除回歸不破壞。runtime身分或真人證據不足為無法判定。
- E023：雙軸絕對偏差≤0.1，最多20次控制且連續3筆置中；獨立rendered quaternion重投影。計算、傳遞、防護及全部15案須過；缺可靠回饋無法判定，有可靠未收斂則失敗。
- E024：19共同案例、分類與非法值／身分／不可變／確定性assertions符合；absolute tolerance 1e-12、relative 0。無目標不是(0,0)，非法值不能產生可用偏差。

原投入上限：E019 90分鐘／有限修正；E020一個最小patch與一次fresh WASM；E023 90分鐘與最多一輪局部修正；E024 60分鐘與一輪局部修正。這些是原研究界線，本頁沒有新執行預算。

### 環境與前置條件

E019／E020：macOS arm64、Node26.10.0、pinned SDK與工具鏈、正面同高視角；E020只對copied source套patch，vendor未改。E023仍用原版SDK，未納入E020 patch；synthetic camera FOV90°、無安裝平移／旋轉、靜態世界目標，真實rendered quaternion不讀command cache。E024：2026-10-15、Python3.12.12、stdlib runtime，手定未鏡像單次框；無攝影機或SDK。

### 重現步驟

E019／E020按各README準備精確runtime、build後preview、起始姿態及具名人工程序；E020新gate必須有host／mesh／MOD完整來源核對。E023依 [README](E023-target-offset-gaze/README.md) 的 `npm run test:runtime` 對固定runtime跑完整15案，先非運動probe再閉環，輸出新run而非覆寫歷史。E024入口為在 `experiments/E024-mock-target-offset/` 目錄執行 `python3.12 -m unittest -v` 與 `python3.12 run_cases.py`。本次僅讀記錄，未執行。

### 是否成功

E019原版假設失敗，任務完成；E020歷史4/4觀察保留，但新來源gate驗收無法判定。E023主假設失敗、任務完成；E024成功只限單次Mock契約。不能用E020舊PASS或E024pure成功改寫E019／E023。

### 結果與證據

- E019：[human-run](E019-static-gaze/evidence/human-run.md)、[human-final](E019-static-gaze/evidence/human-final.json)、[human-retry](E019-static-gaze/evidence/human-retry.json)、[pitch diagnostic](E019-static-gaze/evidence/pitch-diagnostic/README.md)。2026-10-14真人四方向8次符合，但上→解除→下沒有新向下rotation；24項final及28項retry保留，逐步真人畫面不完整。
- E020：[human-final](E020-sdk-gaze-pitch/evidence/human-final.json)、[human-run](E020-sdk-gaze-pitch/evidence/human-run.md)、[review3限縮](E020-sdk-gaze-pitch/evidence/review3-fixes.md)。真人run `E020-2026-10-14T02-19-22-568Z` 為歷史4/4；舊run缺host attestation，後來host hashes不能補renderer。新gate真人未執行；readme後段舊「成功」敘述須併讀前段與明示限縮。
- E023：[manifest-run](E023-target-offset-gaze/evidence/manifest-run.md)、[results](E023-target-offset-gaze/evidence/results.json)、[current audit](E023-target-offset-gaze/evidence/wasm-evidence-audit-current.json)。正式完整run `WASM-2026-10-16T08-20-00-487Z` 是第六輪，15案11成功／4失敗；近中心±0.11四案各20次仍未置中。第七至九輪partial smoke／audit不追溯補全量或舊建置保證。
- E024：[run](E024-mock-target-offset/evidence/run.json)、[common-cases](E024-mock-target-offset/evidence/common-cases.txt)、[tests](E024-mock-target-offset/evidence/tests.txt)：19個手定快照、12測試方法含subtests。初始module missing不冒稱行為級RED；首輪lint/type失敗與最終通過分開保存。

### 結論與限制

現有 [Robot注視限制](../docs/limitations/robot-gaze.md) 持有E023固定SDK限制：0.11在該理想模型約需6.28°，低於30°門檻，SDK返回不能當到位；無改善停止等建議尚未實作。修SDK策略需另topic與完整再驗證，不放寬原0.1判準。

E024 TargetOffset是當前框中心相對當前畫面中心，不是prev-curr、角度或控制狀態。相同輸入重複輸出不會自行趨零；無框、拒絕與Target互斥，模型錯誤不可假裝無目標。真detector／Tracker、consumer相容性、相機校正、實機與動態控制均未驗證。

## Server 工作取消與隔離：E025

### 驗證什麼

Server 收到已成立的取消訊號後，bubus 1.5.6 能否配合標準非同步原語，結束該 Robot 的執行中、排隊、子任務與 async subscriber 業務工作並完成清理，同時保留 WebSocket、控制訊號與其他 Robot？「孩子說不要」是需求情境；語音／拒絕意圖辨識不在本輪。

### 為什麼

現成 EventBus 與 Pydantic 支援不能自動證明完整取消。原紀錄核對 bubus 的同 event loop 共用鎖與停止語意，不能以 `parallel_handlers` 或 `bus.stop()` 返回宣稱 Robot 隔離／工作清理完成。實驗讓 bus 僅做短派送，handlers 將長工作登記到 Robot 的 `asyncio.TaskGroup`；取消由 receiver 直接觸發工作範圍，不排在業務 bus 或滿載 queue 後面，也沒有另造 EventBus。

### 成功與失敗判準

[Shared spec R1–R6](../plan/E025-server-async-event-bus/E025-server-async-event-bus.spec.md) 在執行前固定：全部舊業務結束並通過 cleanup barrier、queued 工作不開始；B 在 A 取消前及清理中均可前進；滿載／重複取消仍保留 control；舊 bus 事件與尚未開始傳送的舊結果失效；清理完成後可開始新工作；斷線取消、重連不續舊工作，清理／子任務／subscriber 故障則跨連線隔離而不假報完成。

12 個主要參數化節點各在獨立程序重複 20 次。完整違規證據為失敗；環境或中止造成證據不足為無法判定。原 cleanup／barrier 上限 2 秒、case watchdog 10 秒、個別 worker 外層 30 秒及 90 分鐘投入界線是合成實驗限制，不是產品 SLA，本次總覽增補不重設或執行這些預算。

### 環境與前置條件

原執行環境為 macOS 26.5.2 arm64、Python 3.12.12、bubus 1.5.6、FastAPI 0.141.1、Starlette 1.6.0、AnyIO 4.15.1、Pydantic 2.13.5，工具及 lock 依 [toolchain](E025-server-async-event-bus/evidence/toolchain.txt)。同一 worker 內的 A／B sessions 使用同一 TestClient／portal／app event loop，記錄 loop identity，避免跨 loop 掩蓋 bus 鎖的影響。

這是實際 bubus 與 FastAPI ASGI 整合，但 Robot、工作與清理資源皆為可控 synthetic 模型，不是實際網路或硬體。Robot identity 亦非已驗證身份；正式 server/device 程式及通信契約未因此採用本實驗。

### 重現步驟

[E025 README](E025-server-async-event-bus/README.md) 持有 `uv sync --frozen`、lint／typecheck／pytest 與 `run_experiment.py` 的完整入口。外層 runner 每次啟動獨立 worker，保存參數節點、次數、退出原因、audit 與來源雜湊；另一次執行須使用新輸出目錄及獲授權的新 deadline，不覆寫歷史證據。本次清理與文件增補只核對已提交紀錄，不重跑矩陣。

### 是否成功

**成功；原輪驗證任務完成：是。** 修正後於 2026-10-19T04:37:06.879539+00:00 至 04:38:57.013972+00:00 完成 240／240 次，failure、inconclusive、watchdog 均為 0，每個成功 worker 有零殘留業務工作的 teardown 證據。額外 invalid-input smoke、Ruff、strict Pyright 與 writer OSError 診斷分列，不拿一般 checks 或 PR 合併代替主假設證據。

### 結果與證據

- [summary](E025-server-async-event-bus/evidence/summary.json)、[逐次 audit](E025-server-async-event-bus/evidence/runs.jsonl)、[worker transcripts](E025-server-async-event-bus/evidence/workers.log)：完整取消、多 Robot 隔離、滿載、斷線重連各 20 次；四種競態各 20 次；四種故障隔離各 20 次，合計 240 次。
- 工作 `started／cleaned／ended／scope_stopped`、取消截點與傳送開始／完成分開記錄，確認 queued 工作不啟動、bus-pending 舊事件不能新建業務、writer-pending 舊結果不開始傳送，barrier 後新工作可執行。
- [checks](E025-server-async-event-bus/evidence/checks.txt) 保存驗證命令與 OSError 注入診斷，確認 writer terminal audit 包含 Robot／session／例外，B control 仍可用。第一輪 240 次後的獨立 code review 要求這項 bounded 修正；[round-1](E025-server-async-event-bus/evidence/round-1/summary.json) 與 [原來源](E025-server-async-event-bus/evidence/round-1/app.py) 僅為歷史證據，不與修正後矩陣混成一個版本。
- Summary 的 `source_git_head=93a1a7d...` 是執行當時基底；五個來源檔案 SHA-256 識別實際受測程式。後續提交／merge 是來源關聯，不能追造執行時 merge-commit attestation。[審查紀錄](../plan/E025-server-async-event-bus/review-log.md) 保留修正及獨立 review 結果。

### 結論與限制

推薦 bubus 1.5.6 作後續整合候選，條件是 handlers 只做短轉交，全部長業務由標準 TaskGroup 工作範圍管理，並保留直接取消、完整 barrier 與舊結果隔離。完整取消不是 bubus 自動提供的能力；本輪也未證明長時間等待的 bus handler 能隔離其他 Robot。

證據限於單程序／event loop、合作式 synthetic async 與 ASGI。真實 LLM／TTS SDK、執行緒、遠端／不合作工作、實際網路及 Robot 已開始的播放／動作另驗；取消前已進入傳送的資料無法撤回。本輪沒有正式 Robot protocol、身份驗證或隔離恢復策略。實驗成功、PR 合併與語意 tag 都不等於正式套件採用或 production release。

## 模擬器直接錄放與對話控制：E025-listening-saying-exclusion

### 驗證什麼

固定SDK的stock simulator直接`audio.record(5000)`與`audio.say()`是否會被SDK阻止重疊。Listening／Saying在此專指這兩個直接API，不等同XiaoZhi對話狀態或所有SDK路徑。

### 為什麼

來源未見直接record／say交叉guard，仍需動態證據確認瀏覽器生命週期重疊及音訊可用性。結果供後續Robot State定義引用；不在本實驗制定狀態機或互斥政策。

### 成功與失敗判準

原假設為SDK會阻止錄放重疊。任一完整有效案例有正長度capture／TTS playback交集、非空錄音及完整成功SDK終態即否定；僅無重疊不能證明互斥，需能歸因拒絕／排隊／中斷至SDK。真人TTS聽辨及測後錄音回放另記，不能以Promise成功或build通過代替。

### 環境與前置條件

2026-10-19，Andrew／Chrome153／耳機40%。SDK pin `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`；官方同pin CI run35444663129／artifact10585271971的stock runtime，並非本機fresh rebuild；MOD為本次新建。stock Host factory以依賴注入被動觀測，不加跨record／say guard；官方metadata及runtime／MOD／observer指紋見原實驗provenance。

### 重現步驟

依[README](E025-listening-saying-exclusion/README.md)準備固定artifact／MOD、tests／strict build及本機頁面。兩項基線分別確認；record→say由capture start觸發，say→record由實際前進中的播放窗口觸發。每筆念「一、二、三、四、五」、回放並保存聽辨。這是原程序入口，本次文件更新未重跑真人或硬體實驗。

### 是否成功

原互斥假設「失敗」：直接API觀察到有效重疊；主要技術驗證任務完成。原頁面只有最後1筆保存heard／heard，其餘8筆聽辨欄位仍unconfirmed；這是逐筆保存程序未完全達成，不改寫成9筆都已逐筆簽認。Owner事後整批回報「我剛剛測是都有聽到」另記。

### 結果與證據

- [human-run](E025-listening-saying-exclusion/evidence/human-run.md)、[trace](E025-listening-saying-exclusion/evidence/trace.jsonl)：錄音→說話5筆重疊3341.5～3689.2ms，說話→錄音4筆重疊3055.3～3116.5ms；9筆錄音均非空，SDK record／say／replay終態成功、自然播放與回放。
- [validation](E025-listening-saying-exclusion/evidence/validation.md)記錄區間由trace重算一致、原始檔指紋、錯位基線欄位、8筆缺逐筆保存及整批事後回報；原始音訊未保存或上傳。9/9 pure tests及strict typecheck／build是另層工程檢查。
- [來源報告](../plan/robot-audio-exclusion/source-report.md)核對固定pin XiaoZhi的listen start／stop與TTS start停止uploading、clear encoder之輪流控制；這是來源核對，不是XiaoZhi動態或真機驗證。

### 結論與限制

- 模擬器直接record()／say()已觀察到重疊。
- XiaoZhi對話路徑有輪流控制，不能概括成整個SDK都不互斥。
- 真機錄放、喇叭回音與插話能力待驗證；另立獨立驗證，不是本PR硬體前置條件。
- 逐筆儲存缺口如實保留；整批回報不冒充逐筆保存。

區間是保守瀏覽器生命週期觀測，非實際聲學同步精度測量。合併、語意tag與純測試不等於真機能力、正式採用或production release。

## 工具流程驗證附錄：E002

### 驗證什麼

分別驗證17個共用skills可被CLI發現、frontmatter／內部路徑與tracker腳本可用，以及追加TypeScript fixture的觀察流程是否相容。實際skill載入與獨立因果效果是不同問題，原證據不足。

### 為什麼

檔案存在不代表從server工作目錄可發現；plan流程還依賴repo合約。腳本測試不能證明agent實際讀skill或真實device行為。

### 成功與失敗判準

原成功條件為17名稱可見、frontmatter與隨附文件可讀、腳本測試通過、阻礙有可重現原因。追加演練要求新增可歸因failing test→修正→strict typecheck；實際skill-read原始event未匯出、未做對照，不補造「skill已證實造成改善」判準。

### 環境與前置條件

2026-09-22、CodexCLI0.155.1／Python3.12.12；skills來源commit `60b3b5b`，Coami快照 `aa22c8e`／路徑修正 `fc0109a`。追加TDD來源Rivet `36d8a3ef9e28cedca4ca43b6137b3627f6f691f1`，Node24.19.0／TypeScript7.0.2，fixture不是device產品契約。

### 重現步驟

原文程序含 `codex debug prompt-input`、frontmatter／reference逐項核對、tracker 56 tests與missing-topic exit1。追加fixture從repo root用 `node --test experiments/E002-agent-skills-validation/tdd-fixture/add.test.ts` 及原文strict NodeNext命令；RED只可在拋棄式checkout恢復歷史缺陷，不改原fixture或dev。

### 是否成功

CLI發現與腳本成功；實際skill載入／獨立因果效果無法判定。原文未記獨立的整體任務完成欄；不因17 skills可見而宣稱全套plan/review/TDD已跑完。

### 結果與證據

[EXPERIMENT](E002-agent-skills-validation/EXPERIMENT.md)、[forward transcript](E002-agent-skills-validation/FORWARD_TEST_TRANSCRIPT.md)、[red](E002-agent-skills-validation/tdd-fixture/red.txt)、[green](E002-agent-skills-validation/tdd-fixture/green.txt)：新增`add(-3,1)=-2`後2 pass／1 fail，修正後3 pass；strict fixture及device typecheck是不同檢查。缺合約與24處路徑錯誤曾阻斷並修正，不將missing-topic前提錯誤當skill壞掉。

### 結論與限制

觀察到的TDD流程與skill指引相容；缺原始skill-read event，未證實實際載入與獨立因果效果。沒有skill對照試驗、真實device/MOD或完整Coami workflow的因果結論。本頁沒有移植或修改skills／治理文件。

## 本次 doc-implementation 範圍與查核

這是文件整合階段的範圍表，不新增workflow profile或實驗gate。

| 欄位 | 範圍 |
| --- | --- |
| In-Scope | 全26個實驗目錄的回溯索引、八主題八段、來源與決策限制；兩個E025分列，保留E001–E024結論。 |
| Out-Of-Scope | 新實驗／重跑、模板或程式修改、門檻重選、SDK修復、產品採用、merge／release。 |
| ReadOnly | 所有原E紀錄與證據、plan／docs決策治理、production、vendor、skills與既有工具設定。 |
| Written | 本總覽；本機Archify／PR Lens的外部產物不納repo。 |
| Deleted | Repo既有內容無刪除；工具僅可受控清理本輪外部暫存。 |
| Modify | Tracked既有修改僅`experiments/README.md`入口。 |
| Goal | 有來源的技術問題、證據與決策限制可按主題或編號查找。 |
| Non-Goal | 不把本頁完成、工具通過或Draft PR等同假設成功與正式採用。 |
| TestCase | TC01全26目錄／八段；TC02分類與完成分離；TC03連結／數字追溯；TC04不外推／不重開決策；TC05兩檔範圍；TC06工具結果與fallback誠實。 |

本機輔助產物位於外部topic目錄，不成為可攜實驗證據或本頁的依賴。Archify導覽只解釋既有來源→主題→限制；PR Lens只解釋真實提交diff；Graphify無可驗證新鮮graph時採定向來源查閱，不建圖／刷新。這些工具的收據、失敗或fallback與本頁靜態文件查核分開交付，不改任何實驗狀態。
