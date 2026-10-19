# E025 readiness evidence — 2026-10-19

## Scope 與 runtime

Owner 明確要求真人驗證；source-only 歷史與 E025 新任務分開。新 scope 獨立審查 round 2 approved，見本 topic review-log；這不是 runtime PASS。

- 官方 CI run35444663129／web-dist artifact10585271971 metadata head_sha = SDK pin；archive SHA-256 `0570742fb76a8dd73289d4a06b8b72aaa6f3c516a6cc831a53cdb6320da6d0e7` 實際校驗一致。
- Feature-local SDK 從既存 pinned checkout 本地 clone，同 pin clean；dev worktree 沒有寫入。沒有本地 fixed compiler，因此不假稱 fresh local runtime rebuild；採官方同 pin CI build。
- E025 MOD 用 pinned editor tools 新建。`npm run prepare:poc` exit0，先清舊 public runtime/MOD，再核 archive／metadata／SDK，僅讀三個固定 ZIP entries；本次 runtime與MOD／stock bridge／observer hashes 見 runtime-provenance.json。

## TDD／程式檢查

RED：先建立有型別但無行為的 stub，執行 Node tests，9 tests 中 6 個 assertion failure／3 pass；是行為失敗，不是 import/collection error。目標為 MOD 兩順序均容許 SDK promises 同時 pending、interval 交集／segment gaps／union 及實際啟動 trigger。實作後 GREEN 9/9。

- `npm ci --ignore-scripts --no-audit --no-fund`：exit0，28 packages；未升級工具。
- `npm test`：exit0，9/9；負例含缺 terminal、空錄音、無 source、非自然 ended、clock未前進、interruption、錯 token、invalid timestamp／duplicate source／timeout。
- `npm run typecheck`：strict web／MOD exit0；沒有 any 或關閉 strict。
- `npm run build`：exit0，Vite 17 modules；bundle size warning 保留（Three.js simulator），非錯誤，不為此擴 scope。
- 回放確認 gate：未自然結束的本筆 replay 不能保存「錄音可辨認」；case 之間防重入，case 內 record／say 沒有共享 busy guard。
- 初次 typecheck 發現 test cleanup delete global trace 的 optional typing 問題，已改 Reflect.deleteProperty；重跑綠燈。局部命令 cwd 路徑錯誤已更正，不作行為 RED 證據。

## Chrome readiness smoke

已在實際 Chrome 開 `http://127.0.0.1:5195/`，透過啟動按鈕解鎖 AudioContext；核 server bytes SHA 與 provenance，官方 runtime／E025 MOD 成功就緒，trace 顯示 COAMI25 ready／stackchan-voice，兩個基線按鈕可用。此 smoke 沒有按錄音或 TTS 案例，沒有取得任何真人聽辨或並行資料。Stock startup chooser 需約8秒，非故障。Vite 最初 sandbox bind EPERM，於授權的本機 loopback dev process 啟動成功。

## Human-check

真人尚未回報；未建立假的 human-run.md 或 trace.jsonl。實驗狀態未執行；本輪任務未完成。頁面保持供 owner 操作，等待兩項基線及雙方向各三案例／回放確認；不能以 tests/build/MOD-ready 代替。

## GREEN transcript

```text

> coami-e025-web@0.1.0 test
> node --test src/*.test.ts

✔ MOD dispatches a→c while both SDK promises remain pending (0.842042ms)
✔ MOD dispatches c→a while both SDK promises remain pending (0.108208ms)
✔ actual intervals with nonempty recording establish 60ms overlap (0.508084ms)
✔ separate TTS segments do not fill the gap or prove exclusion (0.080125ms)
✔ intersections use a union rather than double counting segments (0.073709ms)
✔ SDK completion, empty capture or missing terminal cannot prove overlap (0.079709ms)
✔ fallback, frozen clock, interruption and mismatched tokens remain unknown (0.0885ms)
✔ invalid timestamps, duplicate sources or run errors remain unknown (0.07025ms)
✔ only observed capture start / advancing playback triggers the second operation, once (0.058167ms)
ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 101.825

```

## Handoff integrity

- 最終 browser reload／start 再次到 COAMI25 ready，兩個 baseline 按鈕可用；截圖 `/private/tmp/coami-robot-audio-exclusion/e025-ready.jpg`。尚未代真人按錄音／TTS 或填聽辨。
- Node HTTP negative test：invalid metadata version 回 400，前後 human evidence fingerprints 相同，沒有產生假的真人判定。Sandbox 初次 loopback connect EPERM，於授權本機連線重跑通過。
- 個別 runtime／MOD／observer hashes 與 provenance 相同，generated outputs ignored、SDK 與 dev tracked tree clean。
- 人工作業頁未保存前不建立假的 human-run.md／trace.jsonl；如真人已保存，這份 ready checkpoint 的「未執行」應依新資料明示更新。

## Human execution and interpretation — 2026-10-19

以下取代上方 readiness checkpoint 的「尚未執行」現況；原 checkpoint 保留為執行前歷史。

