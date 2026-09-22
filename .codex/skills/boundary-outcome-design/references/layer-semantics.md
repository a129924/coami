# Layer Semantics and Translation

## Semantic ownership

The same real-world event may be described differently at different layers:

| Layer | Owns language about | Does not automatically own |
| --- | --- | --- |
| Infrastructure | driver, SDK, database, HTTP, and transport facts | Application capability or business result |
| Adapter / Port boundary | external-to-capability translation | UseCase policy about a valid Domain state |
| Application / UseCase | an operation's orchestration and decisions | raw SDK, ORM, or transport vocabulary |
| Domain | valid state, rules, and invariants | endpoint status and client implementation detail |
| Repository / Unit of Work | required persistence capability / transaction completion | ORM-specific public contract by default |
| Delivery | protocol presentation of application result | accidental lower-layer implementation terms |

Architectural boundaries are semantic boundaries, not merely interface
boundaries. In Python, a `Protocol` describes dependency shape; it does not
prevent runtime exceptions from crossing it.

## Vocabulary leak test

For each alternative in a return type, Outcome union, or raised exception,
ask:

1. Which world names it: Domain, Application operation, capability, HTTP, SDK,
   ORM, database, transport, or transaction?
2. Which layer exposes it?
3. Does that layer need this exact word to make a decision?

For example, this Port is suspicious when its caller has no HTTP-level policy:

```python
class DataSourcePort(Protocol):
    def load(self, key: Key) -> Value | Http503 | SdkTimeout:
        ...
```

The Adapter can instead translate its concrete facts into an Application-owned
capability contract such as `Found`, `NotFound`, `DependencyUnavailable`, and
`RateLimited` when those are the distinctions the caller needs. These names are
examples, not a required class hierarchy.

## Preserve, translate, or compress

Start with the decision consumer rather than source exception count.

| Source facts | Receiver decision | Boundary action |
| --- | --- | --- |
| timeout, service unavailable | retry in the same way | translate and compress to one availability outcome |
| rate limit | schedule retry using retry metadata | translate but preserve rate-limit distinction |
| missing record | show normal absence path | preserve as absence if caller needs it |
| malformed external response | terminate as a permanent operation failure | translate to operation-level permanent failure if that is the receiver's decision |

Semantic compression is appropriate only after confirming identical decisions.
It is not a requirement to reduce every failure to `Failed`, and it is not a
one-to-one renaming exercise from `SdkTimeoutError` to `SdkTimeoutOutcome`.

## Port, Adapter, and UseCase

A Port is the inner layer's contract for an external capability, not a
mechanical abstract version of an Adapter interface. It describes what the
Application needs to observe in order to proceed.

An Adapter translates both external representations and external failures to
Port vocabulary. After that translation, the Adapter's concrete SDK, HTTP, or
database terms should disappear from the inner contract unless they are
deliberately part of the capability being modeled.

A UseCase orchestrates calls, evaluates Domain state in the context of the
operation, and can further translate a Port outcome. For example, a Port may
retain `DependencyTimeout` and `DependencyUnavailable` when separate callers
need them; a given UseCase may compress both to `TemporarilyUnavailable` when
its decision is identical.

## Valid state is not an operation outcome

An optional field does not itself prove invalid state:

```python
@dataclass(frozen=True)
class Subject:
    optional_value: Value | None
```

`Subject(optional_value=None)` can be legal if its invariant permits absence.
Only a UseCase that requires a value turns that valid state into an
operation-specific result such as `ValueRequired`. Do not move that operation
policy into the Adapter merely because it first observes an absent value.
