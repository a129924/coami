# E013 experiment record

## Question

Under fixed Context Sufficiency conditions, how does Jev classify frozen v1 research/holdout cases and the frozen v0 comparison, and can every observation be traced to a complete raw response for later analysis?

## Procedure

Implement and verify the offline runner in the separate `feat/andrew/e013-context-evaluation` worktree. Before any live execution, require exact v1 Owner acceptance, independent fixture review and freeze, v0 hash checks, validators, pinned SDK, credential presence, and an Owner-approved durable restricted store. The run order is research 40, holdout 20, v0 15, with one Context call each and no retry. Capture HTTP bytes before SDK parsing, then review content before any Git publication.

## Evidence

Current v1 review says `v1-draft-004`, Owner human-check pending, independent fixture review pending, **NOT FROZEN**. E012 Git evidence contains case-level choices/confidence/probabilities and summaries, but no exact HTTP body bytes. E013 offline test output and code review will be recorded before publication. No E013 live result exists.

Offline verification on 2026-10-07 in the E013 feature worktree used Python 3.12.12 and the locked `typesafe-sdk==0.7.2`: 11/11 unittest cases passed, Ruff lint and format checks passed, and both v0 and v1 structure validators passed. The fake HTTP transport checked complete 2xx body bytes (including unknown fields), actual request projection, non-2xx exclusion, SDK validation behavior, and a response-write failure. Preflight testing proved a missing key causes zero SDK constructions. A synthetic reviewed-export test checked byte hashes, an inaccessible restricted case, clean-checkout recomputation, and tamper detection. These are implementation checks, not Jev outcomes or evidence that v1 answers are accepted.

## Decision

Live E013 remains blocked until the v1 freeze and durable store decisions are completed. No Jev score or pass threshold is selected here. Later threshold work may derive a candidate from research and inspect holdout independently while preserving the original model outputs and oracle.
