---
title: "claude-wiki-pages Plugin"
type: index
aliases: ["claude-wiki-pages Plugin", "claude-wiki-pages plugin", "plugin", "Plugin"]
parent: "[[index|Wiki Index]]"
path: "plugin"
children:
  - "[[agent-contract-table|Agent Contract Table]]"
  - "[[agent-tool-restriction|Agent Tool Restriction]]"
  - "[[plugin-dev-time-vs-runtime|Plugin Dev-Time vs Runtime]]"
  - "[[plugin-manifest|Plugin Manifest]]"
  - "[[single-pass-dispatch|Single-Pass Dispatch]]"
  - "[[analyst-agent|Analyst Agent]]"
  - "[[brainstorming-team|Brainstorming Team]]"
  - "[[claude-wiki-pages-plugin|claude-wiki-pages (Plugin)]]"
  - "[[curator-agent|Curator Agent]]"
  - "[[design-diagrams|Design Diagrams]]"
  - "[[engineering-team|Engineering Team]]"
  - "[[four-layer-stack|Four-Layer Stack]]"
  - "[[git-checkpoint|Git Checkpoint]]"
  - "[[hook-system|Hook System]]"
  - "[[ingest-agent|Ingest Agent]]"
  - "[[maintenance-agent|Maintenance Agent]]"
  - "[[orchestrator-agent|Orchestrator Agent]]"
  - "[[polish-agent|Polish Agent]]"
  - "[[design-drift-gate|Design-Drift Gate]]"
  - "[[parity-gate|Parity Gate]]"
  - "[[plugin-arm|Plugin Arm]]"
  - "[[multi-vault-registry|Multi-Vault Registry]]"
  - "[[parallel-extract|Parallel Extract]]"
child_indexes: []
tags: ["plugin", "architecture", "agents"]
created: 2026-06-13
updated: 2026-06-15
---

# claude-wiki-pages Plugin

> [!summary]
> The `claude-wiki-pages` plugin is a Claude Code plugin that implements a four-layer stack (Data · Skills · Agents · Orchestration) for maintaining a provenance-tracked Obsidian wiki. Plugin identity lives in [[plugin-manifest|Plugin Manifest]] (`plugin.json`). Every agent carries a normative [[agent-contract-table|Agent Contract Table]] that declares its schema authority, halting condition, budget, and safety model. Tool boundaries are enforced via [[agent-tool-restriction|Agent Tool Restriction]]. The orchestrator routes through a [[single-pass-dispatch|Single-Pass Dispatch]] table — one specialist per turn, no recursion. The [[plugin-dev-time-vs-runtime|Plugin Dev-Time vs Runtime]] boundary separates what ships in the plugin cache from what enters session context.

## Overview

The `claude-wiki-pages` plugin is registered with Claude Code via `plugin.json`. It ships seven agents, twenty-five skills, a hook system, and a shell script layer. Together these turn any Obsidian vault into a self-healing, provenance-tracked knowledge base.

The plugin is packaged as a **dev-time/runtime split**: contributors work with the full repository (docs, tests, ADRs, this wiki); end-users see only the runtime surfaces — `skills/`, `agents/`, `hooks/`, `scripts/`, and `rules/`. The `CLAUDE.md` schema in a user's vault overrides every plugin default.

Three structural patterns govern how the plugin's agents behave:

1. **Agent contract tables** declare invariants per-agent in their YAML front-matter — schema authority, halting condition, budget, safety model, retry cap, and untrusted-input rule.
2. **Tool restrictions** declare which tools each agent may use, creating capability sandboxes enforced at the agent level.
3. **Single-pass dispatch** in the orchestrator ensures one specialist is dispatched per invocation, preventing runaway recursion or conflicting writes.

## Key Pages

### Plugin Identity

[[plugin-manifest|Plugin Manifest]] is the `plugin.json` file Claude Code reads to register the plugin. It declares the plugin name (`claude-wiki-pages`), version (`1.0.0`), license (Apache-2.0), hook entry point (`./hooks/hooks.json`), and supported schema versions (`[1, 2, 3]`).

### Agent Structural Patterns

[[agent-contract-table|Agent Contract Table]] is the per-agent YAML front-matter pattern that every agent file uses. The canonical items are: schema authority (always `vault/CLAUDE.md`), halting condition, budget, safety model, untrusted-input rule, and retry cap. The table is the agent's normative specification — it wins over any general instruction.

[[agent-tool-restriction|Agent Tool Restriction]] describes how each agent's `tools:` field in YAML front-matter creates a capability boundary. The most important invariant is the extract-worker restriction: extract workers hold `Read`, `Glob`, and `Grep` only — no `Write`, no `Edit`, no `Bash`.

[[single-pass-dispatch|Single-Pass Dispatch]] is the orchestrator's core behavioral invariant: for any given invocation, exactly one specialist is dispatched from a nine-row routing table. The orchestrator never recurses, never fans out on ambiguity. After a write-path specialist completes, the polish agent runs as a tail step — not a second routing decision.

### Install Boundary

[[plugin-dev-time-vs-runtime|Plugin Dev-Time vs Runtime]] documents what ships at install versus what is dev-only. Runtime surfaces: `skills/`, `agents/`, `hooks/`, `scripts/`, `rules/`. Dev-only: `docs/`, `tests/`, `.github/`, root `CLAUDE.md`, `NOTICE`, `LICENSE`, `CHANGELOG.md`. End-users interact through skills, agents, hooks, and scripts; they never directly load the plugin repo's docs.

### Audit Trail

[[log|Operations Log]] is the vault's paper trail: every ingest, curator pass, polish run, snapshot, query, and sync appends an entry with the operation type, date, and summary. It is the authoritative provenance trail for the vault's history, maintained by every write-path skill.

## Open Questions

- As the plugin adds new agent types (e.g., additional extract workers), does the contract table pattern scale to a larger set of items, or should a machine-readable contract schema be introduced?
- The install boundary is enforced by convention today. Should a validation gate confirm that no dev-only path is loaded as session context?
