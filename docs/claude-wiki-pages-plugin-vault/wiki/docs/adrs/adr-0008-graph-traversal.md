---
title: "ADR-0008: Graph Traversal Primitive"
type: entity
entity_type: standard
aliases: ["ADR-0008", "adr-0008", "graph traversal ADR", "R2 graph walk"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0008|ADR-0008: Graph Traversal Primitive]]"]
related: []
tags: ["docs", "adrs", "retrieval", "graph"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0008: Graph Traversal Primitive

Specifies the single graph-traversal primitive (R2 `--graph`) — the only link-walk mechanism in the wiki, bounded at N≤2 hops from a search hit along provenance and association edges.

## Overview

ADR-0008 establishes the "one graph-traversal primitive" discipline. Rather than allowing each skill or agent to implement its own link-following logic, the engine exposes exactly one R2 walk that all consumers use. The walk is bounded, deterministic, and embedding-free.

## Key Facts

**Status:** Accepted

**Decision:** The R2 graph-traversal primitive walks the provenance/association core from a search hit:
- Edges walked: `sources`, `related`, `depends_on` (per `ontology-profile-v1`)
- Depth: N≤2 hops
- Direction: follows the predicate direction declared in the domain→range table

**Implementation:** `src/commands/search` (the `--graph` flag). The primitive reads its edge set from the predicate domain→range table in `ontology-profile-v1` — it does not hard-code edge names.

**Constraints:**
- No embeddings or vector similarity — the walk is purely structural.
- Depth is hard-bounded at N≤2. Deeper traversal is not exposed.
- MOC/descent edges (`key_pages`, `members`, `scope`, `children`, `child_indexes`, `parent`) are used by C1 (MOC descent) not R2.

**Consequences:**
- One mechanism means one place to test, one place to fix, one place to bound.
- An edge violating the domain/range table is a future S1-check lint finding, not a traversal the primitive follows.

## Related

The `matched{}` score object (ADR-0006) carries the `next?` field that R2 uses for continuation. The predicate domain→range table in `vault/CLAUDE.md` defines the walkable edge set.
