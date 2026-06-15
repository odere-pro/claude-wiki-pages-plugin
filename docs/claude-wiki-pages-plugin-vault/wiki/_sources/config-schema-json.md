---
title: "Config Schema (config.schema.json)"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages plugin project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["schema", "config", "json-schema"]
aliases: ["Config Schema (config.schema.json)"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Config Schema (config.schema.json)

## Metadata

- **Author:** claude-wiki-pages plugin project
- **Publisher:** claude-wiki-pages plugin project
- **Published:** 2026-06-13
- **URL:** raw/repo/knowledge-graph/config.schema.json

## Summary

`config.schema.json` is the JSON Schema (draft-07) that validates both the
user-level config (`~/.config/claude-wiki-pages/config.json`) and the project-level
config (`.claude/claude-wiki-pages.json`). It was created in milestone M1 and enforced
from M5 onward. Environment variable overrides use the `CLAUDE_WIKI_PAGES_*` prefix.

The schema defines seven top-level configuration groups: `version` (const 1),
`vault` (explicit path override), `autoHeal` (enabled flag, aggressiveness level,
maxIterations), `gitCheckpoint` (mode and push policy), `firewall` (enabled/mode/
allowPaths/denyPaths), `localModel` (provider, endpoint, model, draftTarget, tier,
offlinePolicy), and `maintenance` (enabled, autoCatchupOnSessionStart, lintEveryDays,
maxPerRun, cooldownMinutes). An optional `modelHints` map allows per-task model hints.

## Key Claims

- `autoHeal.aggressiveness` has three levels: `mechanical` (wikilinks/MOCs/frontmatter
  only), `structural` (+ restructure/merge), `aggressive` (+ deletions). Default:
  `structural`.
- `gitCheckpoint.mode` controls snapshot behavior: `commit`, `branch`, `both`, or
  `off`. Rollback is via `git revert` or branch checkout. Default: `commit`.
- `gitCheckpoint.push` defaults to `off` — the plugin is not a hosted service.
- `firewall.mode` has three levels: `enforce` (block out-of-vault writes), `warn`
  (advise only), `off` (pass-through). Default: `enforce`.
- `firewall.denyPaths` always blocks `**/.ssh/**`, `**/.aws/**`, `**/.env`,
  `**/.git/config` even inside allowed roots.
- `localModel.tier` has three levels: `draft` (\_proposed/ only), `ingest-extract`
  (source extraction), `query` (cited answers). Gated per ADR-0018.
- `localModel.offlinePolicy` controls Claude API fallback: `strict`, `prefer-local`,
  `off`. Default: `off`.
- `maintenance.maxPerRun` is bounded 1–50, default 10.
- `additionalProperties: false` on all objects — the schema is closed; undeclared
  config keys are rejected.

## Concepts Covered

- [[Config Schema]]
- [[Auto-Heal]]
- [[Git Checkpoint]]
- [[Firewall]]
- [[Offline Policy]]
- [[Local Model Quality Gate]]

## Grounded Pages

Wiki pages that cite this source:

- [[Config Schema]] — the concept page this source directly backs (seven config groups, closed schema)
