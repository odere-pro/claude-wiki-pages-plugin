---
title: "Git Checkpoint"
type: concept
aliases: ["Git Checkpoint", "git checkpoint", "snapshot", "git-checkpointed", "commit backstop"]
parent: "[[claude-wiki-pages Plugin]]"
path: "plugin"
sources:
  [
    "[[Architecture Documentation]]",
    "[[Glossary]]",
    "[[ADR-0005: Git Required Per-Vault Init]]",
    "[[Design: Sequences]]",
    "[[Features]]",
    "[[Operations Guide]]",
    "[[snapshot.ts Source]]",
  ]
related:
  [
    "[[Deterministic Engine]]",
    "[[Ingest Agent]]",
    "[[Curator Agent]]",
    "[[Hook System]]",
    "[[Auto-Heal]]",
  ]
tags: ["concept", "git"]
created: 2026-06-13
updated: 2026-06-14
update_count: 7
status: active
confidence: 1.0
---

# Git Checkpoint

> [!summary]
> A git checkpoint (snapshot) is a git commit that bounds an LLM write phase, making every vault mutation reversible with `git revert`. Every write-path agent calls `scripts/snapshot.sh pre` before writing and `scripts/snapshot.sh post` after. A commit backstop in `SubagentStop` ensures no uncommitted changes escape a write phase. Git is a hard dependency — required per ADR-0005 regardless of whether Bun is installed.

## Key Principles

- The git checkpoint pattern makes every vault mutation reversible: pre-snapshot (rollback point) before writing, post-snapshot after, and a `SubagentStop` backstop that commits any uncommitted changes.
- Git is a hard dependency per ADR-0005 — required regardless of whether Bun is installed. Without a repo, the durable-memory and self-heal story breaks.
- The bash shim (`scripts/snapshot.sh`) reproduces `ensureRepo`'s end state exactly when Bun is unavailable: same identity, same flags.
- The nesting guard runs `git rev-parse --is-inside-work-tree` before any git-init; if the vault is already inside a work tree, it skips init and records `git=skipped(already-in-repo)`.
- The `subagent-commit-gate.sh` backstop never blocks and always exits 0 — it is the last safety net, not a blocking gate.

## Definition

The git checkpoint pattern is the safety model for LLM-driven vault mutations. Because an LLM write phase may span many file edits across many wiki pages, the checkpoint model ensures that:

1. A pre-write snapshot captures the vault state before any changes begin (rollback point).
2. A post-write snapshot captures all changes as one revertible unit.
3. A `SubagentStop` backstop (`subagent-commit-gate.sh`) commits any changes the agent left uncommitted — never blocks, always exits 0.

The `snapshot` engine verb implements this: `engine.sh snapshot pre` creates the `snapshot:` checkpoint commit; `engine.sh snapshot post` creates the post-write commit. When Bun is absent, `scripts/snapshot.sh` provides a bash fallback (inline git).

## Why Git is Required (ADR-0005)

Git-required per-vault init is a non-negotiable (decision #4). The rationale:

- **Undo/checkpoint guarantees** ride on git. Without a repo, the whole durable-memory and self-heal story breaks.
- **The primary seam** is `src/core/git.ts:ensureRepo()`, which git-inits the vault idempotently with a fixed bookkeeping identity (`user.name=claude-wiki-pages`, `commit.gpgsign=false`). All engine verbs (`propose`, `heal`, `migrate`, `doctor`) reuse this seam.
- **Bun-absent shim:** When Bun is unavailable, `scripts/scaffold-vault.sh` falls back to plain `git init` + initial commit that reproduces `ensureRepo`'s end state exactly — same identity, same flags. This is classified as an availability shim, not a logic fork.
- **Nesting guard:** Before any git-init, the scaffold runs `git rev-parse --is-inside-work-tree`. If the vault already sits inside a work tree (e.g., inside the plugin repo), it records `git=skipped(already-in-repo)` and skips — protecting both the plugin repo and a user's project repo from nested `.git`.

## Checkpoint Semantics

| Moment             | What happens                                                                | Who calls it                  |
| ------------------ | --------------------------------------------------------------------------- | ----------------------------- |
| Before write phase | `snapshot pre` → `snapshot:` commit (pre-write state, rollback point)       | Ingest agent, curator agent   |
| After write phase  | `snapshot post` → `snapshot:` commit (all writes as one unit)               | Ingest agent, curator agent   |
| SubagentStop       | `subagent-commit-gate.sh` commits any uncommitted vault changes as backstop | SubagentStop hook (automatic) |

`gitCheckpoint.mode` config: `bun` (primary, full engine), `bash` (shim when Bun is absent), `off`.

## Concurrency Safety

Concurrent write paths — a scheduled maintenance run, a `SubagentStop` backstop, and an interactive agent — can collide on the same vault's git index and `wiki/log.md`. Two mechanisms keep the `isClean → append/stash → commit` sequence race-free:

- **Advisory vault lock.** `scripts/vault-lock.sh` (an `flock` on `<vault>/.git/claude-wiki-pages.lock`) and its in-process companion `src/core/vault-lock.ts` (`withVaultLock` / `withVaultLockSync`) serialize the snapshot / propose / migrate / heal commit sequences so two writers cannot interleave a check-then-commit. The lock is advisory: on a `VAULT_LOCK_TIMEOUT_SEC` (default 30 s) timeout it warns and proceeds rather than blocking the write phase.
- **Bounded git calls.** Every git invocation in `src/core/git.ts` carries a timeout (`GIT_TIMEOUT_MS`, default 30 s, override `CLAUDE_WIKI_PAGES_GIT_TIMEOUT_MS`), so a stale `index.lock` can never hang the engine.

> [!note] Why this exists
> The bounded-parallel-extract and scheduled-upkeep work (ADR-0026) made it possible for more than one writer to touch a vault at once. The advisory lock plus bounded git calls close that parallel-writer race window.

## Rollback

Any checkpoint can be undone:

```bash
git revert <snapshot-sha>
```

This restores the vault to the pre-write state without losing history. The rollback pointer is reported in the curator's lint-and-fix report so the user always has it.

## Examples

- **Ingest pipeline:** `snapshot pre` → write source summary + wiki pages → `snapshot post` → curator agent → `snapshot post`.
- **Engine heal loop:** `engine.sh heal` creates a checkpoint commit, loops verify → fix → re-verify, then commits the repaired state as a single `heal:` commit.
- **A bad restructure:** `git revert <snapshot-sha>` restores the vault; no content is permanently lost.

## Related Concepts

- [[Deterministic Engine]] — the `snapshot` verb is an engine command
- [[Ingest Agent]] — calls snapshot pre/post wrapping the write phase
- [[Curator Agent]] — checkpoint commit precedes every auto-heal change
- [[Hook System]] — `subagent-commit-gate.sh` is the SubagentStop backstop
- [[Auto-Heal]] — auto-heal runs under a git checkpoint for reversibility
