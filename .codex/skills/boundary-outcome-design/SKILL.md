---
name: boundary-outcome-design
description: "Design or review Outcome and exception translation when results cross application, domain, or persistence boundaries."
complexity: high

risk_profile:
  - ambiguity_sensitive

inputs:
  - the operation and the layer where its result or failure is observed
  - the current Outcome, exception, return type, or proposed boundary contract
  - the receiving caller's available decisions and their consequences
  - relevant external, persistence, transport, or SDK facts when translation is considered

outputs:
  - a boundary review with observed boundary, vocabulary ownership, decision-relevant distinctions, and recommended boundary action
  - an implementation-neutral recommendation to preserve, translate, compress, promote, or leave an unexpected exception

use_when:
  - designing or reviewing Outcome, Result, exception, or return-value semantics that cross architectural layers
  - deciding whether an external, HTTP, SDK, ORM, or database failure should become a Port or UseCase outcome
  - deciding whether an optional Domain field is a valid state or an operation-specific failure
  - choosing whether a persistence failure belongs at a Repository method or Unit of Work transaction boundary

do_not_use_when:
  - the task only selects Python exception syntax or a package-wide error hierarchy without an architectural boundary question
  - the task is primarily logging, monitoring, retry implementation, HTTP response mapping, or framework configuration
  - the task requires a concrete class hierarchy, API shape, or implementation change that has not been separately specified
---

# Purpose

Guide one job: determine the semantic meaning an Outcome or exception should
carry at an architectural boundary. Each layer owns its own semantics. Lower
layer facts may affect higher layer decisions, but lower-layer vocabulary must
not escape accidentally.

# Trigger / When to use

Use this skill when:
- designing or reviewing an Outcome, `Result`, exception, return type, or
  failure contract that crosses Domain, Application, Port, Adapter,
  Repository, Unit of Work, or Infrastructure layers
- deciding whether technical distinctions need preservation, translation, or
  semantic compression for the receiving caller
- deciding whether a valid optional Domain state becomes a failure in one
  particular operation

Do not use this skill when:
- the task is only about Python exception mechanics with no layer or caller
  decision to analyze; use `python-error-handling`
- the main task is implementing retries, observability, framework error
  handling, or transport status mapping
- the request insists on a universal `Result[T, E]` pattern, class hierarchy,
  or taxonomy before identifying the receiving layer's decision needs

# Inputs

- the operation, its owning layer, and the layer that receives the result
- the current or proposed Outcome, exception, return type, or contract
- the vocabulary owner for each value: Domain, Application operation, external
  capability, HTTP, SDK, ORM, database, transport, or transaction
- the caller decisions each distinct result enables, such as retry, fallback,
  user-visible rejection, compensation, or termination
- external and persistence facts needed to evaluate a proposed translation

# Process

1. **A — Identify the layer and observed boundary.** Classify the result as
   Domain state/rule, Application or UseCase operation, Port capability,
   Adapter translation, Infrastructure fact, transaction boundary, or Delivery
   boundary. State which boundary owns the contract; an interface alone is not
   proof of a failure boundary.
2. **B — Identify vocabulary ownership.** Name the world described by each
   alternative. Treat HTTP status codes, SDK timeout classes, ORM errors, and
   driver terms in Application or Domain contracts as a possible vocabulary
   leak unless the receiving layer deliberately owns that external meaning.
3. **C — Identify the decision consumer and failure classification.** For
   every distinction, record who receives it, what different action follows,
   and whether it is an `expected failure`, `unexpected failure`, or `not a
   failure`. Preserve a distinction when it supports a meaningful different
   decision. Consider semantic compression only when the receiving layer
   treats alternatives identically.
4. **D — Choose boundary actions per distinction.** For each
   decision-relevant distinction, recommend one or more justified actions:
   `Preserve`, `Translate`, `Compress`, `Promote to application-safe
   exception`, or `Leave as unexpected exception`. Identify the translation
   point for every `Translate` or `Compress` action. Do not mirror every
   lower-layer exception just by changing its name. `Promote` is for an
   expected failure that needs a controlled exception path rather than a
   value-style outcome. For an unexpected failure, select `Leave as
   unexpected exception`; if it must cross a boundary, also name the
   controlled-propagation exception boundary (for example, the Application
   delivery boundary/global error handler) and any application-safe wrapping
   there. Such wrapping does not reclassify the failure as `Promote` or as an
   expected outcome.
5. **Check state against operation.** Decide whether `None` or another
   optional value is a legal Domain state before calling it a failure. A valid
   state becomes an error only when the current operation rejects it, such as
   `ValueRequired` for an operation that requires a present value.
6. **Check capability and persistence boundaries.** Ports describe the
   capability Application needs; Adapters translate external representations
   and failures into that capability vocabulary. Treat a Repository as an
   outbound Port. Place transaction-wide outcomes such as commit conflict or
   transaction unavailability at Unit of Work when that is the actual
   decision boundary; keep read, flush, or other operation-level failures at
   their real boundary.
7. **Classify expected versus unexpected failure.** Make expected failures
   explicit only when a caller can take a meaningful action. Keep programming
   defects, corrupted invariants, impossible states, and unexpected driver
   bugs out of an ever-growing Result union; recommend controlled propagation
   or an application-safe exception/global handler instead.
8. **Return a bounded review.** Use the output structure below. State any
   missing decision evidence rather than inventing an Outcome taxonomy.

