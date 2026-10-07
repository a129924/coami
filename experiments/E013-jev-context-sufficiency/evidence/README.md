# E013 evidence index

Reviewed, Git-versioned runs belong in `runs/<run_id>/`. `manifest.json` maps `(run_id, group, case_id)` to `analysis.jsonl` and either exact reviewed `raw/<group>/<case_id>.body` bytes or an authorized restricted-store object. `summary.json` is descriptive only. Missing or inaccessible originals must be reported as unverified.

No live run has occurred: Owner accepted the 60 v1 answers, but independent fixture review and freeze remain pending, as does separate live authorization. The Owner selected local staging at `/Users/andrew/coami-evidence/E013`, which has no verified backup or immutability. This directory intentionally contains no fabricated case observations. Only after every case's exact body and row pass a recorded safety check may a run be exported here, committed, and pushed. Cases kept solely in local staging remain access-limited gaps from a clean checkout.
