---
title: "config-home distinction"
type: concept
aliases: []
parent: "[[parallel-extract-terms|Parallel-extract and scheduled-upkeep terms]]"
path: "glossary/parallel-extract-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "parallel-extract-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# config-home distinction

## Definition

The three distinct config files, each with one job: the SHAPE/DEFAULTS source (`config.ts` + `schemas/config.schema.json` + `templates/default.config.json`, where a knob is defined), the EDIT home (`.claude/claude-wiki-pages.json`, the runtime override layer a user edits), and vault resolution (`.claude/claude-wiki-pages/settings.json`, holding only `current_vault_path`). Not a fork — three files, three jobs. See ADR-0026.

## Key Principles

- The three distinct config files, each with one job: the SHAPE/DEFAULTS source (`config.ts` + `schemas/config.schema.json` + `templates/default.config.json`, where a knob is defined), the EDIT home (`.claude/claude-wiki-pages.json`, the runtime override layer a user edits), and vault resolution (`.claude/claude-wiki-pages/settings.json`, holding only `current_vault_path`).
- Canonical term in the claude-wiki-pages **Parallel-extract and scheduled-upkeep terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `config.ts`
- `schemas/config.schema.json`
- `templates/default.config.json`
- `.claude/claude-wiki-pages.json`
- `.claude/claude-wiki-pages/settings.json`

## Related Concepts

Part of the **Parallel-extract and scheduled-upkeep terms** group: parallel extract, extract worker, maxParallelExtract, EXTRACT envelope, degrade-to-sequential.