## Required review output

```text
Status:
<READY | INCOMPLETE | BLOCKED>

Observed boundary:
<layer and contract owner>

Potential vocabulary leak:
<none, or lower-layer term and why it leaks>

Decision-relevant distinctions:
- <distinction>: failure classification=<expected failure | unexpected failure | not a failure>; receiving consumer=<role/layer>; consumer decision=<action>

Suggested translation point:
<layer/component, or none>

Suggested outcome granularity:
<alternatives the receiving layer needs, without prescribing implementation types>

Boundary actions:
- <distinction>: <one or more actions and their justification>

Missing evidence:
- <none, or evidence still needed>

Clarification or next step:
<none, or the question / evidence request needed to proceed>
```

# Examples

- Positive: An Adapter maps SDK timeout and service-unavailable facts to
  `DependencyUnavailable` because the UseCase retries both identically, but
  preserves `RateLimited` because the UseCase uses retry metadata. The review
  identifies the Adapter as the translation point.
- Negative: A `ResourceLookup` Port returns `Http503 | SdkTimeoutError` solely
  because those are the exceptions raised by its client. Renaming each SDK
  error as an Outcome without identifying a new caller decision is not an
  abstraction.

# Outputs

- a concise boundary review in the required review-output structure
- a recommendation that names semantic ownership, decision relevance,
  translation point, and outcome granularity
- explicit `INCOMPLETE` or `BLOCKED` status, missing evidence, and a
  clarification or next step when the missing context would materially change
  the recommendation

# Validation

## Required Checks

- Identify both the observed layer and the receiving decision consumer before
  recommending an Outcome shape.
- Verify that every preserved distinction changes a meaningful caller decision.
- Verify that proposed Port and UseCase contracts use their own capability or
  operation vocabulary rather than accidental HTTP, SDK, ORM, or driver terms.
- Check whether optional state is legal independently of whether a current
  operation accepts it.
- Check Repository and Unit of Work failures at their actual operation or
  transaction boundary; do not assume all database failures occur at commit.
- Classify every distinction as an expected failure, unexpected failure, or
  not a failure.

## Quality Checks (best effort)

- Prefer the least detailed outcome set that still enables correct decisions.
- Retain causal technical detail for logging or diagnostics only when it does
  not become an unintended upper-layer contract.
- State why a distinction is preserved or compressed, not only the final names.

## On Soft Fail

- Mark the review `INCOMPLETE` when the layer is clear but one caller decision
  or technical fact is unavailable.
- Give a conditional recommendation and list the evidence that would confirm
  or change it.
- Do not fabricate retry, fallback, transaction, or business policy.

# Failure Handling

## Missing Context

- If the current layer, receiver, or operation is missing, mark `INCOMPLETE`
  and request that context before asserting a translation boundary.

## Ambiguous Requirement

- When caller-decision evidence is unavailable, use `INCOMPLETE` if no
  unresolved policy choice has been identified: request the missing evidence
  and give only a conditional recommendation.
- `BLOCKED` takes precedence over `INCOMPLETE` when the available context
  identifies multiple plausible caller decisions that would produce
  materially different granularity or boundary actions. Ask which policy is
  intended; do not choose a taxonomy by preference.
- If the alternatives differ only in non-material implementation detail,
  state the assumption and continue with the least-leaky option.

## Execution Limitation

- If external failure behavior cannot be inspected, distinguish observed facts
  from assumptions and do not claim a specific mapping is exhaustive.
- This skill reviews semantics; it does not implement exception translation,
  retry, logging, or global error handlers.

# Verification

- Use `checklist.md` before declaring a boundary recommendation ready.
- Compare the proposed vocabulary with the owning layer's language, not merely
  with the concrete Adapter interface.
- Ensure the output names a translation point or explicitly explains why none
  is needed.

# Red Flags

- A Domain or UseCase union contains `Http503`, `SqlDeadlock`, or SDK exception
  classes without a documented reason that layer owns those concepts.
- `Success | Failed` replaces distinctions that cause retry, fallback, or
  user-visible conflict decisions.
- An optional field is declared invalid without showing that its own invariant
  forbids absence.
- A `Protocol` annotation is treated as proof that runtime failures cannot
  escape.

# Common Rationalizations

- "The SDK already has precise exceptions, so exposing them saves work."
- "Every error should be a Result variant, including impossible states."
- "All database failures belong in `commit()`."
- "The field is optional, so every missing value is a failure."

# Boundaries

- Do not mandate `Result[T, E]`, exception-only handling, dataclasses, tagged
  unions, or any concrete hierarchy.
- Do not make an Adapter decide whether a legal Domain state is acceptable for
  a particular UseCase.
- Do not erase distinctions that the receiving layer needs for a meaningful
  decision, or preserve lower-layer details that it does not own.
- Do not treat dependency abstraction (`Protocol`) as failure abstraction.
- Do not design retry algorithms, observability, HTTP responses, ORM session
  mechanics, or implementation code as part of this skill.

# Local references

- `reference.md`: quick map of the decision model and the split references.
- `references/layer-semantics.md`: semantic ownership, vocabulary, and
  translation/compression rules by layer.
- `references/persistence-and-failures.md`: Repository, Unit of Work, runtime
  failure, and expected/unexpected failure guidance.
- `examples.md`: detailed review scenarios and anti-patterns.
- `checklist.md`: repeatable pre-handoff validation for a boundary review.
