# E019：指定靜態位置、解除注視與再次指定

**交付結論：實驗失敗。** Pinned simulator 的「上 → 解除 → 下」接受新目標後沒有新的向下旋轉。Owner 已明確選擇保留失敗結論，完成 commit／push／Draft PR，交 human review；不修改 SDK 或改驗收判準。

## 驗證什麼

- 設計日期：2026-10-13；編號 E019-static-gaze。建立時本機 branch/worktree 未見 E019 占用；E018 已由其他獨立 worktree 使用。
- 問題：pinned browser simulator 能否以真正 SDK `lookAt()` 路徑產生四方向可見反應，並支持解除與再次指定？
- 假設：零旋轉起始、無其他運動干擾時，四個超過 30° 門檻的靜態目標可產生相符方向。

## 為什麼

- Coami 基準 `d3eee648351837e391422e73c299cdae8d03a875`；Stack-chan `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`。
- vendor `firmware/docs/api.md:28` 定義 +X 前、+Y Robot 左、+Z 上、公尺／弧度；`motion-controller.ts:143` 設定與清除 gaze point；相對角度嚴格大於 30° 才轉動。
- `runtime-context.ts:260` 說明同步返回不代表完成；controller 部分錯誤只寫 trace。公開 MOD 沒有 gaze point getter。
- 靜態來源足以定義呼叫與解除語意，不能證明本次 runtime 載入、可見方向與操作關聯，因此需要有界實測。
- 成立只支持後續 Action 設計；不成立記錄限制；缺證據不推進依賴該假設的決策。不修改 vendor/server/device。

## 成功與失敗判準

- 四方向各從固定起始姿勢操作兩次，共八次；同次座標、序號、SDK 呼叫、driver 訊號與畫面互相對應，人工判定方向一致。
- 解除具有真實 pinned controller 的 gazePoint=null 與收尾後 polling 停止證據，加本次 MOD 呼叫證據；不以不動證明清除。
- 左→解除→穩定→右、上→解除→穩定→下均取得新方向。
- 無效目標不呼叫 SDK；同步失敗、driver trace 錯誤與缺證據不能顯示成功。
- 成功：全部固定判準成立。失敗：環境／起始／證據齊備而違反判準。無法判定：已嘗試但缺環境或關鍵證據。未執行：尚未嘗試。
- 建議上限90分鐘、最多一輪修正與重跑；5秒只是單次觀察窗口，並非 SDK 完成保證。變更判準另記版本，不回改原結論。

## 環境與前置條件

- macOS arm64、Node 26.10.0、npm 11.19.1；strict TypeScript、lockfile 固定依賴。
- 本次 feature worktree `/private/tmp/coami-e019-static-gaze`；branch `feat/andrew/e019-static-gaze`。所有實作與建置在此，dev worktree 不實作。
- 工具鏈沿用 E015 的完整性檢查：Moddable 9.5.0 source `b6e06ba70506a7381ffb28e09e3175bf4e99f305`；emsdk 5.0.1 `14c18b569f55138fe4963924162244251f454fb0`；fontbm `7677b908523e909679f67cd5c170396bb9def1aa`。設定 MODDABLE、EMSDK、EM_CONFIG、FONTBM、FONTBM_SOURCE 及 PATH；工具鏈放本 worktree 的 ignored `web/generated/toolchain/`。
- 官方 compiler 套件下載後先執行 `node scripts/install-compiler.mjs`：核對 archive SHA `76bcc261810a6facb482c6314711c7bb429ad52f7ed0af6285a278478aa27f21`，再依 pinned emsdk.py 的 release metadata 安裝規則還原，installed-tree SHA 維持 E015 原值 `42ce84c65e00be2818a7733704b9f0217f4c3ee9c7f2bb3366293f60c8e47295`。編譯 cache 隔離於 generated/em-cache；Python -B wrapper 避免 emcc -E 產生 bytecode 改動工具鏈。
- `assets` 核對 vendor gitlink、checkout、clean tree、tool source pins、compiler版本、固定 installed-tree SHA及 executable hashes；失敗清除舊 public runtime/provenance。
- 頁面啟動前核對 served runtime 與 MOD SHA-256；等待 firmware 與 E019 MOD ready。不請求相機／麥克風。
- 契約測試載入真實 pinned controller 與 util；Timer、mac-address、motion driver 為明示替身。這是控制器契約證據，不能當作 WASM／實機證據。

## 重現步驟

從本實驗 `web/` 執行：

