# E013 Python implementation specification

## Acceptance Criteria

1. No real SDK call occurs without exact v1 Owner acceptance, independent fixture review, freeze, matching source hashes, validated 75-case inventory, pinned dependency and an approved durable restricted store.
2. For every received 2xx, the full HTTP response bytes are persisted before SDK decoding. The emitted body contains only the fixed model, Context question and permitted visible state. Credentials, headers and non-2xx error bodies are excluded.
3. Every planned case has a unique `(run_id, group, case_id)` analysis row. Complete original probabilities and confidence are retained where available; absent values and uncertain outcomes are explicit.
4. Reviewed Git evidence and restricted immutable objects have stable locators, versions and hashes. Later authorized Agents can verify exact bytes and recompute group statistics and arbitrary candidate-threshold misjudgment counts without changing E013's observations.

## Behavioral Scenarios

- Given an accepted frozen v1 and approved store, when 75 sequential Context calls complete, then research 40, holdout 20 and v0 15 have separate case rows, raw-body hashes and descriptive summaries.
- Given a received 2xx that fails SDK validation, when the SDK raises, then the exact body remains stored and the case is INVALID without an invented choice.
- Given a clean checkout and authorized restricted store, when an Agent selects a run/group/case, then it can resolve the full row and body, check their hashes, and recompute groups and a supplied test threshold's two error directions.

## Error / Edge Cases

- Unfrozen v1, missing approval, bad hash, absent key, wrong SDK or missing store stop before any call.
- Non-2xx error bodies are never stored; known failures, unknown in-flight work and not-run cases have distinct statuses and do not count as correct.
- Missing or inaccessible raw/full analysis, invalid object version or hash mismatch is an explicit unverified gap. No sanitized copy is treated as the original.
- Content review must approve each exact hash before Git publication. Sensitive originals remain in the approved restricted store; `/private/tmp` staging is never the only durable copy.
