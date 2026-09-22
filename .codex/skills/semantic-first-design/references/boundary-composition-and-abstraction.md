# Boundaries, composition, and abstraction

Use this reference when external semantics leak inward, important components are
hidden, or a proposed abstraction needs a concrete reason to exist.

## Translate external meaning

Translate third-party flags, identifiers, weak results, and inconsistent
failures at the boundary so higher-level code receives the application's stable
contract. For an API payload, database row, or queue message, route conversion
semantics to `python-serialization-boundaries`; this skill does not choose the
DTO, sentinel, normalization, or wire policy.

Route exception translation to `python-error-handling` and broader package
architecture to `python-library-architecture`.

## Visible composition

Keep important selected components and behavior choices visible at an
appropriate composition point. Keep orchestration readable enough to answer
what happens next. Do not hide material choices behind global registries,
implicit discovery, or defaults merely to reduce wiring.

Route reusable-library architecture choices to `python-library-architecture`.

## Meaningful variation boundaries

Introduce an abstraction only for an independent variation, real system
boundary, or caller-relevant guarantee. Do not add an interface per function,
fake workflow step, or generic dependency container just to make structures
look uniform. Prefer composition when independent dimensions must vary together
without creating a combinatorial inheritance hierarchy.

Route concrete model and architecture choices to `python-model-selection` and
`python-library-architecture`.
