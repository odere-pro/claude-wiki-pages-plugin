---
title: "claude-wiki-pages"
type: entity
entity_type: product
aliases: ["claude-wiki-pages", "Claude Wiki Pages", "the plugin"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture]]", "[[Features]]", "[[Glossary]]", "[[Getting Started]]", "[[Installation]]", "[[Operations]]"]
related: ["[[Four-Layer Stack]]", "[[Karpathy LLM Wiki Pattern]]", "[[claude-wiki-pages-orchestrator-agent]]"]
tags: [plugin, product]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# claude-wiki-pages

> [!summary]
> `claude-wiki-pages` is a Claude Code plugin that implements Karpathy's LLM Wiki pattern as a four-layer stack. It provides a typed, provenance-tracked Obsidian vault wiki maintained by an LLM, with hook-enforced structural guarantees.

## Identity

- **Plugin identifier**: `claude-wiki-pages` — lowercase, hyphenated. Used in headings and slash-command namespaces (`/claude-wiki-pages:<verb>`).
- **Type**: Claude Code plugin.
- **Pattern**: Karpathy's LLM Wiki pattern.
- **Architecture**: [[Four-Layer Stack]] (Data / Skills / Agents / Orchestration).

## Key Differentiators

- Hook-enforced schema validation on every write.
- Structural provenance: every wiki page cites at least one raw source via `[[wikilinks]]`.
- Seven specialist agents with a single orchestrator entry point.
- Five-tier test harness (Tier 0–4).
- Ships a security model (`SECURITY.md`).

## Entry Point

`/claude-wiki-pages:wiki` is the single advertised user-facing entry. The orchestrator probes vault state and dispatches automatically.

## Installation

See [[Installation]] for the three install paths (marketplace, local, update).
