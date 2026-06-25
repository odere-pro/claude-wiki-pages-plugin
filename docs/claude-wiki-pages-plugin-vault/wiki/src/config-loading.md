---
title: "Config Loading"
type: concept
aliases: ["config-loading", "Four-Layer Config", "Config Merge", "loadConfig"]
parent: "[[src|Src]]"
path: "src"
sources: ["[[src-data-config|src/data/config.ts — Configuration Loading]]"]
related: []
tags: ["src", "data", "config", "configuration"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Config Loading

Configuration loading via a four-layer merge pipeline. `Config` is a readonly plain-data interface (intentionally anemic) — encapsulation consciously waived in favour of the structuredClone + deepMerge pipeline.

## Definition

`data/config/config.ts` builds the effective config by deep-merging four layers, lowest precedence first. The merged result is validated against `schemas/config.schema.json`.

## Key Principles

**Four layers (lowest to highest precedence)**:
1. `DEFAULT_CONFIG` — hardcoded defaults in `config.ts`
2. User: `${CLAUDE_CONFIG_DIR:-~/.config}/claude-wiki-pages/config.json`
3. Project: `.claude/claude-wiki-pages.json`
4. Env: `CLAUDE_WIKI_PAGES_*` leaf overrides (mapped via `ENV_MAP`)

**`Config` interface sections**:
- `vault.path`: explicit vault override
- `autoHeal`: `enabled`, `aggressiveness` (`mechanical|structural|aggressive`), `maxIterations`
- `gitCheckpoint`: `mode` (`commit|branch|both|off`), `push` (`off|auto`)
- `firewall`: `enabled`, `mode`, `allowPaths`, `denyPaths`
- `maintenance`: `enabled`, `autoCatchupOnSessionStart`, `lintEveryDays`, `maxPerRun`, `cooldownMinutes`, `maxParallelExtract` (1–8), `unattended`, `syncWiredOnRun`
- `localModel`: `enabled`, `provider`, `endpoint`, `model`, `draftTarget`, capability tier

**Intentionally anemic**: `Config` is plain data, not encapsulated. The four-layer merge pipeline uses `structuredClone` + `deepMerge` over a plain object. Wrapping in a class would break the pipeline or require fragile re-serialisation.

**`validateConfig`**: validates against `schemas/config.schema.json` (enum + nested-object checks).

**`maintenance.maxParallelExtract`**: cap on parallel EXTRACT workers during ingest (default 1 = sequential, clamped [1,8]). Enables ADR-0026 parallel-extract fan-out when set > 1.

**CI gate**: gate-07 (`tests/gates/gate-07-config-schema.sh`) pins the schema.

## Examples

- User sets `maintenance.maxParallelExtract: 4` → ingest spins up to 4 extract workers
- `autoHeal.aggressiveness: "aggressive"` → `heal` applies more structural fixes per iteration
- `gitCheckpoint.push: "auto"` → `heal` pushes after a clean heal commit

## Related Concepts

- `commands/config/config.ts` exposes `show`, `validate`, `path` subcommands for the CLI
- `data/templates.ts` holds embedded frontmatter skeletons used by `migrate`
- Config is read by `heal`, `backlog`, `snapshot`, and maintenance loop
