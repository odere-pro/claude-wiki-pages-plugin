---
title: "claude-wiki-pages Plugin"
type: entity
entity_type: product
aliases: ["claude-wiki-pages Plugin", "claude-wiki-pages", "the plugin"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture Documentation]]", "[[Glossary]]", "[[Installation Guide]]", "[[Features]]"]
related: ["[[Orchestrator Agent]]", "[[Deterministic Engine]]", "[[Four-Layer Stack]]"]
tags: ["plugin", "product"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# claude-wiki-pages Plugin

> [!summary]
> The `claude-wiki-pages` Claude Code plugin is a four-layer stack (Data · Skills · Agents · Orchestration) that turns an Obsidian vault into a provenance-tracked wiki following the Karpathy LLM Wiki pattern. The single advertised entry point is `/claude-wiki-pages:wiki`. Claude Code stays primary; local models are opt-in and quality-gated.

## Overview

`claude-wiki-pages` is a Claude Code plugin that implements the [Karpathy LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). It maintains a structured, provenance-tracked knowledge wiki in an Obsidian vault. The LLM reads from `raw/` (immutable sources), writes to `wiki/` (typed, wikilinked pages), and follows `vault/CLAUDE.md` (schema authority).

The plugin ships 24 skills, 7 agents, 3 slash commands, and 7 hook event handlers. All components are wired at install time; the user interacts through a single entry verb.

## Key Facts

- **Plugin identifier:** `claude-wiki-pages` (lowercase, hyphenated). Never `llm-wiki-stack`.
- **Entry point:** `/claude-wiki-pages:wiki` — the orchestrator probes vault state and dispatches to one specialist agent per invocation.
- **Secondary commands:** `/claude-wiki-pages:onboarding` (guided first-run wizard) and `/claude-wiki-pages:doctor` (environment health check — read-only).
- **Layer count:** 4 layers: Data (vault), Skills (24), Agents (7), Orchestration (hooks/scripts/rules).
- **Non-negotiable:** NO embeddings on the default retrieval path. Deterministic keyword search only.
- **Marketplace:** Published at `odere-pro/claude-wiki-pages-plugin`; dev marketplace is `claude-wiki-pages-local`.

## Related

- [[Four-Layer Stack]] — the architectural model
- [[Orchestrator Agent]] — sole user-facing entry agent
- [[Deterministic Engine]] — validates the vault deterministically
- [[Schema Authority]] — `vault/CLAUDE.md` wins every frontmatter conflict
