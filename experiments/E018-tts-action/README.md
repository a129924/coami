# E018 — 指定日文 TTS 與同次結果

## 問題與假設

指定日文能否透過 pinned SDK `audio.say()` 合成、播放，並在同筆自然播放結束後回報結果？E006 tone/WAV 不構成 TTS 證據。

本實驗固定 A「こんにちは。」、B「おやすみなさい。」。一次一筆，busy 明確拒絕、不排隊。無中文、外部語音服務、取消、實機或正式 API。

## 執行

Node >=24 <27。在本 experiment 的 `web/`：

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run typecheck
npm run build
```

### Fresh runtime

先準備 feature-local `web/generated/toolchain/{moddable,emsdk,fontbm}`：

| Tool | Pin |
| --- | --- |
| Moddable 9.5.0 | b6e06ba70506a7381ffb28e09e3175bf4e99f305 |
| emsdk / Emscripten 5.0.1 | 14c18b569f55138fe4963924162244251f454fb0 / 8c5f43157a3f069ade75876e23061330521eabde |
| fontbm | 7677b908523e909679f67cd5c170396bb9def1aa |
| Stack-chan | b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322 |

本次隔離複製既有 pinned toolchain，含 compiler cache，沒有重用其他實驗的 runtime 或修改原 toolchain。記錄實際 installed-tree hash，不宣稱 pristine package equivalence。Prepare script 檢查 source commits、tracked cleanliness、工具路徑/版本與 hashes。

```sh
E018_TOOLS="$PWD/generated/toolchain"
MODDABLE="$E018_TOOLS/moddable" \
EMSDK="$E018_TOOLS/emsdk" \
EM_CONFIG="$E018_TOOLS/emsdk/.emscripten" \
FONTBM_SOURCE="$E018_TOOLS/fontbm" \
FONTBM="$E018_TOOLS/fontbm/build/fontbm" \
PATH="$E018_TOOLS/moddable/build/bin/mac/release:$E018_TOOLS/emsdk/upstream/emscripten:$PATH" \
npm run prepare:poc
npm run build
npm run dev -- --port 5188
```

Browser: http://127.0.0.1:5188/ 。缺 toolchain 要明確 blocked；不得改用 E006 Pages 或 touch-patched artifacts。Prepare 清除之前可服務 runtime/MOD；單獨 MOD rebuild 也先移除舊 archive，失敗不冒用舊產物。

## 操作與真人程序

1. 記錄 Tester、日期、OS/browser、音量、輸出裝置與靜音狀態，按「啟動模擬器並解鎖聲音」。
2. 就緒後依 A → B → A；每筆等待結果並聽辨內容。記錄 request 身分、實際聽見內容及程式結果。
3. 說話期間連按 A/B，確認畫面明確拒絕且稍後無多餘語音。
4. 展開驗證工具，按「下一筆播放失敗」，觸發一句：應 failed 且無聲；之後可再次說話。
5. 若結果 unconfirmed，保持未知並重新載入；不得假定原播放已停止。下載 trace，將聽辨記錄加入 evidence/tts-run.md。

## 契約

UI `pushButton('a'/'c')` → MOD accepted runSeq → SDK TTS。Host sessionId 與 MOD sequence 對應，播放 callbacks 保存 immutable token。SDK resolved 不代表 success；需要 success、相同文字及同次有效 natural ended 才 completed。

E018 注入自己的 WebAudio bridge；原版 duration+250ms fallback 沒有使用。Startup tone 不計 TTS。30 秒 watchdog、zero-sample 無 play、context interruption 都保持 unconfirmed 並鎖定到 reload；遲到結果不翻案。Failed 只有在無播放殘留可確認時恢復操作。

## 證據與決策

- Pure: 17 tests、strict typecheck、build PASS；含真正 MOD guard 與 pinned newline-free print regression。
- Actual runtime: fresh 未修改 pin、served bytes 核對；自動 A→B→A、busy、播放失敗、再次執行 PASS。這是 browser/WASM/WebAudio lifecycle，不是人耳證據。
- Human listening: PASS，Andrew／耳機／有音量；2026-10-13 以 A→B→A→B→A 五筆確認內容全部相符，程式結果與 natural ended／SDK success 關聯核對通過。詳見 tts-run.md。
- 本次 pinned simulator＋E018 strict bridge 的日文 TTS 假設獲支持；Draft PR 仍供 human code review，不決定 production adoption。
- 詳見 [validation](evidence/validation.txt)、[runtime provenance](evidence/runtime-provenance.json)、[run records](evidence/tts-run.md)、[trace](evidence/tts-trace.jsonl)、[auxiliary](evidence/auxiliary.md)。

Archify/PR Lens/Graphify 為本地輔助；不安裝、不發布、不改工具設定。輔助工具品質與 TTS 結果分開。移除獨立實驗即可撤回行為；本次保留 worktree/branch 等待 human review。
