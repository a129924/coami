# E013 evidence index

Reviewed, Git-versioned runs belong in `runs/<run_id>/`. `manifest.json` maps `(run_id, group, case_id)` to `analysis.jsonl` and either exact reviewed `raw/<group>/<case_id>.body` bytes or an authorized restricted-store object. `summary.json` is descriptive only. Missing or inaccessible originals must be reported as unverified.

No live run has occurred: v1 is not frozen and a durable restricted store has not been approved. This directory intentionally contains no fabricated case observations.
