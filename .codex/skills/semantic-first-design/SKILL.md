---
name: semantic-first-design
description: "Resolve one material Python design ambiguity in contracts, states, policies, boundaries, or failure semantics."
complexity: medium
risk_profile:
  - ambiguity_sensitive
inputs:
  - the Python design or review question and the code or contract under discussion
  - one caller-visible meaning that must be distinguished from another
  - existing repository contracts and the relevant specialised Python skill, when known
outputs:
  - a bounded assessment of one material ambiguity
  - the smallest explicit distinction that removes that ambiguity
  - a bounded handoff to the specialised Python skill that owns the concrete decision
use_when:
  - a Python design or review question has one material contract, state, policy, boundary, composition, abstraction, or failure ambiguity
  - a caller cannot determine one important behavior from local names, types, signatures, or visible composition
do_not_use_when:
  - the question is already owned by a specialised Python skill without cross-cutting semantic ambiguity
  - the proposed change only adds patterns, wrappers, interfaces, or enums for stylistic uniformity
---

# Purpose

Identify one material semantic ambiguity in Python design or review work, then
recommend the smallest explicit distinction that lets a caller reason about the
important behavior locally. This is a cross-cutting guardrail, not a replacement
for specialised Python design skills.

# Trigger / When to use

Use this skill when:

- one Python API, type, workflow, or component can reasonably be interpreted in
  more than one material way;
- one result, state transition, flag, dependency, or failure is hidden behind a
  generic value, fallback, convention, or implementation detail; or
- a review must decide whether one proposed abstraction removes ambiguity or
  merely adds structure.

Do not use this skill when:

- the question is solely about public signature shape, naming, model choice,
  strict typing, error policy, serialization policy, or library architecture;
  route directly to its specialised skill instead;
- the uncertainty is cosmetic and cannot affect behavior, safety, or a
  caller's reasonable interpretation; or
- the suggested solution is a blanket rule such as wrapping every primitive or
  adding an interface for every function.

# Inputs

- The concrete Python design or review target, including the locally visible
  name, signature, type, control flow, and composition where available.
- One pair of meanings that a caller, maintainer, or boundary consumer must
  tell apart.
- Existing repository contracts and constraints; do not reopen locked contract,
  architecture, or path decisions.
- The external system or dependency involved, if the ambiguity crosses a
  boundary.

# Process

1. State the one observed ambiguity in a sentence: identify the same-looking
   value, path, or behavior that carries two or more material meanings.
2. Classify it as contract/state, absence, boolean/policy, boundary,
   composition/abstraction, or failure semantics. Use `reference.md` to select
   the detailed local reference; classify no unrelated concern.
3. Identify the minimum distinction that makes that meaning visible in a name,
   type, signature, return path, component boundary, or orchestration step.
   Keep a simple representation when it already has one unambiguous meaning.
4. Check local reasoning: a reader with the call site and directly referenced
   contract can distinguish success, normal absence, and failure where those
   meanings apply.
5. Route the concrete decision to its specialised owner: use
   `python-api-signature`, `python-naming`, `python-model-selection`,
   `python-error-handling`, `python-type-hints-strict`,
   `python-library-architecture`, or `python-serialization-boundaries` for an
   API payload, database row, or queue message. Do not redefine that owner's
   rules.
6. Return the bounded assessment for this one ambiguity. Do not add a
   prioritized list or prescribe extra patterns without a named ambiguity.

# Examples

- Positive: A lookup returns `None` for both "record does not exist" and
  "backend call failed." Separate normal absence from explicit failure, then
  hand the failure contract to `python-error-handling`.
- Incorrect: Replace every `str` with a wrapper class because semantic-first
  design always requires value objects, even though the values cannot be
  confused and have no distinct guarantees.

# Outputs

- A bounded assessment of one material ambiguity and why it prevents local
  reasoning.
- The smallest explicit semantic distinction and the caller guarantee it
  introduces.
