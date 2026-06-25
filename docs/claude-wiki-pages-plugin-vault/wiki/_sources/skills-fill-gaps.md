---
title: "Fill Gaps Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "fill-gaps"]
aliases: ["Fill Gaps Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Fill Gaps Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/fill-gaps/SKILL.md`
- Type: Skill definition for the `fill-gaps` verb

## Summary

The `fill-gaps` skill closes dangling wikilinks and thin coverage in a vault. It orchestrates eight sequential phases (Resolve+Baseline, Stage, Ingest, Hubs, Dangling, Enrich, Heal+Polish, Measure) to drive dangling link count to zero and cluster pages around core topics. It materializes a workflow script into `<project>/.claude/workflows/` and runs it.

## Key Claims

Covers: Fill Gaps Skill, Eight Phases, Dangling-Link Resolution Policy, Quality Gates, Graph Concentration Metrics.

Dangling-link resolution policy (hard rule): never create an empty page. The policy: Obsidian primitives → prose-ify; recurring backed concept → create substantive typed page; name mismatch → curator rewrites link; recurring substantive concept with no page → create `derived: true` page; true one-off → prose-ify. Quality gates in Phase G: `danglingCount == 0`, `errors == 0 && warnings == 0`, `Cn ≥ 0.85` (node concentration), `Ce ≥ 0.85` (edge concentration), each hub page has ≥5 outbound links.
