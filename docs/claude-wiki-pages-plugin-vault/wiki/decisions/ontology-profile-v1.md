---
title: "Ontology Profile v1"
type: concept
aliases: ["Ontology Profile v1", "ontology-profile-v1", "ontology profile", "predicate table"]
parent: "[[Decisions]]"
path: "decisions"
sources: ["[[ADR-0004: Ontology Profile v1]]", "[[Design: Ontology]]", "[[Glossary]]"]
related: ["[[Schema Authority]]", "[[Predicate Domain-Range Table]]", "[[Entity Type Enum]]", "[[Graph Traversal Primitive]]"]
tags: ["concept", "ontology", "schema"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Ontology Profile v1

## Definition

The `ontology-profile-v1` is a named section in `vault/CLAUDE.md` that is the single source of truth for the vault's formal ontology. R2 graph traversal, C1 MOC descent, and I1 classification all read exclusively from this profile.

## Key Principles

- **Single named block:** `ontology-profile-v1` in `CLAUDE.md` — no parallel file, no fork.
- **Two tables:** (1) predicate domain→range table (11 predicates with domain, range, direction, cardinality); (2) enum list (closed canonical values for every schema enum).
- **`entity_type` is the only extensible axis:** vault owners extend it via `entity_type_extensions:` in their CLAUDE.md. All other enums are fully closed.
- **Adding a page `type`** is a schema change requiring a new ADR + new templates + lint case.

## Examples

The 11 predicates: `parent`, `sources`, `related`, `contradicts`, `supersedes`, `depends_on`, `key_pages`, `members`, `scope`, `children`, `child_indexes`.

The 9 page types: `source`, `entity`, `concept`, `topic`, `project`, `synthesis`, `index`, `manifest`, `log`.

Core `entity_type` values (7): `person`, `organization`, `product`, `tool`, `service`, `standard`, `place`.

## Related Concepts

- [[Schema Authority]] — `CLAUDE.md` that contains this profile
- [[Predicate Domain-Range Table]] — the typed wikilink predicates
- [[Entity Type Enum]] — the extensible entity classification axis
- [[Graph Traversal Primitive]] — the `walk()` function that uses R2_EDGES from this profile
