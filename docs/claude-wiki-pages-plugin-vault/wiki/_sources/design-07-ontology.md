---
title: "Design: Ontology"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["design", "ontology", "graph"]
aliases: ["Design: Ontology"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Design: Ontology

## Summary

ER-style mermaid visualization of the ontology predicate domain→range table from `ontology-profile-v1`. Shows which page classes can connect via which typed predicates.

## Key Claims

- Visualizes 11 predicates: parent, sources, related, contradicts, supersedes, depends_on, key_pages, members, scope, children, child_indexes.
- Entity types (7 fixed core): person, organization, product, tool, service, standard, place.
- Page types (9): source, entity, concept, topic, project, synthesis, index, manifest, log.
- The diagram is grounded — every node corresponds to a real schema class; no speculative nodes.

## Entities Mentioned

- [[claude-wiki-pages Plugin]]

## Concepts Covered

- [[Ontology Profile v1]]
- [[Predicate Domain-Range Table]]

## Grounded Pages

Wiki pages that cite this source:

- [[Design Diagrams]] — ontology ER perspective
- [[Ontology Profile v1]] — predicate diagram
