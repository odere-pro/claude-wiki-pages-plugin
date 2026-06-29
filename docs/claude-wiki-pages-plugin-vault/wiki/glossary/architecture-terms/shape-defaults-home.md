---
title: "SHAPE/DEFAULTS home"
type: concept
aliases: []
parent: "[[architecture-terms|Architecture terms]]"
path: "glossary/architecture-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "architecture-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# SHAPE/DEFAULTS home

## Definition

The single authoritative source for config defaults and schema: `src/data/config/config.ts` (`DEFAULT_CONFIG` + `ENV_MAP`), `schemas/config.schema.json`, and `templates/default.config.json`. All three must be changed in lockstep when a new config key is added; the config-schema gate pins `default.config.json ↔ schema`. Distinct from the EDIT home, which holds operator overrides.

## Key Principles

- The single authoritative source for config defaults and schema: `src/data/config/config.ts` (`DEFAULT_CONFIG` + `ENV_MAP`), `schemas/config.schema.json`, and `templates/default.config.json`.
- Canonical term in the claude-wiki-pages **Architecture terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `src/data/config/config.ts`
- `DEFAULT_CONFIG`
- `ENV_MAP`
- `schemas/config.schema.json`
- `templates/default.config.json`

## Related Concepts

Part of the **Architecture terms** group: claude-wiki-pages, deterministic engine, verify (engine verb), lint (engine verb), fail-closed engine bridge, four-layer stack, Layer 1 — Data, Layer 2 — Skills, Layer 3 — Agents, Layer 4 — Orchestration, skill, agent.
