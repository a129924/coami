# Contracts, state, and normal absence

Use this reference when callers need to know what success establishes, what a
state transition guarantees, or whether an absent value has one normal meaning.

## Truthful contracts

A successful return annotation must describe a guarantee the implementation has
actually established. Do not rely on unchecked casts, caller assumptions, or
undocumented conventions to preserve a stronger contract than the code earns.

Route public signature mechanics to `python-api-signature` and strict
annotation questions to `python-type-hints-strict`.

## Earned state guarantees

When an operation changes a caller-relevant guarantee, distinguish the new
state only if callers must rely on it. For example, parsing, validation, and
preparation may be different states when their guarantees matter. Do not add a
new wrapper merely because a primitive value exists.

Route concrete type and model choices to `python-model-selection` and
`python-type-hints-strict`.

## Normal absence

`T | None` is suitable only when absence has one obvious, normal meaning. If
the same `None` can mean missing, invalid, skipped, unavailable, or failed,
make the material alternatives distinguishable rather than asking callers to
infer them.

Route the return contract to `python-api-signature` and failure meaning to
`python-error-handling`.
