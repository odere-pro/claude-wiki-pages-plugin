---
title: "ADR-0027: Fill-Gaps Capability and Graph-Quality Detector"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-15
tags: ["adr", "fill-gaps", "graph-quality", "skill", "dangling-links"]
aliases: ["ADR-0027: Fill-Gaps Capability and Graph-Quality Detector", "ADR-0027"]
sources: []
created: 2026-06-15
updated: 2026-06-15
status: active
confidence: 1.0
---

# ADR-0027: Fill-Gaps Capability and Graph-Quality Detector

## Summary

Adds the `fill-gaps` skill and `/claude-wiki-pages:fill-gaps` slash command. The skill materializes a Workflow script on demand (copied from `skills/fill-gaps/template/fill-knowledge-gaps.mjs` into `.claude/workflows/`), then runs it. Simultaneously adds `scripts/graph-quality.sh`, a deterministic bash/python3 scanner that detects dangling wikilinks and measures cluster concentration.

## Key Claims

- A Claude Code plugin cannot ship a `.mjs` Workflow directly (`plugin.json` has no `workflows` key); the solution is a skill that materializes the workflow on demand (same pattern as `init`).
- `fill-gaps` is `disable-model-invocation: true` (it writes the vault) and fronted by `/claude-wiki-pages:fill-gaps`.
- `scripts/graph-quality.sh --target <vault> [--json]`: pure bash + python3 stdlib — no Bun, no network, no embeddings. Scans every wiki page's `[[wikilinks]]` (body + frontmatter), resolves against {filename stem, `title`, `aliases`} case-insensitively.
- Computes node concentration `Cn`, edge concentration `Ce`, and hub-touch fraction `Ch` per the seven core clusters.
- Workflow gating: `danglingCount == 0`, `verify` clean, `Cn ≥ 0.85`, `Ce ≥ 0.85`.
- Dangling links resolved by creating a real sourced page, fixing the link (alias/fuzzy), or prose-ifying — never by an empty stub, never by fabrication.
- Plugin gains a fourth slash command and a fourteenth authored skill verb.
- Promoting the dangling check into `engine verify` as a real CHECK is a deliberate future follow-up (→ ADR-0028).

## Entities Mentioned

- [[Polish Agent]]
- [[Curator Agent]]
- [[Ingest Agent]]

## Concepts Covered

- [[Fill-Gaps Skill]]
- [[Graph Quality]]
- [[Node Concentration]]
- [[Dangling Wikilink]]

## Grounded Pages

Wiki pages that cite this source:

- [[Fill-Gaps Skill]] — primary decision page (new)
- [[Graph Quality]] — graph-quality.sh detector (new)
- [[Node Concentration]] — Cn/Ce/Ch metrics (new)
- [[Dangling Wikilink]] — detection and resolution pattern (new)
