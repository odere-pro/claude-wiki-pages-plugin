---
title: "Four-Layer Architecture"
type: concept
aliases: ["four-layer architecture", "Four-Layer Stack", "four-layer stack"]
parent: "[[how-it-works|How It Works]]"
path: "how-it-works"
sources: ["[[docs-architecture|Architecture]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "architecture", "design"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Four-Layer Architecture

A four-layer implementation of Karpathy's LLM Wiki pattern packaged as a Claude Code plugin, where each layer catches a different class of failure.

## Definition

The plugin organizes its components into four layers, each with a distinct responsibility and failure mode:

| Layer | Responsibility | What lives here |
| --- | --- | --- |
| **1. Data** | Immutable sources and wiki schema | `skills/init/template/raw/`, `wiki/`, `skills/init/template/CLAUDE.md` |
| **2. Skills** | Individual capabilities invoked by human or agent | `skills/` (26 skills) |
| **3. Agents** | Multi-step executors that orchestrate skills | `agents/` (8 agents) |
| **4. Orchestration** | Hooks, rules, provenance guards | `hooks/hooks.json`, `scripts/`, `rules/` |

## Key Principles

**Each layer fails differently.** Data corruption (missing `sources:` field, orphan page) is caught by Layer 4 (`validate-frontmatter.sh`, lint). A skill misbehaving is caught by the human re-running with different input. An agent half-writing the wiki is caught by Layer 4's `SubagentStop` gates. Orchestration misbehaving (hooks not firing) is caught by startup reminders and the health check.

**Layer 1 — Data.** Sources go into `raw/` and are never rewritten — `protect-raw.sh` enforces this. Wiki pages live under `wiki/` and are typed by YAML frontmatter. Every claim in every wiki page carries a `sources:` field back to at least one `raw/` item, so provenance is structural, not cultural. The schema (`skills/init/template/CLAUDE.md`) is the authority; every skill and agent defers to it.

**Layer 2 — Skills.** Each skill is a single-responsibility capability. Skills are slash-command entry points; they do not know about each other. The plugin ships 26: 14 plugin-authored verbs + `onboarding` + 5 agent-teaching skills (`engine-api`, `maintain-contract`, `analyst-modes`, `curator-fixes`, `ingest-pipeline`) + `voice` + `obsidian-graph-colors` + `obsidian-vault` + 3 MIT-licensed `obsidian-*` reference skills.

**Layer 3 — Agents.** Agents chain skills and tools across multi-step flows. The orchestrator agent is the user-facing entry: it probes vault state and dispatches to one specialist per invocation. Eight agents ship: orchestrator, onboarding, ingest, extract-worker (read-only), curator, analyst, polish, and maintenance.

**Layer 4 — Orchestration.** Slash commands, hooks, and rules turn the architecture into a contract. `PreToolUse` hooks block frontmatter violations, non-wikilink cross-references, and edits to `raw/`. `PostToolUse` hooks remind the LLM to update folder notes and `index.md`. `SubagentStop` hooks run `verify-ingest.sh` and commit any vault changes left uncommitted.

## Examples

**Data flow through the layers for one ingest:**

1. Human drops a source into `vault/raw/`.
2. Human runs `/claude-wiki-pages:wiki` (Layer 4 command).
3. Orchestrator agent (Layer 3) probes state and dispatches to ingest specialist.
4. Ingest agent (Layer 3) reads `skills/init/template/CLAUDE.md` (Layer 1 schema).
5. Ingest agent writes source summary to `wiki/_sources/` (Layer 1 wiki).
6. Layer 4 hooks fire: `validate-frontmatter.sh`, `check-wikilinks.sh`, `validate-attachments.sh`.
7. Ingest agent extracts entities/concepts, updates wiki pages, creates new ones.
8. Every touched page gets `sources:` updated, `update_count` incremented, `updated` date set.
9. Folder notes in touched folders get new `children:` entries.
10. `wiki/index.md` gets new pages, `wiki/log.md` gets an entry.
11. `SubagentStop` hook runs `verify-ingest.sh` — human sees any drift immediately.

## Related Concepts

The four-layer design is documented in `docs/architecture.md`. The Obsidian graph view represents each topic folder as an island hanging off the ROOT hub, with only spine edges drawn.
