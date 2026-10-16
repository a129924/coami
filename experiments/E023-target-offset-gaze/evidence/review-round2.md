# PR #23 第二輪 review 修正（2026-10-16）

本頁保留當輪紀錄。原完整run之source-hash audit仍缺bundle來源綁定；此限制已於[第四輪修正](review-round4.md)改採新的manifest-aware完整run。當前audit入口以第四輪為準。

Reviewed head：`8bdce4e9ea5c1dc337047316a12f44e1a8abe869`。三項 P2 均接受並修正。僅修改 E023 驗證工具、測試與文件；SDK／Server行為、相機模型及0.1／20次／連續3筆判準不變。

| Thread | 修正與證據 | Commit |
| --- | --- | --- |
| [目前 checkout 可執行歷史 audit](https://github.com/a129924/coami/pull/23#discussion_r4290844308) | 明確以原始 implementation commit `7171ba976c2d40b06de7724a62d2e803ebbf0114` 的 Git blobs 查核每個 recorded source hash，保留 hash不符的拒絕行為。新 receipt 為 `wasm-evidence-audit-current.json`，不覆寫舊receipt或要求切換checkout。 | `546bef6` |
| [runtime bundle 綁定來源](https://github.com/a129924/coami/pull/23#discussion_r4290844312) | runner 啟動 preview 前清除 dist、執行 `npm run build`，自動保存來源／生成public輸入與完整dist hashes；build中及每案前後若來源或輸出變更，停止而不宣稱有效驗證。 | `8276bbc` |
| [完整集合須為15個不同案例](https://github.com/a129924/coami/pull/23#discussion_r4290844319) | 選擇器拒絕空值、非整數、NaN、越界、重複索引。runner檢查頁面案例身分與選擇一致，完整狀態須有確切15個不同CASE_IDS；合法子集合維持partial。歷史audit亦檢查完整唯一IDs與raw檔案身分。 | `546bef6`、`8276bbc` |

## 本輪驗證

- `npm run test:tools`：9項通過，新增 stale dist刪除／重新建置、build中改來源、建置後來源或輸出變更、非法選擇、重複／缺漏完整案例及身分不符測試；包含第一輪來源／子程序清理回歸。
- `npm test`：10項通過；`npm run test:mod`：2項通過；`npm run typecheck`：strict TS／MOD通過。
- `.venv/bin/python -m pytest ../tests/test_calculator.py ../tests/test_evidence_audit.py`：28項通過，包含3項歷史audit／錯誤hash／重複案例回歸。新增Python測試Ruff lint／format通過。
- 在目前 checkout 執行 `python3 evidence/audit-wasm.py`：PASS，原15案與90次SDK呼叫查核完成，不需舊checkout。receipt明列原source commit，不將當前runner誤報為原始執行來源。
- 語法與 `git diff --check` 通過；commit hook依舊缺lefthook，上述checks為明示執行。

終端證據：`review-round2-tools.txt`、`review-round2-python.txt`、`review-round2-ts.txt`、`review-round2-mod.txt`、`review-round2-typecheck.txt`。

## 真正 WASM 整合 smoke

在 code commit `8276bbc` 後執行 `E023_CASES=0 npm run test:runtime`；新run為 `WASM-2026-10-16T05-54-18-350Z`。runner自動clean build，TC-E2E-01成功、6筆非運動probe通過、SDK修正0筆、Browser exceptions=0；suite為 **partial**，不冒充15案通過。完整report／source-inputs／raw JSON／截圖在 `wasm-runs/` 對應目錄，終端為 `review-round2-runtime.txt`。

本輪另核對該report的 `build.sourcesSha256` 與自動source-inputs一致，且每個來源／完整dist byte hash皆符合目前實際檔案。這只支持新runner的中心案整合與來源綁定，沒有重跑完整15案，也沒有重新證明近中心收斂。

原始2026-10-15完整run、source-inputs及原audit receipt皆未修改；11成功／4失敗結論不變。歷史run沒有本輪新增的clean-build manifest，不能將新版綁定保證追溯宣稱為歷史manifest。原來源hash仍依immutable blobs及原紀錄查核。

交付：topic commits → push → 在三個原threads回覆修正及測試 → resolve；PR保持Ready，停於human review，不merge／release。
