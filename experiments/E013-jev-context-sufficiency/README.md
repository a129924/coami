# E013 Jev Context Sufficiency evaluation

E013 evaluates the frozen 60-case v1 research/holdout benchmark and the frozen 15-case v0 comparison with one Context Sufficiency call per case. It records raw model observations and does not select a pass threshold. This directory is an experiment, not a production service.

## Current gate

The v1 dataset at `origin/dev` is `v1-draft-004`, Owner acceptance and independent fixture review are pending, and `review.md` says **NOT FROZEN**. No live Jev run is permitted yet. The repository also has no Owner-approved durable restricted evidence store. Both gates must be resolved before `--live`.

## Inputs and conditions

- Python 3.12, `typesafe-sdk==0.7.2`, model `jev-1.13.0`, 30-second I/O timeout, zero automatic retries, SDK logger disabled.
- The Context question is read without modification from E012 `policies.json`; its hash is recorded. Only `background`, `conversation`, and `utterance` reach Jev. Case ID, split, oracle, rationale, candidate, and threshold remain evaluator-only.
- The fixed run order is v1 research 40, v1 holdout 20, then v0 15. Calls are sequential. E013 does not run Input/Output Policy, route an Action, or generate an answer.
- A future freeze attestation JSON must contain `owner_accepted_60: true`, `fixture_review_approved: true`, `frozen: true`, the SHA-256 of the exact `review.md`, and a `v1_hashes` object keyed by `README.md`, `context_sufficiency_v1.jsonl`, `validate_dataset.py`. The runner checks the files, current review status, frozen v0 hashes, both validators, 75-case inventory, SDK version, and key before any call. The attestation is evidence of human decisions, not a substitute for those decisions.
- A future store-policy JSON must identify an Owner-approved absolute `root`, `store_id`, `approved_by`, `agent_access`, `retention_until`, and `versioned_immutable: true`. The root must be outside the repository and temporary directories and already be writable. An Owner must choose the actual durable location, access rules, and retention policy. No default store is inferred.

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

Only after the freeze, store, and separate live-execution authorization:

```sh
uv run --quiet --locked --project experiments/E013-jev-context-sufficiency \
  --env-file experiments/E013-jev-context-sufficiency/.env \
  python experiments/E013-jev-context-sufficiency/jev_context.py --live \
  --freeze-attestation /approved/freeze-attestation.json \
  --store-policy /approved/store-policy.json \
  --store-root /approved/durable-store
```

`.env` is an Owner-maintained, Git-ignored local credential file. Never print, hash, or commit it. The example paths above are placeholders for a later Owner decision, not an approved destination.

The runner writes an exclusive `runs/<run_id>/` in the approved store: `manifest.json`, `events.jsonl`, `analysis.jsonl`, `summary.json`, exact emitted request bytes, and exact 2xx response bytes. Each body is keyed by `(run_id, group, case_id)` and has a SHA-256. A failed or interrupted run remains incomplete and is never overwritten or automatically resumed. `ERROR`, `UNKNOWN`, and `NOT_RUN` do not count as correct model predictions.

`private-evidence/` is ignored temporary staging only. A reviewed export may be placed under `evidence/runs/<run_id>/` in Git. An Owner review JSON must list all 75 cases and each exact analysis/body hash, with `analysis_public` and `raw_public` decisions, plus `summary_public: true`. Run `--publish-reviewed --run-dir <restricted-run> --approval <review.json>` only after reviewing the content. Approved raw files are copied byte-for-byte; restricted full rows and bodies remain in the durable store. The public manifest records stable relative locators, store ID, run version, hashes, access rules, and retention. A sanitized index never stands in for the full row or raw body.

From a clean checkout, `--verify-evidence --evidence-run <tracked-run> [--restricted-run <authorized-run>]` checks available objects and reports explicit gaps. Future threshold research may use the full research rows to propose candidates, then examine holdout separately, especially `INSUFFICIENT → SUFFICIENT`; E013 itself does not choose a threshold.

## Interpretation

The summary reports planned/attempted/valid/invalid/error/unknown/not-run counts, both error directions, and `correct/valid` separately from `correct/planned` for research, holdout, and v0. E012's earlier v0 result remains historical. A PR merge, technical check, or successful offline test does not freeze v1 or establish a product pass.
