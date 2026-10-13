# PR #17 comment review and fixes

Date: 2026-10-13. Reviewed head: e4ef84551dd1034b0bcb75c2625d6227867d90bd. Worktree: E017 feature worktree only; owner authorized commit/push, thread replies and resolution. All five suggestions were necessary; none dismissed.

| Thread | Finding and resulting behavior | Verification |
|---|---|---|
| [4255699457](https://github.com/a129924/coami/pull/17#discussion_r4255699457) | README now links runtime/TOOLCHAIN.md with exact clone/checkout, tool builds, emsdk install/activate and environment commands; no E015 dependency for fresh setup | Pinned source makefiles/CMake/release map inspected; all shell blocks bash -n PASS. Complete cold acquisition/build not run, clearly disclosed |
| [4255699463](https://github.com/a129924/coami/pull/17#discussion_r4255699463) | pagehide aborts startup, clears timeout/disposes engine and disables input; persisted pageshow starts a new session | Regression failed before fix, passes after; new bridge is ready and accepts/cleans a raw stroke. VM/DOM boundary, not actual browser bfcache evidence |
| [4255699470](https://github.com/a129924/coami/pull/17#discussion_r4255699470) | standalone MOD build removes stale archive, checks SDK checkout/gitlink/cleanliness and runtime source pin before importing builder | Shared guard with runtime staging; real temporary Git fixtures run the actual standalone build entrypoint and reject dirty/moved/gitlink/runtime-provenance mismatch before builder import, removing a seeded stale archive on every rejection. npm run mod succeeds with valid pin; archive/source hashes unchanged |
| [4255699475](https://github.com/a129924/coami/pull/17#discussion_r4255699475) | timeout aborts fetch, invalidates old session/disposes engine and immediately enables restart, even if old await ignores abort | Fetch and engine.start deferred regressions failed before fix; fresh restart succeeds before old completion, late completion cannot replace/dispose the new session |
| [4255699481](https://github.com/a129924/coami/pull/17#discussion_r4255699481) | new session resets displayed provenance and expected MOD hash before first await | Regression failed before fix, passes with verification deliberately left pending |

Validation: 28 tests PASS, strict web/MOD TypeScript + Vite build PASS (existing chunk-size warning), standalone MOD build PASS (2203-byte XS archive). Existing runtime/MOD provenance remains unchanged. No SDK gesture algorithm/threshold, original vendor, E016 or production modifications. No extra human verification or cold toolchain rebuild is claimed. Original successful operator traces remain historical and untouched.

Delivery is by topic commits: startup/lifecycle, MOD provenance guard, then reproduction/review evidence. Replies will reference pushed commits before resolving corresponding threads. Resolution acknowledges addressed comments; it is not reviewer approval or merge authorization.
