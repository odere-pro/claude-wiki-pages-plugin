---
title: "Ontology Profile"
type: concept
aliases: ["ontology profile", "Ontology Profile", "ontology-profile-v1", "predicate table"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-adr-0004|ADR-0004: ontology-profile-v1]]", "[[docs-design-ontology|Design: Ontology Classes and Predicates]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "ontology", "schema"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Ontology Profile

The `ontology-profile-v1` section in `CLAUDE.md` — a named contract containing exactly two tables (predicate domain→range and enum list) that R2 graph traversal, C1 MOC descent, and I1 classification all read.

## Definition

A named, additive section in `skills/init/template/CLAUDE.md` that introduces no new frontmatter field and no new page type — it only tabulates relationships and values the schema already defines. The profile version (`v1`) is independent of `schema_version`.

## Key Principles

**Predicate domain→range table (11 predicates):**

| Predicate | Domain | Range | Direction / cardinality |
| --- | --- | --- | --- |
| `parent` | any non-root page | `index` | directed, single |
| `sources` | entity, concept, topic, project, synthesis | `source` | directed, 1..N |
| `related` | entity, concept, topic, project | entity, concept, topic, project | undirected, 0..N |
| `contradicts` | concept | concept | undirected, 0..N |
| `supersedes` | concept, topic, project, synthesis | same class | directed, 0..N |
| `depends_on` | concept, topic, project | concept, entity | directed, 0..N |
| `key_pages` | topic | entity, concept | directed, 0..N |
| `members` | project | entity, concept | directed, 0..N |
| `scope` | synthesis | entity, concept, topic, project | directed, 1..N |
| `children` | index | any non-root page | directed, 0..N |
| `child_indexes` | index | index | directed, 0..N |

**Enum list.** Page type: 9 closed values (`source`, `entity`, `concept`, `topic`, `project`, `synthesis`, `index`, `manifest`, `log`). `entity_type`: 7 core values (`person`, `organization`, `product`, `tool`, `service`, `standard`, `place`) — the sole vault-extensible axis via `entity_type_extensions:` in the vault's own `CLAUDE.md`. All other enums (`source_type`, `synthesis_type`, `project_status`, `source_format`, `status`) are fully closed.

**Three consumers read this table:**
- R2 graph traversal walks `sources` + `related` + `depends_on` to N≤2.
- C1 MOC descent walks `parent`/`child_indexes`.
- I1 classification assigns an extracted thing to the correct page class using the page type and `entity_type` enums.

**Calibration.** A vault owner widens `entity_type` ONLY by adding `entity_type_extensions:` to their vault's `CLAUDE.md`. The legal set is core ∪ extensions, computed at read time. No second list.

## Examples

A wikilink `A.related → B` is legal only if A and B are both `entity`, `concept`, `topic`, or `project`. A wikilink `A.sources → B` is legal only if A is an entity/concept/topic/project/synthesis and B is a `source`. An edge violating domain/range is a lint finding (S1-check), not a traversal the engine follows.

## Related Concepts

The ontology profile is the formal backbone of the schema authority (`CLAUDE.md`). The strict tree topology (ADR-0036) adds a further constraint: even valid predicates in `related`/`depends_on`/etc. among visible topic pages are demoted to tags, not edges.
