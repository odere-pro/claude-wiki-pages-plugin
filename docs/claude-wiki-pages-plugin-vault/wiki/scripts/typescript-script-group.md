---
title: "TypeScript Utility Scripts"
type: concept
aliases: ["TypeScript Scripts", "Bun TS Scripts", "scripts/*.ts"]
parent: "[[scripts|Scripts]]"
path: "scripts"
sources: ["[[scripts-strict-tree-reduce-ts|scripts/strict-tree-reduce.ts]]", "[[scripts-disambiguate-collisions-ts|scripts/disambiguate-collisions.ts]]", "[[scripts-declutter-source-outlinks-ts|scripts/declutter-source-outlinks.ts]]", "[[scripts-migrate-piped-links-ts|scripts/migrate-piped-links.ts]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["scripts", "typescript", "bun-runtime", "graph-remediation"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 0.9
---

# TypeScript Utility Scripts

Bun-executable TypeScript scripts in the scripts/ directory that implement graph-remediation and wikilink-migration operations.

## Definition

The `scripts/*.ts` files are standalone Bun TypeScript scripts that extend the plugin's remediation and migration capabilities. They are not part of the engine's `src/` build; they run directly via `bun scripts/<name>.ts` and reuse engine modules from `src/core/` without re-implementing them.

## Key Principles

Four key TypeScript utility scripts handle different aspects of graph quality maintenance:

- **`strict-tree-reduce.ts`** — the sole link reducer, implementing the full ADR-0036 demotion pipeline. Reuses `deriveSpine`, `resolveLink`, `demoteInBody`, `pruneFields`, `splitFrontmatter`, and `computeTreeMetric` from `src/core/`.
- **`disambiguate-collisions.ts`** — detects basenames that collide globally across the vault (wiki + raw) and path-qualifies the corresponding wikilinks. Prevents source summaries from being shadowed by their raw originals in Obsidian's resolver.
- **`declutter-source-outlinks.ts`** — removes cross-cutting out-links from source summaries that bridge topics and create hairball graphs. Preserves sources that have no inbound citations (safety guard against orphaning).
- **`migrate-piped-links.ts`** — one-time migration of alias/title-targeted links to Obsidian-resolvable piped form. Rewrites only links that currently resolve via alias/title rather than basename/path.

## Examples

`bun scripts/strict-tree-reduce.ts --target vault --apply` demotes all non-spine links. `bun scripts/disambiguate-collisions.ts --target vault --write` path-qualifies ambiguous basenames. `bun scripts/declutter-source-outlinks.ts --target vault --write` strips redundant source out-link sections. `bun scripts/migrate-piped-links.ts --target vault --write` upgrades all ghost-prone links.

## Related Concepts

All four scripts are dry-run by default and require an explicit `--apply` or `--write` flag to make changes. They are coordinated by the polish agent and the curator agent during vault maintenance cycles.
