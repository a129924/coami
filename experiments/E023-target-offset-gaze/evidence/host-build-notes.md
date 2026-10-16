# 補齊固定 WASM host 與真正驗證

Owner 在首次 Draft PR 交付後明確要求補齊缺少的 probe／15 案閉環。本次因此在 E023 ignored `web/generated/` 內安裝固定建置依賴，沒有修改 dev、vendor、SDK 運動程式或驗收值。這是原先「不安裝新工具鏈」停點的有界修訂；不包含工具升級、Graphify graph 建置或正式採用。

## 固定來源及套件

| 輸入 | 固定值 |
|---|---|
| SDK | b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322 |
| Moddable 9.5.0 | b6e06ba70506a7381ffb28e09e3175bf4e99f305 |
| emsdk 5.0.1 | 14c18b569f55138fe4963924162244251f454fb0 |
| Emscripten compiler | 8c5f43157a3f069ade75876e23061330521eabde |
| fontbm | 7677b908523e909679f67cd5c170396bb9def1aa |
| compiler archive SHA-256 | 76bcc261810a6facb482c6314711c7bb429ad52f7ed0af6285a278478aa27f21 |
| Node 22.16.0 arm64 archive SHA-256 | 1d7f34ec4c03e12d8b33481e5c4560432d7dc31a0ef3ff5a4d9a8ada7cf6ecc9 |
| Python 3.13.3 arm64 archive SHA-256 | 2b0899d7ade9463b0c909ef23aeea27546a4f412637998d817a49718bc2bac19 |

Source URLs：Moddable-OpenSource/moddable、emscripten-core/emsdk、vladimirgamalyan/fontbm 的 GitHub repositories，均 fetch 上表完整 commit。套件 URLs：

- https://storage.googleapis.com/webassembly/emscripten-releases-builds/mac/bf32ae8b61ac8efeb7eca01b54c8307f992724f7/wasm-binaries-arm64.tar.xz
- https://nodejs.org/dist/v22.16.0/node-v22.16.0-darwin-arm64.tar.gz
- https://storage.googleapis.com/webassembly/emscripten-releases-builds/deps/python-3.13.3-0-macos-arm64.tar.gz

Node／Python 套件複用本機 E020 attestation archives，先驗證完整 archive SHA，再解壓至本 E023 目錄。Emscripten archive 自官方 URL 下載，installer 驗證 SHA 後才解壓。Python 依 pinned emsdk 程序加入 `.emsdk_version`，內容 `python-3.13.3-64bit\n`。沒有直接信任舊 executable 或其他版本 host。

## 重建程序

E019 的建置驗證 helpers 複用到 E023 scripts；只將 host staging/output 隔離於 `generated/host-build/`，不寫入 E019。原 native tools／fontbm 均由固定來源清空 build 後重建，Emscripten 使用受控 config、固定 Node/Python、完整 tree digest，重設 compiler cache。SDK 透過既有 `npm run build:wasm` 編譯；沒有 motion patch。

從 E023 web/ 開始，首次建立 `generated/toolchain/`：

```sh
# 各來源以 git init / remote add / fetch --depth 1 origin <完整commit> / checkout --detach FETCH_HEAD 建立：
# generated/toolchain/moddable、generated/toolchain/emsdk、generated/toolchain/fontbm。
# 上表 Node/Python archives 驗證 SHA 後以 tar --strip-components=1 分別解壓到：
# generated/toolchain/emsdk/node/22.16.0_64bit
# generated/toolchain/emsdk/python/3.13.3_64bit
# Python 安裝補上上述 .emsdk_version。
# 官方 compiler archive 放 generated/wasm-binaries-arm64.tar.xz。
node scripts/install-compiler.mjs
MODDABLE="$PWD/generated/toolchain/moddable" \
EMSDK="$PWD/generated/toolchain/emsdk" \
FONTBM_SOURCE="$PWD/generated/toolchain/fontbm" \
PATH="$PWD/generated/toolchain/moddable/build/bin/mac/release:$PWD/generated/toolchain/emsdk/upstream/emscripten:$PATH" \
npm run prepare:host
E023_RUNTIME_DIR="$PWD/generated/host-build/public/simulator" npm run prepare:poc
npm run build
npm run test:runtime
```

實際 canonical feature worktree：`/private/tmp/E023-target-offset-gaze/feature-worktree`。WASM 含 debug 絕對來源路徑，因此不同 worktree 的編譯產物不能假定逐位元組相同。`host-runtime-provenance.json` 記錄本次來源、工具、config、tree hashes 與 runtime hashes；`host-source-verification.json` 另外將建置後的639個 SDK host／simulator 檔案核對 pinned Git blob，全部相符。

舊 E019 hash 與本次輸出比較保存在 `host-runtime-comparison.json`。`web/src/runtime-pin.json` 固定本次 E023 host bytes，prepare 與 Browser 共用並嚴格比對；沒有刪除 hash gate 或接受任意產物。重新定位／更換來源後的不同 bytes 必須重新取得證據及審查，不能靜默更新 pin。

## 一輪局部修正

首次真正 probe 已載入原版 SDK，但 MOD 無回覆，實際 SDK `lookAt` 為0筆；原紀錄保存在 `wasm-runs/WASM-2026-10-15T06-59-40-545Z/`。

限定非運動診斷顯示所有 began／ended 點都到達 Piu，座標與編碼一致；MOD 的 `Time.ticks` 值為 undefined（JSON 中未出現 ticks）。因此改用 Piu 原生 `onTouchBegan/Ended` callback 提供的 runtime ticks。原生 `fxScreenTouch` 以 `modMilliseconds()` 傳入這個值，不使用 Browser 時鐘，也沒有 Date.now fallback。1000ms Browser TTL、5秒 frame timeout／控制窗口、SDK 門檻與收斂判準不變。

另依 pinned button bridge 的120ms release，在初始化的重複 A 選擇之間等待150ms，避免兩次按鍵被視為同一次按住。這只用於固定初始姿態，不改閉環控制策略。

完整重跑由 `runtime-run.mjs` 啟停 Python、preview 與 Chrome；每案重新載入 runtime，保存 source inputs、bundle hashes、probe、SDK trace、rendered quaternion／偏差序列、結果與同次截圖。沒有修改 SDK，也沒有用 setPose 修正閉環結果。
