# Policy and failure semantics

Use this reference when a boolean hides behavior choices or a fallback could be
mistaken for normal success, absence, or completion.

## Boolean and policy choices

Use a boolean for a natural binary domain fact. When `True` and `False` conceal
multiple behavior choices, or a credible third behavior exists, surface the
choice with a named policy or dedicated operation. The policy must enforce the
meaning it declares; renaming an ambiguous boolean is not enough.

Route concrete signature and model choices to `python-api-signature` and
`python-model-selection`.

## Distinguishable failure

Do not silently collapse a failed operation into `None`, `False`, an empty
collection, a skipped action, or an unchanged value unless that result is a
clear, intentional normal domain state. A caller must be able to tell failure
from valid absence or success whenever the distinction changes its next action.

Route exception hierarchy and translation to `python-error-handling`. Retry orchestration and logging policy have no dedicated owner in this library; disclose that boundary and consult project policy or verified general guidance instead of sending an out-of-scope handoff.
