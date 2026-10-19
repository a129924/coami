# E027 — Contextual Traditional Chinese voice turn

## 驗證什麼
成人在 browser simulator 說「我想要車車」；真實 ASR／生成／TTS 能否依固定情境回答或追問，經 MOD→SDK-A05 播放並可聽辨。

## 為什麼
E007 只有錄音回放、E018 只有日文 say；不能推論中文理解或完整閉環。SDK-A03 record(4000) 與 SDK-A05 playAudio 是本輪能力組。

## 成功與失敗判準
先完成 A「你好，我是你的聊天夥伴。」與 B「你說的是玩具車，還是真的汽車呢？」兩句 TTS 的 SDK／natural ended／真人聽辨。然後兩種固定 context 各三筆，依 clear→ambiguous 交錯。
- clear：桌上唯一紅色玩具車，正在談玩具；應短句承接紅色玩具車，不追問或承諾拿取。
- ambiguous：桌上玩具車及窗外真車，尚未指明；只問一個區分問題，不擅選。
成功需六筆均保留原意、分支／內容正確、同輪自然結束與真人聽辨。依賴成立且明確觀察錯誤為失敗；缺證據為無法判定，不以 SDK true 或 build 通過取代。

## 環境與前置條件
Python 3.12 / FastAPI 0.141.1 / httpx 0.28.1；Node 24–26、TypeScript 7.0.2、Vitest 4.1.0、Vite 8.2.1。
SDK b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322；fresh runtime 需要 E027-local web/generated/toolchain/{moddable,emsdk,fontbm}，版本及 source pin 沿用 E018 prepare script。
ASR gpt-transcribe → Responses gpt-6-luna → gpt-4o-mini-tts-2025-12-15 / coral / WAV；TTS 2027-01-06 退役，到日或模型不可用即停止，不 fallback。
只用一個 loopback Server worker。真實 OPENAI_API_KEY 僅由 Server process environment 接收，缺值不呼叫 provider。`.env.example` 僅空值契約；同目錄 `.env` ignored，**不會自動載入**，dotenv／優先序尚未採用。不要把 key 放前端或提交。

## 重現步驟
所有命令在 feature worktree，不能在 dev worktree 實作。
1. server/: `uv sync --locked`，`uv run pytest -q`、`uv run ruff check .`、`uv run pyright`。
2. web/: `npm ci --ignore-scripts`、`npm test`、`npm run build`。
3. 準備 E027-local pinned toolchain；依 E018 同版來源建立副本，不重用 runtime。設定 MODDABLE、EMSDK、EM_CONFIG、FONTBM_SOURCE、FONTBM 與 toolchain PATH，執行 `npm run prepare:poc`。prepare 只 patch generated SDK 的 audio-bridge.c/js；vendor 不變。缺任一工具會 fail closed，不可拿舊 runtime 替代。
4. 已在本機設定 Server process 的 OPENAI_API_KEY 後，server/: `uv run uvicorn app:app --host 127.0.0.1 --port 8027 --workers 1`；web/: `npm run dev`。
5. 開啟夥伴、逐句播放 TTS A/B 並確認聽辨，再按固定順序錄六筆。每筆說同一句話。下載 trace，不保存原始錄音。
6. 注入播放失敗；另在 pending 時 reload，確認舊回覆不發聲。合成錯誤與真人案例分列。
單工作日最多20個已接受操作，含錄音前後失敗、取消、重試；host localStorage 與 Server ignored build/budget.json 跨 reload 保留，不自動重置。Server 最多60次 provider HTTP（每 turn≤3，TTS-check≤1），無自動 retry。不得清除 ledger 來繞過上限。
Server pipeline30秒、host40秒；busy拒絕、不排隊。未確認播放終態會鎖至 reload。取消只保證本地停止等待／音源／tracks，不宣稱 cloud 已停止。

## 是否成功
- 中文 TTS 前置：未執行。
- 主要假設：未執行。
- 驗證任務：未完成；fresh native runtime 已建置並在 browser 啟動，仍缺真實 provider／播放終態與真人聽辨。
- 純測試／web build：見 evidence/validation.txt；不是主要假設成功。

## 結果與證據
保存命令／版本、token、錄音 MIME／SHA256、ASR、生成 kind/text、prompt hash、provider request／returned model、WAV hash、SDK及natural ended與聽辨。raw聲音只在記憶體，不落檔。voice-run.md 與 acceptance-summary.json 目前是未執行紀錄。
2026-10-19：已在 E027 ignored generated 內恢復原 pin 的 Moddable／emsdk／fontbm，fresh runtime 與 MOD 建置成功。修正 EM_ASM 物件逗號的 C macro 編譯錯誤，以及 host 對 SDK 無尾端換行 trace 的處理；13 個 E027 Vitest、strict TS/MOD typecheck、web build 通過。測試搜尋限制在 E027 src，避免把 generated 第三方測試納入。實際 browser 載入 hash 相符、MOD installed／ready、TTS 按鈕解鎖；錄音仍受真人前置確認控制。
runtime-build.txt 保留先前失敗及本次 red/green；runtime-provenance.json 是本次實際建置 receipt。voice-trace.jsonl 含明確標示來源的 HTTP hash 與 browser 觀察，不冒充已匯出的完整真人 trace。自動化 download-event 等待逾時，完整 browser trace 下載仍待確認。
本機已將 ignored server/.env 透過 shell 注入單一 loopback Server process，僅確認非空與 OpenAPI HTTP200；沒有新增 dotenv，也沒有驗證金鑰有效性。範本仍是空值 OPENAI_API_KEY=。依 owner 指示稍後再做真人驗證，目前 live provider calls=0、未接受任何語音操作、未建立 Server budget ledger，未清除／重置任何 ledger。TTS A/B、六筆真人案例及 live 播放失敗／pending reload 均未執行。

## 結論與限制
本輪仍不能判定閉環假設。假設失敗可完成驗證任務；無法判定須記缺口及決策限制，不能推進受阻決策。未驗證兒童、實機、多輪、一般情境充分性或 production採用。完整模型與原目標未改。
回復僅撤回本 topic 程式，不刪歷史證據；Draft PR 等待 human review，不 merge/release。
