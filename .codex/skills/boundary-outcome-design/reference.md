# Boundary Outcome Design Reference

Use this file as the short navigation map for the skill. The primary question
is never "how many exceptions does Infrastructure expose?" It is "what must
the receiving layer distinguish to make a correct decision?"

| Topic | Use this reference for |
| --- | --- |
| Layer semantics | Semantic ownership, lower-layer vocabulary leakage, and the choice to preserve, translate, or compress a distinction. See `references/layer-semantics.md`. |
| Persistence and failures | Repository and Unit of Work boundaries, the limits of `Protocol`, and expected versus unexpected failures. See `references/persistence-and-failures.md`. |
| Worked review patterns | Detailed positive and negative examples and the required review-output shape. See `examples.md`. |
| Final check | Repeatable checks before presenting a recommendation. See `checklist.md`. |

## Decision rule

At each boundary, retain exactly the information the receiving layer needs to
choose correctly. A lower-layer fact can influence a higher-layer decision
without becoming part of the higher-layer contract. The vocabulary and the
type representation may therefore change at every boundary.

The action labels mean:

- **Preserve**: keep a distinction because the receiver decides differently.
- **Translate**: replace source vocabulary with the receiver's capability or
  operation vocabulary.
- **Compress**: merge distinctions that have the same receiver decision.
- **Promote to application-safe exception**: use a controlled exception path
  when an expected failure needs handling but a value-style outcome is not the
  right local contract.
- **Leave as unexpected exception**: do not normalize defects or impossible
  states merely to make every event a result variant.
