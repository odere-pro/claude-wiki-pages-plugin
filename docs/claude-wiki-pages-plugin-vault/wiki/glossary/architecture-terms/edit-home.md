---
title: "EDIT home"
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

# EDIT home

## Definition

The runtime configuration override files: `.claude/claude-wiki-pages.json` (project) and `~/.config/claude-wiki-pages/config.json` (user). Written by the operator to tune behaviour; read by `cfg_scalar` in shell scripts and by `loadConfig` in the engine. Distinct from the SHAPE/DEFAULTS home.

## Key Principles

- The runtime configuration override files: `.claude/claude-wiki-pages.json` (project) and `~/.config/claude-wiki-pages/config.json` (user).
- Canonical term in the claude-wiki-pages **Architecture terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `.claude/claude-wiki-pages.json`
- `~/.config/claude-wiki-pages/config.json`
- `cfg_scalar`
- `loadConfig`

## Related Concepts

Part of the **Architecture terms** group: claude-wiki-pages, deterministic engine, verify (engine verb), lint (engine verb), fail-closed engine bridge, four-layer stack, Layer 1 — Data, Layer 2 — Skills, Layer 3 — Agents, Layer 4 — Orchestration, skill, agent.
