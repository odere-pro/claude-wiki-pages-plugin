---
title: "Ontology Profile"
type: concept
aliases: ["ontology-profile-v1", "ontology profile", "predicate domain-range table", "ontology block"]
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

# Ontology Profile

The named block in `vault/CLAUDE.md` that defines the closed set of page classes, the closed predicate domain-to-range table, and the closed enum lists that all agents, the engine, and classifiers read as their single source of truth.

## Definition

`ontology-profile-v1` is the YAML block (or markdown section) in `skills/init/template/CLAUDE.md` — the vault schema — that formalises the knowledge model. It has two tables:

1. **Predicate domain→range table** — each row names a typed wikilink predicate (e.g. `depends_on`, `related`, `sources`), the page class that may originate the link (domain), the page class the link must point to (range), and the link's direction and cardinality. Eleven predicates are defined: `parent`, `sources`, `related`, `contradicts`, `supersedes`, `depends_on`, `key_pages`, `members`, `scope`, `children`, `child_indexes`.

2. **Enum list** — closed canonical values for every schema enum: `type` (page type), `entity_type`, `source_type`, `synthesis_type`, `project_status`, `source_format`, `status`. The classifier (I1) reads the page-type enum to assign a class; the `--type` filter in search (R1) also reads it.

The profile is versioned: the first version is `ontology-profile-v1`. A second version would be a schema change requiring a new ADR and new templates.

## Key Principles

**Single source of truth.** R2 graph traversal, C1 MOC descent, and I1 classification all read this block and no other source. No agent or script maintains a parallel copy of the predicate table or the enum list.

**Closed by default; `entity_type` is the sole vault-extensible axis.** All other enums are fully closed: adding a new page `type` is a schema change requiring a new ADR, new templates, and a new lint case. A vault owner may widen `entity_type` by adding values to `entity_type_extensions:` in their own vault's `CLAUDE.md`. The legal set is `core ∪ extensions`, computed at read time.

**Domain and range constrain wikilinks.** An entity page (`type: entity`) may carry `related:` pointing to another entity or concept, but it cannot carry `key_pages:` (which is only valid on `topic` pages). A future S1-check lint finding will flag domain-range violations; the engine's graph-traversal primitive skips edges that violate their row's domain or range rather than traversing invalid edges.

**Topic-locality and strict-tree constraints layer on top.** The predicate table defines what types of pages a predicate may connect; ADR-0033 and ADR-0036 further constrain where those connections may go (same topic; spine edges only). Both constraints apply simultaneously.

**Graph-traversal primitive reads only the association core.** R2 (`--graph`) walks `sources`, `related`, and `depends_on` to N≤2 hops. The MOC descent (C1) walks `parent`, `child_indexes`, and `children`. `contradicts` and `supersedes` are available to R3/synthesis analysis. The predicate table is the authority for which edges each traversal mode follows.

## Examples

The predicate row for `depends_on` states: domain = `concept`, `topic`, `project`; range = `concept`, `entity`; directed, 0..N. A concept page about "strict-tree-reduce" may carry `depends_on: ["[[deriveSpine|deriveSpine]]"]` linking to an entity page about the spine function. An entity page may not carry `depends_on:` — it is outside the domain.

A vault owner building a machine-learning wiki adds `entity_type_extensions: [dataset, model]` to their `CLAUDE.md`. The engine's I1 classifier then accepts `entity_type: dataset` on ingested pages without a lint error, while all other enums remain closed.

## Related Concepts

The ontology profile is consumed by the graph-traversal primitive (R2), MOC descent (C1), the classification checklist (I1), and the `--type` search filter (R1). It constrains the predicates (the typed wikilink edges), the domain and range of those predicates, and the controlled vocabulary for all schema enums. The `engine ontology --json` verb exposes the profile as machine-readable JSON for tooling.
---
