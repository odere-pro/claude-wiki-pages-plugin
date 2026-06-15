---
title: "Ontology Profile v1"
type: concept
aliases: ["Ontology Profile v1", "ontology-profile-v1", "ontology profile"]
parent: "[[knowledge-graph|Knowledge Graph]]"
path: "knowledge-graph"
sources: ["[[_sources/adr-0004-ontology-profile-v1|ADR-0004: Ontology Profile v1]]", "[[design-07-ontology|Design: Ontology]]", "[[_sources/glossary|Glossary]]"]
related: ["[[schema-authority|Schema Authority]]", "[[graph-traversal-primitive|Graph Traversal Primitive]]", "[[deterministic-engine|Deterministic Engine]]", "[[no-rag-principle|NO-RAG Principle]]"]
tags: ["concept", "ontology", "schema"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Ontology Profile v1

> [!summary]
> The `ontology-profile-v1` is a named section in `vault/CLAUDE.md` — the single source of truth for the vault's formal ontology. It contains exactly two tables: a predicate domain→range table (11 predicates) and an enum list (closed canonical values for every schema field). R2 graph traversal, C1 MOC descent, and I1 classification all read exclusively from this profile. No parallel file exists; no copy is permitted. The engine's `ontology --json` verb projects this profile at read time without duplicating it.

## Definition

The `ontology-profile-v1` is a named section in `vault/CLAUDE.md` that declares the vault's formal ontology: which typed relationship may connect which kind of page, and the closed value sets for every schema field. It is the single source of truth — no parallel file, no copy permitted.

## Key Principles

- The ontology lives in schema + frontmatter + wikilinks — never a triplestore, RDF database, or vector store.
- The profile section lives inside `CLAUDE.md` (the file the engine and every agent already load) — there is no second file to keep in sync.
- `entity_type` is the sole vault-extensible axis; all other enums are closed and require a new ADR to extend.
- The engine's `ontology --json` verb projects the profile at read time without duplicating it; if the tables are malformed, the verb exits non-zero.
- "Read these two tables and no other source" is the authoritative instruction to agents; any reconstruction from prose is a drift risk.

## Examples

Projecting the ontology at runtime:

```bash
bash scripts/engine.sh ontology --json --target <vault>
```

Output structure:

```json
{
  "enums": {
    "type": ["source", "entity", "concept", "topic", "project", "synthesis", "index", "manifest", "log"],
    "entity_type": ["person", "organization", "product", "tool", "service", "standard", "place", "dataset"]
  },
  "predicates": [
    { "predicate": "sources", "domain": ["entity", "concept", "topic", "project", "synthesis"], "range": ["source"], "cardinality": "1..N" },
    { "predicate": "related", "domain": ["entity", "concept", "topic", "project"], "range": ["entity", "concept", "topic", "project"], "cardinality": "0..N" }
  ]
}
```

The second entry in `enums.entity_type` (`"dataset"`) was added by the vault owner via `entity_type_extensions: [dataset]` — the legal set is core ∪ extensions.

## Problem Statement (ADR-0004)

Three downstream systems need to know the vault's ontology: which typed relationship may connect which kind of page (R2 graph traversal), which navigation edges the topic tree uses (C1 MOC descent), and what the legal page types and entity types are (I1 classification and the `--type` filter).

Before `ontology-profile-v1`, this knowledge existed only as scattered prose in `CLAUDE.md` — described one-by-one in field notes, inlined per page type as enum examples. No artifact stated the **edge set** (domain/range per predicate) as a named contract. If R2, C1, and I1 each reconstructed the edge rules independently from the prose, they would drift on the first predicate or page-type change. That is the second-source-of-truth failure the Brief forbids.

The constraint: the ontology must live in schema + frontmatter + wikilinks — never a triplestore, RDF database, or vector store. So the profile cannot be a new file; it must be additive content inside the existing `CLAUDE.md`.

## The Two Tables

### Predicate Domain→Range Table

Eleven predicates, each with domain (allowed source page class), range (allowed target page class), direction, and cardinality:

| Predicate       | Domain                                     | Range                           | Direction / Cardinality |
| --------------- | ------------------------------------------ | ------------------------------- | ----------------------- |
| `parent`        | any non-root page                          | `index`                         | directed, single        |
| `sources`       | entity, concept, topic, project, synthesis | `source`                        | directed, 1..N (≥1)     |
| `related`       | entity, concept, topic, project            | entity, concept, topic, project | undirected, 0..N        |
| `contradicts`   | concept                                    | concept                         | undirected, 0..N        |
| `supersedes`    | concept, topic, project, synthesis         | same class                      | directed, 0..N          |
| `depends_on`    | concept, topic, project                    | concept, entity                 | directed, 0..N          |
| `key_pages`     | topic                                      | entity, concept                 | directed, 0..N          |
| `members`       | project                                    | entity, concept                 | directed, 0..N          |
| `scope`         | synthesis                                  | entity, concept, topic, project | directed, 1..N          |
| `children`      | index                                      | any non-root page               | directed, 0..N          |
| `child_indexes` | index                                      | index                           | directed, 0..N          |

The [[graph-traversal-primitive|Graph Traversal Primitive]]'s `walk()` function reads only the R2_EDGES subset: `sources`, `related`, `depends_on`. The MOC/descent edges (`parent`, `children`, `child_indexes`, `key_pages`) are used by C1. The `contradicts`/`supersedes` edges are available to R3/synthesis.

An edge violating a row's domain/range is a future S1-check lint finding, not a traversal the engine follows.

### Enum List

All closed value sets for the schema, single-sourced in the profile:

| Enum             | Canonical Values                                                                | Closed?                       |
| ---------------- | ------------------------------------------------------------------------------- | ----------------------------- |
| `type`           | source, entity, concept, topic, project, synthesis, index, manifest, log        | Closed core                   |
| `entity_type`    | person, organization, product, tool, service, standard, place                   | Closed core + owner extension |
| `source_type`    | article, paper, policy, transcript, book, video, podcast, manual, agent-session | Closed core                   |
| `synthesis_type` | comparison, theme, contradiction, gap, timeline                                 | Closed core                   |
| `project_status` | planned, active, paused, done, abandoned                                        | Closed core                   |
| `source_format`  | text, image, pdf                                                                | Closed core                   |
| `status`         | active, stale, superseded, draft                                                | Closed core                   |

`entity_type` is the **sole vault-extensible axis**. A vault owner may add values via `entity_type_extensions:` in their own `CLAUDE.md` — the legal set is then core ∪ extensions at read time. There is no parallel extension file.

All other enums are fully closed: adding a value to `type` requires a new ADR, new templates, and a new lint case. This friction is intentional — page type is the primary filter and the riskiest thing to let drift.

## Design Decisions (ADR-0004)

### Why Inside CLAUDE.md, Not a New File

The constraint "never a triplestore, RDF database, or vector store" rules out extracting the ontology to a new committed file. A `schemas/ontology.json` would be a second source of truth that can drift from the prose. The profile section lives inside `CLAUDE.md` — the file the engine and every agent already load — so there is one document and no second artifact to keep in sync.

### Why Its Own Version (`v1`) Not `schema_version`

`schema_version` gates fields the engine validates. The ontology profile version gates the shape of the two tables. Coupling them would force a `schema_version` bump (and a `migrate` run) for an ontology-table change that adds no field. An independent `ontology-profile-v1` label keeps each migration honest.

### Machine Projection, Not Duplication (ADR-0015)

The engine's `ontology --json` verb (ADR-0015) makes the profile machine-readable without duplicating it. At query time, the verb parses the two markdown tables from `CLAUDE.md` and emits:

- `enums.type` — the closed page-type enum
- `enums.entity_type` — core ∪ `entity_type_extensions`
- `predicates[]` — one entry per row

If the tables are malformed, the verb exits non-zero. It never emits a silent-empty manifest.

This satisfies the core instruction in the profile itself: "read these two tables and no other source. Do not duplicate or fork either table."

## Calibration Mechanism

Vault owners extend `entity_type` ONLY via:

```yaml
# In the vault's own CLAUDE.md
entity_type_extensions: [dataset, model]
```

The legal set is computed at read time as core ∪ extensions. No second list, no parallel file. The engine's `ontology --json` output includes the composed set so agents see the full legal vocabulary for that vault.

## Related Concepts

- [[schema-authority|Schema Authority]] — `CLAUDE.md` that contains this profile
- [[graph-traversal-primitive|Graph Traversal Primitive]] — reads R2_EDGES from this profile
- [[deterministic-engine|Deterministic Engine]] — `ontology --json` projects this profile at read time
- [[no-rag-principle|NO-RAG Principle]] — the `ontology --json` projection is deterministic parse, never embedding
