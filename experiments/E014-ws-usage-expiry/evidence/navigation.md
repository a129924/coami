# E014 navigation evidence

- Source baseline: `7b5772483a8cc62cdcb959d475a1a15ebbe98053`.
- Managed worktree: `/private/tmp/coami-e014-ws-usage-expiry`.
- Graphify mode: existing-graph queries only; no graph build authorized.
- No `graphify-out/graph.json` exists in the selected baseline/worktree. Graphify query was not run against a fabricated or stale graph. No graph/cache/version stamp was written.
- Fallback: targeted reads of E003/E004 wire contracts, E004 Python dependency manifest and TypeScript package/tsconfig, and the shared topic/workflow contracts.
- Runtime verified with `GRAPHIFY_NO_AUTO_REFRESH=1 /Users/andrew/.local/bin/graphify --version`: graphify 0.9.73. Source relationships are checked against actual files, not inferred graph edges.

PR Lens is a local-only comprehension map of the actual bounded diff. Its graph and rendered files live outside the repository; it does not publish or attach assets to the Draft PR.
