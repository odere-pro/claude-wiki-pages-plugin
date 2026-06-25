---
title: "Plugin Config Schema"
type: concept
aliases: ["plugin config schema", "config.schema.json", "configuration schema", "plugin configuration"]
parent: "[[schemas|Schemas]]"
path: "schemas"
sources: ["[[schemas-claude-md|Schemas Directory README]]", "[[schemas-config-schema-json|Config Schema JSON]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["schemas", "config", "json-schema", "validation"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Plugin Config Schema

`config.schema.json` is the draft-07 JSON Schema that validates every key the claude-wiki-pages plugin reads from user and project configuration files.

## Definition

The schema lives at `schemas/config.schema.json` and ships inside the npm package (`files` array in `package.json`). It is closed (`additionalProperties: false`) at every level — unknown keys produce a hard error, catching typos before they silently degrade plugin behavior. The engine exposes it through `claude-wiki-pages config validate`.

## Key Principles

- **Two config files, one schema.** The schema validates both the user-level config (`~/.config/claude-wiki-pages/config.json`) and the project-level config (`.claude/claude-wiki-pages.json`).
- **Closed at every level.** Any key not declared in the schema is a hard error; no silent pass-through.
- **Lockstep with the default template.** `gate-07` CI check pins `config.schema.json` and `templates/default.config.json` together — changing one without the other breaks the gate.
- **Ships in the npm package.** Installed consumers validate against the same schema the repo does (no drift between repo and installed copy).

## Examples

The eight validated sections are:

| Section | Purpose |
|---|---|
| `version` | Schema version; const 1 |
| `vault.path` | Explicit vault path (optional; four-tier resolution when absent) |
| `autoHeal` | Enabled flag, aggressiveness (mechanical/structural/aggressive), maxIterations |
| `gitCheckpoint` | Mode (commit/branch/both/off), push (off/auto) |
| `firewall` | Vault write isolation: enabled, mode, allowPaths, denyPaths |
| `maintenance` | Autonomous upkeep: enabled, maxPerRun, lintEveryDays, maxParallelExtract, etc. |
| `localModel` | Optional local-model drafting: provider, model, tier, offlinePolicy |
| `modelHints` | Free-form per-task model hint map |

## Related Concepts

The `maintenance.maxParallelExtract` setting (1–8, default 1) controls how many extract workers the ingest agent fans out. `localModel.tier` gates which operations a local model may perform (draft / ingest-extract / query). The firewall section mirrors the `scripts/firewall.sh` hot-path gate.
