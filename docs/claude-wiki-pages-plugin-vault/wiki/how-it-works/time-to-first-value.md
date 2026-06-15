---
title: "Time-to-First-Value"
type: concept
aliases: ["Time-to-First-Value", "time-to-first-value", "TTFV", "first cited answer", "quickstart path"]
parent: "[[how-it-works|How It Works]]"
path: "how-it-works"
sources: ["[[_sources/getting-started|Getting Started (CLI Quickstart)]]", "[[llm-wiki-01-getting-started|User Guide 01: Getting Started]]"]
related: ["[[onboarding-wizard|Onboarding Wizard]]", "[[doctor-command|Doctor Command]]", "[[Installation]]", "[[portable-markdown|Portable Markdown]]"]
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

## Key Principles

- TTFV is a design compass, not a measured SLA: it guides feature prioritization rather than enforcing a timing contract.
- The "value" in TTFV is specifically a cited answer — a Claude inference is not value in this definition.
- Features that extend TTFV need strong justification; features that shorten it are preferred.
- Advanced features (multi-vault, local model config, maintenance automation) are deferred to post-TTFV progressive disclosure.
- The [[doctor-command|Doctor Command]] is positioned on the TTFV path as the verification step between init and first ingest — catching a broken install early prevents confusion at the query step.

## Examples

The five-step reference TTFV path:

| Step | Command | What happens |
| ---- | ------- | ------------ |
| 1 | `/plugin marketplace add odere-pro/claude-wiki-pages-plugin` | Plugin registered |
| 2 | `/plugin install claude-wiki-pages` then `/claude-wiki-pages:init` | Vault scaffolded |
| 3 | Drop files in `raw/` | Source material queued |
| 4 | `/claude-wiki-pages:wiki` | Wiki pages created |
| 5 | `/claude-wiki-pages:query "your question"` | First cited answer |

A cited answer from step 5 concludes with a `## Sources` section, for example:

```
## Sources

1. [Firewall] — raw/docs/adr/ADR-0009-multi-vault-confinement.md
```

## Definition

TTFV is not a measured SLA but a design compass: when evaluating a feature or a change to the onboarding flow, the question is "does this shorten or lengthen the time from install to first cited answer?" Features that extend TTFV need strong justification; features that shorten it are preferred.

The Getting Started guide defines the reference TTFV path:

| Step | Command                                                            | What happens                         |
| ---- | ------------------------------------------------------------------ | ------------------------------------ |
| 1    | `/plugin marketplace add odere-pro/claude-wiki-pages-plugin`       | Plugin registered in marketplace     |
| 2    | `/plugin install claude-wiki-pages` then `/claude-wiki-pages:init` | Plugin loaded; vault scaffolded      |
| 3    | Drop files in `raw/`                                               | Source material queued for ingest    |
| 4    | `/claude-wiki-pages:wiki`                                          | Sources ingested; wiki pages created |
| 5    | `/claude-wiki-pages:query "your question"`                         | Cited answer from the wiki           |

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

The [[doctor-command|Doctor Command]] (`/claude-wiki-pages:doctor`) is positioned as a verification step after init, before ingest. It is fast (seconds) and non-destructive. Its placement on the TTFV path is deliberate: catching a broken install early prevents confusion at Step 4.

## Relationship to Portable Markdown

Step 5 (query) produces an Obsidian-native cited answer. A related value is the ability to export that answer as [[portable-markdown|Portable Markdown]] for use outside Obsidian — `/claude-wiki-pages:markdown` renders a query answer as plain markdown in `vault/output/`. This extends the value proposition to users who are not using Obsidian.

## Related Concepts

- [[onboarding-wizard|Onboarding Wizard]] — the wizard that covers Steps 1–2 of the TTFV path
- [[doctor-command|Doctor Command]] — the health check that verifies the install before ingest
- [[Installation]] — the three installation paths that lead to Step 1
- [[portable-markdown|Portable Markdown]] — the value extension for non-Obsidian users
