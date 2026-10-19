# E025 — Listening／Saying 真人與瀏覽器並行驗證

## 驗證什麼

2026-10-19，owner 在 source-only 交付後明確要求「可以真人驗證」，本輪新增 browser 動態與真人聽辨目標。Listening=`audio.record(5000)`，Saying=`audio.say()`。主要假設：固定 SDK 的 stock simulator 路徑會阻止實際 capture 與 TTS playback 重疊。真人確認可聽 TTS 與可辨認錄音，不能單憑眼見 busy 字樣判定互斥。

E025 已在現有目錄及本機 git --all 歷史查無占用。先前來源報告仍是歷史 source-only 結論，不因新增任務而改寫成已做 runtime 驗證。

## 為什麼

來源已能回答「未見 SDK 交叉 guard」，卻不能證明瀏覽器真實執行的重疊或音訊可用性；owner 現在要求的真人驗證需要動態證據。未發現交叉鎖、TTS 自身 streaming guard 與 webRadio busy guard 均不能替代本輪觀察。結果只供後續 Robot State 參考，不設計 state machine。

## 成功與失敗判準

假設成功需兩方向有效案例均無重疊，且拒絕、排隊或中斷可歸因 SDK。任一完整案例有有效 capture／playback 正長度交集、錄音非空、兩者 terminal 完整，即否定互斥假設。無窗口、權限／autoplay／裝置／事件／時鐘／版本來源不足皆無法判定；沒有重疊本身不是互斥成立。

真人另記 TTS 實際聽見內容，以及測後回放能否辨認「一、二、三、四、五」。有耳機、麥克風與正常音量；真人未回報不得標為通過。被動觀測不保存音訊到檔案或網路；原始 buffer 只在本頁記憶體供本機回放，reload／離開頁面後釋放。

環境準備上限 60 分鐘；單案例 30 秒；每個未撞入窗口案例最多重試一次。保留 stock bridge，禁止 record／say 共用 busy guard；測試案例之間只允許一組，案例內確實同時發出兩操作。

## 環境與前置條件

SDK pin `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`。本機原 pinned toolchain／E018 runtime 已不存在，不能聲稱本地 fresh build。本輪使用同一 pin 官方 Bundle Stack-chan Firmware CI run `35444663129` 的 stock `web-dist` artifact `10585271971`，archive SHA-256 `0570742fb76a8dd73289d4a06b8b72aaa6f3c516a6cc831a53cdb6320da6d0e7`，下載後先校驗 archive digest 與 metadata head_sha，再抽出 runtime 並記個別 hashes。不借用其他實驗 runtime，不修改 vendor 或官方產物。

這是新授權真人任務的明示 build provenance 修訂：官方 pinned CI build，非本機 rebuild；CI workflow／工具鏈與本機 E018 的編譯環境不假稱相同。MOD 由 pinned SDK 自帶 editor tools 為 E025 新建。使用 stock Host factory 的依賴注入被動觀測，不使用 E018 strict bridge。Node >=24 <27、可使用 MediaRecorder／WebAudio 的實際 Chrome、真人同意 browser microphone permission。實際執行已允許麥克風；Chrome153、耳機40%，詳細資料見 evidence/human-run.md。

## 重現步驟

1. 下載並驗證官方 artifact metadata／digest，建立 E025 fresh MOD 與 served-bytes provenance。
2. 安裝本 experiment 固定 dependencies，執行 pure behavior tests、strict typecheck／build。啟動 localhost page，真人點擊啟動／聲音解鎖並允許麥克風。
3. 單錄音 5 秒並回放；單 TTS「こんにちは。」四次；真人確認兩種基本音訊正常。
4. capture 真正 start 後才觸發 say；TTS source 排程時間已到且 AudioContext running 後才觸發 record。兩方向各三有效案例；TTS 使用「こんにちは。」四次，錄音 5 秒。請在錄音中念「一、二、三、四、五」。
5. 案例結束後回放該筆錄音，真人記錄聽辨；只有錄音 bytes／播放 Promise 成功不能代替真人確認。重疊依同時鐘 interval、自然 ended、context 前進、非空 recording 與終態判讀；source.start 呼叫本身不算真播放，timer fallback 不當自然 ended。
6. trace／human report 只含 metadata、事件與文字判定，不含音訊。資料導出／寫回後方可記錄本輪真人結果。

