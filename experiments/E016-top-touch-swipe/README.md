# E016：頂部滑動辨識與 MOD 可見回饋

## 驗證什麼

- 編號 E016；歷史 E001–E015 已占用，本 topic 首次使用 E016。
- 設計／執行日期：2026-10-13。
- 主要問題：實際 pointer 原始樣本經新 WASM bridge、既有 SDK recognizer 到 MOD，能否維持方向、一次接觸邊界與取消恢復？
- 假設：原始三通道 FIFO 與原子 sample/timestamp/operation metadata，足以保留 SDK 語意並提供可核對回饋。

## 為什麼

Pinned Stack-chan `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322` 的 `firmware/host/modules/input/touch-panel-gesture.ts` 已定義 position 左−100／中0／右100、delta>60 forwardSwipe、delta<−60 backwardSwipe、每 contact 最多一次 swipe。E010 排除超過15 CSS px 拖曳，不能證明滑動輸入。原始碼無法證明新增 native ABI、實際載入 artifact 與 MOD 接線，故需要 runtime 操作。

若成立，可保留本獨立實驗供後續互動研究；若不成立，先回報範圍／接線缺口，不改 SDK 門檻或直接注入 swipe。

## 成功與失敗判準

事前判準沿 owner-approved plan：真人雙向各3次、每contact一次、連續兩次均接受、tap/短移無swipe、取消恢復、MOD/畫面一致，且來源與證據可追溯。精準±60由自動 raw fixture 驗證。

失敗：來源與操作關聯可信仍違反上述判準。無法判定：來源、ready、關聯或真人證據不足。工程可行性上限90分鐘、一次完整build、一次bounded retry；超限或需改正式契約／SDK門檻時停止。

## 環境與前置條件

- 僅瀏覽器模擬器；feature worktree `/private/tmp/coami-e016-top-touch-swipe`，branch `feat/andrew/e016-top-touch-swipe`，base `9155139`。
- Node26.10.0、TypeScript7.0.2、Vite8.2.1、Three.js0.185.1；web依賴由相同版本lockfile以offline npm ci安裝。
- Moddable9.5.0、Emscripten5.0.1、fontbm pinned commits 見 `evidence/runtime-provenance.json`。E015 toolchain 以APFS copy-on-write隔離到本實驗 generated，沒有改原工具鏈或使用camera runtime。
- firmware offline npm ci遇ENOTCACHED；改用與相同package-lock SHA-256核對一致的本機dependency snapshot，複製到本實驗。此為依賴來源，不是runtime重用。
- SDK recognizer 未修改，只有scratch平台輸入橋接與poll wrapper。真實K151感測品質不在證據範圍。

## 重現步驟

在 feature worktree 的 `experiments/E016-top-touch-swipe/web`：

```sh
npm ci
npm test
npm run prepare:poc
npm run build
npm run dev
```

`npm run stage` 只建立pinned scratch source；完整prepare會重新建立scratch並編譯。工具鏈預設從本機 E015 的 `web/generated/toolchain-verified/` 隔離複製；其他位置可設定 `E016_TOOLCHAIN_SOURCE`，版本必須匹配。

本輪offline依賴重現方式：

```sh
E016_FIRMWARE_NODE_MODULES=/private/tmp/coami-e015-manual-video-recording/experiments/E015-manual-video-recording/web/generated/pinned-stack-chan/firmware/node_modules npm run prepare:poc
```

腳本會核對snapshot父目錄package-lock與pinned firmware lock一致。一般環境未設定此變數時執行npm ci，不安裝或升級圖形工具。

開啟 http://127.0.0.1:5176/ ，等待「可操作」：

1. 左側約10%拖到右側約90%，獨立3次：每次一個forwardSwipe。
2. 反方向獨立3次：每次一個backwardSwipe。
3. 同次接觸越門檻後按住／反向再放開，不能追加swipe。
4. 連續兩次獨立滑動，兩次都須接受、各自release且各一個swipe。
5. 中間tap與短移，不能有swipe；觀察畫面起點／目前position／delta。
6. 門檻前移出；再做有效滑動。另越門檻並等待MOD顯示swipe後移出：保留已收到事件，不追加殘留。
7. 使用「重新初始化」，確認新session ready；舊觀測保留、新操作不混入舊session。
8. 匯出MOD紀錄，以每operation核對方向／次數。humanVerified預設false，須由操作者附上實際程序、觀察與結果後才能作真人證據；不以改旗標代替操作。

精準±60用unit fixture，不要求人手精準命中。真人畫面證據預留 `evidence/manual-forward.png`／`manual-backward.png`，本輪未建立。

