---
title: "strict-tree-reduce.sh"
type: entity
entity_type: tool
aliases: ["strict-tree-reduce.sh", "Strict Tree Reducer"]
parent: "[[scripts|Scripts]]"
path: "scripts"
sources: ["[[scripts-strict-tree-reduce-sh|scripts/strict-tree-reduce.sh]]", "[[scripts-strict-tree-reduce-ts|scripts/strict-tree-reduce.ts]]"]
related: []
tags: ["scripts", "strict-tree", "adr-0036", "link-demotion"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# strict-tree-reduce.sh

Sole link reducer for the strict-tree topology: demotes every non-spine wikilink among visible topic pages to plain text.

## Overview

`scripts/strict-tree-reduce.sh` is a thin bash wrapper over `scripts/strict-tree-reduce.ts`. It implements ADR-0036: among visible topic pages, only the `parent:` spine and the ROOT→folder-note connector draw edges. Every other reference — siblings, transitive-redundant ancestor links, cross-tree mentions — is demoted to plain text.

## Key Facts

- **Dry-run by default.** `--apply` rewrites in place. Intended to be run inside git (the polish agent git-checkpoints before calling it).
- **Tag de-cycle:** when a cross-tree edge is demoted, the target tree name is added as a `topic/<tree>` nested tag on the source page so the relationship stays discoverable without a graph edge.
- **Association fields pruned:** `related`, `depends_on`, `key_pages`, `members`, `scope`, `contradicts`, `supersedes` — entries in these fields that are not spine edges are removed from frontmatter.
- **Never touches:** `parent`, `sources`, `children`, `child_indexes`. Provenance direction is preserved.
- Never creates dangling links: demotes to display text, does not delete targets.
- Idempotent: zero diff when applied to an already-tree-shaped vault.
- Supports `--max-saturation <n>` to set the oversaturation threshold for the metric report.

## Related

The TypeScript engine modules reused by `strict-tree-reduce.ts`: `deriveSpine`, `resolveLink`, `demoteInBody`, `pruneFields`, `splitFrontmatter`, `computeTreeMetric`.
