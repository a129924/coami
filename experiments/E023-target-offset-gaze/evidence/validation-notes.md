# Validation boundary

- Python: 25 pure tests, strict Pyright, Ruff lint/format pass.
- TypeScript: 10 pure tests, strict compiler checks and Vite production build pass.
- MOD contract: 2 tests execute E023 MOD with explicit Piu/Timer/Time/Robot substitutes; not WASM evidence.
- Actual loopback WebSocket smoke and headless fail-closed Browser smoke pass. Preview and test server are stopped by their runners.
- Original pinned SDK source and dev working tree remain unchanged.
- Missing exact WASM host is a real execution blocker: probe and all 15 closed-loop cases remain unexecuted. No SDK convergence is claimed.
- Git reported `Can't find lefthook in PATH` during the implementation commit; commit succeeded. No hook installation or bypass configuration was performed. Explicit scoped checks above are the recorded validation, not a claimed hook pass.
- Archify: deterministic showcase checks and all four desktop containment measurements pass. Four light/dark extreme-size captures were visually inspected by Codex; automated visualReview remains pending as required by the tool, separate visual-review.json records inspection.
- Graphify: pinned 0.9.73 identified; no usable graph in the bounded search, so source fallback used without graph creation.
- Terminal text evidence normalizes trailing whitespace only; pass/fail messages and measurements are preserved.
