# Python serialization-boundaries examples

Use these examples after `SKILL.md` narrows the task to semantic boundary
translation rather than generic JSON or framework usage.

## PATCH semantics: missing vs null vs unchanged

### Preserve omission separately from explicit `null`

```py
_NOT_SET = object()


class UserPatch:
    def __init__(self, *, display_name: str | None | object = _NOT_SET) -> None:
        self.display_name = display_name


def parse_user_patch(payload: dict[str, object]) -> UserPatch:
    return UserPatch(
        display_name=(
            payload["display_name"] if "display_name" in payload else _NOT_SET
        )
    )
```

- `_NOT_SET` means the caller omitted the field, so business logic can leave it
  unchanged.
- `None` means the caller explicitly wants to clear the field.
- A concrete value means replace the field.

### Avoid collapsing omission and explicit `null`

```py
def parse_user_patch(payload: dict[str, object]) -> dict[str, str | None]:
    return {"display_name": payload.get("display_name")}
```

- Missing and explicit `null` both become `None`.
- The boundary has already destroyed the caller's intent.

## Input DTO and output DTO asymmetry

### Separate write intent from publication shape

```py
from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class CreateOrderInput:
    customer_id: UUID
    notes: str | None


@dataclass(frozen=True)
class OrderSummaryOutput:
    order_id: str
    status: str
```

- The input DTO exists to capture what the caller may send.
- The output DTO exists to publish only the fields the boundary promises back.
- No rule says the response must echo every input field or internal attribute.

### Avoid one DTO for every boundary

```py
from dataclasses import dataclass


@dataclass
class OrderDto:
    customer_id: str
    notes: str | None
    internal_retry_count: int
    db_row_version: int
```

- Request, database, queue, and response concerns are now mixed together.
- Internal fields will leak outward or force awkward optionality inward.

## Boundary type normalization

### Normalize semantic primitives at the boundary

```py
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID


def parse_payment_row(row: dict[str, str]) -> tuple[UUID, datetime, Decimal]:
    payment_id = UUID(row["payment_id"])
    created_at = datetime.fromisoformat(row["created_at"]).astimezone(
        timezone.utc
    )
    amount = Decimal(row["amount"])
    return payment_id, created_at, amount
```

- Core logic receives semantic values instead of storage strings.
- This skill decides the boundary timing, not the internal model construct.

### Avoid letting transport parsing leak inward

```py
def apply_payment(row: dict[str, str]) -> None:
    if row["created_at"].endswith("Z"):
        ...
```

- Business logic is still parsing the storage or wire format.
- UUID, datetime, and decimal meaning have not crossed the boundary yet.

## Deep conversion

### Convert nested child payloads too

```py
from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class LineItem:
    product_id: UUID
    quantity: int


def parse_items(payload: list[dict[str, str]]) -> list[LineItem]:
    return [
        LineItem(product_id=UUID(item["product_id"]), quantity=int(item["quantity"]))
        for item in payload
    ]
```

- The boundary returns fully converted child objects.
- Callers do not need to inspect raw nested dictionaries later.

### Avoid shallow wrappers with raw children

```py
from dataclasses import dataclass


@dataclass
class OrderPayload:
    items: list[dict[str, str]]
```

- The wrapper looks typed, but the real transport shape still leaks inside.
- This blocks honest typing and clear boundary ownership.

## Lossy and non-round-trip output

### Allow output that matches publication needs

```py
def to_public_user_summary(user: InternalUser) -> dict[str, object]:
    return {
        "user_id": str(user.user_id),
        "display_name": user.display_name,
        "created_at": user.created_at.isoformat(),
    }
```

- Internal audit flags, permissions, and tokens do not need to round-trip out.
- Output may summarize or redact when that is the real contract.

### Avoid treating internals as the public contract

```py
def to_public_user(user: InternalUser) -> dict[str, object]:
    return user.__dict__
```

- This publishes internal naming and accidental fields as if they were stable.
- Output now depends on internal refactors instead of an explicit boundary DTO.

## Local vs shared boundary schemas

### Keep one-off schemas local by default

- A queue consumer's raw message parser can keep its schema local when only that
  consumer owns the contract.
- Matching field names with an API DTO is not enough reason to extract a shared
  module.

### Promote only true shared external contracts

- Promote a schema when multiple producers or consumers must keep the same wire
  meaning, versioning, and documentation.
- Shared ownership should follow external-contract ownership, not "we saw the
  same JSON twice."

## Supplementary framework notes

### Framework helpers can support the rule without owning it

```py
# Example only: Pydantic/FastAPI-style unset tracking
update = UserPatchModel.model_validate(payload)
if "display_name" in update.model_fields_set:
    ...
```

- Framework unset tracking can help preserve omission versus explicit `null`.
- Still translate from the framework object into the internal update contract
  before business logic depends on it.
