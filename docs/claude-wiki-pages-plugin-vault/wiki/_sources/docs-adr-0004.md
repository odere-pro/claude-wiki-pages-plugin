---
title: "ADR-0004: ontology-profile-v1"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-04
date_ingested: 2026-06-25
tags: ["docs", "adr", "ontology"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0004: ontology-profile-v1

## Metadata

- File: `raw/repo/docs/adr/ADR-0004-ontology-profile-v1.md`
- Status: Accepted

## Summary

Adds one named section (ontology-profile-v1) to CLAUDE.md containing exactly two tables: a predicate domain→range table and an enum list. This is the single named contract that R2 graph traversal, C1 MOC descent, and I1 classification all read for the edge set and type enums.

## Key Claims

Problem: three consumers (R2 graph traversal, C1 MOC descent, I1 classification) need the same information (which predicates connect which page types; what are the legal page/entity types) but had no named single source. Decision: ontology-profile-v1 section in CLAUDE.md with two tables — predicate domain→range (11 predicates: parent, sources, related, contradicts, supersedes, depends_on, key_pages, members, scope, children, child_indexes) and enum list (page type, entity_type, source_type, synthesis_type, project_status, source_format, status). entity_type is the sole vault-extensible axis via entity_type_extensions: in vault CLAUDE.md. All other enums are fully closed. Profile version (v1) is independent of schema_version so a table-shape change doesn't force a schema migration. Alternatives rejected: scattered prose (drifts), separate JSON file (outside schema + frontmatter, splits truth), triplestore (hard non-negotiable), free-text entity_type (defeats classifier and filter).

Covers: Ontology Profile, Predicate Domain-Range, Enum List, entity_type Extensions
