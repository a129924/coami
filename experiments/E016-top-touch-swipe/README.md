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

## 建置前置需求（必要）

完整 WASM 建置僅支援 **macOS／APFS**，工具鏈須與主機 CPU 架構相容；Linux／Windows 會在複製或建置前明確拒絕。`npm run stage`／unit tests 不使用 macOS 複製或 native 工具，但完整建置尚未驗證其他主機。

Fresh clone 不含 Stack-chan checkout 或已建置工具鏈。先另行準備 pinned checkout（唯讀來源）：

```sh
git clone https://github.com/stack-chan/stack-chan.git /absolute/path/stack-chan
git -C /absolute/path/stack-chan checkout --detach b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322
export STACK_CHAN_SOURCE=/absolute/path/stack-chan
```

另須提供一份**已安裝完成**的 pinned macOS 工具鏈；本實驗不下載或建置工具鏈，沒有 E015 私人目錄預設。設定 `E016_TOOLCHAIN_SOURCE` 為以下三個目錄的共同父目錄（絕對路徑）：

| 必要來源 | 固定版本／內容 |
| --- | --- |
| `moddable/` | git HEAD `b6e06ba70506a7381ffb28e09e3175bf4e99f305`，tools/VERSION 為9.5.0；已建置 build/bin/mac/release 工具 |
| `emsdk/` | git HEAD `14c18b569f55138fe4963924162244251f454fb0`；已安裝／啟用 Emscripten5.0.1，有 .emscripten、upstream/emscripten/emcc 與工具／cache |
| `fontbm/` | git HEAD `7677b908523e909679f67cd5c170396bb9def1aa`；已建置 build/fontbm |

```sh
export E016_TOOLCHAIN_SOURCE=/absolute/path/pinned-macos-toolchain
```

缺少來源變數或必要檔案時會明確失敗；腳本核對三個git revision、Moddable與emcc版本，並將工具／cache隔離複製到本實驗generated。每次使用cache前核對三個元件的git revision、必要工具檔與Moddable版本。缺失／不匹配時從顯式來源複製到獨立staging目錄，全部驗證後才替換cache；複製失敗保留舊cache並清理本次staging，下次可直接重試。`.emscripten`每次由固定template原子重建，依EM_CONFIG所在目錄解析工具，避免來源／cache搬移留下舊路徑；需要emsdk內的Node22.16.0與Python3.13.3。這是顯式外部建置前置需求，不是 fresh clone 自動供應的工具。

另需設定 `E016_TOOLCHAIN_ATTESTATION=/absolute/path/reviewed-tool-trees.json`，檔案放在被hash的目錄之外。Manifest包含以下五個key，每個值為已獨立核對的64位小寫SHA-256：`moddableTools`（moddable/build/bin/mac/release）、`emsdkUpstream`（emsdk/upstream）、`emsdkNode`（emsdk/node）、`emsdkPython`（emsdk/python）、`fontbmBuild`（fontbm/build）。來源／cache／staging都須符合manifest，且三個source repo的tracked tree須乾淨；任一不符停止。

Digest格式為scripts/artifact-attestation.mjs的E016-tree-v1：固定排序的相對路徑、型別、可執行bits及檔案內容SHA-256，包含空目錄／symlink目標字串，忽略.git與mtime；拒絕連到attested tree外的symlink。可在**已獨立核對的來源**用hashTree取得manifest值；對未知來源自行計算hash，只建立指紋，不建立可信來源。Manifest基準由操作者提供／核對，本實驗不把它宣稱為官方binary校驗。

Build時EM_CACHE移至generated/em-cache；EMSDK_PYTHON固定到本實驗launcher，再exec已attest的Python並傳入-B（能抵抗emcc wrapper的-E），清除繼承的EM_*／EMSDK_*覆寫與_EMCC_CCACHE後指定必要值，避免繞過工具。Launcher自身hash也記入provenance；完成前再次核對工具與dependency內容未變。

