# E013 experiment record

## Question

Under fixed Context Sufficiency conditions, how does Jev classify frozen v1 research/holdout cases and the frozen v0 comparison, and can every observation be traced to a complete raw response for later analysis?

## Procedure

Implement and verify the offline runner in the separate `feat/andrew/e013-context-evaluation` worktree. Before any live execution, require exact v1 Owner acceptance, independent fixture review and freeze, v0 hash checks, validators, pinned SDK, credential presence, Owner-selected local staging policy, and separate live authorization. The run order is research 40, holdout 20, v0 15, with one Context call each and no retry. Capture HTTP bytes before SDK parsing, then review each case for sensitive content before any Git publication.

## Evidence

The Owner accepted all 60 answers for exact `v1-draft-004` and clarified that the human review was their own. Independent Reviewer `/root/v1_fixture_reviewer` subsequently completed a blind 60-case fixture review, accepted four initial disagreements after checking the visible text and rationale, and returned `approved` with no blockers. The v1 `review.md` records both decisions and matching README/dataset/validator SHA-256 values. The tracked freeze attestation also hashes that review; `load_freeze` accepted it without any SDK call. The Owner selected `/Users/andrew/coami-evidence/E013/runs/<run_id>/` for local evidence. The tracked policy explicitly states that the local directory is neither immutable nor backed up. E012 Git evidence contains case-level choices/confidence/probabilities and summaries, but no exact HTTP body bytes.

Offline verification on 2026-10-07 in the E013 feature worktree used Python 3.12.12 and the locked `typesafe-sdk==0.7.2`: 11/11 unittest cases passed, Ruff lint and format checks passed, and both v0 and v1 structure validators passed. The fake HTTP transport checked complete 2xx body bytes (including unknown fields), actual request projection, non-2xx exclusion, SDK validation behavior, and a response-write failure. Preflight testing proved a missing key causes zero SDK constructions. A synthetic reviewed-export test checked byte hashes, an inaccessible restricted case, clean-checkout recomputation, and tamper detection. These are implementation checks, not Jev outcomes or evidence that v1 answers are accepted.

The follow-up local-storage revision on 2026-10-07 passed 12/12 offline tests, Ruff lint/format, and both structure validators. Tests now check the honest `local_staging` policy, point-in-time local hash verification, and tamper detection. The v1 three source SHA-256 values still match `v1-draft-004`; no oracle file changed. No live Jev call was made. These checks do not supply the missing independent fixture verdict or backup guarantee.

The selected local root and its `runs/` directory were created with mode 0700 and contain no run. A read-only store-policy preflight against the actual path returned `local_staging`, `versioned_immutable: false`, `backup_verified: false`, and `retention_until: null`. This check needed filesystem permission outside the repository sandbox; it did not load a credential, construct an SDK client, or call Jev.

## Decision

The Owner explicitly authorized the live run on 2026-10-08 after the freeze and separate preflight. The existing E012 credential file was loaded read-only without copying or logging its value; the dev worktree was not modified. `20261008T035450Z-010364d7` ran the fixed 40 research, 20 holdout, 15 v0 order with `jev-1.13.0`, `typesafe-sdk==0.7.2`, 30-second timeout and no retries. All 75 calls produced byte-exact 2xx bodies and VALID rows; local integrity verification found 75 verified cases and zero gaps.

Per-case safety review checked all 75 original bodies, emitted requests and full analysis rows against their SHA-256 values, parsed equality and the expected response shape. Every body contained only `model`, `usage` and a Context choice with both probabilities and confidence; no free-text field, credential echo, authentication marker, raw error body or traceback was found. All 75 bodies and rows were approved for Git export; [review.json](evidence/runs/20261008T035450Z-010364d7/review.json) records each decision and exact hash. The reviewed [run directory](evidence/runs/20261008T035450Z-010364d7) contains 75 raw bodies plus manifest, analysis, summary and review. The Git export verifier recomputed 75 cases with zero gaps; this paragraph does not claim a commit, push or separate clean-checkout check.

Observed raw choices only: research 35/40 correct, holdout 17/20, v0 14/15. `INSUFFICIENT → SUFFICIENT` occurred in research 016, 031, 053; holdout 040; and v0 `toy_car_ambiguous_001`. Other errors were research 036, 054 and holdout 038, 050. E012 history remains untouched. This is descriptive evidence, not a pass decision or a chosen probability threshold. The local restricted run is still unbacked; the reviewed Git subset becomes versioned and remotely retrievable only after commit and push.
