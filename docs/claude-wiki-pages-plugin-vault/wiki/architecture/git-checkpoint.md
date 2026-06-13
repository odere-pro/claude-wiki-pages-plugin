---
title: "Git Checkpoint"
type: concept
aliases: ["Git Checkpoint", "git checkpoint", "snapshot", "git-checkpointed"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture Documentation]]", "[[Glossary]]", "[[ADR-0005: Git Required Per-Vault]]", "[[Design: Sequences]]"]
related: ["[[Deterministic Engine]]", "[[Ingest Agent]]", "[[Curator Agent]]", "[[Hook System]]"]
tags: ["concept", "git"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Git Checkpoint

## Definition

A git checkpoint (snapshot) is a git commit that bounds an LLM write phase, making every vault mutation reversible with `git revert`. Every write-path agent calls `scripts/snapshot.sh pre` before writing and `scripts/snapshot.sh post` after writing.

## Key Principles

- **Pre-snapshot:** creates a `snapshot:` commit capturing the pre-write state (rollback point).
- **Post-snapshot:** creates a `snapshot:` commit capturing all writes as one revertible unit.
- **Commit backstop:** after a write-path agent returns, `subagent-commit-gate.sh` commits any vault changes left uncommitted as a labelled backstop commit (never blocks; always exits 0).
- **Git is required per vault:** `init` git-inits the vault; writes commit; `git revert` is the rollback path.
- **`gitCheckpoint.mode`:** `bun` (primary, full engine), `bash` (shim when Bun is absent), `off`.
- **Ingest writes and heal fixes** land as separate, individually revertible commits (ingest snapshot post → curator snapshot post).

## Examples

- Ingest pipeline: `snapshot pre` → write all source summaries + wiki pages → `snapshot post` → curator agent → `snapshot post`.
- A bad restructure: `git revert <snapshot-sha>` restores the vault to the pre-restructure state.

## Related Concepts

- [[Deterministic Engine]] — `snapshot` is an engine verb
- [[Ingest Agent]] — calls snapshot pre/post wrapping the write phase
- [[Curator Agent]] — checkpoint commit precedes every auto-heal change
- [[Hook System]] — `subagent-commit-gate.sh` is the SubagentStop backstop
