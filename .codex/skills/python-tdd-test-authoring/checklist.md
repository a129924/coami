# Verification Checklist

Use this checklist when authoring or reviewing RED tests for a Python implementation plan. All 9 items must be verified before returning a verdict.

---

## Pre-execution checks

- [ ] **1. Plan approval status confirmed**: Plan.md has been reviewed and approved by stakeholder or plan reviewer. Evidence: plan has approval date or reviewer sign-off.

- [ ] **2. D1 classifier decision confirmed**: D1 behavior-change classifier has been run and returned `d1_verdict: { "verdict": "trivial|non-trivial", "reason": "..." }`. If D1 verdict is `trivial`, return `skip_with_reason` immediately. If D1 verdict is `non-trivial`, proceed.

---

## Mapping and coverage checks

- [ ] **3. All Requirements mapped to tests**: Every requirement in plan.md has at least one test case name in test_mapping. Cardinality check: `len(test_mapping) >= len(plan_requirements)`. No requirement should be left unmapped.

- [ ] **4. Public API/contract coverage complete**: Tests cover all:
  - Public functions and class methods (including constructors).
  - Return types and return value contracts (not just "method runs").
  - Error types (all documented exceptions have test cases).
  - Documented side effects or state changes (database writes, cache updates, etc.).

- [ ] **5. Applicable categories covered**: Assess each category; record a concrete N/A reason for categories with no affected behavior:
  - (1) **Happy path**: Main success scenario; behavior works as documented.
  - (2) **Error/exception cases**: Tests for the documented error conditions (ValueError, RuntimeError, custom exceptions).
  - (3) **Boundary/edge cases**: Limits, empty inputs, None, max/min values, boundary values (e.g., password exactly 8 chars).
  - (4) **State/side effects**: Tests that verify state is mutated correctly or side effects occur (database writes, file creation, cache updates).
  - (5) **Integration points**: If the code calls external services or collaborators, at least one mock/fake test to verify the contract.

  Missing applicable behavior coverage → `needs-rework`; a justified N/A category is not a missing test.

---

## Status and constraint checks

- [ ] **6. Per-test initial status observed**: Every test_mapping entry records its actual test command, expected and observed initial status, plus an observation reason. A suite may mix these states:
  - `red`: Tests are written and failing (most common TDD case).
  - `pass_existing`: Tests are written but already passing (refactor guard; run the test suite to confirm).
  - `xfail`: Tests are marked `@pytest.mark.xfail` (advanced; only if plan explicitly requests this).
  - `skip`: Tests are marked `@pytest.mark.skip` (rare; only if plan explicitly requests this).

  Run affected tests and record the actual command and observed states. A RED assertion must demonstrate missing target behavior; import, collection, fixture and unrelated environment failures are not valid RED evidence. Green regression guards and explicitly requested skip/xfail cases need not fail. If status is unset or unclear → `needs-rework`; `red-tests-ready` requires a non-empty command for every mapping entry.

- [ ] **7. production_code_modified guard: FALSE**: Confirm that **NO production code has been modified**. Verification:
  - Check git status: `git diff src/` (or equivalent) should be empty or contain only test files.
  - Check git log: Last commit should not have modified any production code files.
  - Manual review: Scan the file list; only test files should be staged or modified.

  If production code is modified → **ABORT immediately**. Return error: "Hard constraint violated: production_code_modified = true. Test authoring must happen first."

---

## Test structure and YAML schema checks

- [ ] **8. Test file structure and YAML schema valid**: Verify:
  - Test file(s) exist or will be created in the correct location (e.g., `tests/models/test_user.py`).
  - Test function names follow naming convention (e.g., `test_*` in pytest).
  - Output YAML has all required keys:
    - `verdict` (one of: `red-tests-ready`, `needs-rework`, `insufficient-context`, `skip_with_reason`, `BLOCKED`)
    - `d1_verdict` (object: `{ "verdict": "trivial|non-trivial", "reason": "..." }`)
    - `test_mapping` (list of objects with keys: `requirement_id`, `test_case_name`, `coverage_category`, `test_command`, `expected_initial_status`, `observed_initial_status`, `observation_reason`)
    - `validation_checks` (object with all checks, including: d1_decision, behavior_contract_source, requirements_mapped, public_contract_coverage, test_categories_present, initial_statuses_observed, test_commands_recorded, production_code_modified)
    - `issues` (list of strings; empty list if no issues)
    - `next_step` (string describing next action)

  If YAML is missing keys or structure is incorrect → `needs-rework`.

---

## Boundary enforcement checks

- [ ] **9. All 5 hard boundaries enforced**:
  - **Boundary 1 (Never modify production code)**: Verified in item #7 above. If violated → abort.
  - **Boundary 2 (D1 classifier gates verdict)**: If D1 says `trivial`, honor it; do not override to `red-tests-ready`. Return `skip_with_reason` instead.
  - **Boundary 3 (Test mapping must be complete)**: Every requirement has at least one test. If not → `needs-rework`.
  - **Boundary 4 (per-test initial evidence must be recorded)**: Every test_mapping entry includes test_command, expected_initial_status, observed_initial_status, and observation_reason. If any is missing, or any `red-tests-ready` command is empty → `needs-rework`.
  - **Boundary 5 (non-trivial requires spec.md)**: If D1 is `non-trivial` and `plan/<topic>/<topic>.spec.md` is missing, return `BLOCKED` and route to `python-plan-authoring`.

  If any boundary is violated → reflect violation in verdict and issue list.

---

## Checklist usage

**Before submitting verdict:**
1. Go through all 9 items top to bottom.
2. Mark each item ✓ if satisfied.
3. If all 9 are ✓, return verdict: `red-tests-ready` (assuming D1 is non-trivial and no issues found).
4. If any item is ✗ or conditional, return verdict: `needs-rework` with specific issues listed.
5. If prerequisites (items 1-2) fail or plan is unapproved, return: `insufficient-context`.
6. If D1 is `trivial` (item 2), return: `skip_with_reason` with D1 verdict and reason.

**Example success path:**
- Items 1-9 all ✓
- D1 verdict: non-trivial
- No issues found
- → Return `red-tests-ready`

**Example needs-rework path:**
- Items 1-3 ✓
- Item 4 ✗ (public contract not covered; missing error type tests)
- Item 5 ✗ (an applicable category is missing without a justification)
- → Return `needs-rework` with issues listed

**Example insufficient-context path:**
- Item 1 ✗ (plan not approved)
- → Return `insufficient-context`

**Example blocked path:**
- D1 verdict: non-trivial
- `plan/<topic>/<topic>.spec.md` missing
- → Return `BLOCKED` and route to `python-plan-authoring`

---

## Local context

See `references/` for supporting guidance:
- `behavior-change-classifier.md`: Rules for D1 classifier decision.
- `codebase-evidence-levels.md`: Evidence levels for test authoring confidence (insufficient, minimal, sufficient).
- `atomic-commit-order.md`: Commit sequencing (test-first requirement and enforcement).
