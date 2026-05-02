---
description: Environment health check for llm-wiki-stack. Verifies vault path, schema, raw/wiki layout, hook executability, and vocabulary gate.
allowed-tools: Bash
---

# /llm-wiki-stack:wiki-doctor

Run `scripts/doctor.sh` and surface its output verbatim. Exit codes:

| Code | Meaning                                                                       |
| ---- | ----------------------------------------------------------------------------- |
| 0    | Healthy.                                                                      |
| 1    | Vault path unresolvable (no env var, no settings, no auto-detect, default missing). |
| 2    | `schema_version` absent in `vault/CLAUDE.md` or not in the supported list.    |
| 3    | `raw/` not readable, or `wiki/` not writable.                                 |
| 4    | One or more scripts referenced from `hooks/hooks.json` is not executable.    |
| 5    | `validate-docs.sh` reports vocabulary drift in plugin prose.                  |

## Action

Invoke the script directly:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.sh"
```

Print stdout/stderr verbatim. Do not interpret. The exit code tells the user what to fix; each `FAIL[N]` line names the offending artifact and the remedy.

## Companion command

- `/llm-wiki-stack:wiki` — run the LLM Wiki itself once doctor reports healthy.

## Specification anchor

`/SPEC.md §9 Role E` (diagnostics), `/SPEC.md §15` (security model — doctor is read-only by contract).
