---
title: "Design — Configuration, Security, and Isolation"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-01
date_ingested: 2026-06-25
tags: ["docs", "design", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Design — Configuration, Security, and Isolation

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-01
- **URL:** —

## Summary

The config-security diagram document (`docs/design/05-claude-config-security.md`) visualizes the four-tier vault resolution, the fail-closed write boundary (PreToolUse chain), and the two isolation axes: dev-time vs runtime, and per-vault confinement via firewall.sh.

## Key Claims

Three mermaid diagrams. (1) Vault resolution (4-tier, first-match-wins): env var → settings.json → auto-detect → default docs/vault. (2) Write boundary: every Write/Edit passes firewall → validate-frontmatter → check-wikilinks → protect-raw → validate-attachments; any failure blocks the write (fail-closed). (3) Isolation axes: dev-time (docs/, teams/) vs runtime (skills/, agents/, hooks/, rules/); per-vault confinement (firewall.sh confines to the resolved vault; cross-vault writes blocked). Multi-vault audit roll-up is read-only; it aggregates per-vault logs under the same firewall confinement.

Covers: Vault Resolution, Fail-Closed Write Boundary, Dev-Time vs Runtime Isolation, Per-Vault Confinement
