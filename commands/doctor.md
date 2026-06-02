---
description: Environment health check for claude-wiki-pages. Verifies vault path, schema, raw/wiki layout, hook executability, and glossary gate.
allowed-tools: Bash
---

# /claude-wiki-pages:doctor

The standard way to diagnose the plugin's own state. Prefer the engine doctor
(ten checks D01–D10, agentline-style); fall back to the bash health script when
Bun is unavailable.

## Action

Run the engine doctor:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/engine.sh" doctor --json
```

It returns `{ results: [{ id, title, status, message, hint }], worst }` where
`status` is `pass | warn | fail | fixed | skip`. To auto-repair the fixable
subset (D04 hook perms, D05 git init, D08 settings migration), add `--fix`. To
make warnings/failures gate CI, add `--strict` (exit 3 on any warn/fail).

| ID  | Checks                                            | `--fix`           |
| --- | ------------------------------------------------- | ----------------- |
| D01 | Vault path resolves and exists                    | —                 |
| D02 | `schema_version` present and supported            | —                 |
| D03 | `raw/` readable, `wiki/` writable                 | —                 |
| D04 | Every `hooks.json` script exists and is `+x`      | ✓ `chmod +x`      |
| D05 | Vault is a git repo (self-heal is reversible)     | ✓ `git init`      |
| D06 | Bun engine present                                | —                 |
| D07 | User config present / valid                       | —                 |
| D08 | Legacy settings path migrated                     | ✓ copy old → new  |
| D09 | `verify` reports no errors                        | hint: `heal`      |
| D10 | Glossary gate (run in the plugin repo)            | —                 |

If Bun is absent, `engine.sh` warns and exits 0 — then run the bash fallback,
which reports a coarser health status with exit codes 0–5:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.sh"
```

Surface the output and tell the user exactly which check to fix.

## Companion command

- `/claude-wiki-pages:wiki` — run the LLM Wiki itself once doctor reports healthy.

## Specification anchor

`/SPEC.md §9 Role E` (diagnostics), `/SPEC.md §15` (security model — doctor is read-only by contract).
