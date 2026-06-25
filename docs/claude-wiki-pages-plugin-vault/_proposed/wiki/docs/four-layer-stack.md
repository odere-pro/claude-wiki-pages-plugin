---
title: "Four-Layer Stack"
type: concept
aliases: ["four-layer stack", "four layer architecture", "Data Skills Agents Orchestration", "plugin architecture"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-architecture|Four-Layer Architecture]]"]
related: []
tags: ["docs", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.95
derived: false
proposed_by: "claude"
---

# Four-Layer Stack

The plugin's architecture: four layers — Data, Skills, Agents, Orchestration — each catching a different class of failure, implemented with a different tool, and described in `docs/architecture.md`.

## Definition

The four-layer stack is the organizing principle of the `claude-wiki-pages` plugin. It is the direct implementation of Karpathy's LLM Wiki pattern as a Claude Code plugin. Each layer has a distinct responsibility, a distinct failure mode it catches, and a distinct tooling choice:

| Layer | Directory | Responsibility | Failure class caught |
|---|---|---|---|
| Layer 1 — Data | `vault/` | Immutable raw content, LLM-maintained wiki, vault schema | Content correctness |
| Layer 2 — Skills | `skills/` | 26 single-responsibility slash commands | Capability gaps |
| Layer 3 — Agents | `agents/` | 8 multi-step executors composing skills | Workflow coordination |
| Layer 4 — Orchestration | `commands/`, `hooks/`, `scripts/`, `rules/` | Hooks, rules, scripts enforcing schema at every tool call | Invariant violations |

The layers are not optional modules — they are the architecture. A skill operates at L2 but reads the vault (L1) and may invoke a hook (L4). An agent (L3) chains skills (L2) and is guarded by hooks (L4). The data the agent produces lands in the vault (L1).

## Key Principles

**Each layer catches a different failure class.** L1 data correctness is enforced by the vault schema. L2 capability gaps are filled by adding skills. L3 coordination failures (multi-step workflows breaking down) are addressed by agents with retry caps and confirmation gates. L4 invariant violations (a write that bypasses the schema) are caught by hooks.

**Skills are single-responsibility.** A skill does one thing (ingest, query, lint, synthesize…) and does it well. The plugin ships 26 skills: 14 plugin-authored short verbs, one onboarding skill, 6 agent-teaching skills, and 5 Obsidian-targeted skills (including 3 MIT-licensed from `kepano/obsidian-skills`).

**Agents chain skills and own completion gates.** An agent like the ingest agent chains: source reading → extraction → plan gate → page writing → auto-heal delegation → synthesis. Each gate (confirmation, git checkpoint, retry cap) is an agent-level concern, not a skill-level concern.

**Layer 4 is always-on.** Hooks fire at every relevant lifecycle event (`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStop`). A blocking hook exits with code 2 and rejects the tool call before any write. Rules are path-scoped and loaded per-session. Scripts are the implementations hooks call.

**The deterministic engine is Layer 4's backbone.** The Bun CLI (`src/cli/cli.ts`) is a pure computation tool: same input, same output, no LLM, no side effects beyond what it is explicitly told to do. It runs verify, lint, backlog, context, okf, snapshot, and heal. Its `fail-closed engine bridge` (`engine.sh`) blocks security-relevant operations (verify, firewall) when Bun is absent rather than failing open.

## Examples

A user runs `/claude-wiki-pages:wiki` (L4 command → L3 orchestrator) which probes vault state via the engine (L4 script → Bun CLI) and dispatches to the ingest agent (L3). The ingest agent reads raw sources (L1), runs the skill ingest workflow (L2 invocation pattern), writes pages to the wiki (L1), and the PostToolUse hook fires `verify-ingest.sh` (L4) to confirm the writes are clean.

The firewall hook (L4 PreToolUse) intercepts an agent's Write call targeting `raw/`, checks the path against `denyPaths`, and rejects the write — protecting L1's immutability contract without the agent needing to know about it.

## Related Concepts

The four-layer stack is described in `docs/architecture.md`. Each layer has canonical directories and conventions: L1 in `vault/`, L2 in `skills/`, L3 in `agents/`, L4 in `commands/`, `hooks/`, `scripts/`, and `rules/`. The deterministic engine, firewall, hooks, and vault schema are all L4 components that enforce the contracts of the other layers.
---
