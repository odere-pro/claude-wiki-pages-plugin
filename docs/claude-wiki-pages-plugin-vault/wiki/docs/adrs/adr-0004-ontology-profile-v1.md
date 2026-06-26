---
title: "ADR-0004: Ontology Profile v1"
type: entity
entity_type: standard
aliases: ["ADR-0004", "adr-0004", "ontology profile v1 ADR"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0004|ADR-0004: ontology-profile-v1]]"]
related: []
tags: ["docs", "adrs", "ontology"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0004: Ontology Profile v1

The decision to add a named `ontology-profile-v1` section to `CLAUDE.md` containing exactly two tables — a predicate domain→range table and an enum list — that all graph traversal, MOC descent, and classification consumers read.

## Overview

ADR-0004 introduced the `ontology-profile-v1` contract: a single document section, not a separate file, that serves as the schema's formal ontology. It adds no new frontmatter fields and no new page types — it only tabulates the relationships and values the schema already defines.

## Key Facts

**Status:** Accepted

**Problem being solved:** R2 graph traversal, C1 MOC descent, and I1 classification each independently hard-coded their notion of which predicates were "association edges" and which page types were valid. Drift between the three consumers caused inconsistent query and lint results.

**Decision:** Add `ontology-profile-v1` to `CLAUDE.md` as the single source of truth. Contains exactly:
1. A 11-row predicate domain→range table (what each predicate connects, in which direction, with what cardinality).
2. An enum list (all closed value sets — page type, entity_type, source_type, synthesis_type, project_status, source_format, status).

**Calibration mechanism:** `entity_type` is the sole owner-extensible axis — a vault owner adds `entity_type_extensions:` to their vault's `CLAUDE.md`. The legal set is `core ∪ extensions` computed at read time. All other enums are fully closed.

**Consequences:**
- Adding a new predicate requires amending only this table (and the consuming code).
- A constraint violation (wrong domain/range) is a lint finding (S1-check); it is not silently traversed.
- Profile version (`v1`) is independent of `schema_version`; a profile bump does not force a schema migration.

## Related

The ontology profile is described in depth in the ontology profile concept page. The strict-tree ADR (ADR-0036) further constrains which valid predicates produce graph edges among visible topic pages.
