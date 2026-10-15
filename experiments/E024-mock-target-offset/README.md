# E024：Mock 辨識框 → 畫面偏差 Calculator → TargetOffset

## 驗證什麼
- 設計／執行日期：2026-10-15；E024 在建立前核對本機 worktrees、全部 refs 歷史及 freshly fetched origin refs，E001–E023 已占用。
- 問題：單次 Mock 畫面的尺寸、當前框與觀測身分，能否依固定契約轉成正確、解析度無關的當前中心偏差或明確分類？
- 假設：自有 VO 足夠支援此轉換，不需要 OpenCV 內部型別、跨影格狀態或 Robot SDK。
- 依據：owner 核准的對話 processed-plan 及局部修正，落成 `../../plan/E024-mock-target-offset/` 的 Python plan/spec/step；獨立 Python plan review 通過後實作。

## 為什麼
OpenCV 4.8.0 [CascadeClassifier](https://docs.opencv.org/4.8.0/d1/de5/classcv_1_1CascadeClassifier.html) 矩形與 [FaceDetectorYN](https://docs.opencv.org/4.8.0/df/d20/classcv_1_1FaceDetectorYN.html) 每列前四欄 xywh 支持 detector-specific adapter 的映射可行性；原生矩形可能部分越界，拒絕是本實驗政策。
文件已足以回答映射問題，沒有為 OpenCV 另建執行實驗。本次執行是驗證新 Python 實作是否符合固定 Mock 契約；並非重新證明公式、選定 detector 或執行真實模型。

## 成功與失敗判準
判準在執行前固定於 plan/spec：
- 成功：19 筆手定共同案例及全部分類、數值邊界、身分、不可變與確定性測試符合；合法單框方向／偏差正確，非法值明確拒絕。
- 失敗：偏差或分類不符，或非法值產生可用偏差。
- 無法判定：已嘗試但必要執行證據不足；未嘗試為未執行。
- 數值比較：absolute tolerance 1e-12、relative tolerance 0。
- 建議投入上限：60 分鐘、最多一輪局部修正與重跑。實際進行一輪局部 lint/type 修正，保留首輪輸出；未改契約。

## 環境與前置條件
Python 3.12.12、macOS arm64；精確版本與各指令見 `evidence/run.json`、`evidence/toolchain.txt`。
Runtime 僅標準函式庫，無模型或外部套件安裝。Ruff/Pyright 重用主 repo 現有 server venv 作唯讀 developer tooling；沒有修改 server 檔案、venv 或 dev worktree。
所有新檔在 `/private/tmp/E024-mock-target-offset/feature-worktree` 的 `feat/andrew/e024-mock-target-offset`；base `a855b451b6fe1c24d02caf67c569ffa90a9ea732`。
輸入全部為手工 Mock：已校正、未鏡像、左上原點、X 右／Y 下、像素邊界框。沒有攝影機、OpenCV、Tracker、真實 consumer 或 Robot 執行。

## 重現步驟
在本目錄用 Python 3.12 執行，不需安裝實驗套件：
```sh
python3.12 -m unittest -v
python3.12 run_cases.py
```
Developer tooling（此工作環境已有）：
```sh
/Users/andrew/code/python/coami/server/.venv/bin/ruff check .
/Users/andrew/code/python/coami/server/.venv/bin/ruff format --check .
/Users/andrew/code/python/coami/server/.venv/bin/pyright --project pyrightconfig.json
```
- `calculator.py`：frozen VO 與同步 pure domain `calculate_offset(DetectionObservation) -> OffsetResult`。
- `mock_cases.py`：Mock adapter 建立固定觀測及獨立期望值，不呼叫公式產生 expected。
- `run_cases.py`：逐筆顯示輸入／實際／預期結果；是展示入口，正確性由 unittest 判定。
- `test_calculator.py`：12 個測試方法，以 subtests 覆蓋共同案例及多維非法值。
實際指令、工作目錄、時間、exit codes、程式 SHA-256 在 `evidence/run.json`；輸入與對照在 `evidence/common-cases.txt`。

## 是否成功
- 執行日期：2026-10-15。
- 實驗狀態：成功。
- 本輪驗證任務完成：是；單次 Mock 契約、轉換與分類符合事前判準。
- unittest、共同案例展示、Ruff lint/format、strict Pyright 最終 exit code 均為 0；成功判斷來自對應案例／分類的 assertions，不以 build/tool 成功代替行為判準。
- 成功不涵蓋真實 detector、追蹤、consumer 相容性或 Robot 收斂。

## 結果與證據
- `evidence/tests.txt`：12 個測試方法通過（含多筆 subtests）。
- `evidence/common-cases.txt`：19 個獨立 Mock 快照的輸入、實際與手定期望。
- `evidence/ruff-check.txt`、`ruff-format.txt`、`pyright.txt`：最終 developer checks。
- `evidence/run.json`：最終環境、指令、exit codes、程式指紋。
- `evidence/initial-tests.txt`：測試先於 Calculator 建立，初次缺少模組的 import failure。此為初始狀態紀錄，**不是行為級 RED，也未宣稱 red-tests-ready**。
- `evidence/first-pass-run.json`、`first-pass-ruff-check.txt`、`first-pass-pyright.txt`：首輪行為測試通過，但 lint/type 未通過；局部修正 numeric-tower annotation、tuple-count narrowing 與 combined with 格式後重跑通過。
- `evidence/boundaries.txt`：主 dev 乾淨、feature 身分與 Calculator 標準庫依賴查核。
觀察：無目標不是 `(0,0)`；巨大整數不會先 float 化溢位；重複／交錯同一非零觀測仍為 `(0.375,0)`。所有證據均是 Mock Python 執行，沒有真實追蹤或硬體證據。

## 結論與限制
`DetectionObservation` 是單次畫面快照（ID、尺寸、當前 boxes）；`observation_id` 只關聯本次觀測，不是跨影格 target identity。沿用名稱及既有 VO 契約。
Calculator 只消費自有 VO、輸出互斥的 Target／NoTarget／Rejected，無 OpenCV、影像、Tracker、SDK、I/O 或前次位置狀態。相同輸入相同輸出。
`TargetOffset` 是當前目標中心相對畫面中心，左／上負、右／下正；不是 prev-curr、轉動角度或自動置中。重複輸入不會讓偏差自行趨近零。
frame 必須原生 int（非 bool），1..MAX_PIXEL；box 原生 int/float（非 bool）、有限且限界、尺寸正數並完整包含。MAX_PIXEL=2**31-1 是實驗政策，不裁切、不修正。任意破損 Python 物件／JSON 解析在 typed VO 邊界之外。
未來 detector／Tracker 在 adapter 側提供當前框，符合 VO 時 Calculator 不需改；本輪未選定或實作真實接口。正常無框才是 NoTarget，模型／呼叫失敗不可偽裝成無目標。
外層控制責任：新影像 → Adapter 新觀測 → Calculator 偏差 → 下游決定並執行轉動 → 重新觀測。停止容許範圍、控制增益、馬達方向與姿態配對屬外層／下游；本輪不實作控制迴圈。
多筆獨立 Mock 的偏差變小只能展示數值，不能證明控制收斂。真實追蹤、consumer 相容性、Robot 置中另待整合。不得自動升格 production、建立正式共用套件或變更其他實驗。
本次交付 Draft PR 後停在 human review；不 merge、release、刪分支或清理 worktree。