Andrew 使用 Chrome153、耳機40% 完成基線及9筆雙操作（record-say5筆、say-record4筆）。原始 metadata 保存時間 2026-10-19T06:00:44.899Z；session `86e6df4c-445b-4f58-8a8e-a82b89a1c56b`。逐筆由 trace 重算 capture 與自然結束、clock 前進的 TTS playback 區間聯集，9筆均與保存的 overlapMs 相符；record／say／replay MOD terminal 均 success，錄音非空，所有9筆均有自然回放紀錄。這是瀏覽器生命週期重疊，非聲學同步精度量測。

| Case | 順序 | 重疊 ms | 錄音 bytes | 回放 | 原頁面 TTS / 錄音欄位 |
| --- | --- | ---: | ---: | --- | --- |
| `15743b5a` | record-say | 3689.2 | 79508 | 已自然回放 | unconfirmed / unconfirmed |
| `73ef11be` | say-record | 3116.5 | 75644 | 已自然回放 | unconfirmed / unconfirmed |
| `f3909bde` | record-say | 3470.5 | 79508 | 已自然回放 | unconfirmed / unconfirmed |
| `2f200ea8` | say-record | 3060.6 | 76610 | 已自然回放 | unconfirmed / unconfirmed |
| `85b5916b` | record-say | 3344.2 | 77576 | 已自然回放 | unconfirmed / unconfirmed |
| `27f4e5d2` | say-record | 3055.3 | 77576 | 已自然回放 | unconfirmed / unconfirmed |
| `8375d456` | record-say | 3341.5 | 76610 | 已自然回放 | unconfirmed / unconfirmed |
| `65e25cd7` | say-record | 3065.8 | 76610 | 已自然回放 | unconfirmed / unconfirmed |
| `88ae9c37` | record-say | 3352.5 | 77576 | 已自然回放 | heard / heard |

真人來源分層：

- 原頁面基線：`782aabf6` 錄音 heard 且已回放；`849ebfbb` TTS heard。`782aabf6` 的 TTS=heard 是操作者把兩項勾在同一筆造成的錯位，該筆沒有測 TTS，不把此欄當作 TTS 證據。
- 原頁面逐筆完整保存：`88ae9c37` TTS=heard／錄音=heard；其他8筆仍保留 unconfirmed，沒有倒填原始事件或人工作業欄位。
- 隨後 owner 在對話回報：「我剛剛測是都有聽到」。這是整批事後聽辨回報，與原頁面逐筆保存分開記錄；不冒充8筆當時都有按儲存。
- 操作缺陷：頁面只保存 active trial，允許在未保存聽辨前開始下一筆，且未清楚顯示填寫對象。曾造成基線未解鎖與未保存欄位；本次保留此限制，不要求操作者為儲存介面問題重跑。

判讀：互斥假設「失敗」（否定），不是驗證失敗。依事前判準，任一有效完整重疊即足以否定；實際兩順序均有至少3筆，且所有9筆都回放。真人逐筆欄位齊備的目標未完全達成，整批回報不能改寫為逐筆 contemporaneous sign-off；但不阻擋對主要互斥問題作有限結論。

結論限於固定 pin／stock simulator／此 Chrome 與耳機條件：直接record／say可以重疊活動；不能推論整個SDK都不互斥。不外推真機、其他provider或所有時序；不在本topic定義 Robot State 或實作互斥政策。

本輪技術問題判讀已完成；Draft PR 維持人工作業審查，不宣稱正式 TS code review 或 merge gate 通過。`npm test` 再次9/9、`npm run build`（含strict web／MOD typecheck）exit0，只有既知bundle-size warning。

原始檔 SHA-256（此 checkpoint）：
- `human-run.md`: `b921677f7d8310cbe99255c3c0ce37e98a190e32d189d4d25f060d1614a65678`
- `trace.jsonl`: `8e8d1750a7af4a1d2eb4c511a6dcec9faab8b1f1927eb3e7b2009e02e8cfe9e5`

## Owner scope lock — 2026-10-19

- 模擬器直接 `record()`／`say()` 已觀察到重疊。
- XiaoZhi 對話路徑有輪流控制，不能概括成整個 SDK 都不互斥。
- 真機錄放、喇叭回音與插話能力待驗證。
- 逐筆儲存缺口如實保留。

XiaoZhi 為來源層級的路徑區分，沒有執行該對話路徑的動態驗證：固定pin的 [xiaozhi-model.js L254–270](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/firmware/host/modules/conversation/chat-audioio/xiaozhi-model.js#L254-L270) 控制 listen start／stop 與 uploading；[L400–447](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/firmware/host/modules/conversation/chat-audioio/xiaozhi-model.js#L400-L447) 在 TTS start 將 uploading=false、clear encoder，並有 listen／speak 控制。這是對話流程的輪流控制，不能把直接audio API的反例外推成整個SDK都不互斥，也不能從此來源證明物理麥克風已停止、回音消除或插話有效。

新增唯讀來源指紋：`firmware/host/modules/conversation/chat-audioio/xiaozhi-model.js` SHA-256 `ee54f95383a6b7491ebaa2be3489c8bbb5f37de07a3a8bc8b7f6a69002126860`，working bytes與固定pin git show一致。未改原11檔歷史inventory或原始human-run／trace。

真機錄放、喇叭回音與插話另開獨立驗證；本PR不等待硬體，不新增真機PASS，也不因轉Ready for review宣稱code review已核可。
