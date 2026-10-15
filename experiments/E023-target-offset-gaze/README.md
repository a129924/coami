# E023：TargetOffset → Calculator → LookAt → Robot

## 驗證什麼

驗證固定靜態模擬目標能否經 **合成 TargetOffset → Python Calculator → LookAtCommand → TS → 真正 WASM＋XS MOD SDK `lookAt()` → rendered 姿態重新投影** 逐步置中。工作包為 `python-and-ts-implementation`，不是新增 workflow profile。

設計與執行日期：2026-10-15。**本輪結果：無法判定。** Python／TS 與實驗 MOD 已實作；目前缺少與既定雜湊一致的 WASM host，未執行真正 roundtrip 或任何閉環案例。純測試與建置不能證明收斂。

| 邊界 | 本次工作 |
|---|---|
| Goal | 取得計算、傳遞、SDK 返回與實際姿態的可追溯證據，回答固定模型下能否置中。 |
| Non-Goal | 不保證成功、不外推實機，不以假控制器或 `setPose()` 補成功；圖表不替代閉環證據。 |
| In-Scope | Python Calculator／本機 WebSocket、TS receiver／touch glue、XS MOD、獨立觀測、事前案例、防護、實驗證據與限定輔助圖。 |
| Out-Of-Scope | OpenCV、真實攝影機／測距／校正、底座移動、多人／動態追蹤、PID、預測、效能調校、SDK／E019 修復、正式契約、production、部署；不安裝新工具鏈、不 build graph、不呼叫 provider 或發布圖表。 |
| ReadOnly | vendor／SDK、既有實驗、server/src、device/src、治理、skills、工具與既存設定／graph。 |
| Written | 本目錄 server、web、mod、tests、README、evidence；PR Lens 外部本機產物置於 `/private/tmp/E023-target-offset-gaze/pr-lens/`。 |
| Modify | 僅本次新增的 E023 檔案與上述外部產物；既有 baseline 檔案不修改。 |
| Deleted | 無；不刪既有檔案、分支、worktree 或 graph。 |
| TestCase | TC-GEO、TC-INPUT、TC-TRANSPORT、TC-E2E-01..15；TC-AUX 獨立記錄。 |

## 為什麼

SDK `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322` 的 controller 只在 yaw 或 pitch 誤差**嚴格大於 30°**時轉頭。E019 保留上下切換失敗，E020 的獨立 patch 不納入本實驗。座標公式正確不代表 SDK 可以精細置中，需要重新觀測證據。

來源：vendor `firmware/host/modules/motion/motion-controller.ts`、`web/src/services/simulator/simulator-engine.mjs`、`web/simulator/geometry.mjs` 及 E019／E020 README。此版本的 WASM MOD 無可直接沿用的 WebSocket；既有 touchScreenPoint→Piu 輸入支援實驗限定傳遞。Piu event kind 為 began=0、cancelled=1、ended=2、moved=3。

`bridge.getRotation()` 回傳命令 cache，不能當作實際姿態。本實驗只讀 rendered `headGroup` world quaternion，觀測 pose 與 offset 使用同一次快照；synthetic camera 的中心固定為 Robot 原點，不採模型 mesh 平移。

## 成功與失敗判準

相機零安裝平移／旋轉，水平與垂直 FOV 都為 90°；u 向右、v 向下，範圍 [-1,1]，gain=1。Calculator 使用 `R_sdk × normalize([1,-u,-v])`，輸出距原點 1 m 的虛擬目標。SDK X 前、Y 左、Z 上；Three(x,y,z)=SDK(Y,Z,X)，`R_sdk=Sᵀ R_three S`。

驗證器獨立持有固定世界目標，以實際 quaternion 逆旋轉後重新投影，不讀 Calculator 輸出或 SDK 命令姿態。中心條件為 **雙軸絕對偏差≤0.1、最多20次控制、連續3筆觀測置中**；中心不發修正。同一軸連續4筆中心外決策觀測交替正負即持續反轉。250 ms 診斷取樣與每次控制決策觀測分開記錄。

