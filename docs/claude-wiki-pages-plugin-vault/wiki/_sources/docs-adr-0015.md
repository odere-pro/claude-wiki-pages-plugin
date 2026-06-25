---
title: "ADR-0015: Engine Self-Description Surfaces"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-11
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0015: Engine Self-Description Surfaces

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-11
- **URL:** —

## Summary

ADR-0015 adds self-description surfaces to the engine: `engine.sh config --json`, `engine.sh route --json`, and `engine.sh context --skill <name>`. These surfaces let agents and skills query the engine's current configuration and routing decision without side effects. The ICM (Introspectable Context Model) contract formalizes what each surface returns.

## Key Claims

Status: Accepted. `engine.sh config --json` returns the resolved config (including `maintenance.maxParallelExtract`, `degraded.*`). `engine.sh route --json` returns the current routing decision (`claude`, `local`, or `blocked`) with a `degraded.decision` field. `engine.sh context --skill <name>` returns the L0–L4 ICM context for a named skill. These are read-only surfaces; they never write. The `context` command lives in `src/commands/context/`.

Covers: Engine Self-Description, Config Surface, Route Surface, ICM Context, engine.sh
