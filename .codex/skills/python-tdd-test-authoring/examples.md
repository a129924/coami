# Examples

This document provides 6 detailed scenarios covering all verdict paths plus edge cases.

---

## Scenario 1: non-trivial → red-tests-ready (Feature with complete mapping)

**Input Context:**
- Plan.md has been approved by stakeholder.
- D1 classifier output: `{ "verdict": "non-trivial", "reason": "feature" }`.
- Plan Requirements:
  - Req#1: Create `UserAccount.create(email, password)` class method; must validate email format.
  - Req#2: Method must hash password using bcrypt before storage.
  - Req#3: Raise `InvalidEmailError` if email is malformed.
  - Req#4: Raise `PasswordTooWeakError` if password < 8 chars.
- Existing test structure: `tests/models/test_user.py` with fixtures for `db_session`, `sample_email`.
- Production code: `src/models/user.py` unmodified (no create method yet).

**Process Steps:**

1. D1 verdict is non-trivial → proceed.
2. Map requirements:
   - Req#1 → `test_create_user_with_valid_email`
   - Req#2 → `test_password_hashed_with_bcrypt`
   - Req#3 → `test_create_user_invalid_email_raises_error`
   - Req#4 → `test_create_user_weak_password_raises_error`
3. Check test categories:
   - Happy path: `test_create_user_with_valid_email`
   - Error cases: `test_create_user_invalid_email_raises_error`, `test_create_user_weak_password_raises_error`
   - Boundary: `test_create_user_password_exactly_8_chars`
   - State: `test_password_hashed_with_bcrypt`
   - Integration: `test_create_user_transaction_rollback_on_db_error` (mock db)
4. All 5 categories present → ✓
5. Public contract: `UserAccount.create()` method and 2 exception types → all tested.
6. Each test mapping records expected and observed `red` status because the method is not implemented.
7. Verify production_code_modified: false → ✓

**Output YAML:**

```yaml
verdict: "red-tests-ready"
d1_verdict:
  verdict: "non-trivial"
  reason: "feature"
test_mapping:
  - requirement_id: "Req#1"
    test_case_name: "test_create_user_with_valid_email"
    coverage_category: "happy_path"
    test_command: "pytest --no-header -rN tests/models/test_user.py -k test_create_user_with_valid_email"
    expected_initial_status: "red"
    observed_initial_status: "red"
    observation_reason: "The planned behavior is not implemented yet."
  - requirement_id: "Req#2"
    test_case_name: "test_password_hashed_with_bcrypt"
    coverage_category: "state"
    test_command: "pytest --no-header -rN tests/models/test_user.py -k test_password_hashed_with_bcrypt"
    expected_initial_status: "red"
    observed_initial_status: "red"
    observation_reason: "The planned state change is not implemented yet."
  - requirement_id: "Req#3"
    test_case_name: "test_create_user_invalid_email_raises_error"
    coverage_category: "error_cases"
    test_command: "pytest --no-header -rN tests/models/test_user.py -k test_create_user_invalid_email_raises_error"
    expected_initial_status: "red"
    observed_initial_status: "red"
    observation_reason: "The planned rejection behavior is not implemented yet."
  - requirement_id: "Req#4"
    test_case_name: "test_create_user_weak_password_raises_error"
    coverage_category: "error_cases"
    test_command: "pytest --no-header -rN tests/models/test_user.py -k test_create_user_weak_password_raises_error"
    expected_initial_status: "red"
    observed_initial_status: "red"
    observation_reason: "The planned rejection behavior is not implemented yet."
  - requirement_id: "Req#4"
    test_case_name: "test_create_user_password_exactly_8_chars"
    coverage_category: "boundary"
    test_command: "pytest --no-header -rN tests/models/test_user.py -k test_create_user_password_exactly_8_chars"
    expected_initial_status: "red"
    observed_initial_status: "red"
    observation_reason: "The exact password-length boundary is not implemented yet."
  - requirement_id: "Req#1"
    test_case_name: "test_create_user_transaction_rollback_on_db_error"
    coverage_category: "integration"
    test_command: "pytest --no-header -rN tests/models/test_user.py -k test_create_user_transaction_rollback_on_db_error"
    expected_initial_status: "red"
    observed_initial_status: "red"
    observation_reason: "The create workflow and rollback behavior are not implemented yet."

validation_checks:
  d1_decision: "non-trivial (feature)"
  behavior_contract_source: "spec.md"
  requirements_mapped: true
  public_contract_coverage: true
  test_categories_present: 5
  initial_statuses_observed: true
  test_commands_recorded: true
  production_code_modified: false

issues: []

next_step: "Proceed to implementation. All 4 requirements mapped. 5 test categories confirmed. Tests will start as RED."
```

