---
title: "Fill Gaps Skill"
type: entity
entity_type: tool
aliases: ["Fill Gaps Skill", "fill-gaps", "/claude-wiki-pages:fill-gaps", "close gaps", "complete wiki"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-fill-gaps|Fill Gaps Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "fill-gaps", "dangling-links"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Fill Gaps Skill

The `fill-gaps` skill closes dangling wikilinks and thin coverage by staging curated repo sources, ingesting them into topic clusters, authoring hub pages, resolving every dangling link, enriching thin pages, and verifying the result — all under git checkpoints.

## Overview

Two problems this skill closes that ordinary ingest/lint do not: dangling wikilinks (empty grey nodes in Obsidian's graph, not detected by `verify`) and shallow/off-topic coverage (graph should concentrate around core topics). It orchestrates existing capabilities — the ingest, curator, and polish agents plus the engine — and adds no new write logic.

Invocation triggers: Obsidian graph shows empty nodes / wiki has broken links; coverage of core topics is thin; user wants graph re-centered on fixed topic clusters. `disable-model-invocation: true` — invoked only on explicit request.

## Key Facts

**Eight sequential phases** (write phases never parallelized — shared git tree):

| Phase | Does |
|---|---|
| 0 Resolve+Baseline | resolve vault/repo, baseline `verify` + `graph-quality.sh` |
| A Stage | copy curated repo sources into `raw/repo/<topic>/` (new files only) |
| B Ingest | one ingest-agent run per topic |
| C Hubs | author topic hub pages linking their whole cluster |
| D Dangling | create real pages for backed concepts → curator alias fix → prose-ify the rest |
| E Enrich | update thin pages from their sources + new material |
| F Heal+Polish | final `engine heal` → polish (graph colors, index) → `verify` |
| G Measure | re-scan dangling + cluster metric + hub spot-check; assert gates |

**Dangling-link resolution policy** (HARD RULE — never create an empty page):
1. Obsidian/markdown primitive or generic noun → prose-ify: rewrite `[[T]]` to backtick or plain prose
2. Recurring concept backed by an ingested source → create a substantive typed page
3. Name/alias mismatch to existing page → curator rewrites the link
4. Recurring concept, substantive, no page yet → create `derived: true` page citing referencing pages
5. True one-off → prose-ify

**Quality gates** (Phase G assertions):
- `danglingCount == 0`
- `engine verify` → `errors == 0 && warnings == 0`
- `Cn ≥ 0.85` (node concentration — ≥85% of topic pages in core clusters)
- `Ce ≥ 0.85` (edge concentration — ≥85% of wikilink edges with both endpoints in clusters)
- Each hub page has filled body sections and ≥5 outbound links

## Related

Orchestrates `[[skill-ingest|Ingest Skill]]` and the curator and polish agents. Uses `scripts/graph-quality.sh` and `scripts/strict-tree-reduce.sh` for detection and remediation.
