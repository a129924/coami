# E013 experiment record

## Question

Under fixed Context Sufficiency conditions, how does Jev classify frozen v1 research/holdout cases and the frozen v0 comparison, and can every observation be traced to a complete raw response for later analysis?

## Procedure

Implement and verify the offline runner in the separate `feat/andrew/e013-context-evaluation` worktree. Before any live execution, require exact v1 Owner acceptance, independent fixture review and freeze, v0 hash checks, validators, pinned SDK, credential presence, Owner-selected local staging policy, and separate live authorization. The run order is research 40, holdout 20, v0 15, with one Context call each and no retry. Capture HTTP bytes before SDK parsing, then review each case for sensitive content before any Git publication.

## Evidence

The Owner accepted all 60 answers for exact `v1-draft-004` and clarified that the human review was their own. The v1 `review.md` records the message and matching README/dataset/validator SHA-256 values. Independent fixture review remains pending, so v1 is **NOT FROZEN**; no freeze attestation exists. The Owner selected `/Users/andrew/coami-evidence/E013/runs/<run_id>/` for local evidence. The directory was created with owner-only permissions; no run exists. The tracked policy explicitly states that the local directory is neither immutable nor backed up. E012 Git evidence contains case-level choices/confidence/probabilities and summaries, but no exact HTTP body bytes. No E013 live result exists.

Offline verification on 2026-10-07 in the E013 feature worktree used Python 3.12.12 and the locked `typesafe-sdk==0.7.2`: 11/11 unittest cases passed, Ruff lint and format checks passed, and both v0 and v1 structure validators passed. The fake HTTP transport checked complete 2xx body bytes (including unknown fields), actual request projection, non-2xx exclusion, SDK validation behavior, and a response-write failure. Preflight testing proved a missing key causes zero SDK constructions. A synthetic reviewed-export test checked byte hashes, an inaccessible restricted case, clean-checkout recomputation, and tamper detection. These are implementation checks, not Jev outcomes or evidence that v1 answers are accepted.

The follow-up local-storage revision on 2026-10-07 passed 12/12 offline tests, Ruff lint/format, and both structure validators. Tests now check the honest `local_staging` policy, point-in-time local hash verification, and tamper detection. The v1 three source SHA-256 values still match `v1-draft-004`; no oracle file changed. No live Jev call was made. These checks do not supply the missing independent fixture verdict or backup guarantee.

The selected local root and its `runs/` directory were created with mode 0700 and contain no run. A read-only store-policy preflight against the actual path returned `local_staging`, `versioned_immutable: false`, `backup_verified: false`, and `retention_until: null`. This check needed filesystem permission outside the repository sandbox; it did not load a credential, construct an SDK client, or call Jev.

## Decision

Live E013 remains blocked until independent fixture review and v1 freeze are recorded and the Owner separately authorizes the call. Local evidence is only staging; after a future run, per-case safety-reviewed bytes and rows must be exported, verified, committed and pushed before calling them versioned, remotely retrievable evidence. Restricted-only objects remain local without a durability claim. No Jev score or pass threshold is selected here. Later threshold work may derive a candidate from research and inspect holdout independently while preserving the original model outputs and oracle.
