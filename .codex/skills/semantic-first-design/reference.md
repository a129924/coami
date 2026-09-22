# Semantic-first overview and routing

Use this skill to expose one material distinction, not to require a design
pattern. Start with the smallest representation that gives each caller-visible
meaning one clear interpretation.

## Detailed-reference routing

| Observed ambiguity | Read | Route concrete choices to |
| --- | --- | --- |
| Truthful success contract, earned state guarantee, or normal absence | `references/contracts-and-state.md` | `python-api-signature`, `python-type-hints-strict`, `python-model-selection`, `python-error-handling` |
| Boolean/policy meaning or failure distinguishability | `references/policy-and-failure.md` | `python-api-signature`, `python-model-selection`, `python-error-handling` |
| External translation, visible composition, or meaningful variation boundary | `references/boundary-composition-and-abstraction.md` | `python-library-architecture`, `python-model-selection`, `python-error-handling` |
| API payload, database row, or queue message carries ambiguous transport meaning | `references/boundary-composition-and-abstraction.md` | `python-serialization-boundaries` |

## Review result format

Return the smallest useful statement for one ambiguity:

```text
Ambiguity: <one material ambiguity>
Distinction: <the explicit name/type/result/policy/boundary to introduce>
Guarantee: <what a caller can now know locally>
Route: <specialised skill, or none when this is only cross-cutting guidance>
```

Use `INCOMPLETE` when the relevant meanings cannot be determined. Use `BLOCKED`
when choosing between plausible meanings would alter a public contract, valid
state, failure semantics, or architecture boundary.

## Local references

- `references/contracts-and-state.md`: detailed contract, state, and normal-
  absence guidance.
- `references/policy-and-failure.md`: detailed policy and failure guidance.
- `references/boundary-composition-and-abstraction.md`: detailed boundary,
  composition, and abstraction guidance.
- `examples.md`: compact worked patterns and anti-patterns.
