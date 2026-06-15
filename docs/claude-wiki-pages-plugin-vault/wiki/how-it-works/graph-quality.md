---
title: "Graph Quality"
type: concept
aliases: ["Graph Quality", "graph quality", "graph-quality.sh", "graph quality detector", "graph quality metrics"]
parent: "[[how-it-works|How It Works]]"
path: "how-it-works"
sources: ["[[_sources/adr-0027-fill-gaps-and-graph-quality|ADR-0027: Fill-Gaps Capability and Graph-Quality Detector]]", "[[_sources/adr-0028-dangling-wikilink-verify-check|ADR-0028: Dangling-Wikilink WARN Check in Verify]]"]
related: ["[[fill-gaps-skill|Fill-Gaps Skill]]", "[[dangling-wikilink|Dangling Wikilink]]", "[[node-concentration|Node Concentration]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "graph", "quality", "metrics", "dangling"]
created: 2026-06-15
updated: 2026-06-15
update_count: 1
status: active
confidence: 1.0
---

# Graph Quality

## Definition

Graph quality is a set of deterministic metrics that measure how well the wiki's Obsidian knowledge graph is structured: whether dangling links exist, whether the majority of nodes and edges cluster around core topic hubs, and how often hub pages are touched by the graph's edges.

## Implementation

`scripts/graph-quality.sh --target <vault> [--json]` implements the detector in pure bash + python3 stdlib — no Bun, no network, no embeddings (consistent with NO-RAG Principle).

It performs two tasks:

### 1. Dangling-Wikilink Scan

Scans every wiki page's `[[wikilinks]]` (body + frontmatter) and resolves each against the union of {filename stem, `title`, `aliases`} case-insensitively. Outputs unresolved targets as dangling findings. No space↔hyphen fuzzing — that exact mismatch is what produces empty grey nodes in Obsidian.

### 2. Cluster Concentration Metrics

Assigns each topic-bearing page to one of the seven core clusters and computes:

| Metric | Definition |
|---|---|
| `Cn` (node concentration) | Fraction of pages that belong to one of the seven core topic clusters |
| `Ce` (edge concentration) | Fraction of edges whose both endpoints are in the same cluster |
| `Ch` (hub-touch fraction) | Fraction of non-hub pages that link to at least one hub page |

## Resolution Model

The link-resolution model is shared with [[dangling-wikilink|Dangling Wikilink]] and the `verify` check (see ADR-0028). A `[[Target]]` resolves iff, case-insensitively, its normalized form (strip `|alias`, `#heading`, `^block`, then `strip().lower()`) equals some page's filename stem, `title:`, or one entry in `aliases:`.

## Fill-Gaps Quality Gates

The [[fill-gaps-skill|Fill-Gaps Skill]] workflow gates on:
- `danglingCount == 0`
- `Cn ≥ 0.85`
- `Ce ≥ 0.85`
- `Ch` reported (informational)

## Relationship to verify

`graph-quality.sh` is the richer, standalone scanner (per-target ref counts, cluster metrics) used by the fill-gaps workflow. The `verify` engine check (added in ADR-0028) is a lean gate-path twin of its dangling scan — surfacing dangling links as WARN-tier findings on the same Report every consumer reads, without replacing the full detector.

## Related Concepts

- [[dangling-wikilink|Dangling Wikilink]] — the broken link pattern this tool detects
- [[node-concentration|Node Concentration]] — the Cn/Ce/Ch metrics
- [[fill-gaps-skill|Fill-Gaps Skill]] — the workflow that uses graph-quality.sh as its quality gate
- Wiki-Only Graph — the Obsidian graph view that graph quality measures