```sh
npm ci --ignore-scripts
npm test
npm run test:contract
npm run typecheck
# 工具鏈 source checkout 與 executables 已放到本實驗 generated/toolchain 後：
export MODDABLE="$PWD/generated/toolchain/moddable"
export EMSDK="$PWD/generated/toolchain/emsdk"
export EM_CONFIG="$EMSDK/.emscripten"
export FONTBM_SOURCE="$PWD/generated/toolchain/fontbm"
export FONTBM="$FONTBM_SOURCE/build/fontbm"
export PATH="$MODDABLE/build/bin/mac/release:$EMSDK/upstream/emscripten:$PATH"
# compiler套件來源由 pinned emsdk manifest/release mapping 確認：
curl --fail --location --output generated/wasm-binaries-arm64.tar.xz https://storage.googleapis.com/webassembly/emscripten-releases-builds/mac/bf32ae8b61ac8efeb7eca01b54c8307f992724f7/wasm-binaries-arm64.tar.xz
node scripts/install-compiler.mjs
npm run prepare:poc
npm run build
npm run dev -- --port 5199
```

目前觀察條件為v2正面同高鏡頭（camera=[0,0,200]、target=[0,0,0]），模型區固定高度，方便同時看頭部與腳座。既有自動證據使用v1預設斜上方鏡頭，不回改舊結果。真人初次起始不符合與視角修訂見 `evidence/human-run.md`。

1. 開啟 localhost，待 pinned runtime 與 E019 MOD ready，填觀察者姓名。固定頁面視角；viewport 不接收旋轉輸入。
2. 按「選下一個目標／起始準備」，循環 Robot左、Robot右、上、下、起始準備。
3. 選起始準備，核對穩定後勾選起始條件並執行。此操作明確呼叫 lookAway→setPose(零旋轉)，與正式注視分列。
4. 觀察窗口結束後，核對正面起始，填人工判定。選方向、勾選起始條件並設定注視。
5. 目標座標：左[.5,.5,0]；右[.5,-.5,0]；上[.5,0,.5]；下[.5,0,-.5]，單位公尺；預期 yaw/pitch 分別 +45°/−45°/−45°/+45°。
6. 每次保存含 run ID／操作序號的起始與反應截圖；窗口結束再填方向符合、不符合或未確認。沒有 driver 訊號時不能填符合。
7. 每方向從正面重做兩次，再做兩組解除／再次指定。解除只顯示呼叫返回，人工欄填「未確認／解除僅記錄」。
8. 下載 JSON，將操作與截圖位置記入 `evidence/simulator-run.md`。driver錯誤會封鎖後續操作，先下載證據再 reload。

## 是否成功

- **實驗狀態：失敗**。環境與 pinned runtime 已成立；「上 → 解除 → 下」違反既定再次指定判準。八次從正面開始的自動方向操作均取得預期角度；v2真人四方向各兩次共8次判定符合，左→解除→右符合，上→解除→下仍抬頭且無新rotation。真人同次畫面檔未完整保存，列為證據限制。
- **本輪可行性驗證任務完成：是**。已取得足以否定主要假設的真實 WASM 操作與 pinned controller 重現證據，並明列人工證據缺口。這不表示所有驗收項完成或假設成立。
- 工程交付進入 Draft PR human review；不因純測試／契約測試通過改判 simulator 失敗。若要修 SDK，須另行決定 scope。

## 結果與證據

- `evidence/red.txt`、`ledger-red.txt`：新增測試先於對應實作，缺少目標 module 的 red 結果。
- `evidence/validation.txt`：11項純測試、4項真實 pinned controller 契約／限制characterization測試、strict checks與build。
- `evidence/simulator-run.md`：實際 simulator smoke、人工八次方向與再次指定的狀態；未執行項維持未執行。
- `evidence/human-run.md` 與 `human-final.json`：Andrew在v2正面同高視角下的真人判定、24項操作完整匯出與最終垂直再次指定失敗。原始同次真人畫面檔未完整保存，不聲稱全部Acceptance Criteria通過。
- `web/generated/`：ignored runtime、MOD、工具鏈與完整建置 log；不提交二進位。

## 結論與限制

- 公開 API 不變；MOD 只用 motion capability，controller內部只由隔離契約測試讀取。
- 每項 MOD 操作先 emit begin 再呼叫 SDK，序號包含 rejected 操作，5秒內拒絕重疊；窗口結束後仍需人工觀察才能從頁面繼續。
- UI分開呼叫結果、driver訊號與人工結果；解除無 runtime gazePoint讀回，不承諾急停／回正。
- Graphify 沒有可用既有 graph，採 targeted-source fallback；未另建 graph。PR Lens 只產生外部本機變更圖，不上傳、不代表 correctness review。
- pinned runtime、起始條件、解除契約或方向證據不足時停止依賴決策；正式 SDK變更另報 scope gap。
- 已確認 Scope Gap：固定起始的四方向可走 SDK 路徑，但直接上下再次指定不符合本 Mission 判準。失敗只支持此 pinned simulator 條件，不外推實機。最終停在人類審查；不 merge、不 release、不移入正式程式。
