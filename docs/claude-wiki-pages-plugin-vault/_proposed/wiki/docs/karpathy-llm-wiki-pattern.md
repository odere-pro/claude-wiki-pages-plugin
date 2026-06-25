---
title: "Karpathy LLM Wiki Pattern"
type: concept
aliases: ["Karpathy LLM Wiki pattern", "LLM Wiki pattern", "LLM wiki", "Karpathy wiki"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-research-foundations|Research Foundations and Prior Art]]", "[[docs-glossary|Canonical Glossary]]", "[[docs-architecture|Four-Layer Architecture]]"]
related: []
tags: ["docs", "research", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.9
derived: false
proposed_by: "claude"
---

# Karpathy LLM Wiki Pattern

The pattern by Andrej Karpathy (2025) that proposes maintaining a typed, cited wiki with an LLM: raw source material is immutable, the LLM writes and maintains typed wiki pages that cite sources, and the human curates sources and asks questions.

## Definition

The Karpathy LLM Wiki pattern is the research precedent that `claude-wiki-pages` directly implements. Published by Andrej Karpathy as a gist in 2025, the pattern defines a simple split of responsibilities:

- **Human** — drops raw source material into an immutable directory, asks questions, curates sources.
- **LLM** — reads raw sources, writes structured typed wiki pages that cite their sources, updates existing pages as new sources arrive, and answers questions with citations to specific wiki pages.

The pattern's key insight is that an LLM can maintain a structured knowledge base more reliably than it can answer questions from raw sources directly, because the wiki acts as a persistent, verified intermediate layer that accumulates across sessions.

The plugin formalises and enforces this pattern through four layers (Data, Skills, Agents, Orchestration) with a schema, provenance rules, structural lint, and git checkpointing — turning the pattern from a convention into a verifiable contract.

## Key Principles

**Raw is immutable, wiki is LLM-maintained.** The split is structural and enforced: the firewall and `protect-raw.sh` prevent any write to `raw/`; the ingest pipeline is the only sanctioned path from raw content to wiki pages.

**Every page cites at least one source.** The pattern's citation discipline is formalized as the `sources:` required field: `verify` blocks a write if a wiki page has no source citation. No claim exists without a traceable origin.

**The wiki accumulates across sessions.** Because the wiki is a persistent, version-controlled directory, knowledge from session 1 is available in session 2. An LLM that reads `wiki/index.md` and descends into the relevant folder notes has access to all prior ingest work without needing to re-read every raw source.

**Domain-agnostic.** The pattern is not specific to any subject matter. The vault layout, frontmatter schema, and ingest rules work for a software architecture wiki, a legal research wiki, a literature review, or any other knowledge domain. The topic tree structure is derived from the content, not hardcoded.

**Discoverability term only.** "LLM Wiki" is a discoverability-surface term (README tagline, GitHub About, `plugin.json` description). In technical prose and within the vault, "wiki" and "plugin" are the canonical terms. `validate-docs.sh` flags stray "LLM Wiki Stack" occurrences outside SEO surfaces.

## Examples

The `claude-wiki-pages` plugin is the direct implementation of the Karpathy LLM Wiki pattern: `raw/` holds immutable sources, `wiki/` holds LLM-maintained typed pages, the ingest agent processes sources into pages with `sources:` citations, and the query process answers questions with `[[wikilink]]` citations and a mandatory `## Sources` section.

The pattern applied to a software project: a user drops API docs, ADRs, and architecture diagrams into `raw/`. After ingest, the wiki contains entity pages for each service, concept pages for each architectural pattern, and source summaries for each doc. A question "What does the orchestrator depend on?" is answered by the analyst with citations to specific wiki pages and their raw sources.

## Related Concepts

The Karpathy LLM Wiki pattern is the research foundation of the plugin. It grounds the design choices: raw immutability, required source citations, the split between the ingest (write) workflow and the query (read) workflow, and the LLM-as-writer / human-as-curator split. The NO-RAG retrieval stance and the deterministic engine are engineering decisions layered on top of the pattern to make it verifiable and auditable.
---