| TestCase | 固定操作與預期 |
|---|---|
| TC-GEO | 中心、四軸／斜向、非零姿態；方向與獨立幾何預期一致。 |
| TC-INPUT | 無目標、NaN／Infinity、越界、非法旋轉矩陣、重複、倒序、過期、pending 衝突；不產生新修正。 |
| TC-TRANSPORT | 先做非運動 probe：軸向正負、斜向、近中心、不同序號；核對完整解碼與關聯。不完整／錯序／重播／逾時不得執行新命令。 |
| TC-E2E-01 | 中立姿態 (0,0)，修正命令0筆。 |
| TC-E2E-02..05 | 中立姿態，四軸 ±0.8。 |
| TC-E2E-06..09 | 中立姿態，四斜向 (±0.8,±0.8)。 |
| TC-E2E-10..13 | 中立姿態，四軸 ±0.11，仍須保留門檻內未收斂結果。 |
| TC-E2E-14..15 | yaw/pitch=(+20°,+10°)、(-20°,-10°)，各測 (+0.8,0)。 |
| TC-AUX | Archify 驗證與視覺證據、PR Lens 真實 diff、Graphify freshness 或 source fallback；不納入主收斂判準。 |

成功：計算、傳遞、防護及全部閉環案例通過。失敗：環境／證據充分但任一判準不成立，包括可靠姿態顯示目標出視野、SDK failed 或20次仍未置中。無法判定：關鍵 runtime、傳遞或姿態證據不足。尚未嘗試的個別案例維持未執行。

總投入上限90分鐘，包含準備、實作、主實驗、輔助工具及最多一輪局部修正與重跑。不可事後放寬判準；達停點保存證據。

## 環境與前置條件

- 基準 Coami `a855b451b6fe1c24d02caf67c569ffa90a9ea732`；分支 `feat/andrew/e023-target-offset-gaze`。
- Feature worktree：`/private/tmp/E023-target-offset-gaze/feature-worktree`。所有實作在此；dev worktree 未實作。
- SDK 固定 pin，不修改 vendor；MOD 使用 vendor 已有的 WASM tools 編譯，不安裝外部 compiler。
- Node 24..26、npm lockfile；Python 3.12、server/uv.lock。依賴版本沿用既有實驗。
- `E023_RUNTIME_DIR` 必須提供確切 reviewed host bytes：mc.js SHA-256 `9e7c0128e4b94ac78cb3646a488a04be227272e61b7fee77cd2b6ec91aa745f0`；mc.wasm `bc8f5a40fe4e6e1b0f0fd9f29cf5089129fdfca2b9cc0ce229f6788328676ac2`。不接受同名或其他版本產物。
- 本機可找到 E001 host，但 mc.js=`93008fd8c767b2c5ccb8950c0ef290453e900224197420abbc4cfc940907600f`、mc.wasm=`b3bb666cc67c3e2f039b86be59c4a0d1a551b6bffe4e64a5e867380fa3bbbe83`，因此明確拒絕。
- WebSocket 只綁127.0.0.1:8230；接受 origin 127.0.0.1／localhost:5203。每次 connection 固定 run，不跨 runtime 比較 monotonic 時鐘。

## 重現步驟

從 feature worktree 的本實驗目錄開始：

```sh
cd server
uv sync --locked
uv run pytest ../tests/test_calculator.py
uv run ruff check . ../tests
uv run ruff format --check . ../tests
uv run pyright
uv run python ../tests/transport_smoke.py
cd ../web
npm ci --ignore-scripts
npm test
npm run test:mod
```

真正 runtime 前置檢查與啟動：

```sh
# 僅指定已具備上述固定雜湊的目錄；本實驗不安裝或修補 SDK 工具鏈。
E023_RUNTIME_DIR=/absolute/path/to/verified/simulator npm run prepare:poc
npm run build
npm run preview
# 另一個 terminal，在本實驗 server/：
uv run uvicorn app:app --host 127.0.0.1 --port 8230
```

prepare 先核對 vendor pin／clean tree，以現有工具建立 MOD，再核對 runtime。失敗會清除 generated/public，寫入 blocked preflight；不能將舊 public 產物冒充已準備。Vite 另核對 MOD source／archive provenance。Browser 再核對 served mc.js／mc.wasm／mesh／MOD bytes。

