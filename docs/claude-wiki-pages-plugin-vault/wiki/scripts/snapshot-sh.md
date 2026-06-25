---
title: "snapshot.sh"
type: entity
entity_type: tool
aliases: ["snapshot.sh", "Git Checkpoint Script"]
parent: "[[scripts|Scripts]]"
path: "scripts"
sources: ["[[scripts-snapshot-sh|scripts/snapshot.sh]]"]
related: []
tags: ["scripts", "git-checkpoint", "layer-4", "revertible"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# snapshot.sh

Single agent-facing entry for git-bounding an LLM write phase with revertible pre/post checkpoints.

## Overview

`scripts/snapshot.sh` wraps every LLM write phase in two git commits: `pre` (before writes begin) and `post` (after writes complete). This makes every ingest, heal, or synthesis operation individually revertible via `git revert`. Delegates to the Bun engine when present; falls back to inline git for degraded installs.

## Key Facts

- Accepts `pre` and `post` subcommands with `--target`, `--op`, and `--label` flags.
- The `pre` subcommand acquires an advisory vault lock via `vault-lock.sh` to serialise concurrent ingest sessions.
- The `post` subcommand stages all vault-scoped changes and commits them as a `snapshot: <label>` commit.
- Honors `gitCheckpoint.mode` from project or user config (values: `commit` or `off`). The `off` mode skips all git operations for vaults in repositories with stricter commit policies.
- Pathspec-scoped to the vault directory so unrelated project files are never staged.
- Always exits 0: reports results but never gates a write operation.
- The bash fallback git commit uses internal bookkeeping author identity and `--no-gpg-sign` to avoid requiring a signing key for automated bookkeeping commits.

## Related

`vault-lock.sh` provides the advisory lock. The engine's snapshot module is at `src/commands/snapshot/`.
