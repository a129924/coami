# E011 螢幕動作選單

## Question

能否在 pinned Coami simulator 的 Robot 螢幕捲動固定清單，選取一個 E005 visual-PASS 動作，並把同一次實際 terminal 如實回映到螢幕？

## Run

```sh
cd experiments/E011-screen-action-menu/web
npm ci
npm test
npm run prepare:poc
npm run build
npm run dev
```

在瀏覽器開啟 Vite URL，直接在 3D Robot 螢幕上將清單滑至初始不可見項目，放開後再點選該項。頁面右側只顯示 trace 和 restart；不可用它派送動作。

## Evidence procedure

錄影與 trace 必須是同一次操作，依序展示初始清單、捲動、目標列、選取、可辨識動作、matching terminal 和終態畫面。另檢查純滑動、取消／移出、busy 再點與 excluded action IDs。
