---
title: "ADR-0003: Polish Agent and Obsidian Side"
type: entity
entity_type: standard
aliases: ["ADR-0003", "adr-0003", "polish agent ADR"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0003|ADR-0003: Polish Agent and Obsidian Side]]"]
related: []
tags: ["docs", "adrs", "agents", "obsidian"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0003: Polish Agent and Obsidian Side

Adds a dedicated polish agent that owns the Obsidian-side presentation layer — graph colors, MOC regeneration, and folder note reconciliation — separating presentation sync from content writing.

## Overview

ADR-0003 splits the post-write concern into two distinct agents: the curator (content correctness) and the polish agent (Obsidian presentation). Every ingest or curator pass triggers the polish agent as the final step before reporting to the orchestrator.

## Key Facts

**Status:** Accepted

**Drivers:**
- Ingest and curator agents focused on content correctness (schema, provenance); they should not also manage Obsidian's graph view.
- Graph color groups, MOC regeneration, and folder note child lists are regenerable from the wiki tree — separating them keeps each agent's responsibility clear.

**Decision:** Add `claude-wiki-pages-polish-agent` with three idempotent responsibilities:
1. **Graph colors** — apply color groups for any new top-level topic folder.
2. **MOC regeneration** — rebuild `wiki/index.md` from per-folder folder notes with current page counts.
3. **Folder note reconciliation** — reconcile every folder note's `children`/`child_indexes` against actual filesystem siblings (append-only, never delete).

**Dispatch:** Orchestrator-dispatched only after ingest or curator returns successfully. Not directly user-invocable.

**Consequences:**
- Obsidian's graph view stays consistent without human intervention.
- The curator can focus entirely on structural correctness.
- Each polish step is idempotent — running it twice produces the same result.

## Related

The polish agent's color-group logic uses the obsidian-graph-colors skill. Folder note reconciliation follows the `wiki/<topic>/<topic>.md` folder-note convention established in ADR-0022.
