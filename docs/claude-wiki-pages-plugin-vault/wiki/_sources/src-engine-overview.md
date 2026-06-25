---
title: "src — Deterministic Engine Overview"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "engine", "architecture"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src — Deterministic Engine Overview

## Metadata

- **Source**: `raw/repo/src/CLAUDE.md`
- **Type**: Internal architecture document

## Summary

The `src/` directory is the deterministic Bun/TypeScript engine — the "brain" behind the Layer 4 Orchestration hooks and scripts. It indexes, links, verifies, and self-heals an Obsidian LLM-Wiki vault with zero network, zero embeddings, and no ML. Same vault in, same report out. It compiles to `dist/cli.js` via `bun build` and bash hooks shell out to it through `scripts/engine.sh`.

## Key Claims

- Entry point is `cli/cli.ts`: a router that parses argv, dispatches to a command handler, emits JSON or text, and returns an exit code
- Build command: `bun build ./src/cli/cli.ts --outdir ./dist --target bun`
- `engine.sh` runs the prebuilt artifact when present and falls back to running `src/cli/cli.ts` directly
- Immutable data pattern: never mutate inputs, return new objects (`core/report.ts` is `Object.freeze`d)
- Uses `unknown` + narrowing for errors, never `any`
- Small modules: one responsibility per file; commands are thin, primitives in `core/` do the work
- Colocated tests: `*.test.ts` next to each module, run with `bun test`
- Shell ↔ TS parity: bash hooks are the hot path; the engine is the full implementation; two bash twins mirror latency-critical slices pinned byte-for-byte by parity gates
- `verify` ↔ `scripts/verify-ingest.sh`, pinned by `tests/gates/gate-05-verify-parity.sh`
- `core/firewall.ts` is the sole write-isolation authority; `scripts/firewall.sh` is a thin stdin→engine wrapper
- Subtree: `cli/` (router), `commands/` (10+ verbs), `core/` (~21 primitives), `data/` (config + templates), `test-helpers/` (sandbox)
- Dev-time only: NOT shipped to end-users and NOT loaded as plugin runtime context
Covers: Engine CLI, Vault Resolution, Firewall, Report Model, Graph Traversal, Search, Verify, Heal, Snapshot, Config Loading
