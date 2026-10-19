# PR #23 第八輪 review 修正（2026-10-19）

Reviewed head：`e1bb0d010c317a17661450dc9444c48a7ce25f1a`。四項建議均接受，範圍限E023驗證工具、測試及證據；Python Calculator／Server應用、SDK、相機模型與驗收判準不變。

| Thread | 修正 | Commit |
| --- | --- | --- |
| [Reject project npm configuration during attested builds](https://github.com/a129924/coami/pull/23#discussion_r4292813619) | 拒絕任何project `.npmrc`（含空檔／symlink）；install與build前後、後續manifest查核皆驗證，避免project node-options注入未記錄程式。 | `c1afe03` |
| [Reject Node preloads before host preparation](https://github.com/a129924/coami/pull/23#discussion_r4292813624) | Host coordinator載入後立即執行startup guard，在環境及產物變更前拒絕NODE_OPTIONS／NODE_PATH及preload flags；不宣稱能撤銷已載入hook。 | `2442653` |
| [Require complete decoded targets in evidence audits](https://github.com/a129924/coami/pull/23#discussion_r4292813637) | frame expected、decoded及returned target皆須恰為3個有限數值（不接受bool），全三軸比對；returned也必須對上唯一non-probe frame。 | `46a2040` |
| [Attest the MOD TypeScript configuration](https://github.com/a129924/coami/pull/23#discussion_r4292813645) | 記錄mod.ts、protocol.ts、host.d.ts及tsconfig.json；編譯前後與suite前重驗完整輸入集合。拒絕外部config／references／paths／plugins設定及額外檔案，依賴中的TS libraries由完整installed-tree查核。 | `d6c5143`、`c2256f6` |

## Red／green及實際準備

- project `.npmrc`與host coordinator preload回歸先red。Green驗證`.npmrc`於build前、build中與build後出現皆拒絕；fixture中的惡意node-options在attributed builder前被擋下。
- Host測試複製真正scripts到隔離fixture，以NODE_OPTIONS require及直接--import啟動coordinator。Hook確實先載入，但guard拒絕後coordinator未開始準備、原fixture產物未變。這不保證撤銷preload自身副作用，也沒有碰既有host。
- MOD先red：attestation記錄異於目前檔案的tsconfig hash，舊suite檢查仍接受；green後拒絕。額外測試設定變更產生不同digest，以及external extends／references／paths與額外d.ts皆拒絕。
- 實際prepare首次因完整集合漏列既有host.d.ts而拒絕，見 `review-round8-prepare-initial.txt`；補入後clean install／prepare成功，見 `review-round8-prepare.txt`。沒有刪除host.d.ts、放寬輸入集合或改變編譯選項。
- Audit先red：對真正完整run的TC-E2E-02 raw資料，分別替換decoded／returned為空、短、長、NaN、bool、不同三軸與缺target，舊audit未可靠拒絕。修正後16種mutation皆拒絕；不改raw檔，測試僅攔截該檔讀取內容。37項Python測試、25工具、12 TS、2 MOD、strict TS／Python及Ruff通過。
- 一般與-O／PYTHONOPTIMIZE=2的audit均PASS且輸出一致；現有15案raw資料的完整decoded／returned targets已重新查核。這是對既有raw資料加強驗證，不是重新執行15案。

## 證據範圍及交付

本輪只新增中心案真正WASM partial smoke，tooling來源 `46a2040f338839acf9d28b9419d328f6ce6aae34`，run `WASM-2026-10-19T02-11-43-546Z`。完成結果見 `review-round8-smoke.json`；不是15案收斂證據。

[目前完整15案](manifest-run.md)仍為第六輪來源 `e9915ec`，11成功／4失敗；其MOD compiler attestation未包含本輪新增的config／host declarations保證。第七輪及更早的host／build證據不追溯宣稱已執行本輪新guard。本輪未重建host，先前本機Emscripten tree不符固定baseline的紀錄保留，未修復compiler tree或改pin。

自動核准拒絕未明確授權的`git commit --amend`；改用新補正commit保留歷史，未改寫既有commit。Git hook仍缺lefthook，以上checks直接執行。交付為topic commits → push → threads回覆及resolve → human review；不merge／release。

中心smoke完成：6筆非運動probe，0次修正，0 browser exceptions，狀態partial。固定Git source blobs、四個MOD compiler input hashes與現行檔案一致；run後實際source／dist／vendor／dependency／Python／MOD bytes另重驗通過，見 `review-round8-postrun.txt`。完整15案results與原始資料未覆寫。
