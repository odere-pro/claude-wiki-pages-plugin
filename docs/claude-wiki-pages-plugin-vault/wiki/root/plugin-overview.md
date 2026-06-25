---
title: "Plugin Overview"
type: concept
aliases: ["plugin overview", "claude-wiki-pages", "what is claude-wiki-pages"]
parent: "[[root|Root]]"
path: "root"
sources: ["[[root-readme|README]]", "[[root-claude-md|Root CLAUDE.md]]", "[[root-software-3-0-md|SOFTWARE-3-0 Dual Entry Point]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["root", "overview", "four-layer-stack"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Plugin Overview

`claude-wiki-pages` is a Claude Code plugin that turns an Obsidian vault into a provenance-tracked LLM-maintained knowledge base, following Karpathy's LLM Wiki pattern.

## Definition

The plugin implements a four-layer stack (Data / Skills / Agents / Orchestration) where the human curates raw sources and the plugin maintains the wiki. Hooks enforce the schema at every tool-call boundary. A deterministic Bun engine handles structural verification and self-heal under git checkpoints.

## Key Principles

- **One entry verb.** `/claude-wiki-pages:wiki` is the advertised entry point; the orchestrator probes vault state and dispatches automatically.
- **Four layers, each catching a different failure.** Data (passive vault), Skills (26 single-responsibility verbs), Agents (8 multi-step executors), Orchestration (hooks, scripts, rules).
- **Convention-driven.** Schema authority lives in `skills/init/template/CLAUDE.md`; canonical terms in `docs/GLOSSARY.md`; architecture in `docs/architecture.md`. Every skill, agent, and hook binds to them.
- **No telemetry.** The plugin never phones home. Local at `.claude/claude-wiki-pages/settings.json`.
- **Dev-time vs. runtime separation.** At install, Claude Code loads only `skills/`, `agents/`, `hooks/hooks.json` + `scripts/`, and `rules/`. Everything else (docs/, tests/, root CLAUDE.md, CHANGELOG) is plugin cache, not session context.

## Examples

The dispatch flow from one verb:

1. `/claude-wiki-pages:wiki` → orchestrator probes vault state
2. No vault → init wizard (scaffolds `docs/<slug>-vault/`)
3. New files in `raw/` → ingest agent → polish agent
4. Pending lint → curator agent
5. Analytical prompt (`what`, `why`, `compare`) → analyst agent

## Related Concepts

Prerequisites: Claude Code >=2.0, bash/git/find, jq, Bun >=1.2. Optional: Obsidian for graph view. macOS one-liner installer: `install-macos.sh`. Software-3.0 dual entry point applies: persons use `/claude-wiki-pages:wiki`; agents load `skills/engine-api` and `skills/maintain-contract` first.