## 重現步驟

在 feature worktree 的 `experiments/E016-top-touch-swipe/web`：

```sh
npm ci
npm test
npm run prepare:poc
npm run build
npm run dev
```

`npm run stage` 每次從pinned git commit重新建立scratch並套用patch，不信任舊checkout或stage-hash marker；完整prepare再進行編譯。工具鏈只從必要的 `E016_TOOLCHAIN_SOURCE` 隔離複製，沒有私人路徑 fallback，版本必須匹配。

本輪offline依賴重現方式：

```sh
E016_FIRMWARE_NODE_MODULES=/absolute/path/verified-firmware/node_modules E016_FIRMWARE_NODE_MODULES_SHA256=REVIEWED_64_HEX_TREE_DIGEST npm run prepare:poc
```

Snapshot須有事先核對的E016-tree-v1 SHA256，複製前後比對實際tree，另核對父目錄package-lock；僅有相同lockfile不代表內容正確。無已核對的snapshot digest時，省略snapshot變數，使用npm ci。新provenance分開記錄dependencyTreeSha256、toolchainTrees、manifest hash與來源方式；符合指定baseline不等同由lockfile推導的內容驗證。一般環境執行npm ci，不安裝或升級圖形工具。

重現建置只寫入ignored `web/generated/runtime-provenance.json` 及public副本；MOD建置補上modArchiveSha256與publicHashes（磁碟檔案雜湊，不等同HTTP servedHashes）。已提交的 `evidence/runtime-provenance.json` 是原驗證run的歷史證據，不會被重現覆寫。新run若要宣稱served bytes，須另行取得HTTP回應核對並保存獨立驗證紀錄。

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

- 實驗整體狀態：**無法判定（TC05未執行分支及TC07歷史內容attestation缺口）**。已執行的真人滑動與移出恢復判準通過，原操作證據保留；不將局部通過當作完整驗收。
- 本輪工程驗證與真人滑動操作紀錄已完成；完整TC05驗證尚缺上述分支，TC07歷史工具／dependency內容attestation亦不齊備。PR已轉Ready，review／合併仍待owner。
- 結論只適用本實驗模擬器的已執行行為；不外推實機或production。PR維持Ready供human review，不自動合併。

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
| TC05 移出／故障恢復 | 未執行（部分通過） | 真人leave／恢復PASS：14/18及有效17/19，pending0；overflow／ack timeout有unit覆蓋；完整initialize/reset與初始化不可用分支未執行 |
| TC06 MOD／畫面一致 | PASS | 最終forward6／backward4，19release；由owner輸出與agent唯讀觀測交叉核對 |
| TC07 SDK來源／建置內容 | 未執行（部分證據） | recognizer／原始樣本接線及artifact hashes有證據；原run未保存installed tool／dependency tree hashes，不能追補為完整attestation |
| TC08 逐項證據與限制 | PASS | verification.json逐項結果，保留原始humanVerified:false與操作者確認；agent automation分列 |

完整owner匯出至operation17存於 `evidence/operator-session-1-through-operation-17.json`（42筆）；18/19五筆owner事件與19release的agent唯讀觀測分別存於verification.json。合計48筆（19press、19release、6forward、4backward），不把補充觀測冒充owner原始匯出。

operation15曾依指示操作但未新增swipe，當次FAIL紀錄保留；16保留delta14，17以起點−80／終點90成功，19再次成功。沒有raw軌跡，不能斷言15失敗原因或最大位移，也沒有為此修改SDK／輸入程式。operation9程序未確認、10/11未分類；6為owner提及偏掉的非有效swipe。原始匯出旗標不改為true，真人證據由操作程序、owner明確確認與畫面核對共同構成。獨立證據審查接受上述限定結論；不宣稱已排除間歇性問題。

## 結論與限制

