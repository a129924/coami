# Persistence and Failure Boundaries

## Repository as an outbound Port

A Repository describes persistence capability required by Application or
Domain, not the ORM implementation. A lookup can legitimately return an entity
or normal absence:

```python
class EntityRepository(Protocol):
    def find(self, identity: Identity) -> Entity | None:
        ...

    def add(self, entity: Entity) -> None:
        ...
```

Neither the use of `None` for a documented lookup miss nor the absence of a
listed exception proves Infrastructure failure cannot occur. Python does not
have checked exceptions. The actual boundary is established by explicit
exception translation, Outcome translation, or controlled propagation.

Do not expose ORM exception types by default. First determine whether a caller
needs a persistence-level distinction, an Application operation outcome, or an
application-safe exception boundary.

## Unit of Work is a separate boundary

A Unit of Work owns whether a group of persistence operations becomes one
transaction. It can own transaction-wide outcomes such as:

- committed
- write or serialization conflict
- transaction temporarily unavailable

That does not mean every database failure belongs at `commit()`. A read can
fail during lookup; a write can fail during flush; and a connection can fail
before transaction completion. Put each outcome where the actual capability or
transaction decision occurs.

## Expected and unexpected failures

Use an explicit Outcome when its consumer can act meaningfully. Typical
examples include `NotFound`, `Conflict`, `RateLimited`, and
`TemporarilyUnavailable`, but the relevant alternatives are defined by the
receiver's decisions, not by a fixed taxonomy.

Do not force every failure into an Outcome. Programming defects, corrupted
invariants, impossible states, and unexpected driver bugs usually belong in a
controlled application-safe exception or global error-handling path. The
recommendation should state why that path is appropriate and avoid pretending
that the failure is recoverable.

## Controlled propagation

When a technical exception must cross a boundary temporarily, name the
exception boundary and the reason. This is not the same as declaring a
`Protocol` or hiding it behind a generic `Failed` variant. Later translation
may remain appropriate once the receiver and its decisions are known.

The skill does not prescribe logging, alerting, retry implementation, or a
specific global handler. Those are separate implementation and delivery
decisions.
