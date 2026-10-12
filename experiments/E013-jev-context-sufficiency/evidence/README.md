# E013 evidence index

Reviewed, Git-versioned runs belong in `runs/<run_id>/`. `manifest.json` maps `(run_id, group, case_id)` to `analysis.jsonl` and either exact reviewed `raw/<group>/<case_id>.body` bytes or an authorized restricted-store object. `summary.json` is descriptive only. Missing or inaccessible originals must be reported as unverified.

The Owner separately authorized the E013 run `20261008T035450Z-010364d7` after fixture freeze. [Its reviewed evidence](runs/20261008T035450Z-010364d7) contains 75 exact raw Jev bodies, 75 full analysis rows, a run manifest, descriptive summary and per-case safety review. Local and exported verification each reported 75 cases with zero gaps; the exported bytes become remotely versioned only after commit and push. No threshold was selected. The original local staging at `/Users/andrew/coami-evidence/E013` has no verified backup or immutability; cases kept solely there in a future run remain access-limited gaps from a clean checkout.

The historical run now also retains the exact `local-store-policy.json` bytes from runner revision `ad4e692d72ee9661c02697594cfd4aa93cf380a6` as `store-policy.json`; its public manifest binds the SHA-256. This is a later provenance amendment, not a change to the 75 observations or the original local run. Future exports retain each run's policy snapshot.
