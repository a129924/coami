# PR #23 第九輪 review 修正（2026-10-19）

Reviewed head：`3d6c3ffc8824279b22f92090173ebd90fbaa55f4`。四項建議均接受；範圍限host準備工具與evidence audit。SDK、Python Server應用、相機模型及驗收判準不變。

| Thread | 修正 | Commit |
| --- | --- | --- |
| [Revalidate vendor sources after staging the host tree](https://github.com/a129924/coami/pull/23#discussion_r4309829657) | 以固定commit的git archive產生staging，排除可變checkout／ignored檔案；staging前後、compile後及發布前重驗vendor HEAD／gitlink／cleanliness。shell mesh也從固定staging讀取。 | `8a0fd61` |
| [Require complete offsets before accepting centered evidence](https://github.com/a129924/coami/pull/23#discussion_r4309829662) | decision及window offset均須恰為兩個有限數值，拒絕bool，再套用原±0.1及末三筆判準；不讓空陣列vacuous all()成立。 | `567eefa` |
| [Sanitize npm configuration for the host WASM build](https://github.com/a129924/coami/pull/23#discussion_r4309829667) | Host npm ci與build:wasm皆移除大小寫形式的繼承npm_* metadata／config，使用獨立空user/global configs並拒絕project .npmrc；必要compiler環境維持明示設定。 | `8a0fd61` |
| [Correlate server exchanges in the evidence audit](https://github.com/a129924/coami/pull/23#discussion_r4309829670) | 要求hello及成對sent／server exchanges；decision→同run／seq觀測→Calculator command→量化frame→SDK返回→同command ID completion全鏈關聯，並驗證centered／iteration_limit回覆與single-flight coverage。 | `567eefa` |

## 回歸與實際查核

- Audit先red：移除全部sent／server，或把成功案decision offsets改成[]，舊audit仍未拒絕。Green後拒絕；缺少RPC、錯run／sequence／offset／rotation／age、錯command target／ID、錯completion及缺frame皆拒絕。原SDK target三軸驗證保留。
- 新查核把server target與觀測rotation／offset的固定Calculator公式比較，再與原transport量化後frame比較；SDK returned與completion也必須在正確的record順序。不是只檢查訊息存在。
- 真實Git fixtures驗證git archive只含固定commit blobs、不含ignored輸入，並拒絕staging期間tracked／untracked／HEAD變更及compile後vendor污染。
- 實際固定SDK staging成功，逐一依Git blob object ID核對**1,500個檔案**，包括symlink內容及executable bit，見 `review-round9-vendor-staging.txt`。未修改vendor，未編譯host。
- 真正npm lifecycle fixture同時注入npm_config_node_options、大小寫user/global設定與含require hook的npmrc；config-free環境執行成功且hook marker未產生。Project .npmrc仍拒絕。
- 40 Python、27工具、12 TS、2 MOD、strict TS／Python及Ruff通過。一般及-O／PYTHONOPTIMIZE=2 audit輸出相同。

## 證據範圍

本輪重新查核既有完整15案raw資料，沒有重新執行WASM suite；原run `WASM-2026-10-16T08-20-00-487Z`及來源`e9915ec`維持不變，仍為11成功／4失敗、90筆probe／90次SDK呼叫。新receipt增加`complete_offsets_verified`及`server_exchanges_verified`，表示現有raw資料通過較強audit，不表示舊run執行過本輪host guards。前一版receipt保留為 `wasm-evidence-audit-round8.json`。

共享npm helper另以真正clean web build驗證；來源 `567eefa63cacf9b4b87b25ca8b84e009f3b3c04c`，manifest及結果見 `review-round9-web-build.json`、`review-round9-web-build.txt`。這不是新的閉環／host編譯證據。

本輪沒有重建host，也沒有修復先前記錄的本機Emscripten installed-tree mismatch或放寬pin。Host新增防護由上述真實Git staging與npm lifecycle fixtures驗證，不追溯提升舊host建置保證。

Git hook仍缺lefthook；明列checks直接執行。交付維持topic commits → push → threads回覆及resolve → human review；不merge／release。
