---
title: "ADR-0027: Fill-Gaps and Graph Quality"
type: entity
entity_type: standard
aliases: ["ADR-0027", "adr-0027", "fill gaps ADR", "graph quality ADR"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0027|ADR-0027: Fill-Gaps and Graph Quality]]"]
related: []
tags: ["docs", "adrs", "graph", "quality-gate"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0027: Fill-Gaps and Graph Quality

Adds the `/claude-wiki-pages:fill-gaps` command and the `graph-quality.sh` detector — a skill for identifying and enriching thin wiki pages, and a script that measures graph connectivity metrics (Cn, Ce, dangling links, orphans).

## Overview

ADR-0027 makes graph health measurable and actionable. The fill-gaps skill identifies specific gap types; the graph-quality detector reports metrics that let a user track improvement over time. PR #34 delivered the capability; the vault went from 90 dangling links to 0, achieving Cn=Ce=1.0 across all topic clusters.

## Key Facts

**Status:** Accepted

**Fill-gaps skill identifies three gap types:**
- `thin-section` — an H2 section with fewer than 2 sentences of content
- `missing-sources` — a page with zero source citations (orphan provenance)
- `dangling-wikilinks` — `[[links]]` that resolve to no page in the vault

**Graph-quality detector (`graph-quality.sh`) measures:**
- Dangling wikilink count
- Orphan page count (no inbound links)
- Connected-components count (Cn) — 1 = fully connected tree
- Cluster efficiency (Ce) — Cn normalized to the number of topic folders

**Acceptance results (PR #34):**
- Before: 90 dangling wikilinks
- After: 0 dangling wikilinks, 7-topic clusters, Cn=Ce=1.0

**Consequences:**
- Graph health is now a trackable, objective metric.
- The fill-gaps skill gives the ingest agent a targeted enrichment queue.
- `graph-quality.sh` runs in the doctor's health report.

## Related

ADR-0028 (dangling wikilink verify check) adds the same detection to `verify-ingest.sh`. ADR-0031 (graph connectivity) formalizes the orphan and shadow definitions that feed the Cn metric.
