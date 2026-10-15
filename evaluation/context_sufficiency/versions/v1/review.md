# context_sufficiency_v1 — Draft review and evidence

Current：`v1-draft-004` 的 60 筆答案已獲 Owner 親自人工審查並接受，且獨立 fixture review 已核准；確切 snapshot **FROZEN** 為 `context_sufficiency_v1`。下方逐案 `pending` 為先前 draft packet 的歷史標記。

## Independent fixture review and freeze — v1-draft-004

- 獨立 Reviewer：`/root/v1_fixture_reviewer`；2026-10-08T03:32:41Z 記錄 verdict。Reviewer 唯讀審查，未建立案例、修改 oracle 或呼叫 Jev；與 Owner 人工接受及先前 bounded 技術審查分開。
- 程序：先以中性編號只讀全部 60 案的 background／conversation／utterance，在看 expected、candidate 與 rationale 前盲判 Context Sufficiency。初判與 oracle 56/60 一致；再讀全部 60 筆 oracle、candidate、rationale、policy／Action 和固定 slot 表，對四筆差異做逐案複核。
- 初判差異：`cs_v1_036` 的明確選擇支持自己作畫；`cs_v1_054` 最新的「故事也不要」表明拒絕；`cs_v1_055` 最新的「先看媽媽那張」建立順序；`cs_v1_058` 最新的「留在窗邊…先看外面」建立窗邊觀看。Reviewer 複核後接受四筆原 oracle 判斷，最終 60/60 可接受；未發現剩餘語意阻擋。
- Reviewer 核對全部 60 筆 candidate／rationale：SUFFICIENT 的候選依據可見文字確認主要意思，INSUFFICIENT 的候選區分實質不同的可能意思。README 固定 slot 表與 60 筆 category／topic／group／split 全部相符。
- 重新計算三份 SHA-256：README `b230ca3f6dea08d62ca0d0facb6374255649bd620913bac81803a73698d9a898`；dataset `d2dc258088caf4f9ee7f0f44f7123adb96ee50a5a71a805532d1857d7a16c3f9`；validator `b563e47b656d55107b98f7e352d25884ed05d9cb8e17327aeddeb1e89a630b4f`。獨立執行 validator exit 0：60 案、40 research／20 holdout、35 S／25 I、12 topics／54 groups。
- 原始 verdict：`{"verdict":"approved","blocking_issues":[],"snapshot":"v1-draft-004","reviewer":"/root/v1_fixture_reviewer"}`。限制：此為人工語意 oracle 審查，不能證明 Jev 表現或產品安全。
- Matching gate 核對：Owner 接受同一 004 snapshot，獨立審查三份 hash 相同，validator 通過，v0 凍結三份 hash 未變；未改動 v1 案例內容。Freeze 決定時間：2026-10-08T03:33:27Z；版本 `context_sufficiency_v1`。Runner 的 [freeze-attestation.json](freeze-attestation.json) 另以本文件完整 SHA-256 綁定本紀錄與三份來源檔。
- 此 freeze 只開啟 E013 的 fixture gate；Jev live run 仍需另行明確授權，E013 模型分數／通過門檻均未決定。

## Owner acceptance of exact v1-draft-004 snapshot

- 記錄時間：2026-10-07T08:53:10Z；原始訊息的獨立 timestamp 未提供，這是本次核對時間。
- 來源：本對話 Owner 訊息：「接受 v1 的 60 筆人工答案及獨立案例審查結果。」
- 接受範圍：`v1-draft-004` 全部 60 筆人工答案。README、dataset、validator 的 SHA-256 分別為 `b230ca3f6dea08d62ca0d0facb6374255649bd620913bac81803a73698d9a898`、`d2dc258088caf4f9ee7f0f44f7123adb96ee50a5a71a805532d1857d7a16c3f9`、`b563e47b656d55107b98f7e352d25884ed05d9cb8e17327aeddeb1e89a630b4f`；記錄時逐檔重新核對，內容未修改。
- Owner 後續釐清「我是人工 review 的」；因此前述「接受獨立案例審查結果」指的是 Owner 自己的人工審查，不能視作獨立 reviewer 的 verdict。目前可見的 PR #12 紀錄僅有 bounded 技術審查，明言不是全量 fixture 語意審查。獨立案例審查者、程序、matching snapshot verdict 與 blocking issues 仍待完成，不能據此標記 freeze。
- 此紀錄只確認 Owner 決定。獨立案例審查與 matching-evidence sufficiency 仍待核對，未建立 runner 可接受的 freeze attestation；Jev live run 仍需另行授權。

## Question, procedure, evidence, decision

Question：在六類語義機制、十二生活主題下，何時可根據可見文字回答，何時須追問？
Procedure：先固定60 slots/category/topic/group/split，再寫案例；本機結構／CLI負例與逐列slot核對；提交技術draft供 human review。無Jev、無模型調整或分數門檻。
Evidence：下列 baseline 在案例文字、label與候選尚未建立時記錄。
Decision：維持 v0、不編E013；新v1只60案。Owner最新授權commit/push未凍結draft→human review，fixture review/freeze仍待同版本Owner接受。

## Pre-authoring baseline

- Recorded UTC：2026-10-07T03:58:29.837707+00:00
- README SHA-256：`2c812698e72934d0b704ce286a690b21100679a01d9b141339a4b5893187e00a`
- 60 slots 先固定，無案例內容／labels／interpretation／candidate；category-split matrix已固定。
- Topic plan 對話 advisory review approved；repo-visible gate另記，不冒稱已過。

## v0 frozen baseline (read-only)

| File | SHA-256 |
| --- | --- |
| evaluation/context_sufficiency/README.md | `32471da22cde6410764e319a1eda114d91c6c78b233258239aa6da81108d7b1f` |
| evaluation/context_sufficiency/dataset/context_sufficiency_v0.jsonl | `35f8511d30c112eafd3387866d588cd1df3f9a80f2f12029b6298e7a60d8cdb5` |
| evaluation/context_sufficiency/validate_dataset.py | `45f0f0d8efe685b2514c2ae27109ea7586db5bc57858d382518cbc078da1db38` |

## Repo-visible plan review

獨立 Plan-Reviewer：`/root/plan_reviewer`，讀 feature worktree 中的 topic plan、shared contracts、README slots 與 baseline；verdict approved／blocking_issues=[]。唯讀核對60唯一ID、六類各10、40/20matrix、十二topic、各類至少兩topic、所有group同split、README baseline與v0三hash。當時尚無dataset；只批准執行契約，不批准任何答案。

Owner 最新授權：接受計畫並要求 create-feature-worktree，禁止 dev-worktree 實作，無重大問題直接 commit by topic→push→human review。此授權涵蓋未凍結draft交付；不等於逐案接受，未開放Jev、threshold、merge或release。

## Exact draft snapshot

Snapshot ID：`v1-draft-004`。PR #12 第三輪 bounded correction；未經Owner接受，NOT FROZEN。036沿用可見文字更正為自己作畫的SUFFICIENT；044改為清洗袖口果汁，與010穿紅外套不同。頂層只允許schema欄位。全部60 slots、coverage/group/split不變；README只同步schema，pre-authoring baseline保留為歷史。

| File | SHA-256 |
| --- | --- |
| [README.md](README.md) | `b230ca3f6dea08d62ca0d0facb6374255649bd620913bac81803a73698d9a898` |
| [context_sufficiency_v1.jsonl](context_sufficiency_v1.jsonl) | `d2dc258088caf4f9ee7f0f44f7123adb96ee50a5a71a805532d1857d7a16c3f9` |
| [validate_dataset.py](validate_dataset.py) | `b563e47b656d55107b98f7e352d25884ed05d9cb8e17327aeddeb1e89a630b4f` |

Snapshot recorded UTC：2026-10-07T06:35:14.336666+00:00。

## Previous snapshot — v1-draft-003 (historical)

Snapshot ID：`v1-draft-003`。PR #12 第二輪 bounded correction；未經Owner接受，NOT FROZEN。028／029改為洗手用水與拒絕被抱；visible conversation turn僅允許speaker/text。全部60 slot欄位不變，coverage/group/split不變；README只修schema的turn key allowlist，原pre-authoring baseline仍保留為历史，不能把它當新README hash。

| File | SHA-256 |
| --- | --- |
| [README.md](README.md) | `48c27d80629ee4052298cf96d24076654b70321f401b04ea5162f0eb440a9072` |
| [context_sufficiency_v1.jsonl](context_sufficiency_v1.jsonl) | `f4982171386194c8e1fd69207d01372f1d1f58bd2bd14e09b4b4f381a95b9bc5` |
| [validate_dataset.py](validate_dataset.py) | `62d9b33fcde6b3704953004e9aeff36fa5b002b1be6b764501013fb196412e05` |

Snapshot recorded UTC：2026-10-07T06:04:35.718212+00:00。