原始樣本→新增native ABI→原SDK→MOD的路徑有真實runtime、自動測試及真人操作支持。TC01–04、TC06與TC05真人leave子案例通過；TC07採source／provenance核對，TC08採逐項證據稽核。原exact±60 fixture誤用了±40，本次改為±60 equality及±62越門檻後通過；overflow／ack timeout有unit覆蓋，完整initialize/reset與初始化不可用分支沒有執行證據，改列未執行。不能外推實機感測品質。

所有實作、文件與generated輸出都在feature worktree；dev worktree未修改。無正式契約、production、其他Event／Action或SDK門檻變更。合併及後續採用由human決定，不自動merge／release／清理branch。

## PR comment review 修正 — 2026-10-13

六項建議均採用：顯式工具鏈來源、macOS主機限制、頁面驗收狀態、真正±60 fixture、重現provenance與歷史證據分離，以及撤回未執行reset／不可用初始化的覆蓋宣稱。舊run與真人軌跡證據不變；完整驗收改為無法判定，避免把既有局部PASS擴為未測分支。測試與建置結果見verification.json的prCommentReview。

### 第二輪 review：不完整工具鏈 cache

Comment4255853165採用：不再只以moddable/tools/VERSION判定cache完整，改為驗證所有元件並以staging完成後替換。新增四項temporary-filesystem測試：完整cache重用、部分cache重建、中斷複製保留舊cache並重試成功、不合格元件不得發布。首次RED為2項恢復行為失敗；最終整套12項PASS、strict typecheck及script syntax PASS。沒有執行完整WASM重建，既有真人／runtime歷史證據與未執行的reset／初始化分支狀態保持不變。

### 第三輪 review：設定檔中斷寫入

Comment4256008289採用：`.emscripten` 路徑重定位改為同目錄暫存檔完整寫入後rename替換，不直接截斷已發布設定。中斷寫入測試先重現原設定變成truncated的FAIL；修正後原設定保持完整、retry成功。兩項新測試加上既有案例共14項PASS，strict typecheck／script syntaxPASS。這是防止後續寫入中斷的修正，不宣稱修復先前已損毀的設定，也未重跑完整WASM build。

### 第四輪 review：路徑與runtime狀態邊界

三項建議採用：4256154628將顯式工具鏈根目錄正規化後統一用於前置檢查、copy及config替換，避免尾端斜線造成toolchainemsdk錯接；4256154638初始化catch保留既有unavailable／fault分類與原因；4256154647在persisted pagehide保留engine供bfcache返回，非persisted才dispose。三項新regression assertions首次全部FAIL，修正後整套17tests、strict typecheck／Vitebuild／script syntaxPASS。

新增unavailable測試僅驗證TopTouchInput狀態處理，不等同完整初始化callback時序、缺能力runtime或reset驗證；完整TC05未執行分支保持不變。bfcache修正經code inspection，未執行實際瀏覽器bfcache往返，也未重跑完整WASM build或新增真人證據。

### 第五輪 review：實際建置內容與搬移後設定

ADDRESS4256325949/5956/5962：snapshot必須指定核對過的tree SHA256，複製前後均比對；工具source必須tracked-clean，工具／安裝payload依外部核對manifest比對並記入provenance；config每次依EM_CONFIG當前位置產生。新增5項內容attestation與1項搬移設定測試，最終25tests及typecheck/build/syntaxPASS。實際本機工具tree已唯讀量測，可用於確認hash實作可讀取，但不當作獨立可信baseline，也不追補舊run。

**歷史證據限制修正：** 原run只有來源commit、版本、artifact hashes與snapshot相鄰lockfile匹配，未記錄當時工具／installed dependency內容hash。原runtime-provenance.json保持原樣，TC07完整PASS撤回；真人觀測仍保留，但不能用今天量測的tree倒推原建置內容。新attestation流程尚未完整重建WASM；原TC05、bfcache等未執行項不變。

