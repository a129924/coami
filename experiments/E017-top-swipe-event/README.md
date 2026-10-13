# E017 頂部 Swipe Event

## 驗證什麼

- 獨立 simulator-only 實驗：真實 pointer 連續位置 → 三區 raw samples → C/WASM driver → pinned SDK recognizer → MOD → 可核對的方向、次數與操作關聯。
- 主要假設：保持既有 recognizer 規則時，這條通路能產生正確且不重複的 Swipe，並在取消／重啟後恢復。
- owner 已選擇獨立 E017；E016 是平行且未驗證工作，本實驗不修改或沿用其產物。實作只在 feat/andrew/e017-top-swipe-event 的 feature worktree。

## 為什麼

- SDK 宣告 Swipe 不代表瀏覽器具備 raw 輸入或 MOD 已收到事件。E010 的 tap 表面與預製 swipe 不構成本實驗的真人證據。
- 來源：Stack-chan `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`，`touch-panel-gesture.ts` 的原有 weighted position、strict delta >60／<-60 與 SWIPING 至 zero release 規則。recognizer 和正式事件 shape 均不修改。
- 此證據只支持指定 pinned simulator 的後續互動決策；不賦予 Swipe 產品 Action、不外推硬體或核准 production 採用。

## 成功與失敗判準

- 每方向至少3次獨立真人滑動，方向符合「左→右 forwardSwipe；右→左 backwardSwipe」，MOD 與 UI 次數一致。
- 一次持續／反向移動只發一次 Swipe；兩次已接納的獨立操作由 zero 分隔。Tap、小幅移動不得 Swipe；press/release 是正常事件。
- 取消／移出不追加未消費 move，保留已辨識事件；zero 經 recognizer 與同步 MOD 派送後才開放下一次。正常 up 後 lostcapture 不清掉合法 FIFO。
- 缺 provider、metadata 不符、初始化逾5秒、FIFO溢位、runtime 錯誤明確停用；重啟新 session 不混入舊操作。
- 成功須具備全部核心案例與可追溯 runtime／MOD provenance。有效前置成立而行為違反判準為失敗；已嘗試但缺依賴／provenance／真人案例為無法判定；尚未嘗試為未執行。單項 PASS 不等同整體成功。
- 首輪 runtime 可行性驗證上限90分鐘、最多兩次針對明確錯誤的 corrective runtime rebuild；工具圖表不占用或延長此預算。到限、需改 recognizer／production contract 或擴 scope 即停。

## 環境與前置條件

- macOS arm64，Node24–26、npm；本次 Node26.10.0、npm11.19.1。web／MOD strict TypeScript；依賴見 web/package-lock.json。
- SDK pin 如上。隔離工具來源：Moddable9.5.0 `b6e06ba70506a7381ffb28e09e3175bf4e99f305`、emsdk5.0.1 `14c18b569f55138fe4963924162244251f454fb0`（Emscripten `8c5f43157a3f069ade75876e23061330521eabde`）、fontbm `7677b908523e909679f67cd5c170396bb9def1aa`。
- 本輪工具由 E015 已有來源唯讀複製至 E017 `web/generated/toolchain/`，不在 E015 建置；副本包含既有 compiler cache，未宣稱為 E008 fresh-installed-tree fingerprint。來源 commits、實際工具及產物 hashes 見 evidence/runtime-provenance.json。
- runtime patch 只套用 E017 ignored scratch；原始 vendor clean。所有 runtime／MOD 輸出均 ignored；新 checkout 必須重新建置，不使用舊實驗 binaries。
- MOD 透過既有 onLaunch hook 略過 upstream8秒 setup splash，保留本實驗5秒逾時；onContextCreated 覆寫預設 petting，只有事件觀測。
- 橫向 p=-100..100，sample=[max(0,-p),100-abs(p),max(0,p)]；強度是 synthetic，不代表實機量測。

## 重現步驟

新 checkout 請先依 [pinned 工具鏈完整建立程序](runtime/TOOLCHAIN.md) 取得三個指定 commit、建置 Moddable／fontbm 並安裝 emsdk 5.0.1；該程序不依賴 E015 或舊 cache。以下命令適用於已完成該程序、仍使用 Node24–26 的同一個 shell，從本實驗 `web/` 執行：

```sh
npm ci
export MODDABLE="$PWD/generated/toolchain/moddable"
export EMSDK="$PWD/generated/toolchain/emsdk"
export EM_CONFIG="$EMSDK/.emscripten"
export FONTBM_SOURCE="$PWD/generated/toolchain/fontbm"
export FONTBM="$FONTBM_SOURCE/build/fontbm"
export PATH="$MODDABLE/build/bin/mac/release:$EMSDK/upstream/emscripten:$PATH"
npm run prepare:poc
npm test
npm run build
npm run dev -- --port 5187
```

`prepare:poc` 依序重建 runtime 與 MOD，不能並行。runtime 先清舊 public/provenance；單獨 `npm run mod` 也先移除舊 archive，再驗證 vendor gitlink、checkout pin、包含 untracked 檔的 cleanliness、runtime provenance source pin 與目前 patch SHA-256；全部符合才載入 MOD builder。頁面啟動核對實際 mc.js／mc.wasm／MOD SHA-256。同頁若偵測 runtime 或 browser/runtime patch 已改變，須完整 reload，避免舊 dynamic-import module cache。stage:host 可獨立準備測試所需 scratch，但不產生 WASM。

