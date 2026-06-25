---
title: "Rules"
type: index
aliases: ["rules", "Rules", "path-scoped rules", "rule files"]
parent: "[[index|Wiki Index]]"
path: "rules"
children:
  - "[[path-scoped-rules|Path-Scoped Rules]]"
  - "[[raw-immutability|Raw Immutability]]"
  - "[[wiki-page-format|Wiki Page Format]]"
child_indexes: []
tags: ["rules", "orchestration"]
created: 2026-06-25
updated: 2026-06-25
---

# Rules

Layer 4 Orchestration: four path-scoped rule files that tell Claude what is allowed or required when operating on specific directory trees in the repository.

## Pages

### Concepts

- [[path-scoped-rules|Path-Scoped Rules]] — YAML-fronted convention files each targeting one directory glob; first line of defence before hooks and engine
- [[raw-immutability|Raw Immutability]] — the invariant that `vault/raw/` files are never modified after placement; enforced by `protect-raw.sh`
- [[wiki-page-format|Wiki Page Format]] — structural conventions for `vault/wiki/` files: frontmatter, wikilinks, kebab-case naming, and post-write bookkeeping

## Subtopics