003完整工件與證據保留於 [29f5460](https://github.com/a129924/coami/blob/29f546014ac7b208250903ba79690348d7eec3d0/evaluation/context_sufficiency/versions/v1/review.md)；舊hash、122checks與技術批准不能替代004的matching gates。

## Previous snapshot — v1-draft-002 (historical)

Snapshot ID：`v1-draft-002`。PR-comment-review-and-fix 修訂版；未經 Owner 接受，NOT FROZEN。README的60 slots、coverage matrix、group/split與pre-authoring baseline完全不變；更正五個案例的語義內容及validator實際行讀取。

| File | SHA-256 |
| --- | --- |
| [README.md](README.md) | `2c812698e72934d0b704ce286a690b21100679a01d9b141339a4b5893187e00a` |
| [context_sufficiency_v1.jsonl](context_sufficiency_v1.jsonl) | `b5ef56f8ecf1221944cc5df4084dcd00cfd536e0de00051766778b6266abbbd2` |
| [validate_dataset.py](validate_dataset.py) | `3a4661ed2beb457c2852ee2d51789bbfa19963323fdbda9e42df64541d83e374` |

Snapshot recorded UTC：2026-10-07T04:29:41.479385+00:00。

002完整工件與審查證據保留於 [e54907c](https://github.com/a129924/coami/blob/e54907c1eef9d9c93a66a4ae4567622df708881f/evaluation/context_sufficiency/versions/v1/review.md)；舊hash、88checks與bounded技術批准不能替代003的matching gates。

## Previous snapshot — v1-draft-001 (historical)

Snapshot ID：`v1-draft-001`。這是待 Owner 檢查的 exact snapshot；非 frozen version。下列三份 SHA-256 供後續驗證、Owner接受與獨立fixture review共同指向；review.md本身不納入hash。

| File | SHA-256 |
| --- | --- |
| [README.md](README.md) | `2c812698e72934d0b704ce286a690b21100679a01d9b141339a4b5893187e00a` |
| [context_sufficiency_v1.jsonl](context_sufficiency_v1.jsonl) | `f97f5b0091e7a68d5bf43d63036fe2f54775fa4575d2535196e84debf8e3ab80` |
| [validate_dataset.py](validate_dataset.py) | `44d1d1765dc8e1fed80dcee6b18304735ff50d7a107837527a78f1c649bb77f7` |

Snapshot recorded UTC：2026-10-07T04:04:00.659759+00:00。

舊版完整案例與證據保留於 [a65d3b6](https://github.com/a129924/coami/blob/a65d3b640423b772d07822bb0c351f523c8fc8c2/evaluation/context_sufficiency/versions/v1/review.md)；舊hash／65checks／技術批准只指001，不能接受或凍結002。

## Current validation — v1-draft-004

Codex本機Tester pass：2026-10-07T06:34:46.547556+00:00，Python 3.14.0；**166 checks 通過**。TemporaryDirectory候選透過實際CLI subprocess檢查exit、stderr、line/ID診斷與無traceback；正式dataset前後SHA-256相同。

- RED：修正前頂層新增model_observation或predicted_label均exit0；修正後全部額外key拒絕，不以模型結果黑名單限制。
- 首／中／末記錄各測10種額外key（含nested observation/results/notes/metadata），共30個拒絕案例；多個extra keys亦拒絕並列出名稱。新增其餘12種schema缺欄回歸，與原4種合併覆蓋16欄；合法schema仍通過。
- 原122checks全量重跑，保留turn allowlist、Unicode實際行、CLI路徑、enum/type/policy/action/group/coverage/contrast與v0/E012檢查。
- 與29f5460比較，僅036 oracle與044清洗情境更動；036可見文字不變。60 slots及README slotrows完全不變；所有meaning_without_keyword前文仍無目標關鍵字。
- 60案，40research/20holdout，十二topics、54groups，35 SUFFICIENT/25 INSUFFICIENT；跨label對照research toy_car/water、holdout book，三distinct topics。
- Ruff lint/format、v0 validator及v0/E012不變檢查通過；不跑Jev，不把結構或技術審查當oracle接受。

| Check | Expected and observed exit |
| --- | ---: |
| default from different cwd | 0 |
| explicit absolute dataset | 0 |
| explicit relative dataset | 0 |
| malformed JSON | 1 |
| non-object JSON | 1 |
| empty line | 1 |
| NaN | 1 |
| duplicate JSON key | 1 |
| non-UTF8 | 1 |
| empty file | 1 |
| missing file | 1 |
| directory input | 1 |
| duplicate ID | 1 |
| duplicate visible input | 1 |
| missing background | 1 |
| missing conversation | 1 |
| missing interpretation | 1 |
| missing group_id | 1 |
| invalid background | 1 |
| invalid candidate_text | 1 |
| invalid utterance | 1 |
| invalid group_id | 1 |
| invalid id | 1 |
| invalid enum topic | 1 |
| unhashable enum topic | 1 |
| invalid enum context_type | 1 |
| unhashable enum context_type | 1 |
| invalid enum coverage_category | 1 |
| unhashable enum coverage_category | 1 |
| invalid enum split | 1 |
| unhashable enum split | 1 |
| invalid enum expected | 1 |
| unhashable enum expected | 1 |
| invalid enum expected_input_policy | 1 |
| unhashable enum expected_input_policy | 1 |
| invalid enum expected_output_policy | 1 |
| unhashable enum expected_output_policy | 1 |
| invalid enum expected_action | 1 |
| unhashable enum expected_action | 1 |
| conversation not list | 1 |
| too few turns | 1 |
| too many turns | 1 |
| turn not object | 1 |
| invalid speaker | 1 |
| empty turn text | 1 |
| sufficient null interpretation | 1 |
| insufficient string interpretation | 1 |
| wrong label Action | 1 |
| too few cases | 1 |
| wrong matrix | 1 |
| group crosses split | 1 |
| missing topic | 1 |
| category only one topic | 1 |
| research contrast missing | 1 |
| holdout contrast missing | 1 |
| fewer than three contrast topics | 1 |
| structure-valid semantic error | 0 |
| counts-preserving slot swap structural pass | 0 |
| all 60 slot assignments match README; swapped split detected independently | 0 |
| 10 no-keyword cases checked in visible context | 0 |
| literal U+2028 in background, '\n' physical rows | 0 |
| literal U+2028 in background, '\r\n' physical rows | 0 |
| literal U+2028 in conversation, '\n' physical rows | 0 |
| literal U+2028 in conversation, '\r\n' physical rows | 0 |
| literal U+2028 in candidate_text, '\n' physical rows | 0 |
| literal U+2028 in candidate_text, '\r\n' physical rows | 0 |
| physical line 2 after U+2028 | 1 |
| literal U+2029 in background, '\n' physical rows | 0 |
| literal U+2029 in background, '\r\n' physical rows | 0 |
| literal U+2029 in conversation, '\n' physical rows | 0 |
| literal U+2029 in conversation, '\r\n' physical rows | 0 |
| literal U+2029 in candidate_text, '\n' physical rows | 0 |
| literal U+2029 in candidate_text, '\r\n' physical rows | 0 |
| physical line 2 after U+2029 | 1 |
| literal U+0085 in background, '\n' physical rows | 0 |
| literal U+0085 in background, '\r\n' physical rows | 0 |
| literal U+0085 in conversation, '\n' physical rows | 0 |
| literal U+0085 in conversation, '\r\n' physical rows | 0 |
| literal U+0085 in candidate_text, '\n' physical rows | 0 |
| literal U+0085 in candidate_text, '\r\n' physical rows | 0 |
| physical line 2 after U+0085 | 1 |
| final physical row without newline | 0 |
| extra blank physical row rejected | 1 |
| prior corrections retained; all60 metadata and README slots unchanged | 0 |
| visible turn 1 rejects extra expected | 1 |
| visible turn 1 rejects extra expected_action | 1 |
| visible turn 1 rejects extra expected_input_policy | 1 |
| visible turn 1 rejects extra expected_output_policy | 1 |
| visible turn 1 rejects extra interpretation | 1 |
| visible turn 1 rejects extra rationale | 1 |
| visible turn 1 rejects extra id | 1 |
| visible turn 1 rejects extra topic | 1 |
| visible turn 1 rejects extra coverage_category | 1 |
| visible turn 1 rejects extra split | 1 |
| visible turn 1 rejects extra group_id | 1 |
| visible turn 1 rejects extra model_prediction | 1 |
| visible turn 1 rejects extra score | 1 |
| visible turn 1 rejects extra notes | 1 |
| visible turn 2 rejects extra expected | 1 |
| visible turn 2 rejects extra expected_action | 1 |
| visible turn 2 rejects extra expected_input_policy | 1 |
| visible turn 2 rejects extra expected_output_policy | 1 |
| visible turn 2 rejects extra interpretation | 1 |
| visible turn 2 rejects extra rationale | 1 |
| visible turn 2 rejects extra id | 1 |
| visible turn 2 rejects extra topic | 1 |
| visible turn 2 rejects extra coverage_category | 1 |
| visible turn 2 rejects extra split | 1 |
| visible turn 2 rejects extra group_id | 1 |
| visible turn 2 rejects extra model_prediction | 1 |
| visible turn 2 rejects extra score | 1 |
| visible turn 2 rejects extra notes | 1 |
| visible turn rejects nested oracle object | 1 |
| visible text rejects nested oracle object | 1 |
| visible speaker rejects nested oracle object | 1 |
| exact speaker-text keys accept parent | 0 |
| exact speaker-text keys accept child | 0 |
| exact speaker-text keys accept robot | 0 |
| top-level row 1 rejects model_observation | 1 |
| top-level row 1 rejects predicted_label | 1 |
| top-level row 1 rejects model_prediction | 1 |
| top-level row 1 rejects score | 1 |
| top-level row 1 rejects probability | 1 |
| top-level row 1 rejects accuracy | 1 |
| top-level row 1 rejects results | 1 |
| top-level row 1 rejects oracle | 1 |
| top-level row 1 rejects notes | 1 |
| top-level row 1 rejects metadata | 1 |
| top-level row 30 rejects model_observation | 1 |
| top-level row 30 rejects predicted_label | 1 |
| top-level row 30 rejects model_prediction | 1 |
| top-level row 30 rejects score | 1 |
| top-level row 30 rejects probability | 1 |
| top-level row 30 rejects accuracy | 1 |
| top-level row 30 rejects results | 1 |
| top-level row 30 rejects oracle | 1 |
| top-level row 30 rejects notes | 1 |
| top-level row 30 rejects metadata | 1 |
| top-level row 60 rejects model_observation | 1 |
| top-level row 60 rejects predicted_label | 1 |
| top-level row 60 rejects model_prediction | 1 |
| top-level row 60 rejects score | 1 |
| top-level row 60 rejects probability | 1 |
| top-level row 60 rejects accuracy | 1 |
| top-level row 60 rejects results | 1 |
| top-level row 60 rejects oracle | 1 |
| top-level row 60 rejects notes | 1 |
| top-level row 60 rejects metadata | 1 |
| multiple top-level result fields rejected | 1 |
| missing schema field id | 1 |
| missing schema field topic | 1 |
| missing schema field context_type | 1 |
| missing schema field coverage_category | 1 |
| missing schema field split | 1 |
| missing schema field utterance | 1 |
| missing schema field expected | 1 |
| missing schema field candidate_text | 1 |
| missing schema field expected_input_policy | 1 |
| missing schema field expected_output_policy | 1 |
| missing schema field expected_action | 1 |
| missing schema field rationale | 1 |
| round3 changes bounded to036 oracle and044 cleaning activity; all60 slots unchanged | 0 |
| ruff check /private/tmp/coami-worktrees/context-sufficiency-expansion/evaluation/context_sufficiency/versions/v1/validate_dataset.py | 0 |
| ruff format --check | 0 |
| /opt/homebrew/opt/python@3.14/bin/python3.14 /private/tmp/coami-worktrees/context-sufficiency-expansion/evaluation/context_sufficiency/validate_dataset.py | 0 |
| git diff --exit-code | 0 |

## Previous validation — v1-draft-003 (historical)

Codex本機Tester pass：2026-10-07T06:03:50.984246+00:00，Python 3.14.0；**122 checks 通過**。全量CLI/structure/slot/keyword/歷史不變與既有Unicode回歸重新執行，再加visible-turn allowlist与兩案回歸。候選均於TemporaryDirectory deep-copy後實際subprocess執行；核對exit、stderr與無traceback，正式資料在驗證前後SHA-256相同。

- RED：修正前，turn新增expected=SUFFICIENT仍exit0，會將oracle夾帶到整個model-visible conversation；修正後exit1，指出line/ID/turn及unexpected fields。
- 兩個可見turn各測14種附加欄位（oracle/policy/Action/metadata/model_prediction/score/notes），28候選都拒絕；附加nested oracle object及text/speaker內的object payload也拒絕。speaker/text恰有兩key且合法parent/child/robot的三種正常候選仍通過。
- 舊88check範圍保留，literal U+2028/2029/0085、LF/CRLF及physical line2正常；真正relative argv與JSON/UTF8/enum/turn/policy/action/group/contrast負例正常。
- 與e54907c比對，只有028/029兩案更動；60筆id/category/topic/group/split及README全部60slot rows完全不變。028明確以水洗手而非喝杯水，029明確拒絕爸爸抱而非肯定被抱請求；語義接受仍待Owner。
- 60案、research40/holdout20、十二topics、54groups、34 S/26 I；research跨label對照toy_car/water，holdout為book，共三distinct topics。沒有為分布或label數硬改答案。
- Ruff lint/format、v0 validator、v0/E012不變檢查通過；不跑模型，不把結構PASS當oracle批准。

| Check | Expected and observed exit |
| --- | ---: |
| default from different cwd | 0 |
| explicit absolute dataset | 0 |
| explicit relative dataset | 0 |
| malformed JSON | 1 |
| non-object JSON | 1 |
| empty line | 1 |
| NaN | 1 |
| duplicate JSON key | 1 |
| non-UTF8 | 1 |
| empty file | 1 |
| missing file | 1 |
| directory input | 1 |
| duplicate ID | 1 |
| duplicate visible input | 1 |
| missing background | 1 |
| missing conversation | 1 |
| missing interpretation | 1 |
| missing group_id | 1 |
| invalid background | 1 |
| invalid candidate_text | 1 |
| invalid utterance | 1 |
| invalid group_id | 1 |
| invalid id | 1 |
| invalid enum topic | 1 |
| unhashable enum topic | 1 |
| invalid enum context_type | 1 |
| unhashable enum context_type | 1 |
| invalid enum coverage_category | 1 |
| unhashable enum coverage_category | 1 |
| invalid enum split | 1 |
| unhashable enum split | 1 |
| invalid enum expected | 1 |
| unhashable enum expected | 1 |
| invalid enum expected_input_policy | 1 |
| unhashable enum expected_input_policy | 1 |
| invalid enum expected_output_policy | 1 |
| unhashable enum expected_output_policy | 1 |
| invalid enum expected_action | 1 |
| unhashable enum expected_action | 1 |
| conversation not list | 1 |
| too few turns | 1 |
| too many turns | 1 |
| turn not object | 1 |
| invalid speaker | 1 |
| empty turn text | 1 |
| sufficient null interpretation | 1 |
| insufficient string interpretation | 1 |
| wrong label Action | 1 |
| too few cases | 1 |
| wrong matrix | 1 |
| group crosses split | 1 |
| missing topic | 1 |
| category only one topic | 1 |
| research contrast missing | 1 |
| holdout contrast missing | 1 |
| fewer than three contrast topics | 1 |
| structure-valid semantic error | 0 |
| counts-preserving slot swap structural pass | 0 |
| all 60 slot assignments match README; swapped split detected independently | 0 |
| 10 no-keyword cases checked in visible context | 0 |
| literal U+2028 in background, '\n' physical rows | 0 |
| literal U+2028 in background, '\r\n' physical rows | 0 |
| literal U+2028 in conversation, '\n' physical rows | 0 |
| literal U+2028 in conversation, '\r\n' physical rows | 0 |
| literal U+2028 in candidate_text, '\n' physical rows | 0 |
| literal U+2028 in candidate_text, '\r\n' physical rows | 0 |
| physical line 2 after U+2028 | 1 |
| literal U+2029 in background, '\n' physical rows | 0 |
| literal U+2029 in background, '\r\n' physical rows | 0 |
| literal U+2029 in conversation, '\n' physical rows | 0 |
| literal U+2029 in conversation, '\r\n' physical rows | 0 |
| literal U+2029 in candidate_text, '\n' physical rows | 0 |
| literal U+2029 in candidate_text, '\r\n' physical rows | 0 |
| physical line 2 after U+2029 | 1 |
| literal U+0085 in background, '\n' physical rows | 0 |
| literal U+0085 in background, '\r\n' physical rows | 0 |
| literal U+0085 in conversation, '\n' physical rows | 0 |
| literal U+0085 in conversation, '\r\n' physical rows | 0 |
| literal U+0085 in candidate_text, '\n' physical rows | 0 |
| literal U+0085 in candidate_text, '\r\n' physical rows | 0 |
| physical line 2 after U+0085 | 1 |
| final physical row without newline | 0 |
| extra blank physical row rejected | 1 |
| bounded two-case correction; all60 metadata and README slots unchanged; new activities distinct | 0 |
| visible turn 1 rejects extra expected | 1 |
| visible turn 1 rejects extra expected_action | 1 |
| visible turn 1 rejects extra expected_input_policy | 1 |
| visible turn 1 rejects extra expected_output_policy | 1 |
| visible turn 1 rejects extra interpretation | 1 |
| visible turn 1 rejects extra rationale | 1 |
| visible turn 1 rejects extra id | 1 |
| visible turn 1 rejects extra topic | 1 |
| visible turn 1 rejects extra coverage_category | 1 |
| visible turn 1 rejects extra split | 1 |
| visible turn 1 rejects extra group_id | 1 |
| visible turn 1 rejects extra model_prediction | 1 |
| visible turn 1 rejects extra score | 1 |
| visible turn 1 rejects extra notes | 1 |
| visible turn 2 rejects extra expected | 1 |
| visible turn 2 rejects extra expected_action | 1 |
| visible turn 2 rejects extra expected_input_policy | 1 |
| visible turn 2 rejects extra expected_output_policy | 1 |
| visible turn 2 rejects extra interpretation | 1 |
| visible turn 2 rejects extra rationale | 1 |
| visible turn 2 rejects extra id | 1 |
| visible turn 2 rejects extra topic | 1 |
| visible turn 2 rejects extra coverage_category | 1 |
| visible turn 2 rejects extra split | 1 |
| visible turn 2 rejects extra group_id | 1 |
| visible turn 2 rejects extra model_prediction | 1 |
| visible turn 2 rejects extra score | 1 |
| visible turn 2 rejects extra notes | 1 |
| visible turn rejects nested oracle object | 1 |
| visible text rejects nested oracle object | 1 |
| visible speaker rejects nested oracle object | 1 |
| exact speaker-text keys accept parent | 0 |
| exact speaker-text keys accept child | 0 |
| exact speaker-text keys accept robot | 0 |
| ruff check /private/tmp/coami-worktrees/context-sufficiency-expansion/evaluation/context_sufficiency/versions/v1/validate_dataset.py | 0 |
| ruff format --check | 0 |
| /opt/homebrew/opt/python@3.14/bin/python3.14 /private/tmp/coami-worktrees/context-sufficiency-expansion/evaluation/context_sufficiency/validate_dataset.py | 0 |
| git diff --exit-code | 0 |

## Previous validation — v1-draft-002 (historical)

Codex 本機 Tester pass：2026-10-07T04:28:54.326339+00:00，Python 3.14.0；**88 checks 通過**。既有全量CLI/structure/slot/字詞缺席/歷史不變驗收，加本輪Unicode與五案回歸。所有CLI檢查實際subprocess執行，核對exit與stderr，無traceback；TemporaryDirectory候選不寫回正式資料。

- RED證據：修正前，合法60行JSONL中的U+2028被splitlines拆散，exit1；修正後同類候選exit0。
- U+2028／U+2029／U+0085分別在background、conversation.text、candidate_text出現，LF與CRLF實際記錄行共18個正常候選exit0；三種字元之後的缺background仍準確回報physical line2。
- 最後一行沒有newline仍通過；多一個空physical row在line61拒絕。
- 全60 slots與原README完全相符；從a65d3b6比對僅049／050／054／055／058五案變更，id/category/topic/group/split均不变。三筆明確選擇同步expected、interpretation、Action及候選／理由。
- 049不含抱字，以孩子主動陪小熊玩偶為主，與004被媽媽抱不同；050不含還要短句，以繼續剝橘子為主，與005追加食物份量不同。語義仍待Owner，不以字詞檢查或自檢代替接受。
- 34 SUFFICIENT／26 INSUFFICIENT不設配額；跨label對照research為toy_car／water，holdout為book，共三個distinct topics，仍符合原下限；drawing與outside同組兩案皆S，保留已解的意思而非為對照數硬套答案。
- Ruff lint／format、v0 validator、v0/E012 diff不變檢查通過。完整正常／負例驗收重新執行，正式dataset測試前後hash相同。

| Check | Expected and observed exit |
| --- | ---: |
| default from different cwd | 0 |
| explicit absolute dataset | 0 |
| explicit relative dataset | 0 |
| malformed JSON | 1 |
| non-object JSON | 1 |
| empty line | 1 |
| NaN | 1 |
| duplicate JSON key | 1 |
| non-UTF8 | 1 |
| empty file | 1 |
| missing file | 1 |
| directory input | 1 |
| duplicate ID | 1 |
| duplicate visible input | 1 |
| missing background | 1 |
| missing conversation | 1 |
| missing interpretation | 1 |
| missing group_id | 1 |
| invalid background | 1 |
| invalid candidate_text | 1 |
| invalid utterance | 1 |
| invalid group_id | 1 |
| invalid id | 1 |
| invalid enum topic | 1 |
| unhashable enum topic | 1 |
| invalid enum context_type | 1 |
| unhashable enum context_type | 1 |
| invalid enum coverage_category | 1 |
| unhashable enum coverage_category | 1 |
| invalid enum split | 1 |
| unhashable enum split | 1 |
| invalid enum expected | 1 |
| unhashable enum expected | 1 |
| invalid enum expected_input_policy | 1 |
| unhashable enum expected_input_policy | 1 |
| invalid enum expected_output_policy | 1 |
| unhashable enum expected_output_policy | 1 |
| invalid enum expected_action | 1 |
| unhashable enum expected_action | 1 |
| conversation not list | 1 |
| too few turns | 1 |
| too many turns | 1 |
| turn not object | 1 |
| invalid speaker | 1 |
| empty turn text | 1 |
| sufficient null interpretation | 1 |
| insufficient string interpretation | 1 |
| wrong label Action | 1 |
| too few cases | 1 |
| wrong matrix | 1 |
| group crosses split | 1 |
| missing topic | 1 |
| category only one topic | 1 |
| research contrast missing | 1 |
| holdout contrast missing | 1 |
| fewer than three contrast topics | 1 |
| structure-valid semantic error | 0 |
| counts-preserving slot swap structural pass | 0 |
| all 60 slot assignments match README; swapped split detected independently | 0 |
| 10 no-keyword cases checked in visible context | 0 |
| literal U+2028 in background, '\n' physical rows | 0 |
| literal U+2028 in background, '\r\n' physical rows | 0 |
| literal U+2028 in conversation, '\n' physical rows | 0 |
| literal U+2028 in conversation, '\r\n' physical rows | 0 |
| literal U+2028 in candidate_text, '\n' physical rows | 0 |
| literal U+2028 in candidate_text, '\r\n' physical rows | 0 |
| physical line 2 after U+2028 | 1 |
| literal U+2029 in background, '\n' physical rows | 0 |
| literal U+2029 in background, '\r\n' physical rows | 0 |
| literal U+2029 in conversation, '\n' physical rows | 0 |
| literal U+2029 in conversation, '\r\n' physical rows | 0 |
| literal U+2029 in candidate_text, '\n' physical rows | 0 |
| literal U+2029 in candidate_text, '\r\n' physical rows | 0 |
| physical line 2 after U+2029 | 1 |
| literal U+0085 in background, '\n' physical rows | 0 |
| literal U+0085 in background, '\r\n' physical rows | 0 |
| literal U+0085 in conversation, '\n' physical rows | 0 |
| literal U+0085 in conversation, '\r\n' physical rows | 0 |
| literal U+0085 in candidate_text, '\n' physical rows | 0 |
| literal U+0085 in candidate_text, '\r\n' physical rows | 0 |
| physical line 2 after U+0085 | 1 |
| final physical row without newline | 0 |
| extra blank physical row rejected | 1 |
| bounded five-case correction; metadata unchanged; three explicit choices sufficient | 0 |
| ruff check /private/tmp/coami-worktrees/context-sufficiency-expansion/evaluation/context_sufficiency/versions/v1/validate_dataset.py | 0 |
| ruff format --check | 0 |
| /opt/homebrew/opt/python@3.14/bin/python3.14 /private/tmp/coami-worktrees/context-sufficiency-expansion/evaluation/context_sufficiency/validate_dataset.py | 0 |
| git diff --exit-code | 0 |

## Initial validation — v1-draft-001 (historical)

執行者：Codex 本機 Tester pass；不是獨立fixture review、Owner接受或模型評估。Python 3.14.0，recorded UTC 2026-10-07T04:03:16.510568+00:00。

```sh
python3 evaluation/context_sufficiency/versions/v1/validate_dataset.py
ruff check evaluation/context_sufficiency/versions/v1/validate_dataset.py
ruff format --check evaluation/context_sufficiency/versions/v1/validate_dataset.py
python3 evaluation/context_sufficiency/validate_dataset.py
```

全 **65 checks 通過**。使用 TemporaryDirectory 與 deep-copy的暫存JSONL，實際subprocess執行CLI，核對預期exit、stderr診斷及無traceback；結束清除候選檔。驗證前後正式dataset SHA-256相同。未新增測試framework、測試repo工件或網路呼叫。

- CLI正常路徑：其他cwd預設、明確絕對與相對candidate。
- 負例：malformed／非object／空行／NaN／duplicate JSON key／非UTF8／空檔／不存在／directory；duplicate ID／完整visible input；缺欄、型別、空字串、ID格式、enum（含dict值）、turn shape/count/speaker/text、interpretation／Action錯配。
- 配置負例：不足60、matrix錯、group跨split、缺topic、category只有一topic、research／holdout對照缺失與不足三個distinct對照topic。
- 結構有效但故意給錯語義的暫存案仍exit0：程式不推答案；不寫回oracle。
- 逐列核對60案 id/category/topic/group/split 與 README 已固定slots全部相符。另交換 cs_v1_004／cs_v1_010 的split，維持matrix且CLI exit0，但逐列核對準確找出兩筆差異，證明counts不代替slot驗收。
- cs_v1_041–050 的前文／背景逐案未出現對應target keyword；此檢查只證明字詞缺席，不證明語義充分。
- Ruff lint與format check exit0；既有v0 validator exit0；git diff base確認v0及E012原樣。

### Individual check inventory

| Check | Expected and observed exit |
| --- | ---: |
| default from different cwd | 0 |
| explicit absolute dataset | 0 |
| explicit candidate (initial harness supplied absolute path) | 0 |
| actual relative argv candidate.jsonl from temporary cwd | 0 |
| malformed JSON | 1 |
| non-object JSON | 1 |
| empty line | 1 |
| NaN | 1 |
| duplicate JSON key | 1 |
| non-UTF8 | 1 |
| empty file | 1 |
| missing file | 1 |
| directory input | 1 |
| duplicate ID | 1 |
| duplicate visible input | 1 |
| missing background | 1 |
| missing conversation | 1 |
| missing interpretation | 1 |
| missing group_id | 1 |
| invalid background | 1 |
| invalid candidate_text | 1 |
| invalid utterance | 1 |
| invalid group_id | 1 |
| invalid id | 1 |
| invalid enum topic | 1 |
| unhashable enum topic | 1 |
| invalid enum context_type | 1 |
| unhashable enum context_type | 1 |
| invalid enum coverage_category | 1 |
| unhashable enum coverage_category | 1 |
| invalid enum split | 1 |
| unhashable enum split | 1 |
| invalid enum expected | 1 |
| unhashable enum expected | 1 |
| invalid enum expected_input_policy | 1 |
| unhashable enum expected_input_policy | 1 |
| invalid enum expected_output_policy | 1 |
| unhashable enum expected_output_policy | 1 |
| invalid enum expected_action | 1 |
| unhashable enum expected_action | 1 |
| conversation not list | 1 |
| too few turns | 1 |
| too many turns | 1 |
| turn not object | 1 |
| invalid speaker | 1 |
| empty turn text | 1 |
| sufficient null interpretation | 1 |
| insufficient string interpretation | 1 |
| wrong label Action | 1 |
| too few cases | 1 |
| wrong matrix | 1 |
| group crosses split | 1 |
| missing topic | 1 |
| category only one topic | 1 |
| research contrast missing | 1 |
| holdout contrast missing | 1 |
| fewer than three contrast topics | 1 |
| structure-valid semantic error | 0 |
| counts-preserving slot swap structural pass | 0 |
| all 60 slot assignments match README; swapped split detected independently | 0 |
| 10 no-keyword cases checked in visible context | 0 |
| ruff check /private/tmp/coami-worktrees/context-sufficiency-expansion/evaluation/context_sufficiency/versions/v1/validate_dataset.py | 0 |
| ruff format --check | 0 |
| /opt/homebrew/opt/python@3.14/bin/python3.14 /private/tmp/coami-worktrees/context-sufficiency-expansion/evaluation/context_sufficiency/validate_dataset.py | 0 |
| git diff --exit-code | 0 |

## Human-check procedure

請先只讀每案可見background／conversation／utterance，自行判斷，再展開固定oracle。中性Case編號只是此包的定位；case ID／category／group／split與候選均放展開區，不作判斷線索。這個可見human包不構成unseen或blind holdout的宣稱。

逐案確認：S主意思是否由文字支持；I至少兩合理意思是否導向不同回應；候選是否簡短且只確認／釐清一件事；COMPANION／ALLOW與Action是否合宜；是否依賴隱藏訊息或硬套category；對照及同情境group是否合理。

可一次明示接受 **v1-draft-004三hash所指的全部60案**，或用Case編號／展開的ID提修訂。任何snapshot變更均更新版本證據並重走全量驗證、Owner接受與後續獨立fixture review，不用本機PASS代替接受。

## Case review package

以下60案對應目前 v1-draft-004；Case編號沿用001/002/003，便於追蹤；舊版接受不能套用新snapshot。

### Case 01

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：外面有院子，外面的路上也有小狗。
>
> **parent**：可以隔著窗看外面，也可以出門去院子。
>

孩子當句：**外面**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_040
- **topic**：outside
- **context_type**：ambiguous
- **coverage_category**：keyword_misdirection
- **group_id**：case-040
- **split**：holdout
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想出門去院子，還是隔著窗看？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能要出門，回應移動意願；可能要窗邊看，回應觀看。外面重複不解決兩種不同活動。

Owner：pending；independent fixture review：pending。

</details>

### Case 02

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：門的另一邊是院子，屋裡很悶，你想出去看樹嗎？
>
> **child**：想出去看樹。
>

孩子當句：**外面**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_048
- **topic**：outside
- **context_type**：clear
- **coverage_category**：meaning_without_keyword
- **group_id**：case-048
- **split**：holdout
- **expected**：SUFFICIENT
- **interpretation**：孩子想到院子看樹。
- **candidate_text**：你想去院子看樹。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：前文沒有外面兩字，出門方向、院子與看樹的目的已由文字確立。

Owner：pending；independent fixture review：pending。

</details>

### Case 03

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：這個黃色圓玩具用手拍到地上會彈起來，你想拍它嗎？
>
> **child**：要拍黃色那個。
>

孩子當句：**球球**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_041
- **topic**：ball
- **context_type**：clear
- **coverage_category**：meaning_without_keyword
- **group_id**：case-041
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想拍黃色會彈起的圓玩具。
- **candidate_text**：你想拍黃色那個球。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：前文未用球字，卻以會彈、用手拍及孩子確認建立具體物件和玩法，不借影像。

Owner：pending；independent fixture review：pending。

</details>

### Case 04

背景：大人剛才聊了明天的天氣和午餐；沒有說到玩具。

前文（全部在當句之前）：

> **parent**：你要用手拍這顆紅球嗎？
>
> **child**：要，我想拍紅球。
>

孩子當句：**球球**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_021
- **topic**：ball
- **context_type**：irrelevant
- **coverage_category**：irrelevant_background
- **group_id**：case-021
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想拍紅球。
- **candidate_text**：你想拍紅球。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：背景的天氣和午餐無關；近前文已由孩子選定紅球與拍的玩法，無關背景不應抹掉充分性。

Owner：pending；independent fixture review：pending。

</details>

### Case 05

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：這件有袖子的布料，袖口沾到果汁了。你要把它拿去洗，還是先晾著？
>
> **child**：我要洗掉袖口的果汁。
>

孩子當句：**衣衣**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_044
- **topic**：clothing
- **context_type**：clear
- **coverage_category**：meaning_without_keyword
- **group_id**：case-044
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想清洗袖口沾到果汁的衣物。
- **candidate_text**：你想洗掉袖口的果汁。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：前文沒有衣字，但袖子、袖口與孩子明選洗掉果汁已建立清洗衣物的用途。這是清潔活動，與保留組010選擇穿紅外套的穿著目的不同；不需靠相同keyword確認。

Owner：pending；independent fixture review：pending。

</details>

### Case 06

背景：奶奶今天早餐喝了茶；這與外套扣子沒有關係。

前文（全部在當句之前）：

> **parent**：紅外套上的扣子要自己扣，還是要我幫忙？
>
> **child**：自己扣紅的。
>

孩子當句：**扣扣**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_024
- **topic**：clothing
- **context_type**：irrelevant
- **coverage_category**：irrelevant_background
- **group_id**：case-024
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想自己扣紅外套的扣子。
- **candidate_text**：你想自己扣紅外套的扣子。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：雖有喝茶背景，當下對話已選定扣子與自己扣的方式，不需再釐清衣物。

Owner：pending；independent fixture review：pending。

</details>

### Case 07

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：藍色那本是海龜故事。
>
> **parent**：你要我念那本，還是把它放回書架？
>

孩子當句：**書書**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_018
- **topic**：book
- **context_type**：ambiguous
- **coverage_category**：multiple_meanings
- **group_id**：book-sea-reading
- **split**：holdout
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想聽海龜故事，還是把書放回去？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：同一本書可能指請人念，也可能指收回；前者確認聽故事，後者確認收書，短句未選用途。

Owner：pending；independent fixture review：pending。

</details>

### Case 08

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：書架有故事書、圖畫書和字母書。你剛說想聽哪一本？
>
> **child**：想聽綠色封面的字母書。
>

孩子當句：**那本**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_034
- **topic**：book
- **context_type**：clear
- **coverage_category**：keyword_misdirection
- **group_id**：case-034
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想聽綠色封面的字母書。
- **candidate_text**：你想聽綠色那本字母書。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：多種書名並未破壞孩子最後的明確選擇；真正證據是封面與聽的意圖，不是書字頻率。

Owner：pending；independent fixture review：pending。

</details>

### Case 09

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：這裡有白紙和彩色筆，你想自己用筆在紙上做個太陽嗎？
>
> **child**：要，我自己做太陽。
>

孩子當句：**畫畫**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_045
- **topic**：drawing
- **context_type**：clear
- **coverage_category**：meaning_without_keyword
- **group_id**：drawing-make-or-show
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想自己用彩色筆在紙上畫太陽。
- **candidate_text**：你想自己在紙上畫太陽。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：前文沒有畫字，但紙筆、用筆做太陽和孩子確認建立作畫活動；不是私下看見作品才推斷。

Owner：pending；independent fixture review：pending。

</details>

### Case 10

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **child**：別唱歌，我要故事。
>
> **parent**：先聽故事？
>
> **child**：故事也不要，歌又好像可以。
>

孩子當句：**不要**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_054
- **topic**：sleep
- **context_type**：clear
- **coverage_category**：conflicting_context
- **group_id**：case-054
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子現在不想聽故事，沒有明確拒絕唱歌。
- **candidate_text**：你現在不想聽故事。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：最後明說故事也不要，歌又好像可以；當句不要可合理延續已明確的故事拒絕，不必把沒有文字支持的突然反悔唱歌當同等競爭意思。先前意願衝突已有主要解讀，不需百分之百確定。

Owner：pending；independent fixture review：pending。

</details>

### Case 11

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：藍襪子洗好了，白襪子還在洗。
>
> **child**：襪袜。
>

孩子當句：**外面**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_025
- **topic**：outside
- **context_type**：irrelevant
- **coverage_category**：irrelevant_background
- **group_id**：case-025
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想出去，還是想看外面？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能想出門，回應出去；也可能想看戶外，回應觀看。洗襪子的文字不支持選定任何一種外面用途。

Owner：pending；independent fixture review：pending。

</details>

### Case 12

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：床邊這本有小牛和農場的故事，你想聽我念嗎？
>
> **child**：想聽小牛，念這本。
>

孩子當句：**書書**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_047
- **topic**：book
- **context_type**：clear
- **coverage_category**：meaning_without_keyword
- **group_id**：book-bedtime-choice
- **split**：holdout
- **expected**：SUFFICIENT
- **interpretation**：孩子想聽床邊這本小牛與農場故事。
- **candidate_text**：你想聽床邊這本小牛故事。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：前文未用書字，卻明說一本故事、念及孩子選擇，足以建立閱讀；另一對照案保留未解的先後選擇。

Owner：pending；independent fixture review：pending。

</details>

### Case 13

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：你說累了，現在想睡覺嗎？
>
> **child**：想睡，不玩了。
>

孩子當句：**睡睡**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_006
- **topic**：sleep
- **context_type**：clear
- **coverage_category**：explicit_reference
- **group_id**：case-006
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想停止玩耍並睡覺。
- **candidate_text**：你想睡覺了。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：孩子已明說想睡且不再玩，候選只確認狀態，不承諾安排睡眠。

Owner：pending；independent fixture review：pending。

</details>

### Case 14

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：你剛剝好一顆橘子，桌上另有一顆完整的。
>
> **child**：這顆我也自己剝。
>
> **parent**：你說先剝下一顆，吃的事等一下？
>
> **child**：對，先剝。
>

孩子當句：**還要**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_050
- **topic**：food
- **context_type**：clear
- **coverage_category**：meaning_without_keyword
- **group_id**：case-050
- **split**：holdout
- **expected**：SUFFICIENT
- **interpretation**：孩子想繼續自己剝下一顆橘子，暫不吃。
- **candidate_text**：你想繼續自己剝橘子。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：前文未用還要短句，但孩子明選繼續剝下一顆，且確認先剝、吃等一下。主要意思是延續食物準備與練習，不是cs_v1_005的吃完後追加一份食物。

Owner：pending；independent fixture review：pending。

</details>

### Case 15

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：小熊玩偶從枕頭上掉下來了。你想讓牠待在你的懷裡，陪著牠嗎？
>
> **child**：要，我陪小熊，放我懷裡。
>

孩子當句：**抱抱**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_049
- **topic**：hug
- **context_type**：clear
- **coverage_category**：meaning_without_keyword
- **group_id**：case-049
- **split**：holdout
- **expected**：SUFFICIENT
- **interpretation**：孩子想自己把小熊玩偶放在懷裡陪伴牠。
- **candidate_text**：你想把小熊放在自己懷裡，陪著牠。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：前文未用抱字，卻以玩偶待在孩子懷裡與孩子自己陪牠建立主意思。這是孩子主動照顧玩偶，不是cs_v1_004的孩子請求被媽媽抱，參與角色與回應目的不同。

Owner：pending；independent fixture review：pending。

</details>

### Case 16

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：門外正在下雨，在屋裡也能聽到雨聲。
>
> **parent**：你可以留在窗邊看，也可以穿雨衣出門。
>

孩子當句：**外面**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_019
- **topic**：outside
- **context_type**：ambiguous
- **coverage_category**：multiple_meanings
- **group_id**：case-019
- **split**：holdout
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想出門，還是在屋裡看外面？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能要出門，回應出門意願；也可能指在屋內觀看外面的雨，回應觀看。未選身處位置與活動。

Owner：pending；independent fixture review：pending。

</details>

### Case 17

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：你想讓媽媽抱一下嗎？
>
> **child**：要媽媽抱。
>

孩子當句：**抱抱**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_004
- **topic**：hug
- **context_type**：clear
- **coverage_category**：explicit_reference
- **group_id**：case-004
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想被媽媽抱一下。
- **candidate_text**：你想讓媽媽抱一下。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：孩子直接確認接受媽媽的擁抱，最新疊字延續同一意願。

Owner：pending；independent fixture review：pending。

</details>

### Case 18

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：媽媽現在在廚房。
>
> **parent**：我剛說錯了，媽媽其實已經出門了。
>

孩子當句：**媽媽**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_051
- **topic**：parent
- **context_type**：ambiguous
- **coverage_category**：conflicting_context
- **group_id**：case-051
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想知道媽媽在哪裡，還是想跟媽媽說話？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：位置已更正，但可能是在問位置，應談在哪；也可能想與媽媽說話，應談聯絡意願。更正事實未建立孩子目的。

Owner：pending；independent fixture review：pending。

</details>

### Case 19

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：把這些方塊一層一層疊成小屋，好嗎？
>
> **child**：要疊小屋。
>

孩子當句：**積木**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_046
- **topic**：blocks
- **context_type**：clear
- **coverage_category**：meaning_without_keyword
- **group_id**：case-046
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想把方塊疊成小屋。
- **candidate_text**：你想用這些方塊疊小屋。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：前文未用積木兩字，文字中的方塊、疊小屋及確認已建立具體玩法，不依字面重複。

Owner：pending；independent fixture review：pending。

</details>

### Case 20

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：故事裡的媽媽正在找小兔子。
>
> **parent**：你家裡的媽媽現在在廚房。
>

孩子當句：**媽媽**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_017
- **topic**：parent
- **context_type**：ambiguous
- **coverage_category**：multiple_meanings
- **group_id**：case-017
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你在說故事裡的媽媽，還是想找家裡的媽媽？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能提問故事角色，應談故事；也可能想找真實媽媽，應談找人。兩個 referent 都在當下文字中。

Owner：pending；independent fixture review：pending。

</details>

### Case 21

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **child**：讓娃娃抱我。
>
> **parent**：你想抱著娃娃嗎？
>
> **child**：不要娃娃，我要媽媽抱我。
>

孩子當句：**抱抱**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_059
- **topic**：hug
- **context_type**：clear
- **coverage_category**：conflicting_context
- **group_id**：case-059
- **split**：holdout
- **expected**：SUFFICIENT
- **interpretation**：孩子想被媽媽抱。
- **candidate_text**：你想讓媽媽抱你。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：早先娃娃相關意思與新要求不同，但孩子明排娃娃且指定媽媽抱自己，衝突被可見更正解除。

Owner：pending；independent fixture review：pending。

</details>

### Case 22

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：窗外的小鳥來了，你想留在屋裡看嗎？
>
> **child**：在這裡看鳥，不出去。
>

孩子當句：**外面**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_009
- **topic**：outside
- **context_type**：clear
- **coverage_category**：explicit_reference
- **group_id**：outside-watch-or-go
- **split**：holdout
- **expected**：SUFFICIENT
- **interpretation**：孩子想留在屋內看窗外的小鳥。
- **candidate_text**：你想在屋裡看外面的小鳥。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：孩子已排除出門，外面延續觀看對象，不必先問是否要出去。

Owner：pending；independent fixture review：pending。

</details>

### Case 23

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：剛才的小饅頭吃完了，還想吃一個嗎？
>
> **child**：要，再一個。
>

孩子當句：**還要**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_005
- **topic**：food
- **context_type**：clear
- **coverage_category**：explicit_reference
- **group_id**：case-005
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想再吃一個小饅頭。
- **candidate_text**：你還想吃一個小饅頭。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：吃完的小饅頭與孩子回答建立追加食物的主要意思，並未涉及別的待選活動。

Owner：pending；independent fixture review：pending。

</details>

### Case 24

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：餅乾故事剛講完，桌上也有一盤餅乾。
>
> **parent**：你想再來嗎？
>

孩子當句：**餅餅**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_032
- **topic**：food
- **context_type**：ambiguous
- **coverage_category**：keyword_misdirection
- **group_id**：case-032
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想吃餅乾，還是再聽餅乾故事？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能要真的餅乾，確認吃；也可能要重聽餅乾故事，確認故事。相同詞橫跨食物與故事不會自动定義意圖。

Owner：pending；independent fixture review：pending。

</details>

### Case 25

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：你口渴了嗎？想喝杯裡的涼開水嗎？
>
> **child**：口渴，要喝。
>

孩子當句：**水水**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_002
- **topic**：water
- **context_type**：clear
- **coverage_category**：explicit_reference
- **group_id**：water-drink-or-use
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想喝杯裡的涼開水。
- **candidate_text**：你想喝杯裡的水。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：口渴、杯中飲用水與孩子的要喝回答共同確立喝水目的。

Owner：pending；independent fixture review：pending。

</details>

### Case 26

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：水的故事講到河水流向瀑布。
>
> **parent**：桌上杯子也裝了能喝的水。
>

孩子當句：**水水**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_039
- **topic**：water
- **context_type**：ambiguous
- **coverage_category**：keyword_misdirection
- **group_id**：case-039
- **split**：holdout
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想喝水，還是繼續聽水的故事？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能要飲用水，確認喝；也可能要故事繼續，確認聽。水相關詞並未建立用途，兩種都有文字依據。

Owner：pending；independent fixture review：pending。

</details>

### Case 27

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **child**：先念床邊那本小牛故事。
>
> **parent**：先小牛那本？
>
> **child**：車子的那本也要先念。
>

孩子當句：**書書**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_057
- **topic**：book
- **context_type**：ambiguous
- **coverage_category**：conflicting_context
- **group_id**：book-bedtime-choice
- **split**：holdout
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想先聽小牛故事，還是車子的故事？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能仍以小牛先，確認農場故事；也可能改以車故事先，確認另一本。也要先未明撤前選擇，先後衝突未解。

Owner：pending；independent fixture review：pending。

</details>

### Case 28

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：你想聽那本海龜故事嗎？藍色封面那本。
>
> **child**：要聽海龜，念那本。
>

孩子當句：**書書**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_008
- **topic**：book
- **context_type**：clear
- **coverage_category**：explicit_reference
- **group_id**：book-sea-reading
- **split**：holdout
- **expected**：SUFFICIENT
- **interpretation**：孩子想聽藍色封面的海龜故事。
- **candidate_text**：你想聽藍色那本海龜故事。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：孩子明選書與聽故事目的；同組另一案保留同一句短句但不選閱讀或收書。

Owner：pending；independent fixture review：pending。

</details>

### Case 29

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：球滾到沙發下面了。
>
> **parent**：我們剛才也說等一下要踢球。
>

孩子當句：**球球**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_013
- **topic**：ball
- **context_type**：ambiguous
- **coverage_category**：multiple_meanings
- **group_id**：case-013
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你在說沙發下面的球，還是想踢球？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能提醒球的位置，應確認找球；也可能重提踢球活動，應確認玩法。球這個字不足以區分提醒與請求。

Owner：pending；independent fixture review：pending。

</details>

### Case 30

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：你想推地墊上的紅色小汽車嗎？
>
> **child**：要，推紅的。
>

孩子當句：**車車**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_001
- **topic**：toy_car
- **context_type**：clear
- **coverage_category**：explicit_reference
- **group_id**：car-play-or-look
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想推地墊上的紅色玩具車。
- **candidate_text**：你想推地墊上的紅色車車。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：孩子已明確選定推紅色玩具車；短句延續同一物件和玩法，無須再問車的種類。

Owner：pending；independent fixture review：pending。

</details>

### Case 31

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：杯裡有能喝的水，水壺裡有要澆花的水。
>
> **parent**：你想喝一口，還是和我一起澆花？
>

孩子當句：**水水**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_012
- **topic**：water
- **context_type**：ambiguous
- **coverage_category**：multiple_meanings
- **group_id**：water-drink-or-use
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想喝水，還是用水澆花？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能想喝杯水，回應飲用；也可能想用水澆花，回應活動。兩種用途都已提出但未選定。

Owner：pending；independent fixture review：pending。

</details>

### Case 32

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：媽媽說今天穿紅外套。
>
> **parent**：爸爸又說今天穿藍外套，一次只穿一件。
>

孩子當句：**穿穿**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_060
- **topic**：clothing
- **context_type**：ambiguous
- **coverage_category**：conflicting_context
- **group_id**：case-060
- **split**：holdout
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想穿紅外套，還是藍外套？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：兩位照顧者說法衝突，孩子尚未選；可能紅或藍，應確認不同衣物，不能假定哪位指示優先或最後一句勝出。

Owner：pending；independent fixture review：pending。

</details>

### Case 33

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：衣櫃有外衣、毛衣和雨衣，門口還有一件雨衣。
>
> **child**：我要穿門口那件雨衣。
>

孩子當句：**衣衣**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_038
- **topic**：clothing
- **context_type**：clear
- **coverage_category**：keyword_misdirection
- **group_id**：case-038
- **split**：holdout
- **expected**：SUFFICIENT
- **interpretation**：孩子想穿門口的雨衣。
- **candidate_text**：你想穿門口那件雨衣。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：衣物相關詞雖多，孩子明選位置、種類與穿的用途；不能因多keyword就反向判歧義。

Owner：pending；independent fixture review：pending。

</details>

### Case 34

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **child**：我要自己用筆做太陽。
>
> **parent**：是想自己畫一張嗎？
>
> **child**：先看媽媽那張，我又想自己做。
>

孩子當句：**畫畫**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_055
- **topic**：drawing
- **context_type**：clear
- **coverage_category**：conflicting_context
- **group_id**：drawing-make-or-show
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想先看媽媽的畫，之後也想自己作畫。
- **candidate_text**：你想先看媽媽的畫，也想自己畫。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：最後的先看媽媽那張已選定眼前的第一個活動，自己做是另一個後續願望；可見先後足以支持主要意思，不能為保留歧義標籤忽略先看的明確選擇。

Owner：pending；independent fixture review：pending。

</details>

### Case 35

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **child**：我要出去看院子。
>
> **parent**：想出門？
>
> **child**：也想留在窗邊看小鳥，先看外面。
>

孩子當句：**外面**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_058
- **topic**：outside
- **context_type**：clear
- **coverage_category**：conflicting_context
- **group_id**：outside-watch-or-go
- **split**：holdout
- **expected**：SUFFICIENT
- **interpretation**：孩子想先留在窗邊看外面的小鳥。
- **candidate_text**：你想先留在窗邊看外面的小鳥。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：最後提留在窗邊看小鳥並說先看外面，可合理延續窗邊觀看的選擇。更早的出門願望沒有讓當下的第一個活動仍未選定；主意思充分，不需臆測立即反悔。

Owner：pending；independent fixture review：pending。

</details>

### Case 36

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：媽媽畫的畫放在桌上，旁邊有給你畫畫的白紙。
>
> **parent**：你想看媽媽的畫，還是自己畫？
>

孩子當句：**畫畫**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_036
- **topic**：drawing
- **context_type**：clear
- **coverage_category**：keyword_misdirection
- **group_id**：case-036
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想自己在白紙上畫畫。
- **candidate_text**：你想自己在白紙上畫畫。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：前文把畫畫用於白紙上的創作活動，並區分看媽媽的畫與自己畫；孩子的畫畫重複自己作畫的動作，支持主要意思。媽媽的作品雖也含畫字，不構成同等合理的欣賞請求。

Owner：pending；independent fixture review：pending。

</details>

### Case 37

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：媽媽在客廳，你想找她嗎？
>
> **child**：想找媽媽。
>

孩子當句：**媽媽**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_007
- **topic**：parent
- **context_type**：clear
- **coverage_category**：explicit_reference
- **group_id**：case-007
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想找客廳的媽媽。
- **candidate_text**：你想找客廳的媽媽。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：位置與找人的意圖都有可見文字，媽媽不是未選定的故事人物。

Owner：pending；independent fixture review：pending。

</details>

### Case 38

背景：早上大人說週末要洗車，與眼前的飯和故事無關。

前文（全部在當句之前）：

> **parent**：剛吃完飯，也剛聽完一個故事。
>
> **parent**：還有飯，故事也可以再講一次。
>

孩子當句：**還要**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_022
- **topic**：food
- **context_type**：irrelevant
- **coverage_category**：irrelevant_background
- **group_id**：case-022
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想再吃飯，還是再聽故事？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能追加飯，回應吃飯；也可能追加故事，回應再講。背景的洗車話題不替孩子選定其中一項。

Owner：pending；independent fixture review：pending。

</details>

### Case 39

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：這件衣服可以穿上，也可以脫下換另一件。
>
> **parent**：你現在想穿，還是想脫？
>

孩子當句：**衣衣**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_020
- **topic**：clothing
- **context_type**：ambiguous
- **coverage_category**：multiple_meanings
- **group_id**：case-020
- **split**：holdout
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想穿衣服，還是想脫下來？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能要穿上，應確認穿衣；也可能想脫下換衣，應確認脫下。前文直接保留兩種相反動作。

Owner：pending；independent fixture review：pending。

</details>

### Case 40

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **child**：我要香蕉。
>
> **parent**：你要吃香蕉嗎？
>
> **child**：不是香蕉，我要餅乾，再一片。
>

孩子當句：**還要**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_052
- **topic**：food
- **context_type**：clear
- **coverage_category**：conflicting_context
- **group_id**：case-052
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想再吃一片餅乾。
- **candidate_text**：你還想吃一片餅乾。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：早先香蕉與後來餅乾衝突，但孩子明確否定香蕉、選餅乾及追加一片；不能把已解的更正當未解矛盾。

Owner：pending；independent fixture review：pending。

</details>

### Case 41

背景：昨天吃的是芒果布丁，與現在的積木活動無關。

前文（全部在當句之前）：

> **parent**：桌上那座積木塔可以繼續疊，也可以拆掉。
>
> **parent**：你想怎麼玩？
>

孩子當句：**積木**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_027
- **topic**：blocks
- **context_type**：irrelevant
- **coverage_category**：irrelevant_background
- **group_id**：case-027
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想繼續疊積木，還是拆掉？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能續疊，確認建造；也可能拆塔，確認拆卸。甜點背景與短句都不選定玩法。

Owner：pending；independent fixture review：pending。

</details>

### Case 42

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：盤子裡還有餅乾。
>
> **parent**：剛才的兔子故事也可以再講一次。
>

孩子當句：**還要**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_015
- **topic**：food
- **context_type**：ambiguous
- **coverage_category**：multiple_meanings
- **group_id**：case-015
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想再吃餅乾，還是再聽兔子故事？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能要追加食物，確認再吃餅乾；也可能要故事重播，確認再聽。省略受詞而兩件事都待選。

Owner：pending；independent fixture review：pending。

</details>

### Case 43

背景：今天車棚重新粉刷，沒有提到睡前故事或燈。

前文（全部在當句之前）：

> **parent**：睡前故事講到一半，房間的大燈還亮著。
>
> **child**：嗯。
>

孩子當句：**不要**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_030
- **topic**：sleep
- **context_type**：irrelevant
- **coverage_category**：irrelevant_background
- **group_id**：case-030
- **split**：holdout
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你不要聽故事，還是不要亮著的大燈？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能拒絕故事，需確認停止聽；也可能拒絕燈光，需確認環境。車棚背景不能選定拒絕對象。

Owner：pending；independent fixture review：pending。

</details>

### Case 44

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：你要拍黃色球，還是把藍色球放回盒子？
>
> **child**：我要拍黃的。
>

孩子當句：**球球**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_003
- **topic**：ball
- **context_type**：clear
- **coverage_category**：explicit_reference
- **group_id**：case-003
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想拍黃色球。
- **candidate_text**：你想拍黃色球。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：前文雖有兩球兩種活動，孩子明選黃色球和拍的玩法，未留下須追問的競爭意思。

Owner：pending；independent fixture review：pending。

</details>

### Case 45

背景：隔壁剛才放了一首歌；沒有談到顏色或畫紙。

前文（全部在當句之前）：

> **parent**：你要把紙上的太陽塗紅色還是黃色？
>
> **child**：紅色，太陽要紅。
>

孩子當句：**紅紅**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_026
- **topic**：drawing
- **context_type**：irrelevant
- **coverage_category**：irrelevant_background
- **group_id**：case-026
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想把紙上的太陽塗紅色。
- **candidate_text**：你想把太陽塗紅色。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：音樂背景沒有指涉作用；孩子已指定太陽和紅色，省略句仍有充分的可見受詞。

Owner：pending；independent fixture review：pending。

</details>

### Case 46

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：故事有火車、汽車和消防車。
>
> **parent**：你可以再聽車子的故事，也可以玩桌上的小車。
>

孩子當句：**車車**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_031
- **topic**：toy_car
- **context_type**：ambiguous
- **coverage_category**：keyword_misdirection
- **group_id**：case-031
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想聽車子的故事，還是玩小車？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：車字很多但用途未選：可能要故事，應確認聽；可能要玩具，應確認玩。不能以 keyword 次數取代目的。

Owner：pending；independent fixture review：pending。

</details>

### Case 47

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：這個有四個輪子的小玩具能沿著地墊推，你想推它嗎？
>
> **child**：要推四個輪子的。
>

孩子當句：**車車**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_043
- **topic**：toy_car
- **context_type**：clear
- **coverage_category**：meaning_without_keyword
- **group_id**：case-043
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想推地墊上的四輪小玩具。
- **candidate_text**：你想推那個四個輪子的玩具車。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：前文未說車，卻描述輪子、玩具、推的玩法並得到孩子選擇，足以確認主要意思。

Owner：pending；independent fixture review：pending。

</details>

### Case 48

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **child**：把長方塊放上面。
>
> **parent**：放小屋上面？
>
> **child**：不對，放下面，當底。
>

孩子當句：**下面**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_056
- **topic**：blocks
- **context_type**：clear
- **coverage_category**：conflicting_context
- **group_id**：case-056
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想把長方塊放在小屋下面當底。
- **candidate_text**：你想把長方塊放下面當底。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：上下指令曾衝突，但孩子明確更正並說當底，最後意思已建立；不用僵化地把所有矛盾都判不足。

Owner：pending；independent fixture review：pending。

</details>

### Case 49

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：地墊上有紅色玩具車，窗外有一台大車。
>
> **parent**：可以推玩具，也可以在窗邊看大車。
>

孩子當句：**車車**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_011
- **topic**：toy_car
- **context_type**：ambiguous
- **coverage_category**：multiple_meanings
- **group_id**：car-play-or-look
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想推玩具車，還是看窗外的大車？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能要推地墊的玩具車，應確認玩耍；也可能要看窗外的大車，應確認觀看。可見文字未選物件或目的。

Owner：pending；independent fixture review：pending。

</details>

### Case 50

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：故事裡媽媽先找小熊，媽媽再幫小熊蓋被。
>
> **parent**：你家的媽媽剛才去陽台了。
>

孩子當句：**媽媽**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_033
- **topic**：parent
- **context_type**：ambiguous
- **coverage_category**：keyword_misdirection
- **group_id**：case-033
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你在說故事裡的媽媽，還是想找你媽媽？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能延續故事角色，需談情節；可能找真實照顧者，需談找人。媽媽多次出現仍跨兩referent。

Owner：pending；independent fixture review：pending。

</details>

### Case 51

背景：大人剛說今天搭公車花了十分鐘，沒有描述杯子。

前文（全部在當句之前）：

> **parent**：你的手上黏了顏料，要用水把手洗乾淨嗎？
>
> **child**：要洗手，把黏黏洗掉。
>

孩子當句：**水水**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_028
- **topic**：water
- **context_type**：irrelevant
- **coverage_category**：irrelevant_background
- **group_id**：case-028
- **split**：holdout
- **expected**：SUFFICIENT
- **interpretation**：孩子想用水洗掉手上的顏料。
- **candidate_text**：你想用水把手上的顏料洗掉。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：搭公車背景無關；近前文已建立洗手目的，孩子確認要洗掉黏顏料。水水可合理延續清洗用途，不是cs_v1_002的口渴飲水或只改追加喝一口。候選確認用途，不承諾執行清洗。

Owner：pending；independent fixture review：pending。

</details>

### Case 52

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：睡床、睡袋和睡枕都是睡覺時用的。你要先聽故事嗎？
>
> **child**：不要故事，我想睡了。
>

孩子當句：**睡睡**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_037
- **topic**：sleep
- **context_type**：clear
- **coverage_category**：keyword_misdirection
- **group_id**：case-037
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想睡覺而非聽故事。
- **candidate_text**：你想睡覺了。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：睡字出現很多但不是判定依據；孩子明說排除故事並想睡，文字足以支持主要意思。

Owner：pending；independent fixture review：pending。

</details>

### Case 53

背景：午餐有三支湯匙，這與擁抱沒有關係。

前文（全部在當句之前）：

> **parent**：爸爸想抱你一下，你現在想讓爸爸抱嗎？
>
> **child**：不要，我要自己坐著。
>

孩子當句：**不要**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_029
- **topic**：hug
- **context_type**：irrelevant
- **coverage_category**：irrelevant_background
- **group_id**：case-029
- **split**：holdout
- **expected**：SUFFICIENT
- **interpretation**：孩子現在不想被爸爸抱，想自己坐著。
- **candidate_text**：你現在不想讓爸爸抱，想自己坐著。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：湯匙背景無關；孩子已拒絕爸爸的擁抱，並選自己坐著。當句不要延續明確拒絕，不是cs_v1_004接受媽媽抱的肯定請求，也不是只替換照顧者。

Owner：pending；independent fixture review：pending。

</details>

### Case 54

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：透明杯裡是煮過放涼、沒有甜味的飲料，你口渴想喝嗎？
>
> **child**：口渴，喝杯裡的。
>

孩子當句：**水水**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_042
- **topic**：water
- **context_type**：clear
- **coverage_category**：meaning_without_keyword
- **group_id**：case-042
- **split**：research
- **expected**：SUFFICIENT
- **interpretation**：孩子想喝透明杯裡的飲料。
- **candidate_text**：你想喝透明杯裡的。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：前文無水字但文字指定杯中可飲液體與喝的意圖；候選只確認可見referent，不增加成分或動作承諾。

Owner：pending；independent fixture review：pending。

</details>

### Case 55

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：積木塔疊高會倒，這袋積木也可以放到高架子。
>
> **parent**：你想怎麼弄積木？
>

孩子當句：**高高**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_035
- **topic**：blocks
- **context_type**：ambiguous
- **coverage_category**：keyword_misdirection
- **group_id**：case-035
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想把積木疊高，還是放到高架子？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能要塔更高，確認建造高度；也可能要收袋到高處，確認收納位置。高和積木重複不選定動作。

Owner：pending；independent fixture review：pending。

</details>

### Case 56

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：等一下買蘋果和雞蛋。
>
> **child**：蘋果。
>

孩子當句：**書書**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_023
- **topic**：book
- **context_type**：irrelevant
- **coverage_category**：irrelevant_background
- **group_id**：case-023
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想找書，還是想聽故事？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能想找一本書，確認找物；也可能想聽故事，確認閱讀。購物前文沒有選定書或用途，不能借假定的場外書。

Owner：pending；independent fixture review：pending。

</details>

### Case 57

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：你說娃娃想要被抱，也說你想靠媽媽懷裡。
>
> **parent**：現在是你要抱娃娃，還是媽媽抱你？
>

孩子當句：**抱抱**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_014
- **topic**：hug
- **context_type**：ambiguous
- **coverage_category**：multiple_meanings
- **group_id**：case-014
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想抱娃娃，還是想讓媽媽抱你？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能要自己抱娃娃，回應照顧玩具；也可能要被媽媽抱，回應被抱需求。前文同時支持兩種方向。

Owner：pending；independent fixture review：pending。

</details>

### Case 58

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：睡覺前要把積木收進箱子。
>
> **parent**：我們現在要收積木，然後上床睡。
>

孩子當句：**不要**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_016
- **topic**：sleep
- **context_type**：ambiguous
- **coverage_category**：multiple_meanings
- **group_id**：case-016
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你不要收積木，還是不想睡覺？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：可能拒絕收拾，需釐清整理意願；也可能拒絕睡覺，需釐清休息意願。沒有文字選定拒絕對象。

Owner：pending；independent fixture review：pending。

</details>

### Case 59

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **child**：我只要推紅車。
>
> **parent**：那先玩紅的嗎？
>
> **child**：藍車也要先玩。
>

孩子當句：**車車**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_053
- **topic**：toy_car
- **context_type**：ambiguous
- **coverage_category**：conflicting_context
- **group_id**：case-053
- **split**：research
- **expected**：INSUFFICIENT
- **interpretation**：null
- **candidate_text**：你想先玩紅車，還是藍車？
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_QUESTION
- **rationale**：孩子先說只紅，後又說藍也先，未明確撤回或排好先後；可能先紅或先藍，確認不同待選物件，需追問。

Owner：pending；independent fixture review：pending。

</details>

### Case 60

背景：沒有其他可用背景；只依以下文字判斷。

前文（全部在當句之前）：

> **parent**：你想穿紅色外套嗎？
>
> **child**：要穿紅色那件。
>

孩子當句：**穿穿**

<details>
<summary>展開固定預期、理由與分組</summary>

- **id**：cs_v1_010
- **topic**：clothing
- **context_type**：clear
- **coverage_category**：explicit_reference
- **group_id**：case-010
- **split**：holdout
- **expected**：SUFFICIENT
- **interpretation**：孩子想穿紅色外套。
- **candidate_text**：你想穿紅色外套。
- **expected_input_policy**：COMPANION
- **expected_output_policy**：ALLOW
- **expected_action**：DELIVER_ANSWER
- **rationale**：孩子已選定紅色外套與穿的動作，候選不代人穿衣。

Owner：pending；independent fixture review：pending。

</details>

## Coverage and contrast summary

60案：research40／holdout20；十二topics；54groups（6個相關案例pairs＋48singleton，其中4個pairs跨label）；35 SUFFICIENT／25 INSUFFICIENT是作者完成結果，不是預先答案配額。

| Category | Research | Holdout |
| --- | ---: | ---: |
| explicit_reference | 7 | 3 |
| multiple_meanings | 7 | 3 |
| irrelevant_background | 7 | 3 |
| keyword_misdirection | 7 | 3 |
| meaning_without_keyword | 6 | 4 |
| conflicting_context | 6 | 4 |

| Related group (not every pair crosses labels) | IDs | Split | Topic |
| --- | --- | --- | --- |
| car-play-or-look | cs_v1_001, cs_v1_011 | research | toy_car |
| water-drink-or-use | cs_v1_002, cs_v1_012 | research | water |
| book-sea-reading | cs_v1_008, cs_v1_018 | holdout | book |
| outside-watch-or-go | cs_v1_009, cs_v1_058 | holdout | outside |
| drawing-make-or-show | cs_v1_045, cs_v1_055 | research | drawing |
| book-bedtime-choice | cs_v1_047, cs_v1_057 | holdout | book |

## Acceptance, independent review and freeze gates

| Evidence | State |
| --- | --- |
| Repo plan review | approved; contract only |
| Local structure／CLI／slot checks | 004: 166 checks PASS; not oracle approval |
| Independent technical draft review | 001/002/003 historical; 004 bounded review approved, no blocker; not fixture verdict |
| Owner full60 exact-snapshot acceptance | accepted；本文件頂部記錄本次 Owner 訊息及 004 三份 SHA-256 |
| Independent fixture review after Owner | approved；`/root/v1_fixture_reviewer` 對 004 完成 60 案盲判／複核，無 blocking issues，詳見文件頂部 |
| Matching-evidence sufficiency for freeze | Owner、獨立 Reviewer、validator 均指向 004 三份相同 SHA-256；v0 hash 未變 |
| Freeze | FROZEN；`context_sufficiency_v1`，2026-10-08T03:33:27Z |

Owner 接受與獨立 fixture Reviewer verdict 已按 matching snapshot 記錄。先盲判三個可見欄位、再讀 oracle 的程序、差異複核及 gate 核對詳見文件頂部；技術 draft review 和 commit/push 未代替這些證據。

## Revision and delivery history

- v1-draft-001：預先slots不變，完成60案、独立validator与可讀human包；未呼叫模型。
- Plan已記Owner新publish授權，交未凍結draft→human review，不merge/release。
- Commit／push／PR交付結果另以實際Git與remote結果回報，不預填成功。

## Initial independent technical draft review — 001 (historical)

Reviewer：`/root/plan_reviewer` 切獨立 Reviewer 路徑；讀 python-code-review skill、五個工件與暫存test harness/results。Standalone quality verdict approved／blocking_issues=[]。Typing、lint、readability、error handling、anti-patterns、observability無findings；test quality有一個warning，已處理如下。此技術draft審查不是Owner接受或fixture語義批准，未重新執行工具或宣稱freshhash核驗。

Reviewer 發現初輪名為relative-path的check其harness覆寫為絕對path，因此不能用原check證明相對路徑。已更正上表初輪check名稱，並另在TemporaryDirectory中實際傳入argv `candidate.jsonl`、以該目錄為cwd呼叫絕對validator；觀察exit0、60案、stderr空、candidate bytes不變。新增這一項後共65checks，不重跑已通過且未受影響的其餘檢查。README/dataset/validator snapshot未變。

技術交付 Decision：可依Owner既有授權按topic commit/push供human review，Owner全60接受／後續fixture review／matching freeze gates均pending，NOT FROZEN。

## PR-comment-review-and-fix — v1-draft-002

Decision：六個threads皆ADDRESS，無SKIP項；採可見文字證據修正，不以模型得分選答案。既有slot/group/split不改、case數不改、README不改、v0/E012不改；Owner與fixture review/freeze仍pending。

| Thread | Addressed change | Verification |
| --- | --- | --- |
| [4203001851](https://github.com/a129924/coami/pull/12#discussion_r4203001851) | 049改成孩子主動陪小熊玩偶，非被媽媽抱 | 角色／目的不同；hug slot與keyword缺席保留 |
| [4203001893](https://github.com/a129924/coami/pull/12#discussion_r4203001893) | loader讀physical file lines，不用splitlines | Unicode LF/CRLF与physical line2回歸 |
| [4203003244](https://github.com/a129924/coami/pull/12#discussion_r4203003244) | 058保留原文字，改S，先留窗邊看 | 主要解讀、candidate、rationale、Action同步 |
| [4203003248](https://github.com/a129924/coami/pull/12#discussion_r4203003248) | 054保留原文字，改S，拒絕故事 | 不假設立即反悔唱歌，候選只確認故事拒絕 |
| [4203003251](https://github.com/a129924/coami/pull/12#discussion_r4203003251) | 055保留原文字，改S，先看媽媽作品 | 明確先後不硬改成未解歧義 |
| [4203003254](https://github.com/a129924/coami/pull/12#discussion_r4203003254) | 050改成繼續自己剝橘子，非追加吃一份 | 準備活動／吃的目的不同；food slot不變 |

Review packet与snapshot已同步；舊001內容保留於Git commit與上述歷史證據。留言／resolve待修正commit已push後執行；不預稱遠端thread已關閉。

## Previous bounded technical re-review — 002 (historical)

Reviewer：`/root/plan_reviewer`，針對PR12六個threads以python-code-review path唯讀重審，verdict approved／blocking_issues=[]，七quality維度無findings。核對六項修正、physical-line loader、88checks證據（未run工具）、60slots不變、全60案human packet逐欄一致，重新計算current三hash均符合002。v0三hash與baseline一致，v0/E012無變更。只核對bounded thread論點，不是全量fixture語義review，不批准Owner接受或freeze。

Decision：技術修正可進publish；本輪commit訊息仍須Owner明確確認，之後commit→push→逐thread回覆／resolve。未先留言或關閉thread，未merge或release。

## PR-comment-review-and-fix — round 2 / v1-draft-003

| Thread | Triage | Change |
| --- | --- | --- |
| [4203589184](https://github.com/a129924/coami/pull/12#discussion_r4203589184) | ADDRESS | 028以水洗手、029拒絕被抱，與002飲水／004接受被抱不同；固定slots與分組不變 |
| [4203589187](https://github.com/a129924/coami/pull/12#discussion_r4203589187) | ADDRESS | 每turn恰含speaker/text，所有其他key拒絕；README schema、validator與回歸同步 |

README新hash反映shape契約修正，不是重新配置slots；舊baseline與001/002 snapshot、驗證及review保留。全60human包更新到003，Owner／fixture／freeze pending。第一輪六threads已在e54907c推送後留言並resolve；本輪兩thread回覆／resolve待003的commit已push才執行，不預填遠端成功。

## Independent bounded technical review — 003

Reviewer：`/root/plan_reviewer` 依python-code-review唯讀檢查本輪兩threads修正，verdict approved／blocking_issues=[]，七quality維度無findings。核對028洗手用途與029拒絕擁抱、turn只允許speaker/text且缺欄仍拒絕、README/plan相符；重新核對003三hash、全部60案human包逐欄一致、60slots及README slotrows與e54907c相同、v0/E012 diff無變更、122check entries與record一致。未執行tests/lint，不是全量fixture語義審查。

Decision：本輪技術修正可進publish；待Owner明確確認本輪commit訊息後commit/push，再對兩個threads留言resolve。Owner接受／fixture review/freeze仍pending，不將關thread當oracle接受。

## PR-comment-review-and-fix — round 3 / v1-draft-004

| Thread | Triage | Change |
| --- | --- | --- |
| [4203799302](https://github.com/a129924/coami/pull/12#discussion_r4203799302) | ADDRESS | 頂層schema allowlist，拒絕所有額外key，含模型觀察及快取預測 |
| [4203799313](https://github.com/a129924/coami/pull/12#discussion_r4203799313) | ADDRESS | 036保留可見文字，按畫畫動作更正S／自己作畫，不將媽媽作品同字當同等意思 |
| [4203799324](https://github.com/a129924/coami/pull/12#discussion_r4203799324) | ADDRESS | 044改為洗掉袖口果汁，與010穿紅外套實質用途不同，前文仍無衣字 |

003兩threads已於29f5460推送後回覆resolve；本輪三threads待修正commit/push後才回覆resolve。歷史hash／驗證／review保留，004全60human包同步；Owner接受／fixture review／freeze仍pending。

## Independent bounded technical re-review — 004

Reviewer：`/root/plan_reviewer` 依python-code-review進行唯讀獨立審查，verdict approved／blocking_issues=[]，七品質維度無findings。核驗頂層REQUIRED_FIELDS allowlist與README/plan一致，036可見文字未改且自己作畫oracle回應thread，044清洗袖口果汁與010穿衣目的不同、前文無衣字。004三hash相符、60packet逐欄一致、全部60slots與003相同、v0/E012無diff；166checks記錄／entries與harness一致。未執行tests/lint，不代替Owner接受或全60fixture語義審查。

Decision：bounded技術修正可進publish。依AGENTS.md仍待Owner明確確認本輪commit訊息，再commit→push→三threads回覆resolve；Owner／fixture／freeze pending。
