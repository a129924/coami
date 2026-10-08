# E013 Jev Context Sufficiency evaluation

E013 evaluates the frozen 60-case v1 research/holdout benchmark and the frozen 15-case v0 comparison with one Context Sufficiency call per case. It records raw model observations and does not select a pass threshold. This directory is an experiment, not a production service.

## Current gate

The exact `v1-draft-004` 60-case snapshot has Owner human acceptance and an independent fixture verdict recorded in its `review.md`. The matching snapshot is **FROZEN** as `context_sufficiency_v1`; [freeze-attestation.json](../../evaluation/context_sufficiency/versions/v1/freeze-attestation.json) binds the review and three source files by SHA-256. The Owner separately authorized one live 75-case run on 2026-10-08: `20261008T035450Z-010364d7`. Its local bytes passed integrity and per-case safety review; the reviewed Git export is under [evidence/runs/20261008T035450Z-010364d7](evidence/runs/20261008T035450Z-010364d7). The local directory alone has no verified backup or immutability.

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

The following command was used for the separately authorized historical run, with the existing E012 `.env` loaded read-only in place of an E013 credential copy. It is not a standing authorization for another run, and the current runner now requires an additional committed, run-specific `--live-authorization` record:

```sh
env -u TYPESAFE_API_KEY -u UV_NO_ENV_FILE -u RUST_LOG \
  uv run --quiet --locked --no-sync --project experiments/E013-jev-context-sufficiency \
  --env-file /Users/andrew/code/python/coami/experiments/E012-jev-text-policy/.env \
  python experiments/E013-jev-context-sufficiency/jev_context.py --live \
  --freeze-attestation evaluation/context_sufficiency/versions/v1/freeze-attestation.json \
  --store-policy experiments/E013-jev-context-sufficiency/local-store-policy.json \
  --store-root /Users/andrew/coami-evidence/E013
```

`.env` is an Owner-maintained, Git-ignored local credential file. Never print, hash, or commit it. The freeze attestation path above is tracked and verified; the local store path is approved for staging, not backed-up archival storage. Any later live run needs a new explicit Owner instruction. Before such a run, commit a dedicated JSON authorization record and pass its path as `--live-authorization`. It must contain `run_id` (a new unique ID), `authorized_by: "Owner"`, `scope: "one E013 75-case Context Sufficiency run"`, `model: "jev-1.13.0"`, `freeze_attestation_sha256`, and `store_policy_sha256`. The runner checks that its exact bytes are committed at HEAD and consumes that run ID by exclusively creating `authorization-uses/<run_id>.json` in the approved store **before** creating `runs/<run_id>/` or calling Jev. The marker remains if the run directory is deleted; a failed run still consumes its authorization. This marker is outside the mutable run directory but remains owner-mutable local state without independent backup or tamper resistance. The manifest retains the authorization SHA-256. A committed record is auditable but does not cryptographically prove who approved it. The Owner's separate instruction and commit review establish that human decision. The completed historical run predates this record requirement; no retrospective pre-run authorization is asserted for it.

The runner writes an exclusive `runs/<run_id>/` in the local store: `manifest.json`, `runner.py` (the exact executing source), `authorization.json` (the exact committed one-run approval for future runs), `events.jsonl`, `analysis.jsonl`, `summary.json`, exact emitted request bytes, and exact 2xx response bytes. The authorization JSON is limited to the six documented fields and is checked against the tracked freeze and store-policy hashes; only the historical run `20261008T035450Z-010364d7` predates this record and has none. Every other run without an authorization snapshot is an explicit verification gap. Each body is keyed by `(run_id, group, case_id)` and has a SHA-256. A failed or interrupted run remains incomplete and is never overwritten or automatically resumed. `ERROR`, `UNKNOWN`, and `NOT_RUN` do not count as correct model predictions. Verify the local bytes after each run with `--verify-local-run --run-dir /Users/andrew/coami-evidence/E013/runs/<run_id>`; the verifier requires the request hash and checks the request body against the frozen visible state for each captured response. A clean verification is a point-in-time integrity check, not a backup.

`private-evidence/` is ignored temporary staging only. After a local integrity check, a reviewer must inspect **each case's** exact analysis row and body for unexpected sensitive content, recording `safety_checked: true`, each exact analysis/body SHA-256, and `analysis_public`/`raw_public` decisions in an approval JSON with all 75 cases. The summary also needs `summary_public: true`, `summary_safety_checked: true`, and `summary_sha256` of its exact reviewed bytes. API keys, authentication headers, non-2xx error bodies, and raw tracebacks must never enter Git. Run `--publish-reviewed --run-dir <local-run> --approval <review.json>` only after that review. The tool checks local hashes, oracle inventory, request evidence, parsed raw content, store-policy claims, fixed execution conditions, and summary identity before publishing through a temporary sibling directory. A failed write leaves no Git-visible run and can be retried. It publishes a field-limited `review.json` with 75 safety decisions, the exact `runner.py` source, and future runs' six-field `authorization.json`; their SHA-256 values are bound in the manifest. Approved raw files are copied byte-for-byte; unapproved full rows and bodies remain local. Commit and push the reviewed evidence as a separate versioned topic; until then, the run is **local and unbacked**. If any case cannot be published, the Git index records a gap and later Agents need authorized local access to verify it. The index records stable relative locators, store ID, run version, hashes, access limits, and the absence of a retention promise.

From a clean checkout, `--verify-evidence --evidence-run <tracked-run> [--restricted-run <authorized-run>]` checks available objects, exact summary/review/runner hashes, raw-to-analysis agreement, fixed run conditions, valid status states and frozen oracle membership; it reports explicit gaps. The historical run's retained runner source matches both its recorded SHA-256 and Git revision `ad4e692d72ee9661c02697594cfd4aa93cf380a6`. Future threshold research may use the full research rows to propose candidates, then examine holdout separately, especially `INSUFFICIENT → SUFFICIENT`; E013 itself does not choose a threshold. A single mutable local directory has no independent retention or immutability guarantee, even after chmod; Git publication makes only the reviewed subset versioned and remotely retrievable.

## Interpretation

The summary reports planned/attempted/valid/invalid/error/unknown/not-run counts, both error directions, and `correct/valid` separately from `correct/planned` for research, holdout, and v0. E012's earlier v0 result remains historical. A PR merge, technical check, or successful offline test does not freeze v1 or establish a product pass.
