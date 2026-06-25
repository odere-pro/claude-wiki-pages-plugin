---
title: "Config Sections"
type: concept
aliases: ["config sections", "configuration blocks", "autoHeal config", "gitCheckpoint config", "firewall config", "maintenance config", "localModel config"]
parent: "[[schemas|Schemas]]"
path: "schemas"
sources: ["[[schemas-config-schema-json|Config Schema JSON]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["schemas", "config", "autoHeal", "gitCheckpoint", "firewall", "maintenance"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Config Sections

The eight top-level configuration sections in `config.schema.json`, each controlling a distinct behavioral domain of the claude-wiki-pages plugin.

## Definition

Configuration is split into named blocks so users can override exactly one area without touching unrelated defaults. Every block is optional — absent sections fall back to the defaults declared in `templates/default.config.json`. Unknown keys are rejected by the closed schema.

## Key Principles

**autoHeal** — controls the structural self-repair loop. `aggressiveness` levels: `mechanical` (wikilinks, MOCs, frontmatter only), `structural` (adds restructure and merge), `aggressive` (adds deletions). `maxIterations` caps the loop at 1–20 runs (default 5).

**gitCheckpoint** — determines how each write-phase is snapshotted. `mode: commit` (default) makes an inline commit; `branch` pins a rollback branch; `both` does both; `off` skips git ops. `push: auto` pushes to the configured upstream after each checkpointed op (best-effort, default off).

**firewall** — confines agent writes to the resolved vault path. `mode: enforce` (default) blocks out-of-vault writes; `warn` advises only; `off` passes through. `denyPaths` default blocks `.ssh/**`, `.aws/**`, `.env`, and `.git/config`.

**maintenance** — drives the autonomous upkeep loop. `enabled: false` by default; `autoCatchupOnSessionStart` triggers on backlog detection; `maxParallelExtract` (1–8) controls extract worker count; `unattended` routes uncertain output to `_proposed/` instead of `wiki/`.

**localModel** — optional Ollama/LM Studio integration for offline drafting. `tier` gates capability: `draft` (safest), `ingest-extract`, or `query`. `offlinePolicy: prefer-local` falls back to the approved local model when Claude is unreachable.

## Examples

A minimal project config enabling structural auto-heal with git commits and no push:

```json
{
  "version": 1,
  "autoHeal": { "enabled": true, "aggressiveness": "structural" },
  "gitCheckpoint": { "mode": "commit" }
}
```

## Related Concepts

`templates/default.config.json` is the seed config the plugin writes on first run — every key in it must be a valid schema value. The `gate-07` CI check enforces their lockstep.
