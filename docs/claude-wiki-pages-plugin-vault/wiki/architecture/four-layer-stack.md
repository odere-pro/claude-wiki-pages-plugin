---
title: "Four-Layer Stack"
type: concept
aliases: ["Four-Layer Stack", "four-layer stack", "four-layer architecture", "plugin stack"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture Documentation]]", "[[Glossary]]", "[[Design: System Context]]", "[[Design: Feature Relations]]"]
related: ["[[claude-wiki-pages Plugin]]", "[[Deterministic Engine]]", "[[Orchestrator Agent]]", "[[Hook System]]"]
tags: ["architecture", "concept"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Four-Layer Stack

## Definition

The four-layer stack is the architectural model of the `claude-wiki-pages` plugin. Each layer catches a different class of failure and has a clearly scoped responsibility.

| Layer | Directory | Responsibility |
| --- | --- | --- |
| Layer 1 — Data | `docs/vault-example/` | Immutable `raw/`, LLM-maintained `wiki/`, schema in `CLAUDE.md`. Passive — holds the material. |
| Layer 2 — Skills | `skills/` | 24 single-responsibility capabilities. The `/claude-wiki-pages:` namespace scopes them. |
| Layer 3 — Agents | `agents/` | 7 multi-step executors composing skills. Own completion gates. |
| Layer 4 — Orchestration | `commands/`, `hooks/`, `scripts/`, `rules/` | Slash commands, hook enforcement, script implementations, path-scoped rules. |

## Key Principles

- **One class of failure per layer.** Data layer handles storage; skills handle single operations; agents handle multi-step workflows; orchestration enforces invariants.
- **Specialists never re-probe state.** The orchestrator (Layer 4 entry) probes vault state once; specialists trust its payload.
- **Deterministic engine as peer.** The Bun CLI (`src/cli/cli.ts`) validates the vault inside Layer 4 — same input always produces the same result.
- **No embeddings.** Retrieval is wiki pages + wikilinks + frontmatter. The deterministic engine enforces this.

## Examples

- A user runs `/claude-wiki-pages:wiki` (Layer 4 command) → orchestrator (Layer 3/4) probes vault state → dispatches to the ingest agent (Layer 3) → which calls the ingest skill (Layer 2) → which writes to `wiki/` (Layer 1).
- The `PreToolUse` hook (Layer 4 orchestration) blocks a write that would modify `raw/` before the ingest agent's write even lands.

## Related Concepts

- [[claude-wiki-pages Plugin]] — the product implementing this stack
- [[Orchestrator Agent]] — the Layer 4 entry agent
- [[Deterministic Engine]] — the Layer 4 validation peer
- [[Hook System]] — Layer 4 enforcement mechanism
- [[Specialist Pattern]] — agents that never re-probe state
