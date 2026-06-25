---
title: "Link Resolver"
type: concept
aliases: ["link-resolver", "Obsidian Link Resolution", "buildLinkIndex", "resolveLink"]
parent: "[[src|Src]]"
path: "src"
sources: ["[[src-core-link-resolver|src/core/link-resolver.ts — Obsidian-Accurate Link Resolution]]"]
related: []
tags: ["src", "core", "link-resolution", "obsidian"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Link Resolver

Obsidian-accurate link resolution (ADR-0030). Implements the exact priority ladder Obsidian uses to resolve a `[[link]]` to a page. The one resolution rule — no forked implementations.

## Definition

`buildLinkIndex(wiki)` walks `wiki/` once and records per-normalised-name the pages that claim it at each resolution tier. `resolveLink(target, source, index)` resolves a `[[link]]` to the exact page Obsidian would open.

## Key Principles

**Four-tier priority ladder:**
1. Exact vault path (wiki-relative, with or without `.md`)
2. File basename, case-insensitive — **always beats an alias**
3. Alias, case-insensitive
4. Title, case-insensitive (deliberate superset of Obsidian — Obsidian itself does NOT resolve by `title`)

**Tie-break**: shortest vault-relative path → same folder as source → alphabetical. Fully sorted, same vault always resolves the same way.

**`normaliseTarget(raw)`**: strips `|display` (from first `|`), `#heading`, `^block`, trims, lowercases. Also strips trailing `\` from escaped pipes in markdown table cells (`[[entity\|Entity Name]]` — the escaped pipe form for table cells). This prevents the target surviving as `entity-name\` and dangling as a ghost twin.

**Branded types**: `WikiDirPath`, `WikiRelPath`, `WikilinkTarget` — intersection types with unique symbols; zero runtime cost, domain intent markers preventing parameter-order mistakes.

**`resolvableNames(index)`**: the membership set (path ∪ basename ∪ alias ∪ title) used by dangling/orphan/stale/MOC checks (ADR-0031). Alias/title tiers kept as deliberate superset — cannot produce false dangling reports.

**`LinkIndex`**: `byPath`, `byBasename`, `byAlias`, `byTitle`, `files` — all sorted, deduped, frozen `ReadonlyMap`s.

## Examples

- `buildLinkIndex(wiki)` → `LinkIndex` (built from one filesystem walk)
- `resolveLink("entity-name", "topics/foo.md", index)` → `{ file: "entities/entity-name.md", kind: "basename" }`
- `resolvableNames(index)` → `Set<string>` checked by dangling-wikilink verify check

## Related Concepts

- Used by: graph-quality.ts, strict-tree-reduce.ts, `spine.ts`, verify dangling-wikilink check, collision check
- `normaliseTarget` mirrors `normaliseTarget()` in `scripts/verify-twins.ts` (pinned by gate-05)
- ADR-0030: Obsidian-accurate resolution and collision handling
- ADR-0031: graph connectivity — orphans and shadows
