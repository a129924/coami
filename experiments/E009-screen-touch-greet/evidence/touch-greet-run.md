# E009 — 同次螢幕觸控與打招呼證據

## 環境

- 2026-09-29，E009 feature worktree `feat/andrew/e009-screen-touch-greet`。
- Stack-chan submodule：`b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`；模擬器 `mc.js`／`mc.wasm` 經 `prepare-assets.mjs` SHA-256 核對。
- Chrome headless 1280×800，實際 E009 Vite 頁面、pinned WASM 與編譯後雙模組 MOD。頁面唯一動作來源為 3D 裝置螢幕。

## 成功情境（同一次 run）

[WebM](touch-greet-run.webm) 共 5 秒，約 0.3 秒為螢幕選項、1.9 秒為可見表情／點頭、4.6 秒為螢幕完成結果。執行期間頁面 trace 依序包含：

```text
COAMI9|{"kind":"touch","phase":"began","touch_id":0,"accepted":true}
COAMI9|{"kind":"touch","phase":"ended","touch_id":0,"run_seq":1}
COAMI9|{"kind":"run","run_seq":1,"action_id":"greet","phase":"started"}
COAMI9|{"kind":"screen","phase":"completed"}
COAMI9|{"kind":"run","run_seq":1,"action_id":"greet","phase":"completed"}
```

畫面可辨認由選項切換到笑臉與點頭，再回到結果畫面「打招呼完成」。這是 creator 人工檢視，draft PR 仍待 human review。

## 負向與重複情境

- 點選 3D 裝置螢幕外：無 MOD touch trace、無 run，頁面維持「尚未執行」。
- 從選項移出 3D 螢幕再放開：頁面記錄 `viewport outside: pointermove`，MOD 收到 move，無 run；其後再點有效選項得到 `run_seq: 1` completed。
- 觸碰選項後送出 pointercancel：無 run；其後再點有效選項得到 `run_seq: 1` completed。
- 動作進行中的第二次螢幕點選：僅 `run_seq: 1` 開始及完成；終態後再次點選得到 `run_seq: 2` 開始及完成，無排隊執行。
- 純 TS 測試驗證 `failed` 終態、遲到結果與 restart 不會轉成成功；實際模擬器本次未強制注入動作失敗。

## 建置與檢查

`npm test` 5/5 通過；MOD／Web strict typecheck、雙模組 XS archive、Vite build 與 pinned 資產 SHA-256 均通過。Vite 對 simulator bundle 發出大小警告，但建置成功。
