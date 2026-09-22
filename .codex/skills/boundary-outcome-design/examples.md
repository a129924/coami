# Boundary Outcome Design Examples

## 1. Adapter translation with selective preservation

**Situation:** An external client raises timeout, service-unavailable, and
rate-limit errors. The UseCase retries timeout and service-unavailable in the
same way, but schedules rate-limited work from server-provided retry metadata.

```text
Status:
READY

Observed boundary:
Adapter implementing an Application-owned outbound Port.

Potential vocabulary leak:
SdkTimeoutError and HTTP 503 would leak client/transport vocabulary through the Port.

Decision-relevant distinctions:
- timeout/service unavailable: failure classification is expected failure;
  receiving consumer is the UseCase
  (Application layer), which makes the same retry decision
- rate limited: failure classification is expected failure; receiving consumer
  is the UseCase (Application layer), which schedules retry work from retry
  metadata

Suggested translation point:
Adapter, while mapping the external client response/error.

Suggested outcome granularity:
DependencyUnavailable; RateLimited(retry metadata); successful capability result.

Boundary actions:
- timeout/service unavailable: Translate at the Adapter, then compress to
  DependencyUnavailable because the UseCase retries both identically.
- rate limited: Translate at the Adapter and preserve RateLimited with retry
  metadata because scheduling differs.

Missing evidence:
- none

Clarification or next step:
none
```

Do not infer that every HTTP status needs its own Port outcome. The examples are
semantic roles, not required type names.

## 2. UseCase compression after a detailed Port contract

**Situation:** A shared Port distinguishes `DependencyTimeout` from
`DependencyUnavailable` for one consumer. A checkout UseCase has the same
temporary-unavailable handling for both.

```text
Status:
READY

Observed boundary:
Checkout UseCase operation result.

Potential vocabulary leak:
None; both Port outcomes are capability vocabulary, but they exceed this operation's needs.

Decision-relevant distinctions:
- timeout/unavailable: failure classification is expected failure; receiving
  consumer is the Checkout UseCase
  (Application layer), which uses the identical fallback and user message

Suggested translation point:
Checkout UseCase when interpreting the Port result.

Suggested outcome granularity:
TemporarilyUnavailable; operation success; other operation-specific results.

Boundary actions:
- timeout/unavailable: Compress at the Checkout UseCase to
  TemporarilyUnavailable because fallback and user messaging are identical.

Missing evidence:
- none

Clarification or next step:
none
```

The Port and UseCase do not need the same type or number of alternatives.

## 3. Optional Domain state becomes an operation failure

**Situation:** A `Subject` may legally have no `optional_value`; an export
operation requires one.

```text
Status:
READY

Observed boundary:
Application operation interpreting valid Domain state.

Potential vocabulary leak:
None.

Decision-relevant distinctions:
- value absent: failure classification is expected failure; receiving consumer
  is the Export UseCase (Application layer), which must reject with an
  operation-specific result
- value present: failure classification is not a failure; receiving consumer is
  the Export UseCase (Application layer), which proceeds with export

Suggested translation point:
UseCase after obtaining Subject state, not Adapter retrieval.

Suggested outcome granularity:
Exported; ValueRequired.

Boundary actions:
- value absent: Preserve it as valid Domain state, then translate it at the
  UseCase to ValueRequired because export rejects absence.
- value present: Preserve the state and proceed with export because the
  operation accepts it.

Missing evidence:
- none

Clarification or next step:
none
```

**Incorrect reasoning:** `optional_value: Value | None` means `Subject` is
invalid, so the Adapter must return an error whenever it sees `None`.

## 4. Repository and Unit of Work

**Situation:** `find()` can have a normal lookup miss; `commit()` can report a
write conflict. The ORM may also raise an unexpected driver failure during
either operation.

```text
Status:
READY

Observed boundary:
Repository lookup and Unit of Work transaction completion are separate boundaries.

Potential vocabulary leak:
Leaking the ORM's concrete conflict or driver exception into Application.

Decision-relevant distinctions:
- lookup miss: failure classification is not a failure; receiving consumer is
  the Application lookup caller
  (Application layer), which follows its normal absence path
- write conflict: failure classification is expected failure; receiving
  consumer is the Application transaction caller
  (Application layer), which may refresh, retry, or report conflict
- unexpected driver failure: failure classification is unexpected failure;
  receiving consumer is the Application delivery boundary/global error handler
  (Delivery layer), which has no defined local recovery decision

Suggested translation point:
Repository for lookup capability; Unit of Work for transaction completion;
Application delivery boundary/global error handler for controlled propagation
of an unexpected driver failure.

Suggested outcome granularity:
Entity | absence at lookup; Committed | Conflict at commit; unexpected failure stays controlled propagation.

Boundary actions:
- lookup miss: Preserve normal absence at the Repository because Application
  follows its ordinary absence path.
- write conflict: Translate at Unit of Work commit and preserve the conflict
  distinction because the caller may refresh, retry, or report it.
- unexpected driver failure: Leave as an unexpected exception with controlled
  propagation to the Application delivery boundary/global error handler,
  because no local recovery decision is defined. That boundary may wrap it as
  an application-safe exception without reclassifying it as an expected
  outcome.

Missing evidence:
- none

Clarification or next step:
none
```

**Incorrect reasoning:** All database failures must be `CommitOutcome`, or a
`Session(Protocol)` return signature means the ORM cannot fail at runtime.

## 5. Over-compression and exception mirroring

**Over-compression:** Replacing `NotFound`, `Conflict`, and
`TemporarilyUnavailable` with `Failed` is wrong when callers respectively show
absence, ask for conflict resolution, and retry.

**One-to-one mirroring:** Replacing `Sdk429Error`, `Sdk503Error`, and
`SdkTimeoutError` with identically named Outcome classes is not translation if
the caller still sees only SDK facts and no new semantic decision is described.

**Unexpected exception handling:** If a corrupted invariant reaches an
Application boundary, do not add `CorruptedInvariant` to every normal result
union merely for completeness. Leave it as an unexpected exception and route
it through the named Application delivery boundary/global error handler. That
boundary may safely wrap it for delivery, but this is not `Promote` and does
not make the defect an expected outcome.
