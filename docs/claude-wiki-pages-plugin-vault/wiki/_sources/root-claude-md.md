---
title: "Root CLAUDE.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "odere-pro"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["root", "schema", "architecture"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Root CLAUDE.md

## Metadata

- **File**: `raw/repo/root/CLAUDE.md`
- **Scope**: Plugin repository contributor context
- **Type**: Claude session context file (dev-time, not runtime)

## Summary

The repository-root CLAUDE.md loaded by Claude Code for contributors working on the plugin source. Not copied to user vaults on install. Describes the four-layer stack, vault location resolution, dev-time vs. runtime separation, where to look for each concern, and local workflows.

## Key Claims

Schema authority: `skills/init/template/CLAUDE.md` (not this file). Vault location resolution: four-tier (env var → settings.json → auto-detect → `docs/vault`). Dev-time only: docs/, tests/, .github/, root CLAUDE.md, NOTICE, LICENSE, CHANGELOG.md. Runtime context: skills/, agents/, hooks/hooks.json + scripts/, rules/. Local workflows: `bash tests/install-deps.sh` (idempotent dep installer), `bash tests/run-tests.sh` (Tier 0+1), `scripts/validate-docs.sh` (glossary gate, fails without Bun). Four-layer table: Data (skills/init/template/), Skills (26), Agents (8), Orchestration (commands/, hooks/, scripts/, rules/).
Covers: Contributor Context, Dev-Time vs Runtime, Vault Resolution, Local Workflows
