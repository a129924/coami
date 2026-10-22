# E028 actual simulator smoke — 2026-10-22

## 執行環境與順序

Feature worktree `/Users/andrew/.codex/worktrees/7a76/coami`，Node **v24.19.0**、Vite8.2.1 loopback `http://127.0.0.1:5198/`。Browser為使用者實際Chrome（CUA extension連線），不是unit fake host。先在Node24完成unit／strict browser+MOD typecheck／build，再啟動Vite與實際Chrome。

官方artifact10585271971／run35444663129 metadata於2026-10-22T07:01:59.982Z重新查核、expired=false，下載archive SHA核對成功。Fresh E028 MOD從pinned editor編譯，沒有借用E027 runtime/MOD/cache。完整bytes與host source hashes見 [runtime-provenance.json](runtime-provenance.json)。

最終保留smoke epoch：`59ae5432-2fdd-4632-83a9-074de294d06d`。較早兩次開發載入受HMR中斷，不混用其epoch作本次trace。曾有一次CDP Page.getFrameTree timeout，後續reload成功。最後的成功producer缺end→unknown bounded修正在此smoke之後，由新assertion RED→GREEN與最終strict/build覆蓋；沒有倒填重跑最終browser驗證。該修正不改本次已取得可靠head end及自然source end路徑。

## 實際觀測

來源 [trace.jsonl](trace.jsonl) 為操作頁「下載metadata trace」保存的**原始bytes副本**，28行、同epoch、所有droppedEvents=0，無音訊、無人類verdict。SHA-256 `b80411c6be4262cc356bf09cc8b3dab1ea844aa21f60ed1de8119c160b5bcb3b`。原檔在owner指定Downloads，未修改原檔。

| UTC／身份 | 實際metadata，不外推人類效果 |
| --- | --- |
| 07:07:18.208–18.227 | Browser fetch核對mc.js、mc.wasm、shell.stl、E028 MOD的served hashes，均相符。 |
| 07:07:26.335–26.345 | COAMI28 ready、engine-ready；三活動初始inactive明標managed-session scope。 |
| managed-1／seq1／07:08:01.781–02.751 | Head admission requested，called綁identity，sequence-start→active，完整sequence-end→inactive，terminal success；head+appearance同時保留，pose/motorStop一直unknown。 |
| managed-2／seq2／07:08:09.993起 | Say admission requested；後到Record於07:08:10.092被拒、conflict指managed-2，沒有record dispatch／capture。 |
| managed-2／source-1 | source-scheduled→playback-running→playback-ended，natural=true、clockAdvanced=true、interrupted=false；同seq2 producer success terminal後output inactive。這只證明browser source生命週期，不證明聲音可聽。 |
| 最後兩筆30秒診斷 | 對已終結tombstone的診斷事件不重新占用資源；三summary仍inactive。Timeout沒有扮演停止。 |

上列為metadata wiring smoke，**沒有麥克風口述、沒有聽辨與nod/reset人類簽認**。不把截圖中的臉或seq completion冒充人體／實體馬達效果。

## 工具限制與交接

CUA `waitForEvent('download')`等待約257秒後工具timeout/reset，但點擊本身已成功下載；owner提供實際下載路徑，已唯讀查28行並原樣複製。這是automation等待回報失敗，不是trace遺失，也不是runtime失敗。沒有再進行browser重試。

Server保留於5198供owner操作。該tab可能因CUA session清理而關閉，若如此從瀏覽器重新開本機URL；reload是新epoch，不證明之前物理工作停止。人類H1–H6仍全部awaiting-human，見 [human-run.md](human-run.md)。