---

## Scenario 2: trivial → skip_with_reason (Valid skip, not error)

**Input Context:**
- Plan.md submitted for test authoring.
- D1 classifier output: `verdict: "trivial"`, `reason: "doc_only"` (only docstring updates).
- Plan Requirements: "Update docstrings for UserAccount class".
- Production code: Changes are docstring-only; no behavior changes.

**Process Steps:**

1. D1 verdict is `trivial` with reason `doc_only` → Skip test authoring (this is valid per design).
2. Return early with skip verdict.
3. No test_mapping needed.
4. No issues.

**Output YAML:**

```yaml
verdict: "skip_with_reason"
d1_verdict:
  verdict: "trivial"
  reason: "doc_only"
reason: "doc_only"
context: "Plan contains only docstring updates. No behavior changes detected. Test authoring not required."

test_mapping: []
validation_checks: {}
issues: []

next_step: "Docstring changes approved without test authoring. Return to plan workflow."
```

---

## Scenario 3: trivial → skip_with_reason (Internal refactor, behavior unchanged)

**Input Context:**
- Plan.md approved for refactoring.
- D1 classifier output: `{ "verdict": "trivial", "reason": "internal_refactor" }` (extract private method; no observable behavior change).
- Plan Requirements:
  - Req#1: Extract `_validate_email()` private method from `UserAccount.create()`.
  - Req#2: Behavior of `UserAccount.create()` unchanged; tests must still pass.
- Existing test structure: `tests/models/test_user.py` already has 6 green tests for `UserAccount.create()`.
- Production code: `src/models/user.py` not modified yet.

**Process Steps:**

1. D1 verdict is trivial (`internal_refactor`) → skip test authoring per classifier contract.
2. Existing 6 passing tests are supporting evidence only; they do not change the skip path.
3. Verify production_code_modified: false → ✓

**Output YAML:**

```yaml
verdict: "skip_with_reason"
d1_verdict:
  verdict: "trivial"
  reason: "internal_refactor"
reason: "internal_refactor"
context: "Private-method extraction with no observable behavior change. Existing tests remain green; no new RED test authoring required."
test_mapping: []

validation_checks:
  d1_decision: "trivial (internal_refactor)"
  production_code_modified: false
  existing_regression_coverage: "confirmed by existing tests"

issues: []

next_step: "Skip new test authoring. Keep running existing suite before/after refactor to confirm no regression."
```

---

## Scenario 4: needs-rework (Incomplete test mapping)

**Input Context:**
- Plan.md submitted for test authoring.
- D1 classifier output: `{ "verdict": "non-trivial", "reason": "bug_fix" }`.
- Plan Requirements:
  - Req#1: Fix bug: `UserAccount.create()` should reject emails with leading/trailing whitespace.
  - Req#2: Error message must include the raw email received.
  - Req#3: (VAGUE) "Improve error handling for edge cases".
- Existing test structure: `tests/models/test_user.py` with 3 existing tests.
- Production code: `src/models/user.py` unmodified.

**Process Steps:**

1. D1 verdict is non-trivial (bug_fix) → proceed.
2. Map requirements:
   - Req#1 → `test_create_user_rejects_email_with_leading_whitespace`
   - Req#2 → `test_error_message_includes_raw_email`
   - Req#3 → CANNOT MAP: requirement is too vague; what "edge cases"?
3. Validation fails: test_mapping is incomplete (only 2 of 3 requirements mapped).
4. Public contract check: Unclear if other edge cases need test coverage.
5. Test categories: boundary and error handling are covered by the two mapped requirements. State/side-effect and integration are N/A because this input-validation change has neither; a valid-email happy-path case is still applicable and missing.

**Output YAML:**

