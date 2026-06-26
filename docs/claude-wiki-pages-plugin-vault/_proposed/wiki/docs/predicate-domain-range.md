---
title: "Predicate Domain and Range"
type: concept
aliases: ["predicate domain range", "predicate", "domain-range constraint", "typed relationship", "ontology predicate"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-design-ontology|Design: Ontology Classes and Predicates]]"]
related: []
tags: ["docs", "ontology", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.9
derived: false
proposed_by: "claude"
---

# Predicate Domain and Range

A typed directed relationship between two wiki page classes: the domain is the page class that may carry the wikilink field, and the range is the page class the link must point to. Defined in the `ontology-profile-v1` predicate table.

## Definition

A predicate is a named, typed relationship between two pages, expressed as a frontmatter field containing one or more piped wikilinks. The predicate table in `ontology-profile-v1` defines eleven predicates, each with a domain (the page class that originates the link), a range (the page class the link must target), and a direction and cardinality.

**Domain** — the page class (identified by its `type` value) that may carry a frontmatter field for this predicate. A domain constraint says "only pages of this type may have this field." For example, `key_pages` has domain `topic` — only `type: topic` pages carry a `key_pages:` field.

**Range** — the page class that the wikilinks in this field must point to. A range constraint says "this field's wikilinks must target pages of this type." For example, `sources` has range `source` — all entries in a page's `sources:` list must point to `type: source` pages in `wiki/_sources/`.

**Full predicate table** (from `ontology-profile-v1`):

| Predicate | Domain | Range | Direction / cardinality |
|---|---|---|---|
| `parent` | any non-root page | `index` | directed, single |
| `sources` | entity, concept, topic, project, synthesis | `source` | directed, 1..N |
| `related` | entity, concept, topic, project | entity, concept, topic, project | undirected, 0..N |
| `contradicts` | concept | concept | undirected, 0..N |
| `supersedes` | concept, topic, project, synthesis | same class as domain | directed, 0..N |
| `depends_on` | concept, topic, project | concept, entity | directed, 0..N |
| `key_pages` | topic | entity, concept | directed, 0..N |
| `members` | project | entity, concept | directed, 0..N |
| `scope` | synthesis | entity, concept, topic, project | directed, 1..N |
| `children` | index | any non-root page | directed, 0..N |
| `child_indexes` | index | index | directed, 0..N |

## Key Principles

**Domain and range constrain link targets at authoring time.** When writing a wiki page, the author must check that each frontmatter link field targets a page of the correct range class. A `sources:` entry pointing to a `type: concept` page (instead of a `type: source` page) violates the range constraint. A future S1-check lint finding will flag such violations; the engine's graph-traversal primitive skips edges that violate their row.

**The graph-traversal primitive reads only the association core.** R2 (`--graph`) walks `sources`, `related`, and `depends_on` edges. C1 (MOC descent) walks `parent`, `child_indexes`, and `children`. `contradicts` and `supersedes` are used by R3/synthesis analysis. The predicate table defines which edges each traversal mode reads.

**ADR-0033 topic-locality and ADR-0036 strict-tree constrain where links go.** The predicate table says which types of pages a predicate may connect; topic-locality (ADR-0033) further restricts association predicates to same-topic endpoints; strict-tree (ADR-0036) demotes association predicates further to tags and prose. All three constraints apply simultaneously.

**`entity_type` is the sole vault-extensible axis.** Predicates and the page-type enum are closed — adding a new predicate or page type is a schema change. Only `entity_type` can be extended per-vault via `entity_type_extensions:`.

## Examples

An entity page about the `claude-wiki-pages-orchestrator-agent` (type: entity, entity_type: tool) carries `depends_on: ["[[ingest-agent|Ingest Agent]]"]` linking to another entity page. The `depends_on` predicate has domain `concept`, `topic`, `project` — but not `entity` — so this would be a domain violation. The correct pattern is: only concept pages carry `depends_on` linking to entity pages.

A synthesis page's `scope:` field carries wikilinks to three concept pages and one entity page. The `scope` predicate has range `entity, concept, topic, project` — all four types are valid range targets.

## Related Concepts

The predicate domain-range table is defined in the `ontology-profile-v1` block in `vault/CLAUDE.md`. It is consumed by the graph-traversal primitive (R2), MOC descent (C1), and future lint checks (S1 domain-range violations). It relates to the ontology profile (the parent concept) and to the strict-tree topology and topic-locality rules (the additional constraints that layer on top of domain-range).
---
