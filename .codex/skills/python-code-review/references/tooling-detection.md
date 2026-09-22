# Tooling detection rules and severity calibration

## Detection priority order

Inspect relevant sources per tool rather than stopping at the first matching file. Do not execute tools in this review.

| Source | Evidence |
|---|---|
| `pyproject.toml` | Ruff, Pyright, mypy, pytest and other configured tools |
| Tool-specific files | `pyrightconfig.json`, `ruff.toml`, `.ruff.toml`, `mypy.ini`, `.mypy.ini`, `setup.cfg`; use the tool's actual precedence |
| `Makefile` / CI / project docs | Selected validation commands, explicit flags and configuration paths |
| Fallback | Only for a tool/dimension with no configuration evidence |

For Pyright, `pyrightconfig.json` takes precedence over `[tool.pyright]`; follow `extends` and execution-environment overrides when relevant. Global strictness is `typeCheckingMode = "strict"` in TOML or `"typeCheckingMode": "strict"` in JSON. `strict` is an array of paths, not a boolean; apply path-specific strictness only to matching files. An explicit CLI/config selection must be accounted for. Report unresolved conflicts rather than guessing.
Finding a linter is not evidence that the project lacks typing configuration.

## How detected tooling calibrates severity

- Effective Pyright strict mode for the reviewed file, or `[tool.mypy]` with `strict = true`:
  - `Any` annotations → `blocking`
  - Missing annotations on any public API → `blocking`
  - `# type: ignore` without inline comment → `blocking`
- `[tool.pyright]` without strict or `[tool.mypy]` without strict:
  - Missing annotations on public APIs → `warning`
  - `Any` with inline justification → `warning`
- `[tool.ruff]` or `[tool.flake8]`:
  - Naming violations, unused imports → `warning` (or `blocking` if the config sets them as errors)
- Generic fallback:
  - Apply PEP 8 and standard Python best practices
  - Missing annotations on public APIs → `warning` (never `blocking` in fallback mode)
  - Hard-discouraged anti-patterns still flagged as `blocking`
  - No strict-mode typing rules applied

Record `tooling_detected: generic fallback (no pyproject.toml or Makefile found)` in output when fallback applies.

## Severity classification

| Severity | Definition | Verdict impact |
|---|---|---|
| `blocking` | A correctness issue, a security risk, a hard anti-pattern, or a strict-mode violation. The code must not be merged as-is. | Triggers `needs-rework` |
| `warning` | A quality issue that should be addressed soon. Does not block merge on its own, but accumulation of warnings is a signal to address before the next review cycle. | Does not trigger `needs-rework` alone |
| `info` | An optional improvement, style note, or readability suggestion. Low urgency. | Does not trigger `needs-rework` |

**Verdict rule:**
- `approved` — zero `blocking` findings across all 7 dimensions.
- `needs-rework` — one or more `blocking` findings.

**Escalation:**
- A `warning` may be escalated to `blocking` if the reviewer judges the cumulative risk is
  unacceptable. State the escalation rationale explicitly in the finding.