## 是否成功

- 實驗狀態：**成功（限定 pinned 瀏覽器模擬器與已執行判準）**。真人操作、操作者確認與唯讀畫面觀測已分開記錄。
- 本輪工程驗證／紀錄任務及真人操作驗收已完成；Draft PR human review／合併仍待 owner。
- 結論只適用本實驗模擬器；不外推實機或 production。Draft PR依owner授權交human review。

## 結果與證據

- TDD：初始8項失敗可歸因於輸入與回饋未實作，green後8項通過；另以失敗測試修正回饋去重，保留重複MOD回報供稽核，不能掩蓋重複事件。
- Git hook回報lefthook不在PATH，未假稱hook通過；已另執行strict web/MOD typecheck、Vite production build、專用WASM與MOD build通過。上游freetype macro重定義及Three.js bundle大小警告保留，未停用檢查。
- 真實Chrome pointer自動化：operation1–3各forward一次，4–6各backward一次；7 tap、8短移、9移出取消均無swipe；10恢復後forward一次。共27個MOD觀測（10 press、10 release、4 forward、3 backward）。此為**agent UI automation**，不是真人。
- `evidence/verification.json` 保存實際下載的MOD紀錄、AC狀態、TDD與工具限制；`evidence/runtime-provenance.json` 保存source/patch/tool/runtime/MOD雜湊及實際served hashes。
- native begin/sample/ticks/meta/complete 經實際WASM執行；SDK Event shape沒有新增operation欄位，實驗metadata由MOD另讀。
- Archify外部sequence已9/9 showcase、四desktop尺寸containment通過；已目視light/dark輸出。繁中內容，固定Viewer UI與HTML lang為英文fallback。外部圖不作真人/E2E證據。
- PR Lens已依實際committed implementation diff（base9155139→head531135a）建立並通過本地validate/render（1張SVG）；後續文件／handoff不在此bounded圖範圍；Graphify0.9.73已確認CLI版本，但沒有既有graph，採rg→source fallback，沒有建圖或上傳。

### 真人操作結果 — 2026-10-13

| 判準 | 結果 | 證據 |
| --- | --- | --- |
| TC01 雙向各三次 | PASS | forward operations1/3/4；backward2/5/7，各press→一次swipe→release |
| TC02 持續按住／反向／放開不追加 | PASS | operation8；owner確認按住至少2秒後反向拖回左側再放開 |
| TC03 連續獨立操作 | PASS | operations3/4分別辨識，不宣稱重疊FIFO時序 |
| TC04 tap／短移無swipe | PASS | quick tap12為124ms；短移13保留delta2，唯讀頁面核對 |
| TC05 移出清理與恢復 | PASS | owner確認14門檻前移出、18看到forward6後移出；有效17與19恢復；最終pending0 |
| TC06 MOD／畫面一致 | PASS | 最終forward6／backward4，19release；由owner輸出與agent唯讀觀測交叉核對 |
| TC07 SDK來源路徑 | PASS | pinned recognizer未改、WASM／MOD／served hashes及原始樣本接線；不是新增真人動作 |
| TC08 逐項證據與限制 | PASS | verification.json逐項結果，保留原始humanVerified:false與操作者確認；agent automation分列 |

完整owner匯出至operation17存於 `evidence/operator-session-1-through-operation-17.json`（42筆）；18/19五筆owner事件與19release的agent唯讀觀測分別存於verification.json。合計48筆（19press、19release、6forward、4backward），不把補充觀測冒充owner原始匯出。

operation15曾依指示操作但未新增swipe，當次FAIL紀錄保留；16保留delta14，17以起點−80／終點90成功，19再次成功。沒有raw軌跡，不能斷言15失敗原因或最大位移，也沒有為此修改SDK／輸入程式。operation9程序未確認、10/11未分類；6為owner提及偏掉的非有效swipe。原始匯出旗標不改為true，真人證據由操作程序、owner明確確認與畫面核對共同構成。獨立證據審查接受上述限定結論；不宣稱已排除間歇性問題。

## 結論與限制

原始樣本→新增native ABI→原SDK→MOD的路徑有真實runtime、自動測試及真人操作支持。TC01–06真人行為通過；TC07採source／provenance核對，TC08採逐項證據稽核。精準門檻、overflow／fault／reset與不可用初始化仍屬自動化證據，真人session1未操作所有失敗分支。不能外推實機感測品質。

所有實作、文件與generated輸出都在feature worktree；dev worktree未修改。無正式契約、production、其他Event／Action或SDK門檻變更。合併及後續採用由human決定，不自動merge／release／清理branch。
