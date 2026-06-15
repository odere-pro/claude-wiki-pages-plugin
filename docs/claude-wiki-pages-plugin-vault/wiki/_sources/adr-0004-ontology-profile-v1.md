---
title: "ADR-0004: Ontology Profile v1"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "ontology", "schema"]
aliases: ["ADR-0004: Ontology Profile v1"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0004: Ontology Profile v1

## Summary

Establishes a single named ontology profile (`ontology-profile-v1`) in `vault/CLAUDE.md` as the sole authority for the predicate domain→range table and the `entity_type` enum. `entity_type` is the only vault-extensible axis; all other enums are fully closed.

## Key Claims

- A single `ontology-profile-v1` block in `CLAUDE.md` is the sole authority — no parallel ontology file.
- The profile contains two tables: predicate domain→range table and enum list.
- `entity_type` is the only extensible axis; vault owners extend it via `entity_type_extensions:` in their CLAUDE.md.
- All other page types and enums are fully closed — adding a type requires a new ADR.
- R2 graph traversal, C1 MOC descent, and I1 classification all read from this profile.
