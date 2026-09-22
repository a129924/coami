# Reference — plan-step-tracker

## Canonical file and marker rules

- The tracked file path is `plan/<topic>/<topic>.step.md`.
- The Python CLI parses only lines that match the regex `^\- \[(.)\](.*)`.
- Marker interpretation is fixed for accepted checkbox markers:
  - `[X]` = done
  - `[ ]` = pending
  - `[x]` = pending and warning-worthy
- Any other single character inside the brackets still matches the parser, emits a warning, and is treated as pending.
- This skill is read-only; it reports declared checkbox state and does not repair formatting.

## Python CLI contract

Use the local script from the repository root:

```bash
python skills/plan-step-tracker/scripts/step_tracker.py <operation> <topic>
```

Supported operations:

| Operation | Result | Exit code |
| --- | --- | --- |
| `read_all` | prints all parsed checkbox lines | `0` |
| `read_not_run` | prints pending lines, including `[x]` | `0` |
| `read_success` | prints completed `[X]` lines | `0` |
| `check_all_succeeded` | prints success summary if all done; otherwise blocked summary plus pending lines | `0` for valid nonempty completed evidence, `1` when pending or invalid |
| `check_impl_steps_succeeded` | prints success summary when `## Implementation Steps` is complete; otherwise blocked summary plus pending implementation lines | `0` for valid nonempty completed implementation evidence, `1` when pending or invalid |

Error contract:

- Missing file prints `Error: File not found: plan/<topic>/<topic>.step.md` to stderr and returns exit code `1`.
- Lowercase `[x]` prints `Warning: Found lowercase [x] at line N; treating as pending` to stderr.

## Implementation-only scope rule

- `check_impl_steps_succeeded` inspects only checkbox lines under the `## Implementation Steps` section.
- Pending items outside `## Implementation Steps` do not block `check_impl_steps_succeeded`.
- Exactly one Implementation Steps section must exist and contain valid nonempty task text. Missing, empty, duplicate, unreadable, or malformed evidence returns `1`; only uppercase `[X]` is done. Query operations keep their permissive parsing contract, but completion checks reject unsupported task formats rather than silently ignoring them.

## Grep fallback guidance

Use grep only when the Python CLI cannot run.

Output format note:

- grep preserves the original leading `- ` prefix from the `.step.md` line
- the Python CLI normalizes matching lines to `[X] foo` / `[ ] foo` / `[x] foo`
- if a caller needs grep output to resemble the CLI contract, normalize it explicitly with `sed 's/^- //'`

```bash
# all parsed checkbox lines
grep '^\- \[.\]' plan/<topic>/<topic>.step.md

# pending lines with a broad fallback that catches both [ ] and [x]
grep '^\- \[[ x]\]' plan/<topic>/<topic>.step.md

# completed lines
grep '^\- \[X\]' plan/<topic>/<topic>.step.md

# normalized fallback output that more closely matches the Python CLI format
grep '^\- \[.\]' plan/<topic>/<topic>.step.md | sed 's/^- //'
```

Completion fallback:

Grep is a listing aid, not a completion validator. Zero matches, a failed read, or an empty section cannot prove completion. If the CLI cannot run, inspect the file directly: require readable input, the intended section exactly once, at least one nonempty supported task, no malformed markers, and only `[X]` tasks. For a whole-file check, validate all task-like lines rather than the implementation section alone. If any of these checks cannot be established, report BLOCKED; do not emit an automated success exit based on grep counts.

Fallback limitation:

- grep can approximate pending detection for `[x]`, but it does not emit the Python CLI warning automatically
- when using grep fallback, call out lowercase `[x]` manually if present
- section-scoped fallback commands are only an approximation of the Python CLI; prefer the CLI when exact implementation-step semantics matter
