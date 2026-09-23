# Stage 1 — A event from Context to browser bridge

## Environment
- Date: 2026-09-22 Asia/Taipei; observed firmware trace at 2026-09-22T08:48:53.283Z.
- Worktree: `/Users/andrew/code/python/coami-e003-robot-event-loop`, branch `feat/andrew/e003-robot-event-loop` at base `4573716`.
- Stack-chan submodule: `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`.
- Node.js 24.19.0, npm with E003 lockfile. Chrome local browser at `http://127.0.0.1:5173/`. No Server process was started for this run.
- Pinned `mc.js` and `mc.wasm` were copied from E001's local generated assets; E003 `npm run prepare:poc` independently verified both SHA-256 values and built `coami-mod.xsa`.

## Procedure
1. Run `npm ci`, `npm run prepare:poc`, and `npm run build` in E003 `web/`, using Node 24.
2. Run `npm run dev`; open the E003 local page. Wait until it displays `已啟動，MOD 已安裝`.
3. Click `在 simulator 按 A` exactly once, then wait longer than the simulator's 120 ms release delay.
4. Read the browser event list, bridge status, and captured console trace.

## Same-run raw observations
Browser event list after one A click, newest first:

```text
Bridge 接收 #1：kind=button name=a pressed=true
MOD trace: COAMI_EVENT|button|a|pressed
[bridge] Host.Button.a pushed
使用者按 A：engine.pushButton(a)
Stack-chan simulator 已啟動；等待 A 按鍵
```

Chrome console captured:

```text
[firmware] COAMI_EVENT|button|a|pressed
timestamp: 2026-09-22T08:48:53.283Z
```

After release, `#bridge-status` remained `已收到 1 筆：kind=button name=a pressed=true` and the event list still had exactly one `Bridge 接收 #1`. The MOD source emits the marker only inside the runtime `robot.input.button.a.onEvent` pressed callback. E003 Stage 1 `web/src/main.ts` fetches only the same-origin MOD archive, has no Server WebSocket or API request, and never calls C/B; the observed page had no greet/result.

## Build evidence
- `npm run prepare:poc`: both WASM SHA-256 checks passed; XS archive built (790 bytes).
- `npm run build`: TypeScript checks and Vite production build passed. Vite reported a non-blocking large chunk warning.
- Node 26 was the initial system default and emitted an engine warning during `npm ci`; all prepare/build commands were run with installed Node 24.19.0.

## Independent Tester repeat
Tester opened the E003 page in a separate Chrome run, waited for MOD installed, clicked A once, and rechecked after 500 ms (>120 ms release). It again showed the same four-item A → Host.Button → MOD trace → bridge receipt chain, with exactly one receipt and one console `[firmware] COAMI_EVENT|button|a|pressed` at 2026-09-22T08:50:55.831Z. No `COAMI_RESULT` or visible greet appeared. Source inspection confirmed no Server transport; a network capture was not taken. Tester recommended Stage 1 PASS without editing files.

## Gate
PASS（2026-09-22）：獨立 Reviewer 檢查最新版 evidence、MOD A callback、bridge parser 與 upstream simulator 路徑，確認兩次實際 simulator run 均為單次 A → Host.Button A → MOD trace → bridge receipt，release 後僅一筆；無 Stage 1 blocker。EXPERIMENT.md 已記 PASS，Stage 2 可依計畫啟動。


## Final app reproduction mode
After Stage 2 was added, the final web app retained a separate `/?stage=1` mode. On 2026-09-22, it was rechecked in Chrome: Server status displayed `Stage 1：不連線`; one A click produced Host.Button A, MOD marker, one bridge receipt, and `事件未送 Server`, with no greet or command. This preserves the isolated Stage 1 procedure in the final code.
