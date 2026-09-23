# E002 TypeScript TDD forward-test transcript

## Record identity

- Date: 2026-09-22 (Asia/Taipei).
- Agent task: `/root/ts_tdd_forward_retest`.
- Feature commit under review when dispatched: `ffccbc05a5694e2cc85910da4cd789f2639e159f` plus the uncommitted review fixture setup described in `EXPERIMENT.md`.
- Skill read from `.codex/skills/typescript-tdd/SKILL.md`; its SHA-256 was `bb65eb2c6eddb5abaa3dfddb8a02fd648c5e1be10ea2d5c9cc9285cefc45365a`.

This file preserves the prompt, ordered tool record, and final agent report from the forward-test session. Tool chunk IDs are session-local locators; the commands, exit codes, changed test, and saved RED/GREEN output are the durable record.

## Dispatch prompt

```text
請在 feature worktree `/Users/andrew/code/python/coami-typescript-tdd-skill` 的 `experiments/E002-agent-skills-validation/tdd-fixture/` 使用 repo 的 `typescript-tdd` skill 完成此行為：`add(a, b)` 對有限數值應回傳算術和，包括結果小於零的情況。保留現有測試，補足必要的行為驗證。僅修改 E002 fixture 的程式、測試與測試輸出；不要修改 skill、`EXPERIMENT.md`、device 產品程式碼、dev/E003 worktree，也不要執行 Git workflow。完成後依 skill 回報測試邊界、可歸因的失敗證據、完成後驗證，以及實際使用的 skill 路徑與命令。
```

The prompt names the skill and observable behavior. It does not prescribe the test case, RED/GREEN operations, runner, compiler flags, implementation, or expected exit codes.

## Ordered tool record

1. **Read the skill.** `cat .codex/skills/typescript-tdd/SKILL.md` returned the full skill text, exit 0, tool chunk `307c67`.
2. **Add the behavior test.** The agent used `apply_patch` to add `add(-3, 1) === -2` while retaining the two existing cases. `apply_patch` returned no chunk ID; the following file read was chunk `3be1dc`.
3. **Confirm RED.** The agent ran `node --test experiments/E002-agent-skills-validation/tdd-fixture/add.test.ts`, saved the human-readable output now tracked as `tdd-fixture/red.txt`, and received exit 1, chunk `20db4b`. The existing cases passed; only the new case failed with `0 !== -2`.
4. **Apply the minimum implementation.** The agent used `apply_patch` to replace `Math.max(0, a + b)` with `a + b`. The following file read was chunk `06755f`.
5. **Confirm GREEN.** The agent reran the same test command, saved the output now tracked as `tdd-fixture/green.txt`, and received exit 0, chunk `aa485d`: 3 passed, 0 failed.
6. **Run strict fixture typecheck.** The agent invoked the repository's TypeScript 7.0.2 compiler with `--strict --noEmit` plus the Node test module options recorded in `EXPERIMENT.md`. It returned exit 0 with no diagnostics, chunk `a8a838`.

## Final agent report

```text
已在 feature worktree 的 E002 fixture 完成 `add(a, b)` 負和行為，保留原有兩個測試，新增 `add(-3, 1) === -2`。實作改為 `return a + b`，並更新 red 與 green 測試輸出。

使用的 skill：`/Users/andrew/code/python/coami-typescript-tdd-skill/.codex/skills/typescript-tdd/SKILL.md`，以 `cat .codex/skills/typescript-tdd/SKILL.md` 讀取，退出碼 0。測試邊界是 E002 的 `add.ts` 與 `add.test.ts`。

- RED：Node 24 執行 `node --test experiments/E002-agent-skills-validation/tdd-fixture/add.test.ts`，退出碼 1；原有兩例通過，新增案例因 `0 !== -2` 失敗。
- GREEN：同一命令退出碼 0；3 passed、0 failed。
- Strict typecheck：TypeScript 7.0.2 對 `add.ts` 與 `add.test.ts` 執行 `--strict --noEmit`，退出碼 0，無診斷。

未執行 commit、push 或其他 Git workflow。
```

## Audit limits

This transcript persists what the dispatched agent and its tool results reported. Together with the exact prompt, final diff, and saved RED/GREEN output, it makes the claimed skill read and operation order reviewable outside the original session. It does not prove the skill caused the choices; E002 therefore limits its conclusion to successful use of the skill in this isolated workflow and makes no causal comparison against an agent without the skill.
