---
title: "Fill-Gaps Skill"
type: concept
aliases: ["Fill-Gaps Skill", "fill-gaps", "/claude-wiki-pages:fill-gaps", "fill-knowledge-gaps", "fill the gaps"]
parent: "[[How It Works]]"
path: "how-it-works"
sources: ["[[ADR-0027: Fill-Gaps Capability and Graph-Quality Detector]]"]
related: ["[[Graph Quality]]", "[[Dangling Wikilink]]", "[[Node Concentration]]", "[[Ingest Pipeline]]", "[[Curator Agent]]", "[[Polish Agent]]", "[[Maintenance Loop]]"]
contradicts: []
supersedes: []
depends_on: ["[[Graph Quality]]", "[[Ingest Pipeline]]"]
tags: ["concept", "skill", "fill-gaps", "graph-quality", "workflow"]
created: 2026-06-15
updated: 2026-06-15
update_count: 1
status: active
confidence: 1.0
---

# Fill-Gaps Skill

## Definition

The fill-gaps skill is the fourteenth authored skill verb in the plugin. It materializes a multi-step Workflow script on demand and runs it to complete a partially-ingested wiki: staging sources by topic, authoring hub pages, resolving dangling links, enriching thin pages, measuring graph quality, and healing the result.

## Why a Skill, Not a Shipped Workflow

A Claude Code plugin cannot ship a `.mjs` Workflow directly — `plugin.json` has no `workflows` key and `.claude/workflows/*.mjs` is project-local with no distribution path. The solution: carry the canonical Workflow script as a **skill asset** (`skills/fill-gaps/template/fill-knowledge-gaps.mjs`) and copy it into the user's `.claude/workflows/` on invocation (idempotent — only when absent or content-changed, never clobbering a user-modified copy).

This is the same materialize-from-`template/` pattern the `init` skill uses for the vault scaffold.

## Entry Point

`/claude-wiki-pages:fill-gaps` (fourth slash command). The orchestrator routes "complete the wiki / fill the gaps / no empty pages" intent to this skill. The skill is `disable-model-invocation: true` because it writes the vault.

## Workflow Steps

The materialized workflow orchestrates the **existing** agents — no new agent is introduced:

1. Stage pending sources by topic cluster
2. Run ingest agent per cluster
3. Author hub pages (one `type: topic` page per cluster)
4. Resolve dangling wikilinks (create sourced pages, fix aliases, or prose-ify)
5. Enrich thin pages (< 50 lines content)
6. Run curator agent (structural heal)
7. Run polish agent (graph colors, index, folder notes)
8. Measure graph quality (`graph-quality.sh`)

## Quality Gates

The workflow asserts these gates before declaring success:
- `danglingCount == 0`
- `verify` clean (0 errors)
- `Cn ≥ 0.85` (node concentration — majority of nodes in core topic clusters)
- `Ce ≥ 0.85` (edge concentration — majority of edges within clusters)
- `Ch` is reported (hub-touch fraction) but not gated

A failed gate surfaces with its checkpoint SHA, not papered over. Dangling links are resolved by creating a real sourced page, fixing the link via alias/fuzzy, or prose-ifying — never by an empty stub, never by fabrication.

## Related Concepts

- [[Graph Quality]] — the detector that measures `Cn`/`Ce`/`Ch` and dangling counts
- [[Dangling Wikilink]] — the broken link pattern fill-gaps resolves
- [[Node Concentration]] — the Cn/Ce/Ch metrics the workflow gates on
- [[Maintenance Loop]] — the loop fill-gaps orchestrates (ingest → curator → polish)
