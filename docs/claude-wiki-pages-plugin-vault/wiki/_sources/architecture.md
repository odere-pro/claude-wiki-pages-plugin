---
title: "Architecture Documentation"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["architecture", "four-layer-stack", "plugin"]
aliases: ["Architecture Documentation"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Architecture Documentation

## Summary

The architecture documentation describes the four-layer stack that powers the `claude-wiki-pages` plugin: Data (vault), Skills (single-responsibility capabilities), Agents (multi-step executors), and Orchestration (hooks, scripts, rules). Each layer catches a different class of failure. The single entry point is `/claude-wiki-pages:wiki`; the orchestrator probes vault state and dispatches to one specialist agent per invocation.

## Key Claims

- The four-layer stack is: Layer 1 — Data (vault), Layer 2 — Skills (24 capabilities), Layer 3 — Agents (7 executors), Layer 4 — Orchestration (hooks/scripts/rules).
- The orchestrator (`claude-wiki-pages-orchestrator-agent`) is the sole user-facing entry agent; it routes to specialists that never re-probe state.
- The deterministic engine (`src/cli/cli.ts`, requires Bun ≥ 1.2) validates the vault; no embeddings or inference are involved.
- The firewall (`scripts/firewall.sh` + `src/core/firewall.ts`) confines all agent writes to the resolved vault; cross-vault writes are blocked.
- Every structural write is git-checkpointed via `scripts/snapshot.sh` (pre/post) for reversibility.
- The `SubagentStop` backstop (`scripts/subagent-commit-gate.sh`) commits any uncommitted vault changes after a write-path agent returns.
