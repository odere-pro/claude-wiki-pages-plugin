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
updated: 2026-06-15
status: active
confidence: 1.0
---

# Architecture Documentation

## Summary

The architecture documentation describes the four-layer stack that powers the `claude-wiki-pages` plugin: Data (vault), Skills (single-responsibility capabilities), Agents (multi-step executors), and Orchestration (hooks, scripts, rules). Each layer catches a different class of failure. The single advertised entry point is `/claude-wiki-pages:wiki`; the orchestrator probes vault state and dispatches to one specialist agent per invocation. Provenance is structural — every wiki page's `sources` field links back to at least one `raw/` item.

## Key Claims

- The four-layer stack is: Layer 1 — Data (`raw/`, `wiki/`, `CLAUDE.md`), Layer 2 — Skills (single-responsibility capabilities), Layer 3 — Agents (multi-step executors), Layer 4 — Orchestration (hooks, scripts, rules).
- Each layer fails differently and its gate is placed in the only location that failure can be observed.
- `protect-raw.sh` (PreToolUse hook) enforces raw immutability; sources in `raw/` are never rewritten.
- The orchestrator (`claude-wiki-pages-orchestrator-agent`) is the sole user-facing entry agent; specialists never re-probe state.
- The deterministic engine (`src/cli/cli.ts`, requires Bun ≥ 1.2) validates the vault; no embeddings or inference are involved.
- The `SubagentStop` backstop runs `verify-ingest.sh` after the ingest pipeline and surfaces any drift immediately.
