---
title: "ADR-0005: Git Required Per-Vault Init"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "git", "vault"]
aliases: ["ADR-0005: Git Required Per-Vault Init"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0005: Git Required Per-Vault Init

## Summary

Git is required for every vault. The `init` command git-inits the vault. Two availability tiers exist: Bun-primary (full snapshot/commit/revert) and Bun-absent (bash shim). A nesting guard prevents git-within-git accidents.

## Key Claims

- Every vault must be its own git repo; `init` git-inits it.
- Git is the foundation for reversible self-heal, checkpoints, and durable-memory write-backs.
- Two tiers: Bun ≥ 1.2 primary (full engine), bash shim when Bun is absent (degraded).
- A nesting guard (`scripts/snapshot.sh`) prevents creating a git repo inside an existing one.
- `gitCheckpoint.mode` controls behavior: `bun` (primary), `bash` (shim), `off`.

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[Git Checkpoint]]
- [[Snapshot]]
- [[Vault Resolution]]