- A direct, bounded routing recommendation when a specialised Python skill owns
  the concrete signature, naming, model, type, error, serialization, or
  architecture choice.
- `INCOMPLETE` or `BLOCKED` status when the available context cannot support a
  safe distinction.

# Validation

## Required Checks

- Confirm the one ambiguity changes a caller-visible guarantee, valid state,
  behavior choice, boundary meaning, or failure interpretation.
- Confirm the recommendation gives each relevant normal result and failure path
  one distinguishable meaning.
- Confirm the proposed abstraction, type, policy, or component removes the
  named ambiguity rather than merely standardizing style.
- Confirm no specialised skill's concrete rules are restated, weakened, or
  overridden.

## Quality Checks (best effort)

- Prefer an explicit name, return distinction, or visible composition over a
  new abstraction when that is sufficient.
- Keep orchestration readable: reveal what happens next, but do not invent
  no-op steps for structural symmetry.
- Check `examples.md` when a similar ambiguity recurs.

## On Soft Fail

- **SOFT FAIL**: Mark the output `INCOMPLETE` when context is missing for an
  otherwise non-blocking assessment.
- State the missing contract or caller expectation, make no invented policy,
  and provide only the safe observations and routes available.

## On Blocked

- **BLOCKED**: Mark the output `BLOCKED` and stop when plausible
  interpretations would select different public contracts, valid states,
  failure behavior, or architecture boundaries.
- State the exact unresolved meaning and the decision owner required before a
  recommendation can be made.

# Failure Handling

## Missing Context

- If success, absence, failure, caller expectation, or boundary ownership is
  unknown, mark the assessment `INCOMPLETE` and list the missing information.

## Ambiguous Requirement

- If alternative interpretations materially change the recommended contract or
  design boundary, mark it `BLOCKED`; do not choose one by inference.
- Otherwise state the conservative assumption and why it does not change the
  recommendation.

## Execution Limitation

- State when code, call sites, or an external contract cannot be inspected.
- Do not manufacture a type, policy, error, or abstraction to conceal the
  limitation.

# Red Flags

- `None`, `False`, an empty collection, or an unchanged value can each mean
  success, absence, invalid input, and failure.
- A boolean names an implementation switch rather than a natural binary domain
  fact, or a credible third behavior already exists.
- A public type promises a guarantee that the implementation has not established.
- A third-party identifier, flag, exception, or weak result leaks unchanged
  into the application contract.
- Important dependencies are selected by registry, discovery, or hidden
  defaults such that visible composition cannot explain the behavior.

# Boundaries

- Do not mandate value objects, `Enum`, `dataclass`, `ABC`, `Protocol`,
  factories, builders, registries, or dependency containers as universal
  solutions.
- Do not design public signature mechanics; route them to
  `python-api-signature`.
- Do not set identifier names or visibility conventions; route them to
  `python-naming`.
- Do not choose concrete Python model constructs; route them to
  `python-model-selection`.
- Route exception hierarchy and translation to `python-error-handling`. Retry orchestration and logging policy are outside that skill too; disclose the coverage gap and use relevant project policy or verified general guidance within the requested scope. Do not imply a completed handoff.
- Do not define strict annotation syntax or typing escape hatches; route them
  to `python-type-hints-strict`.
- Do not define payload, row, or queue-message conversion rules; route them to
  `python-serialization-boundaries`.
- Do not define reusable-library package architecture; route that work to
  `python-library-architecture`.
- Do not change existing specialised skills, platform projections, or runtime
  code as part of this guardrail.

# Local references

- `reference.md`: short overview, detailed-reference routing, and the bounded
  assessment result format.
- `references/contracts-and-state.md`: truthful contracts, earned guarantees,
  and normal absence.
- `references/policy-and-failure.md`: boolean/policy choices and
  distinguishable failure semantics.
- `references/boundary-composition-and-abstraction.md`: external translation,
  visible composition, and meaningful variation boundaries.
- `examples.md`: compact positive and negative ambiguity-resolution patterns,
  including a bounded serialization handoff.
