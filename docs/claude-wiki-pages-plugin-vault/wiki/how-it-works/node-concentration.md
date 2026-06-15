---
title: "Node Concentration"
type: concept
aliases: ["Node Concentration", "node concentration", "Cn", "Ce", "Ch", "edge concentration", "hub-touch fraction", "graph concentration metrics", "cluster concentration"]
parent: "[[How It Works]]"
path: "how-it-works"
sources: ["[[ADR-0027: Fill-Gaps Capability and Graph-Quality Detector]]"]
related: ["[[Graph Quality]]", "[[Fill-Gaps Skill]]", "[[Dangling Wikilink]]", "[[Wiki-Only Graph]]", "[[Folder Note]]"]
contradicts: []
supersedes: []
depends_on: ["[[Graph Quality]]"]
tags: ["concept", "graph", "metrics", "concentration", "cluster"]
created: 2026-06-15
updated: 2026-06-15
update_count: 1
status: active
confidence: 1.0
---

# Node Concentration

## Definition

Node concentration (Cn) is one of three graph-quality metrics that measure how well the wiki's knowledge graph clusters around the seven core topic hubs. High concentration means the majority of nodes and edges are in recognizable, navigable clusters — not scattered as isolated pages with no clear home.

## The Three Metrics

| Metric | Symbol | Definition | Fill-Gaps Gate |
|---|---|---|---|
| Node concentration | `Cn` | Fraction of wiki pages that belong to one of the seven core topic clusters | ≥ 0.85 |
| Edge concentration | `Ce` | Fraction of wikilink edges whose both endpoints are in the same cluster | ≥ 0.85 |
| Hub-touch fraction | `Ch` | Fraction of non-hub pages that link to at least one hub page | Reported, not gated |

## Why These Metrics Matter

A vault ingested from a large docs tree tends to spread across many small folders with no center of mass. The user's explicit quality bar for the fill-gaps capability was: *the majority of nodes and edges should cluster around a fixed set of core topics, each a navigable hub.* Cn and Ce are the faithful operational measure of that bar.

`Ch` is informational rather than gated because it measures a softer property (hub connectivity) whose absence does not necessarily signal a broken graph — some peripheral pages legitimately do not link to a hub.

## Computation

`scripts/graph-quality.sh` computes all three metrics in pure bash + python3 stdlib:

1. **Cluster assignment.** Each topic-bearing page is assigned to exactly one of the seven core clusters (`engine`, `how-it-works`, `knowledge-graph`, `llm`, `obsidian`, `plugin`, `wiki-pages`) based on its `path:` frontmatter field.
2. **Cn.** Count pages in a cluster / total wiki pages.
3. **Ce.** Count wikilink edges where both endpoints are in the same cluster / total wikilink edges.
4. **Ch.** Count non-hub pages that have at least one wikilink to a hub page / total non-hub pages.

## Relationship to Hub Pages

Hub pages (`type: topic`) are the concentration anchors. The [[Fill-Gaps Skill]] workflow authors one hub per cluster before computing Cn/Ce, then uses these metrics to verify the authoring succeeded. A failed Cn or Ce gate means the wiki still lacks the center-of-mass the hub pages were supposed to provide.

## Related Concepts

- [[Graph Quality]] — the full detector that computes these metrics
- [[Fill-Gaps Skill]] — the workflow that gates on Cn ≥ 0.85 and Ce ≥ 0.85
- [[Wiki-Only Graph]] — the Obsidian graph these metrics characterize
