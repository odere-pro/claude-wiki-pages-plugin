---
title: "src/core/link-resolver.ts — Obsidian-Accurate Link Resolution"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "core", "link-resolution", "obsidian"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/core/link-resolver.ts — Obsidian-Accurate Link Resolution

## Metadata

- **Source**: `raw/repo/src/core/link-resolver.ts`
- **Type**: TypeScript implementation

## Summary

Implements ADR-0030: Obsidian-accurate link resolution with a four-tier priority ladder. `buildLinkIndex(wiki)` walks `wiki/` once; `resolveLink(target, source, index)` resolves a `[[link]]` to the exact page Obsidian would open.

## Key Claims

- Resolution priority ladder: (1) exact vault path, (2) file basename case-insensitive, (3) alias case-insensitive, (4) title case-insensitive (deliberate superset of Obsidian — Obsidian does NOT resolve by `title`)
- Real file basename ALWAYS beats an alias
- Tie-break: shortest vault-relative path → same folder as source → alphabetical (deterministic)
- `normaliseTarget()`: strips `|display`, `#heading`, `^block`, trims, lowercases; also strips trailing `\` from escaped pipes in table cells
- `LinkIndex`: `byPath`, `byBasename`, `byAlias`, `byTitle`, `files` — all sorted, deduped, frozen
- Branded types: `WikiDirPath`, `WikiRelPath`, `WikilinkTarget` — zero runtime cost, domain intent markers
- `resolvableNames(index)`: path ∪ basename ∪ alias ∪ title — used by dangling/orphan/stale/MOC checks (ADR-0031)
- The dangling check treats a link as resolved iff it resolves by PATH or BASENAME (what Obsidian does); alias/title kept in set as deliberate superset — cannot produce false dangling reports
- Used by: graph-quality.ts, strict-tree-reduce.ts, verify checks
Covers: Link Resolution, LinkIndex, normaliseTarget, resolvableNames, ADR-0030
