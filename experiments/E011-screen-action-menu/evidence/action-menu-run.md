# E011 pinned-simulator run

## Procedure

2026-09-30 在 Vite 的 pinned simulator 中，以 in-app Browser 操作 Robot 螢幕：從 offset 0 滑動三次至 offset 280，點選初始不可見的「回正」（`head.center`）。同一次操作的瀏覽器畫面取樣為 80 張 frame，再以 10 fps 編碼成 8 秒 [action-menu-run.webm](action-menu-run.webm)；最後狀態另存 [action-menu-result.jpg](action-menu-result.jpg)。這是 browser screenshot sampling，並非作業系統連續擷取。

## Results

- `npm test`：10/10 PASS；包含取消拖曳還原顯示 offset、模擬器重用 touch ID 時取消 callback 遺失後的恢復，以及 terminal footer 狀態。
- `npm run typecheck`：PASS。
- `npm run prepare:poc`：PASS；`coami-mod.xsa` 含 `mod`、`action-catalog`、`action-menu-interaction` 三個 emitted modules。
- `npm run build`：PASS。
- Robot 螢幕初始可見清單前段；`head.center` 初始不可見。三次滑動的 `touch ended` 均有 `run_seq: null`，offset 依序到 98、196、280；畫面可見「回正」。
- 「回正」點選的同次 trace：`touch began action_id=head.center` → `touch ended run_seq=1 action_id=head.center` → `screen running` → `run_seq=1 started` → `screen completed` → `run_seq=1 completed`。WebM 的動作段可見頭部運動，最後 Robot 螢幕顯示「回正完成」，頁尾恢復「滑動瀏覽，點選執行」，不再顯示等待完成。
- 修正前的實測顯示執行中連點沒有第二個 run；第一個 terminal 後新的有效點選才產生第二個 run。
- 修正後再測：拖曳移出 3D 螢幕未執行動作；模擬器未向 Piu 傳回 cancel/end callback，後續新觸碰由 E011 `recovered` 路徑還原螢幕 offset 並正確派送畫面上的 `face.neutral`。實際收到 cancel callback 時的還原則由純 TypeScript 測試覆蓋。
- 2026-09-30 owner 回報已在 `http://127.0.0.1:4173/` 手動測試，Robot 螢幕可正常點選；此為 owner 回報，未取代上方的 trace／畫面證據或獨立 code review。

## Limitations

模擬器未強制產生 action failure，故失敗、取消與 stale terminal 的畫面不宣稱有實際 simulator 重現；這些分支由純 TypeScript tests 驗證。WebM 是 browser screenshots 的取樣錄影，適合核對選取到結果的時序，但不能用來測量真實硬體的觸控流暢度。獨立 Reviewer 首輪指出的終態頁尾矛盾與取消拖曳 offset 偏離，已在本輪修正並重新驗證；第二輪判定 `approved`，無 blocking issues。

## Decision

本次 pinned-simulator 主路徑與已測負向互動通過；交由獨立 Reviewer 核對 evidence 與 topic 邊界。E011 仍不宣稱實機可用性或完整 forced-failure simulator coverage。
