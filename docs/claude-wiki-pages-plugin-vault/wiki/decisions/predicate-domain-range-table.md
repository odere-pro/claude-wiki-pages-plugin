---
title: "Predicate Domain-Range Table"
type: concept
aliases: ["Predicate Domain-Range Table", "predicate domain-range table", "predicate table", "domain-range table", "ontology predicates"]
parent: "[[Decisions]]"
path: "decisions"
sources: ["[[ADR-0004: Ontology Profile v1]]", "[[Design: Ontology]]"]
related: ["[[Ontology Profile v1]]", "[[Schema Authority]]", "[[Required Fields]]", "[[Graph Traversal Primitive]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "ontology", "schema"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Predicate Domain-Range Table

> [!summary]
> The predicate domain-range table is one of two tables in the `ontology-profile-v1` block of `vault/CLAUDE.md`. It defines the valid domain→range combinations for typed frontmatter relationships: which `type:` of page can hold a given frontmatter predicate and what types of pages that predicate may point to. It constrains the wikilink graph to semantically valid edges.

## Definition

ADR-0004 established the `ontology-profile-v1` block as the single authority for the plugin's ontology. The block contains two tables:

1. **Predicate domain-range table** (this page) — defines which predicates are valid on which page types and what they may link to.
2. **Entity type enum** — the allowed values for `entity_type:`.

The predicate domain-range table has three columns:

| Predicate | Domain (page types that may hold it) | Range (page types it may point to) |
| --- | --- | --- |
| `sources` | entity, concept, topic, project, synthesis | source |
| `related` | entity, concept, topic, project | entity, concept, topic, project |
| `depends_on` | concept, topic | concept, topic, entity |
| `contradicts` | concept, topic | concept, topic |
| `supersedes` | concept, topic | concept, topic |
| `parent` | entity, concept, topic, project, index | index |
| `children` | index | entity, concept, topic, project |
| `child_indexes` | index | index |
| `scope` | synthesis | entity, concept, topic, project |

## Why Domain-Range Constraints Matter

Without domain-range constraints, a `sources` link from a `source` page pointing to another `source` page would be syntactically valid but semantically meaningless (a source citing itself as a source). The domain-range table makes such errors detectable.

The table also drives the [[Graph Traversal Primitive]]: `walk()` traverses only the `R2_EDGES` set (`sources`, `related`, `depends_on`). The domain-range table ensures these edges are semantically coherent — they connect pages in directions that have meaning within the provenance and association graph.

## Single Authority

The table lives only in `vault/CLAUDE.md`, in the `ontology-profile-v1` block. It is not duplicated in any other file. ADR-0004: "R2 graph traversal, C1 MOC descent, and I1 classification all read from this profile." Any change to the predicate set requires editing this block and only this block.

## `entity_type` as the Only Extensible Axis

All predicates in the domain-range table are fully closed — adding a new predicate requires a new ADR. However, `entity_type` is the one vault-extensible axis: vault owners can add values to `entity_type` via `entity_type_extensions:` in their `CLAUDE.md` without filing an ADR. This allows domain-specific entity types (e.g., `person`, `standard`, `protocol`) to be added per vault without modifying the core ontology.

## Related Concepts

- [[Ontology Profile v1]] — the ADR-0004 decision that established this table as the authority
- [[Schema Authority]] — `vault/CLAUDE.md` as the single source of truth for the predicate table and all other schema rules
- [[Required Fields]] — the required-fields table (a sibling in CLAUDE.md); domain-range table governs what predicates mean, required-fields table governs which must be present
- [[Graph Traversal Primitive]] — the `walk()` function that traverses the edges defined by the `R2_EDGES` subset of this table