獨立審查先發現Python bootstrap仍可能由PATH選取且-E忽略bytecode環境設定，已補experiment-local-B launcher與環境清理。兩項新測試確認實際interpreter、dont_write_bytecode=True及拒絕環境覆寫；亦以本機pinned emcc --version執行相同launcher，5.0.1啟動成功且upstream tree hash不變，沒有執行完整WASM build。

### 第六輪 review — 2026-10-14

ADDRESS4256577091/7096/7102：清除EMCC_*與legacy EMMAKEN_*，補足原EM_*／EMSDK_* filter；stage-only與完整prepare每次重新checkout pinned SDK再apply patch，marker只記錄不授權重用；persisted pagehide暫停ack健康時鐘，persisted pageshow恢復，原始SDK capture ticks不變。健康時鐘扣除凍結時間但保留前後active等待，不以恢復重新給滿額timeout。

Regression：保留EMCC_CFLAGS、凍結時誤報timeout兩項RED；另實際修改scratch recognizer並保留matching marker，舊stage未還原（RED），新stage還原為原pinned檔案（GREEN）。最終27tests、strict web/MOD typecheck、Vitebuild與script syntaxPASS。健康時鐘是單元驗證，未執行livebfcache往返；完整WASM／TC05／TC07缺口不回改。官方變數參考：[emcc environment variables](https://emscripten.org/docs/tools_reference/emcc.html#environment-variables)，實驗仍固定5.0.1。

## PR comment review round7 — 2026-10-14

ADDRESS4266156233/6239. 每次完整prepare在任何emcc invocation（含version/sanity probe）之前，清除並重建本實驗owned ignored generated/em-cache；不重用上次可變library bytes。MOD readiness deadline改用與ack相同的activeTime，persisted hide/show凍結期間不累積，恢復後仍保留先前active等待額度。

兩項新增regressions先RED（缺少cache reset export／activeTime method），再GREEN：cache涵蓋不存在、污染nested libc及重複清理；readiness時計涵蓋長凍結、精確30000與超過門檻、多次凍結。整套29tests、strict web/MOD typecheck、Vitebuild與prepare script syntax PASS。這些是filesystem／clock單元測試及caller檢查，不宣稱完整WASM重建、完整初始化或liveBFCache通過。TC05／TC07及原始runtime/operator證據保持不變。獨立審查approved，另行重跑29tests PASS，無blocking issues。

## PR comment review round8 — 2026-10-14

ADDRESS4266235046/5051/5058/5065. Clear Clang CPATH and four language-specific include variables. Validate toolchain root and three component roots with lstat as real directories before source/cached/staged use; reject symlink roots and replace prior linked caches. Both toolchain and dependency copies use one macOS cp -cRpH helper: preserve modes and follow only command-line symlinks (snapshot operands), not internal links. Read-only source configuration remains untouched.

Visibilitychange pauses the shared readiness/ack clock; each new session immediately synchronizes document.hidden. Hidden and BFCache reasons are tracked independently, and clock resumes only when both clear, retaining prior active wait. Six new regressions cover compiler paths, source/cache links, actual macOS copy under umask077, overlapping lifecycle reasons and initial hidden readiness. Five behavioral assertions first FAIL (retained CPATH, missing link rejection, linked-cache reuse, two premature resumes); copy test already passed with local APFS clone mode and is not claimed as RED. Final35tests/strict web+MOD typecheck/Vitebuild/script syntax PASS. The copy test verifies real filesystem executable bits and tree hashes, including symlink snapshot operand; it does not prove a full toolchain build. FullWASM/liveBFCache/background-browser/TC05/TC07 gaps retained; original evidence unchanged. Independent review approved; Reviewer reran35tests PASS, including actual macOS copy fixture, with no blockers.

References: [Clang header environment](https://clang.llvm.org/docs/CommandGuide/clang.html#environment), [macOS cp options](https://keith.github.io/xcode-man-pages/cp.1.html).
