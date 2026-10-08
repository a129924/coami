# E013 Jev Context Sufficiency evaluation

E013 evaluates the frozen 60-case v1 research/holdout benchmark and the frozen 15-case v0 comparison with one Context Sufficiency call per case. It records raw model observations and does not select a pass threshold. This directory is an experiment, not a production service.

## Current gate

The exact `v1-draft-004` 60-case snapshot has Owner human acceptance and an independent fixture verdict recorded in its `review.md`. The matching snapshot is **FROZEN** as `context_sufficiency_v1`; [freeze-attestation.json](../../evaluation/context_sufficiency/versions/v1/freeze-attestation.json) binds the review and three source files by SHA-256. No live Jev run is authorized yet. The Owner selected local E013 storage, but that directory is only local staging until reviewed evidence is committed and pushed.

## Inputs and conditions

- Python 3.12, `typesafe-sdk==0.7.2`, model `jev-1.13.0`, 30-second I/O timeout, zero automatic retries, SDK logger disabled.
- The Context question is read without modification from E012 `policies.json`; its hash is recorded. Only `background`, `conversation`, and `utterance` reach Jev. Case ID, split, oracle, rationale, candidate, and threshold remain evaluator-only.
- The fixed run order is v1 research 40, v1 holdout 20, then v0 15. Calls are sequential. E013 does not run Input/Output Policy, route an Action, or generate an answer.
- The tracked freeze attestation contains `owner_accepted_60: true`, `fixture_review_approved: true`, `frozen: true`, the SHA-256 of the exact `review.md`, and a `v1_hashes` object keyed by `README.md`, `context_sufficiency_v1.jsonl`, `validate_dataset.py`. The runner checks the files, current review status, frozen v0 hashes, both validators, 75-case inventory, SDK version, and key before any call. The attestation records the separate human decisions; it does not authorize a live call.
- [local-store-policy.json](local-store-policy.json) records the Owner-selected `/Users/andrew/coami-evidence/E013` root. It says `storage_mode: local_staging`, `versioned_immutable: false`, `backup_verified: false`, and `retention_until: null`; these are deliberate facts, not a claim of durable or immutable backup. Only Owner-authorized local processes may read it. The preflight checks the exact root and policy, then uses `runs/<run_id>/` with exclusive creation. A read-only mode after completion and SHA-256 checks detect or discourage changes but cannot stop the local owner from altering or deleting evidence.

## Offline validation

From the repository root after `uv sync --locked --project experiments/E013-jev-context-sufficiency`:

```sh
experiments/E013-jev-context-sufficiency/.venv/bin/python -m unittest discover -s experiments/E013-jev-context-sufficiency/tests -v
python evaluation/context_sufficiency/validate_dataset.py
python evaluation/context_sufficiency/versions/v1/validate_dataset.py
ruff check experiments/E013-jev-context-sufficiency
ruff format --check experiments/E013-jev-context-sufficiency
```

The tests use fake HTTP transport and synthetic responses. They do not measure Jev.

## Future live execution and evidence review

Only after the Owner separately authorizes a live run and its remaining preflight inputs are ready:

```sh
uv run --quiet --locked --project experiments/E013-jev-context-sufficiency \
  --env-file experiments/E013-jev-context-sufficiency/.env \
  python experiments/E013-jev-context-sufficiency/jev_context.py --live \
  --freeze-attestation evaluation/context_sufficiency/versions/v1/freeze-attestation.json \
  --store-policy experiments/E013-jev-context-sufficiency/local-store-policy.json \
  --store-root /Users/andrew/coami-evidence/E013
```

`.env` is an Owner-maintained, Git-ignored local credential file. Never print, hash, or commit it. The freeze attestation path above is tracked and verified; the local store path is approved for staging, not backed-up archival storage. The example command is documentation, not permission to execute it now.

The runner writes an exclusive `runs/<run_id>/` in the local store: `manifest.json`, `events.jsonl`, `analysis.jsonl`, `summary.json`, exact emitted request bytes, and exact 2xx response bytes. Each body is keyed by `(run_id, group, case_id)` and has a SHA-256. A failed or interrupted run remains incomplete and is never overwritten or automatically resumed. `ERROR`, `UNKNOWN`, and `NOT_RUN` do not count as correct model predictions. Verify the local bytes after each run with `--verify-local-run --run-dir /Users/andrew/coami-evidence/E013/runs/<run_id>`; a clean verification is a point-in-time integrity check, not a backup.

`private-evidence/` is ignored temporary staging only. After a local integrity check, a reviewer must inspect **each case's** exact analysis row and body for unexpected sensitive content, recording `safety_checked: true`, each exact analysis/body SHA-256, and `analysis_public`/`raw_public` decisions in an approval JSON with all 75 cases and `summary_public: true`. API keys, authentication headers, non-2xx error bodies, and raw tracebacks must never enter Git. Run `--publish-reviewed --run-dir <local-run> --approval <review.json>` only after that review. The tool checks all local hashes before creating the exclusive `evidence/runs/<run_id>/` Git output. Approved raw files are copied byte-for-byte; unapproved full rows and bodies remain local. Commit and push the reviewed evidence as a separate versioned topic; until then, the run is **local and unbacked**. If any case cannot be published, the Git index records a gap and later Agents need authorized local access to verify it. The index records stable relative locators, store ID, run version, hashes, access limits, and the absence of a retention promise.

From a clean checkout, `--verify-evidence --evidence-run <tracked-run> [--restricted-run <authorized-run>]` checks available objects and reports explicit gaps. Future threshold research may use the full research rows to propose candidates, then examine holdout separately, especially `INSUFFICIENT → SUFFICIENT`; E013 itself does not choose a threshold. A single mutable local directory has no independent retention or immutability guarantee, even after chmod; Git publication makes only the reviewed subset versioned and remotely retrievable.

## Interpretation

The summary reports planned/attempted/valid/invalid/error/unknown/not-run counts, both error directions, and `correct/valid` separately from `correct/planned` for research, holdout, and v0. E012's earlier v0 result remains historical. A PR merge, technical check, or successful offline test does not freeze v1 or establish a product pass.
