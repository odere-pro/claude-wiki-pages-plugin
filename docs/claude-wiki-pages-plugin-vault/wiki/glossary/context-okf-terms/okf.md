---
title: "OKF"
type: concept
aliases: []
parent: "[[context-okf-terms|Context layering and OKF interop terms]]"
path: "glossary/context-okf-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "context-okf-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# OKF

## Definition

Open Knowledge Format (Google). A portable markdown bundle convention that maps to the vault schema: our `type`/`title`/`description`/`tags`/`sources`/`url` frontmatter fields are a superset of OKF's model. The `engine okf export` verb renders `wiki/` as an OKF bundle; `engine okf import` snapshots an external bundle into `vault/raw/okf/<bundle>/` for normal ingest.

## Key Principles

- Open Knowledge Format (Google).
- Canonical term in the claude-wiki-pages **Context layering and OKF interop terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `type`
- `title`
- `description`
- `tags`
- `sources`

## Related Concepts

Part of the **Context layering and OKF interop terms** group: context contract, OKF bundle, context layers.
