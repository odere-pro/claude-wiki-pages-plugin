---
title: "ADR-0030: Obsidian-Accurate Link Resolution and Collision"
type: entity
entity_type: standard
aliases: ["ADR-0030", "adr-0030", "Obsidian resolution ADR", "wikilink collision"]
parent: "[[decisions|Decisions]]"
path: "decisions"
sources: ["[[docs-adr-0030|ADR-0030: Obsidian-Accurate Link Resolution and Collision]]"]
related: []
tags: ["docs", "adrs", "wikilinks", "obsidian"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0030: Obsidian-Accurate Link Resolution and Collision

Tightens the link-resolution model to match Obsidian's actual priority (exact path > basename > alias) and adds a `wikilink-collision` WARN for cases where the same string is both a real basename and an alias on different pages.

## Overview

ADR-0030 addresses the two silent failure classes that ADR-0028's flat resolvable set cannot detect: (1) a link that passes verify but routes to the wrong page because Obsidian's basename > alias priority is not modeled; (2) a collision where the same string is a real filename in one place and an alias in another.

## Key Facts

**Status:** Proposed

**Two silent failures addressed:**
1. **Wrong-page routing:** A link `[[T]]` where `T` is both a filename in one location and an alias elsewhere — Obsidian opens the filename, not the alias. The flat set cannot distinguish these; the new resolver does.
2. **Collision WARN:** When `T` is both a basename (on page A) and an alias (on page B), report `wikilink-collision` WARN — any link to `T` will silently route to A, not B, even if the author intended B.

**Resolver priority (matching Obsidian):**
1. Exact vault path
2. File basename (case-insensitive)
3. Alias (case-insensitive)
Ties broken by shortest path, then same-folder-as-source, then alphabetical.

**Parity:** The bash twin in `scripts/` must implement the same priority order. Gate-05 enforces parity.

**Consequences:**
- Authors learn about collisions at lint time, before they cause navigational confusion in Obsidian.
- The resolver is the single implementation of "how does Obsidian open this link?" — no duplication.
- Path-qualified links (`[[topic/page|Title]]`) bypass the basename/alias ambiguity entirely.

## Related

ADR-0028 provided the flat resolvable set that this ADR supersedes. ADR-0032 formalizes the piped-basename convention that avoids collisions by construction.