1. 開啟 `http://127.0.0.1:5203/`，等待 runtime＋MOD ready；缺 runtime 時只顯示無法判定，執行按鈕封鎖。
2. 每案 fresh runtime。選擇案例並重新載入，按「執行此案例」。先執行6筆非運動 probe；若失敗立即停止，不進入閉環。
3. 初始姿態只在此階段使用 lookAway→setPose；以 rendered quaternion 確認1°內，最多等5秒。閉環不使用 setPose。
4. 每筆 observation 含 run、遞增 seq、同次 R／offset 與本機 age。Python 單筆 pending；Browser 在傳送 frame 前及 commit 前檢查觀測年齡≤1000 ms，不重送、不補過期 commit。
5. 五個完整 began／ended touch：start(seq)、X、Y、Z、commit(seq)。每分量 q=floor((component+1)*1000+0.5)，還原 q/1000-1 m；誤差≤0.0005 m。x=q%200，y=80+12*field+floor(q/200)，field=0..4，probe start=5；避開 AppBar。MOD 用 Time.ticks 檢查5秒組裝與序號；此期限不延長 Browser TTL。
6. commit 至匹配完整 trace 最多2秒；缺失／錯誤身分／錯誤 payload 即無法判定。SDK returned 後固定5秒觀測，每250 ms取樣，之後才計算下一筆。中心連續3筆後停止。
7. 每案下載 JSON，保存 run、Command、量化目標、SDK trace、實際姿態、偏差與結果。任何可靠出視野立即判該案失敗；缺姿態／driver錯誤／回報中斷立即停，保留分層證據。

僅重現缺 runtime 的 fail-closed UI（不能當作 WASM 驗證）：

```sh
npm run build
node scripts/blocked-ui-smoke.mjs
```

此 smoke 自行啟停 preview 與 headless Chrome；需要可啟動 Chrome 的本機環境。Node MOD contract 的 Piu、Timer、Time 與 Robot driver 均為明示替身，僅驗證本實驗 MOD 的路由／防護。

## 是否成功

- **主實驗：無法判定。** 已嘗試 runtime 前置檢查，缺少固定 host bytes，找到的 E001 產物雜湊不符。
- **真正 WASM roundtrip：未執行；閉環15案：全部未執行；真實 SDK 控制0筆。** 沒有用替身產生收斂成功。
- **本輪實作與紀錄交付：完成供 Draft PR 審閱；閉環驗證任務：未完成。** 證據缺口及恢復條件明列，受阻的收斂決策不能前進。
- 純測試、strict checks、WebSocket smoke 與 MOD archive 建置通過，各只支持對應邊界。Archify／PR Lens 為輔助，不是 correctness review。

## 結果與證據

- `evidence/python-red.txt`、`ts-red.txt`：在缺少目標 module 時新增測試的 red 證據；Python red 已使用正確3.12測試環境。
- `python-green.txt`：25項 Python 純測試。`ts-green.txt`：10項 TS 測試。`mod-contract.txt`：2項明示假 host 的 MOD 測試。
- `python-typecheck.txt`、`web-build.txt`：strict Python／TS 與 Vite build；bundle size warning 保留，未做效能調校。
- `websocket-smoke.txt`：真正 loopback WebSocket 的 hello、Calculator、pending、correlation、replay、expiry、center、lost、malformed 行為；沒有 Robot／WASM。
- `runtime-preflight*.txt/json`、`mod-provenance.json`：實際 runtime 缺失／雜湊拒絕與已建立 MOD archive 雜湊；archive 本身為 ignored build artifact。
- `blocked-ui.json/png`、`blocked-ui-smoke.txt`：缺 runtime 時的實際 Browser UI 與0筆傳送證據；不是閉環紀錄。
- `results.json`：主狀態與15案未執行表。
- `evidence/archify/diagram.html`：設計 sequence 圖。showcase 9/9、零 composition errors／warnings；delivery receipt 綁定 spec／HTML hash。四個 desktop containment 通過，兩種主題與兩個極端尺寸已以圖片檢視，見 visual-review.json。繁中內容，Viewer UI 回退英文。
- `graphify.txt`：固定CLI 0.9.73；限定搜尋未找到可用 graph，採 rg／source fallback，未 refresh／extract／build。
- PR Lens 於真正 topic commits 後，依實際 base/head 生成外部本機圖，不上傳／附加至 PR、不修改 repository config。

## 結論與限制

本輪只交付實驗限定程式及可核對的局部證據。**尚未回答真正 SDK 是否能閉環置中**。要解除停點，需提供固定 reviewed WASM host，依原判準先通過真正非運動 roundtrip，再執行原15案；若需安裝新工具鏈、改SDK或改判準，另行決定，不在本輪偷渡。

Graphify 是導覽輔助，重要關係已回查 source。PR Lens 只呈現實際變更與必要 unchanged SDK／runtime neighbors，不能取代 human code review。所有輔助工作共用90分鐘上限，不用圖表結果升級主實驗狀態。

停在 Draft PR → human review，不 merge、不 release、不移入正式程式，也不宣稱固定 host 或實機驗證通過。