## 是否成功

- 實驗狀態：失敗；假設「SDK 會阻止錄放重疊」被有效重疊反例否定。
- 本輪主要技術驗證任務完成：是；兩方向均觀察到有效完整重疊，真人回報都有聽到。
- 原逐筆保存程序未完全達成：9筆都有回放，但只有最後1筆在頁面保存兩項 heard；另外8筆保留 unconfirmed，owner 的整批事後回報另記，不倒填。此缺口不改變事前「任一有效反例即可否定互斥」判準。

## 結果與證據

Andrew 在 Chrome153、耳機40% 完成兩基線及9筆：錄音→說話5筆，重疊3341.5～3689.2ms；說話→錄音4筆，重疊3055.3～3116.5ms。錄音均非空，record／say／replay SDK terminal成功，TTS及回放自然結束、AudioContext前進；區間由保存的trace獨立重算一致。真人於對話回報「我剛剛測是都有聽到」。

原始事件為 [trace.jsonl](evidence/trace.jsonl)，原頁面判定為 [human-run.md](evidence/human-run.md)；逐筆數值、事後回報來源、錯位欄位與程序限制見 [validation.md](evidence/validation.md#human-execution-and-interpretation--2026-10-19)。原始音訊未保存或上傳。9/9純測試及strict typecheck／build通過，與真人／動態證據分開。

## 結論與限制

固定版本 stock simulator 的 `audio.record()` 與 `audio.say()` 可以重疊活動；來源未見交叉guard的結果獲本次動態反例支持。後續 Robot State 定義不能假設 Listening／Saying 天生互斥；本實驗不制定新的 state model 或互斥政策。

只支持固定pin、此Chrome與輸入條件，不保證真機或其他provider。被動觀測是保守瀏覽器生命週期區間，非實際聲學同步測量。頁面只儲存最後一筆且容許未儲存就開始下一筆，造成8筆缺逐筆聽辨欄位；保留原始缺口，以對話整批回報補充，不捏造逐筆簽認。獨立TS code review與human PR review仍未完成。

## 本機啟動與真人交接

本次頁面：http://127.0.0.1:5195/ 。現有進程在 feature worktree 的 E025 web 目錄。

```sh
cd experiments/E025-listening-saying-exclusion/web
npm ci --ignore-scripts --no-audit --no-fund
# prepare:poc 前需放入已驗證官方 ZIP 與 evidence/official-artifact.json
npm run prepare:poc
npm test
npm run typecheck
npm run build
npm run dev -- --port 5195
```

本地缺 ZIP 時由 `gh api repos/stack-chan/stack-chan/actions/artifacts/10585271971/zip > generated/official-runtime/web-dist.zip` 下載，metadata 用相同 artifact API 保存；prepare script 必先核對上述官方 digest／head_sha。不要換成其他版本或其他實驗 runtime。

先完成錄音及 TTS 兩項基線，各自填聽辨並儲存；錄音必先按回放、等自然結束後才能確認可辨認。之後兩個方向各三筆，每筆回放、填真人結果並儲存。測前暫停其他音訊，戴耳機並開啟麥克風權限。儲存只向同 origin 的 loopback dev middleware 寫 `evidence/human-run.md`／`trace.jsonl`，欄位白名單只保留 metadata／文字，沒有音訊資料。production build 不提供此本機儲存 endpoint。

SDK／Host 的原返回值與 fallback 保留；observer 不控制錄放允許與否。capture end 採 stop() 呼叫的保守界線；playback start／end 採 context 正在前進且 source 尚在 buffer 期間的已觀測時間，並要求 natural ended。這些保守區間避免把 callback 遞送延遲當成重疊，仍不等同實際聲學輸出，真人聽辨另記。
