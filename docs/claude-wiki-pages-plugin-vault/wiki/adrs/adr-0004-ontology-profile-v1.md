---
title: "ADR-0004 Ontology Profile v1"
type: concept
aliases: ["ADR-0004 Ontology Profile v1", "ADR-0004", "ontology profile ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0004-ontology-profile-v1]]"]
related: ["[[Canonical Terms]]", "[[ADR-0008 Graph Traversal Primitive]]", "[[ADR-0006 Search Score Object]]"]
tags: [adr, ontology, schema]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0004: Ontology Profile v1

**Status:** Accepted | **Date:** 2026-06-04

## Problem

Three downstream consumers (R2 graph traversal, C1 MOC descent, I1 classification) all needed to know: which typed relationship may connect which kind of page, and what are the legal page types and entity types. Without a named, single-sourced contract, each consumer would reconstruct the edge rules independently and drift on the first predicate or page-type change.

## Decision

Add one named, additive section — **`ontology-profile-v1`** — to `docs/vault-example/CLAUDE.md`. It contains exactly two tables:

1. **The predicate domain→range table** — for each typed predicate (parent, sources, related, contradicts, supersedes, depends_on, key_pages, members, scope, children, child_indexes): the allowed domain (originating page class) and range (target page class), direction, and cardinality.

2. **The enum list** — canonical values for every closed value set: page type, entity_type, source_type, synthesis_type, project_status, source_format, status.

The profile introduces no new frontmatter field and no new page type — it only names and tabulates relationships and values the schema already defines. Additive under schema_version 1 and 2.

**Key calibration rule:** `entity_type` is the sole vault-extensible axis. A vault owner may add values via `entity_type_extensions:` in their own `CLAUDE.md`. All other enums are fully closed. Adding a new page `type` is a schema change requiring a new ADR, new templates, and a new lint case.

## Key Alternatives Rejected

- **Scattered prose** — no named edge set; consumers reconstruct and drift.
- **Machine-readable ontology file (JSON/SHACL/OWL)** — puts ontology outside schema + frontmatter + wikilinks (Brief §5 forbids); splits truth.
- **Free-text `entity_type`** — defeats the classifier and filter; opens terminology drift.

## Consequences

One named contract for the edge set and enums. R2, C1, and I1 all cite `ontology-profile-v1` and read the same two tables. The profile stays inside the file everything already reads — no new store, no new artifact.
