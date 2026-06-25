---
title: "ADR-0036: Strict-Tree Topology"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-24
date_ingested: 2026-06-25
tags: ["docs", "adr", "graph"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0036: Strict-Tree Topology

## Metadata

- File: `raw/repo/docs/adr/ADR-0036-strict-tree-topology.md`
- Status: Proposed

## Summary

Supersedes the linking rule of ADR-0033. Among visible topic pages, the ONLY wikilink edges allowed are spine edges (parent/children/child_indexes) plus the single ROOT→folder-note connector. All other references are plain prose or tags. Remediation: strict-tree-reduce.sh.

## Key Claims

Problem: even after ADR-0033 topic-local rule, within-topic islands became dense blobs because topic-local still permits every intra-topic non-spine edge. Four mechanisms re-fuse: (1) intra-topic non-spine edges (siblings linking siblings); (2) transitive-redundant edges (A→C where C is already on A's spine path); (3) oversaturated nodes (tens of outbound links → hub); (4) related:/associative fields within a topic. Decision: strict-tree rule — ONLY spine edges (parent↔child) and the ROOT spine (index.md → each top-level folder note) among visible topic pages. Every other reference is plain prose or tag (never a wikilink). Association fields (related, depends_on, key_pages, members, scope, contradicts, supersedes) carry NO graph edges — express as nested tags instead. Remediation: strict-tree-reduce.sh (demotes non-spine body wikilinks to plain text, prunes non-spine entries from association frontmatter fields, records topic/<tree> tag for each demoted cross-tree edge). Tag de-cycling: demoted cross-tree edge A(tree X)→B(tree Y) becomes topic/<Y> tag on A. Spine derivation: src/core/spine.ts deriveSpine. Metrics: graph-quality.sh, tree-lint.sh. Exempt: parent:/children:/child_indexes:, sources:→_sources/**. ADR-0033's connectivity metric, island view filter, ROOT-hub remain in force.

Covers: Strict Tree Topology, Spine Edge, Tag De-Cycling, strict-tree-reduce, Transitive Reduction
