---
title: "ADR-0031: Graph Connectivity, Orphans, and Shadows"
type: entity
entity_type: standard
aliases: ["ADR-0031", "adr-0031", "graph connectivity ADR", "orphan pages", "shadow pages"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0031|ADR-0031: Graph Connectivity, Orphans, and Shadows]]"]
related: []
tags: ["docs", "adrs", "graph", "quality-gate"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0031: Graph Connectivity, Orphans, and Shadows

Defines three graph health concepts — orphan pages, shadow pages, and connected-components (Cn) as the objective connectivity metric — and specifies how the doctor and curator address each.

## Overview

ADR-0031 gives precise definitions to informal concepts ("disconnected pages", "pages not in the tree") that were previously described inconsistently. The connected-components count (Cn) is the objective, computable metric that measures the same property the concepts describe qualitatively.

## Key Facts

**Status:** Accepted

**Three concepts:**

| Term | Definition | Consequence |
| --- | --- | --- |
| **Orphan** | A wiki page with no inbound wikilink from any other wiki page | Page is not reachable by navigation; doctor D11 flags it |
| **Shadow** | A page not reachable from `wiki/index.md` via `children`/`child_indexes` | Page exists in the filesystem but is not in the MOC tree |
| **Connected components (Cn)** | The number of disconnected subgraphs in the wiki's spine graph | Cn=1 means all pages reach each other via the spine |

**Cluster efficiency (Ce):** Cn normalized to the number of top-level topic folders. Ce=1.0 means every topic folder is a single connected component.

**Detection and cure:**
- Doctor D11 detects orphans via inbound-link count scan.
- Curator's heal pass connects orphans by adding missing `children:` entries to the appropriate folder note.
- `graph-quality.sh` computes Cn and Ce.

**Target:** Cn=Ce=1.0 across all topic clusters. ADR-0027 acceptance tracked this target to achievement.

**Consequences:**
- Cn/Ce are objective, trackable quality metrics shown in the doctor report.
- The curator can automatically connect most orphans by finding their parent folder note.
- Shadows require manual review — their absence from the MOC is typically intentional or a missing folder-note entry.

## Related

ADR-0027 tracks the graph connectivity target as an acceptance criterion. `graph-quality.sh` is the implementation.
