---
title: "claude-wiki-pages (Plugin)"
type: entity
entity_type: product
aliases: ["claude-wiki-pages (Plugin)", "claude-wiki-pages", "the plugin"]
parent: "[[plugin|claude-wiki-pages Plugin]]"
path: "plugin"
sources: ["[[_sources/architecture|Architecture Documentation]]", "[[_sources/glossary|Glossary]]", "[[_sources/install|Installation Guide]]", "[[_sources/features|Features]]", "[[_sources/getting-started|Getting Started (CLI Quickstart)]]", "[[plugin-readme|Plugin README]]", "[[plugin-json|Plugin Manifest (plugin.json)]]"]
related: ["[[orchestrator-agent|Orchestrator Agent]]", "[[four-layer-stack|Four-Layer Stack]]", "[[hook-system|Hook System]]"]
tags: ["plugin", "product"]
created: 2026-06-13
updated: 2026-06-13
update_count: 6
status: active
confidence: 1.0
---

# claude-wiki-pages (Plugin)

> [!summary]
> The `claude-wiki-pages` Claude Code plugin is a four-layer stack (Data · Skills · Agents · Orchestration) that turns an Obsidian vault into a provenance-tracked wiki following the Karpathy LLM Wiki pattern. The single advertised entry point is `/claude-wiki-pages:wiki`. The plugin ships 24 skills, 7 agents, 3 slash commands, and 7 hook event handlers. Claude Code stays primary; local models are opt-in and quality-gated.

## Overview

`claude-wiki-pages` is a Claude Code plugin that implements the [Karpathy LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). It maintains a structured, provenance-tracked knowledge wiki in an Obsidian vault. The LLM reads from `raw/` (immutable sources), writes to `wiki/` (typed, wikilinked pages), and follows `vault/CLAUDE.md` (schema authority).

Most LLM-wiki implementations are one layer: a prompt and a folder convention. `claude-wiki-pages` is four layers, because each layer has a different failure mode and deserves a different tool:

- Data corruption looks like a missing `sources` field or an orphan page — caught by Layer 4 hooks and lint.
- A skill misbehaving looks like bad output for one command — caught by re-running with different input.
- An agent misbehaving looks like a half-written wiki after a long run — caught by `SubagentStop` gates.
- Orchestration misbehaving looks like hooks not firing — caught by startup reminders and the health check.

## Key Facts

- **Plugin identifier:** `claude-wiki-pages` (lowercase, hyphenated). Never `llm-wiki-stack` (banned since 1.0.0 rebrand).
- **Entry point:** `/claude-wiki-pages:wiki` — the orchestrator probes vault state and dispatches to one specialist agent per invocation.
- **Secondary commands:** `/claude-wiki-pages:onboarding` (guided first-run wizard) and `/claude-wiki-pages:doctor` (environment health check — read-only).
- **Layer count:** 4 layers: Data (vault), Skills (24), Agents (7), Orchestration (hooks/scripts/rules).
- **Non-negotiable:** NO embeddings on the default retrieval path. Deterministic keyword search only (Porter stemming + synonym lexicon + wikilink graph walk).
- **Marketplace:** Published at `odere-pro/claude-wiki-pages-plugin`; dev marketplace is `claude-wiki-pages-local` (differently named to prevent collision when both are added).
- **Bun optional but recommended:** Without Bun ≥ 1.2, engine commands (`verify`/`fix`/`heal`/`doctor`) are disabled; bash hooks still enforce the schema.

## What the Plugin Ships

| Component type | Count | Examples                                                                                                                                                                                   |
| -------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Skills         | 24    | `init`, `ingest`, `query`, `lint`, `fix`, `synthesize`, `index`, `markdown`, `search`, `review`, `draft`, `sync`, `onboarding`, `obsidian-graph-colors` + 5 agent-teaching + 3 third-party |
| Agents         | 7     | orchestrator, onboarding, ingest, curator, analyst, polish, maintenance                                                                                                                    |
| Slash commands | 3     | `/claude-wiki-pages:wiki`, `/claude-wiki-pages:onboarding`, `/claude-wiki-pages:doctor`                                                                                                    |
| Hook events    | 7     | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStop`, `Stop`, `SessionEnd`                                                                                      |

## Data Flow (One Ingest)

1. Human drops a source into `vault/raw/`.
2. Human runs `/claude-wiki-pages:wiki` (or `:ingest`).
3. Plugin reads `vault/CLAUDE.md` — the schema authority.
4. Ingest agent writes a source summary to `wiki/_sources/`.
5. `PreToolUse` hooks fire: `validate-frontmatter.sh`, `check-wikilinks.sh`, `protect-raw.sh`.
6. Agent extracts entities/concepts, updates existing wiki pages, creates new ones in topic folders.
7. Every touched page gets `sources` updated, `update_count` incremented, `updated` date set.
8. Folder notes in touched folders get new `children` entries; `wiki/index.md` gets new pages.
9. `wiki/log.md` gets a `## [YYYY-MM-DD] ingest | Source Title` entry.
10. `SubagentStop` hook runs `verify-ingest.sh` — the human sees any structural drift immediately.

## What the Scaffolding Buys (Measured)

The Scaffolding Ablation (ADR-0020) runs the same model through two prompt arms — the plugin's full prompts vs a generic "extract the knowledge into well-organized notes" prompt. Key measured results (`qwen3-coder:30b`):

| Capability               | With plugin | Without plugin                    |
| ------------------------ | ----------- | --------------------------------- |
| `schema_validity`        | 1.00        | 0.00                              |
| `claim_source_fidelity`  | 1.00        | 0.00                              |
| `dedup_correctness`      | 1.00        | 0.00                              |
| Answer citation protocol | PASS        | Unscorable (drifted off-protocol) |

## Topic Map

This page is the wiki's **root entry point**: every top-level topic in the vault is a facet of this one plugin. Start here and descend into the topic that matches your question.

- [[plugin|claude-wiki-pages Plugin]] — the plugin's own agents, hooks, and packaging
- [[engine|Wiki Engine]] — the deterministic TypeScript engine and its verbs
- [[wiki-pages|Wiki Pages]] — the page schema, ingest pipeline, and retrieval contract
- [[llm|LLM]] — the LLM-wiki pattern, NO-RAG stance, and local-model tiers
- [[obsidian|Obsidian]] — the Obsidian experience: graph, vault scoping, CLI
- [[knowledge-graph|Knowledge Graph]] — the ontology profile and graph model
- [[how-it-works|How It Works]] — lifecycle, maintenance, and operational flows

## Related

- [[four-layer-stack|Four-Layer Stack]] — the architectural model this plugin implements
- [[orchestrator-agent|Orchestrator Agent]] — sole user-facing entry agent; dispatches all work
- Deterministic Engine — validates the vault with no embeddings or inference
- Schema Authority — `vault/CLAUDE.md` wins every frontmatter conflict
- [[hook-system|Hook System]] — how the plugin enforces its contracts at every tool call
- Installation — how to install and verify the plugin
