---
title: "Design: Ontology Classes and Predicates"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["docs", "design", "ontology"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Design: Ontology Classes and Predicates

## Metadata

- File: `raw/repo/docs/design/07-ontology.md`
- Type: design documentation (Mermaid diagrams)

## Summary

Visualizes the closed predicate domain→range table from ontology-profile-v1 as a Mermaid diagram. Shows which page classes exist and which typed predicates may connect them. Authority: skills/init/template/CLAUDE.md ontology-profile-v1; diagram visualizes it, does not restate it.

## Key Claims

Page classes: source, entity, concept, topic, project, synthesis, index. Predicate edges (from ontology-profile-v1): entity/concept/topic/project/synthesis →|sources| source; entity/concept/topic/project →|related| each other (same class); concept →|contradicts| concept; concept/topic/project →|depends_on| entity/concept; topic →|key_pages| entity/concept; project →|members| entity/concept; synthesis →|scope| entity/concept/topic/project; index →|children| any; index →|child_indexes| index; any non-root →|parent| index. Use this diagram to understand the closed structural graph before writing wikilinks or running graph-traversal primitive. graph-traversal primitive (R2 --graph) walks sources + related + depends_on to N≤2; C1 descent walks parent/child_indexes; R3/synthesis uses contradicts/supersedes.

Covers: Ontology Diagram, Predicate Domain-Range, Page Classes, Graph Traversal