人工程序（全部結果填 evidence/swipe-run.md）：

1. 打開 localhost，等待 ready。確認方向提示、runtime來源與 count=0；MOD ready 之後新 zero acknowledgement 才允許輸入。
2. 在觸控帶內從 20% 拖至 80%（反向為 80% → 20%）；Swipe 需位移嚴格大於 60，即帶寬 30%。左→右3次、右→左3次；每次等 ready 再操作。逐筆核對 MOD gesture、session/operation/sample、UI direction/count。
3. 一次滑動後持續按住，來回移動並放開；仍只有一次 Swipe。再做兩次獨立滑動，各增一次。
4. 輕點、少量移動（例如10px）與長按不移動；沒有 Swipe。press/release 不算誤報。
5. 門檻前取消／移出，不增 Swipe；已辨識後取消保留一次。取消後重做有效滑動，確認無殘留事件。
6. 重新啟動，count 重置，新 session 不混入舊操作；確認不可用／失敗時停用。按「匯出本次 trace」，自行標示 human 或 automated 及具名觀察，不混淆證據類型。

自動 browser smoke 使用本機 Chrome，以 CDP pointer 操作相同 UI，**不算真人**：

```sh
node scripts/runtime-smoke.mjs
```

CHROME_EXE／E017_URL 可指定既有 Chrome 與 localhost URL。測試不注入 SDK Swipe 名稱，不建立 graph 或呼叫 provider。

## 是否成功

- 整體實驗狀態：**成功（本次 pinned browser simulator 範圍）**。真人各方向三次、持續操作、無效輸入、取消／恢復、切分頁及普通重啟隔離已核對；獨立自動初始化故障與恢復通過。
- 初版 bounded code review 已通過；該審查早於 b408039 高頻輸入修正，不宣稱涵蓋修正。最新實作與證據留在 PR #17（Ready for review）等待 human review。
- 純測試／mock-native SDK ordering 已執行；C/WASM browser 自動操作17案例全部PASS、12次Swipe；結果見 runtime-automated.json。真人首次失敗與修正後完整操作證據詳見 swipe-run.md。修正後23項 source tests、strict build 與 CUA 自動雙向操作通過；後者見 runtime-coalesced-automated.json。

## 結果與證據

- evidence/validation.txt：TDD red→green、strict checks、建置與負面檢查。
- evidence/runtime-provenance.json：實際 SDK／patch／工具／runtime／MOD hashes；頁面重做 served-byte 驗證。
- evidence/runtime-automated.json／.png：CDP自動操作、原始 host/MOD trace、操作結果及畫面；不算 human。
- evidence/swipe-run.md：真人程序、逐案狀態與人工觀察缺口。
- diagram/swipe-sequence.html：Archify sequence；繁中內容，固定 viewer／HTML lang fallback English。delivery／visual-check receipts 與 screenshots 綁定實際 artifact hash。
- evidence/auxiliary.md：Graphify fallback、Archify、PR Lens 的獨立 TC-AUX 狀態。工具結果不替代核心驗收。

## 結論與限制

本輪保留原 SDK recognizer，建立 raw input、同筆 XS metadata、MOD-only count 與 zero consumed barrier。真人與工程證據支持本次 pinned browser simulator 的已執行條件；硬體、跨瀏覽器品質與 production 採用均無通過結論。

所有新增檔案限 E017 與其 topic plan；PR Lens 產物在外部本機目錄。停止於 Draft PR／human review，不 merge、不 release。

高頻 pointer 修正：輸入佇列保留 press、轉折與最新單方向端點，合併尚未消費的中間 move，避免 120Hz pointer 堵塞 20Hz SDK；coalesced trace 明列 replacement sampleId。不調整 SDK 手勢門檻。

2026-10-13驗證任務完成：是（本次simulator-only判準）。owner真人trace與agent自動故障注入分開保存；acceptance-summary.json記錄關聯與限制。單一Chrome/macOS、實機與production未驗證，active操作途中重啟未另做人測，provider-missing分支未另注入。實驗結果支持本次輸入能力，PR #17已Ready for review；review修正與證據見 evidence/pr-review-fixes.md。

PR review修正：persisted pageshow重新啟動session；初始化逾時abort/dispose並立即解鎖重啟、隔離晚到結果；新session先清除畫面provenance。28項source／SDK／生命週期／pin回歸測試、strict build與standalone MOD build通過。新增生命周期證據屬自動mock-boundary回歸，不重標既有真人trace為新版本人測。

第二輪 PR review：browser patch SHA-256納入重啟快取key；standalone MOD build拒絕與目前patch不符的runtime provenance。初始化error/unavailable取消timeout並立即開放重試，已排入事件佇列的timeout也不覆蓋原始原因。31/31測試、strict build、standalone MOD build通過；新增案例為自動回歸，歷史真人trace不變。