```yaml
verdict: "needs-rework"
d1_verdict:
  verdict: "non-trivial"
  reason: "bug_fix"
test_mapping:
  - requirement_id: "Req#1"
    test_case_name: "test_create_user_rejects_email_with_leading_whitespace"
    coverage_category: "boundary"
    test_command: null
    expected_initial_status: "unset"
    observed_initial_status: "not_observed"
    observation_reason: "Test execution is deferred until the ambiguous requirement is clarified."
  - requirement_id: "Req#2"
    test_case_name: "test_error_message_includes_raw_email"
    coverage_category: "error_cases"
    test_command: null
    expected_initial_status: "unset"
    observed_initial_status: "not_observed"
    observation_reason: "Test execution is deferred until the ambiguous requirement is clarified."

validation_checks:
  d1_decision: "non-trivial (bug_fix)"
  behavior_contract_source: "spec.md"
  requirements_mapped: false
  public_contract_coverage: "partial"
  test_categories_present:
    - boundary
    - error_cases
  test_categories_not_applicable:
    - state_side_effect: "UserAccount.create() validation has no state change when it rejects input."
    - integration: "The stated requirements name no external integration point."
  initial_statuses_observed: false
  test_commands_recorded: false
  production_code_modified: false

issues:
  - "Req#3 is too vague: 'Improve error handling for edge cases'. Add specific requirements for each edge case (e.g., null email, empty string, domain validation)."
  - "Add a valid-email happy-path test. State/side-effect and integration categories are N/A for the stated contract and do not require invented tests."
  - "Per-test initial evidence was not observed. Set each expected status, run the tests, and record the command, observed result, and reason."

next_step: "Return to plan review. Clarify Req#3 with specific edge cases. Then run and record each test's command and initial status before resubmitting for test authoring."
```

---

## Scenario 5: insufficient-context (Plan not approved)

**Input Context:**
- Plan.md submitted for test authoring, but NOT yet approved by stakeholder.
- Plan Requirements section is incomplete:
  - Req#1: "Create login flow" (vague; what steps? what errors?)
  - Req#2: (missing description)
- D1 classifier output: Not run yet (plan is too incomplete).
- Production code: `src/auth.py` does not exist yet.

**Process Steps:**

1. Verify prerequisites:
   - Plan approval status: NOT approved → ✗
   - D1 classifier: Not run (insufficient context for classifier) → ✗
2. Cannot proceed: Plan lacks approved status and clear Requirements.

**Output YAML:**

```yaml
verdict: "insufficient-context"
d1_verdict:
  verdict: "trivial"
  reason: "precheck_placeholder_not_from_d1"
reason: "plan_not_approved"
test_mapping: []

validation_checks:
  plan_approval_status: false
  d1_classifier_run: false
  requirements_clarity: "incomplete"
  production_code_modified: false

issues:
  - "Plan has not been approved by stakeholder."
  - "Requirements section is incomplete. Req#1 is vague ('Create login flow'). Req#2 is missing description."
  - "Cannot run D1 classifier without approved plan and clear requirements."

next_step: "Plan must be approved and Requirements must be clarified before test authoring can begin. Contact plan author and stakeholder."
```

Note: In this scenario, D1 is not executed. `d1_verdict` is a skill-layer placeholder for schema consistency only, not classifier output.

---

## Scenario 6: BLOCKED (Non-trivial but missing spec.md)

**Input Context:**
- Plan.md approved.
- D1 classifier output: `{ "verdict": "non-trivial", "reason": "feature" }`.
- `plan/<topic>/<topic>.spec.md` is missing.

**Output YAML:**

```yaml
verdict: "BLOCKED"
d1_verdict:
  verdict: "non-trivial"
  reason: "feature"
test_mapping: []

validation_checks:
  d1_decision: "non-trivial (feature)"
  behavior_contract_source: "missing_spec_md"
  requirements_mapped: false
  public_contract_coverage: false
  test_categories_present: 0
  initial_statuses_observed: false
  production_code_modified: false

issues:
  - "Missing required plan/<topic>/<topic>.spec.md for non-trivial path."

next_step: "Route to python-plan-authoring to create spec.md, then rerun python-tdd-test-authoring."
```

---

## Summary

- **Scenario 1** (red-tests-ready): Non-trivial feature, complete test_mapping, all 5 categories, production code untouched.
- **Scenario 2** (skip_with_reason): D1 detects trivial (doc-only) change; skip test authoring entirely (valid outcome).
- **Scenario 3** (skip_with_reason): Internal refactor classified as trivial; skip new RED test authoring and keep existing regression suite.
- **Scenario 4** (needs-rework): Vague requirements and incomplete test coverage; returns with specific gaps to fix.
- **Scenario 5** (insufficient-context): Plan not approved; cannot author tests without approved, clear plan.
- **Scenario 6** (BLOCKED): D1 is non-trivial but required `spec.md` is missing; route to plan-authoring first.

All verdict paths are covered (`red-tests-ready`, `skip_with_reason`, `needs-rework`, `insufficient-context`, `BLOCKED`). Boundaries are enforced (production code modified = abort, D1 trivial = skip, non-trivial + missing spec = BLOCKED).
