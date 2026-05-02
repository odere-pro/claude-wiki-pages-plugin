# Migration to `0.2.0`

`0.2.0` introduces a top-level `/llm-wiki-stack:wiki` orchestrator command and renames three Layer 3 agents to the `{plugin-name}-{role}-agent` convention. **Vaults themselves are unchanged** — `schema_version: 1` continues to be supported. Only plugin-side identifiers moved.

If you have not pinned any agent name in scripts, automations, or notes, no action is required: keep using the new `/llm-wiki-stack:wiki` entry point and the orchestrator handles the rest.

## What changed

### Renamed agents

| Old (≤ `0.1.x`)            | New (`0.2.0`+)                      | Why                                                                       |
| -------------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| `llm-wiki-ingest-pipeline` | `llm-wiki-stack-ingest-agent`       | Adopt `{plugin-name}-{role}-agent` convention.                            |
| `llm-wiki-lint-fix`        | `llm-wiki-stack-curator-agent`      | The agent gates judgment fixes behind plans — that is curation, not lint. |
| `llm-wiki-analyst`         | `llm-wiki-stack-analyst-agent`      | Convention parity.                                                        |

A new agent, `llm-wiki-stack-orchestrator-agent`, joins them as the user-facing entry. It is invoked by the new `/llm-wiki-stack:wiki` slash command.

### New top-level commands

| Command                          | What it does                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `/llm-wiki-stack:wiki`           | Probes vault state and dispatches to the right specialist (wizard, ingest, curator, analyst). One verb does the right thing. |
| `/llm-wiki-stack:wiki-doctor`    | Environment health check (`scripts/doctor.sh`). Exit codes 0–5 cover vault path, schema, layout, hooks, vocab. |

### Specification moved

`docs/SPECIFICATION.md` → `/SPEC.md` (repository root). A one-line stub remains at the old path through `0.2.x`; it is removed in `0.3.0`.

## Search-and-replace map

For scripts, automation, or notes that pin the old names. Run from your project root:

```sh
# Agent renames (in your own automation files — not in the plugin tree)
grep -rl 'llm-wiki-ingest-pipeline' . | xargs sed -i.bak 's/llm-wiki-ingest-pipeline/llm-wiki-stack-ingest-agent/g'
grep -rl 'llm-wiki-lint-fix'        . | xargs sed -i.bak 's/llm-wiki-lint-fix/llm-wiki-stack-curator-agent/g'
grep -rl 'llm-wiki-analyst'         . | xargs sed -i.bak 's/llm-wiki-analyst/llm-wiki-stack-analyst-agent/g'

# Spec path
grep -rl 'docs/SPECIFICATION\.md'   . | xargs sed -i.bak 's|docs/SPECIFICATION\.md|SPEC.md|g'
```

Review the diffs before committing. The `.bak` files are byproducts of `sed -i.bak` (BSD-compatible); delete them once the diff looks right.

## What you do _not_ need to change

- **Vault content.** Pages, frontmatter, `wiki/log.md`, `_index.md` files — all unchanged.
- **`schema_version`.** Still `1`. The `supported_schema_versions` array in `plugin.json` is unchanged.
- **Hook configuration.** `hooks/hooks.json` does not reference any of the renamed agents by name.
- **Skill names.** All 13 skills keep their existing names. Only the three Layer 3 agents were renamed.

## Recommended new workflow

Replace any custom workflow that chained the old agents:

**Before** (you remembered each step):

1. `/llm-wiki-stack:llm-wiki` — init the vault.
2. The pipeline agent (then named `llm-wiki-ingest-pipeline`) — ingest.
3. The lint-fix agent (then named `llm-wiki-lint-fix`) — repair.
4. `/llm-wiki-stack:llm-wiki-status` — verify.

**After** (the orchestrator chains it for you):

```text
/llm-wiki-stack:wiki   # the plugin probes vault state and runs what's needed
```

The power-user surface remains: you can still invoke specialists directly when scripting. The orchestrator is the recommended interactive default.

## Where to read more

- [`/CHANGELOG.md`](../../CHANGELOG.md) — full `0.2.0` entry.
- [`/SPEC.md`](../../SPEC.md) — `§9` (command contracts), `§11` (agent contracts including the orchestrator).
- [`docs/adr/ADR-0001-four-layer-orchestrator.md`](../adr/ADR-0001-four-layer-orchestrator.md) — why the orchestrator exists.
- [`docs/adr/ADR-0002-agent-naming-convention.md`](../adr/ADR-0002-agent-naming-convention.md) — why the rename, why hard not soft.
