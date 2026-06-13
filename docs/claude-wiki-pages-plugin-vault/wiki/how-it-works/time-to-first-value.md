---
title: "Time-to-First-Value"
type: concept
aliases: ["Time-to-First-Value", "time-to-first-value", "TTFV", "first cited answer", "quickstart path"]
parent: "[[How It Works]]"
path: "how-it-works"
sources: ["[[Getting Started (CLI Quickstart)]]", "[[User Guide 01: Getting Started]]"]
related: ["[[Onboarding Wizard]]", "[[Doctor Command]]", "[[Installation]]", "[[Portable Markdown]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "guides", "onboarding", "getting-started"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Time-to-First-Value

> [!summary]
> Time-to-First-Value (TTFV) is the design target that measures how quickly a new user can go from plugin install to receiving a cited answer from the wiki. The reference path is five steps: install → init → drop sources into `raw/` → `/claude-wiki-pages:wiki` → `/claude-wiki-pages:query "your question"`. TTFV is a product design principle that shapes which features are onboarding-path vs advanced.

## Definition

TTFV is not a measured SLA but a design compass: when evaluating a feature or a change to the onboarding flow, the question is "does this shorten or lengthen the time from install to first cited answer?" Features that extend TTFV need strong justification; features that shorten it are preferred.

The Getting Started guide defines the reference TTFV path:

| Step | Command | What happens |
| --- | --- | --- |
| 1 | `/plugin marketplace add odere-pro/claude-wiki-pages-plugin` | Plugin registered in marketplace |
| 2 | `/plugin install claude-wiki-pages` then `/claude-wiki-pages:init` | Plugin loaded; vault scaffolded |
| 3 | Drop files in `raw/` | Source material queued for ingest |
| 4 | `/claude-wiki-pages:wiki` | Sources ingested; wiki pages created |
| 5 | `/claude-wiki-pages:query "your question"` | Cited answer from the wiki |

A user who follows this path gets their first cited answer with no manual configuration, no prerequisites beyond Claude Code itself.

## What "Value" Means

The "value" in TTFV is specifically a **cited answer** — an answer where every claim is traceable to a source page in the wiki, which in turn traces back to a raw source file. This is the plugin's core value proposition. An uncited answer (e.g., a Claude inference) is not "value" in this definition.

The query command produces a cited answer by:
1. Running deterministic keyword + graph search over the wiki
2. Loading the top-scoring pages into context
3. Synthesizing an answer with explicit wikilink citations
4. Appending a `## Sources` section listing every consulted page

## Onboarding Design Implications

TTFV shapes the onboarding wizard's design. The wizard (`/claude-wiki-pages:init`) scaffolds only what is needed to reach Step 4: vault structure, `CLAUDE.md`, `index.md`, `log.md`. Advanced features (local model configuration, multi-vault registry, maintenance automation) are not surfaced in the wizard — they are progressive-disclosure items for after first value.

The [[Doctor Command]] (`/claude-wiki-pages:doctor`) is positioned as a verification step after init, before ingest. It is fast (seconds) and non-destructive. Its placement on the TTFV path is deliberate: catching a broken install early prevents confusion at Step 4.

## Relationship to Portable Markdown

Step 5 (query) produces an Obsidian-native cited answer. A related value is the ability to export that answer as [[Portable Markdown]] for use outside Obsidian — `/claude-wiki-pages:markdown` renders a query answer as plain markdown in `vault/output/`. This extends the value proposition to users who are not using Obsidian.

## Related Concepts

- [[Onboarding Wizard]] — the wizard that covers Steps 1–2 of the TTFV path
- [[Doctor Command]] — the health check that verifies the install before ingest
- [[Installation]] — the three installation paths that lead to Step 1
- [[Portable Markdown]] — the value extension for non-Obsidian users
