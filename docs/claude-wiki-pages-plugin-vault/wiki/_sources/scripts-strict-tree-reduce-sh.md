---
title: "scripts/strict-tree-reduce.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["scripts", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# scripts/strict-tree-reduce.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/strict-tree-reduce.sh

## Summary

Sole link reducer for the strict-tree topology (ADR-0036). Demotes every non-spine wikilink among visible topic pages — siblings, transitive-redundant ancestor links, cross-tree mentions — to plain text, and prunes non-spine association frontmatter. Thin bash wrapper over `scripts/strict-tree-reduce.ts`.

## Key Claims

Dry-run by default; `--apply` rewrites in place. Tag de-cycle: when a cross-tree edge is demoted, the target tree is recorded as a nested `topic/<tree>` tag so the relationship stays discoverable without an edge. Never touches parent/sources/children/child_indexes. Never creates dangling links (demotes to text, does not delete targets). Idempotent on an already-tree-shaped vault.

Covers: Strict-Tree Topology, Link Demotion, Tag De-Cycle, ADR-0036
