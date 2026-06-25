---
title: "Heal Command"
type: concept
aliases: ["heal-command", "heal verb", "self-heal loop"]
parent: "[[src-commands|Src Commands]]"
path: "src/commands"
sources: ["[[src-commands-heal|src/commands/heal.ts — Git-Bounded Self-Heal]]"]
related: []
tags: ["src", "commands", "heal", "git", "self-heal"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Heal Command

Fully automatic, git-bounded self-heal. No approval prompts — safety comes from git. `verify → fix → re-verify` loop bounded by a configurable iteration cap with a checkpoint commit before any change.

## Definition

`commands/heal/heal.ts` composes the `verify` and `fix` commands in a loop. Before changing anything it writes a `checkpoint:` commit; on success it squashes all fixes into a single revertible `heal:` commit.

## Key Principles

**The loop**:
1. `verify` once — if `errors === 0`, pure no-op (no `ensureRepo`, no commits, no git churn)
2. `ensureRepo` + checkpoint commit (captures pre-heal state)
3. Repeat up to `maxIterations` (default 5): run `fix`, re-run `verify`; break on `errors === 0` OR `changed === 0` (no progress — stop rather than spin)
4. On clean with changes: `appendLog` → `commitHeal` (one revertible `heal:` commit)
5. On non-convergence: leave checkpoint, collect residual `unresolved` findings

**DIP fix (M17)**: `VerifyFn` and `FixFn` are injectable function types on `HealOptions`. Real implementations are defaults. Tests can inject alternatives without pulling sibling modules.

**Already-clean vault**: `iterations === 0`, `checkpoint === null`, no new commits (test asserts git log unchanged).

**`withVaultLockSync`**: serializes the heal critical section (in-process per-vault mutex from `vault-lock.ts`).

**`HealReport`**: `{ command, vault, errorsBefore, errorsAfter, iterations, clean, checkpoint, healCommit, changes, unresolved }`.

**Config-driven**: `autoHeal.maxIterations`, `autoHeal.aggressiveness` (`mechanical|structural|aggressive`), `gitCheckpoint.push` (`off|auto`).

**GPG-safe**: commits use internal identity with signing disabled (CI runners with `commit.gpgsign=true` never block the loop).

## Examples

- `claude-wiki-pages heal --target /my/vault` → heals and prints checkpoint + rollback hint
- `claude-wiki-pages heal --json` → full `HealReport` JSON
- Non-convergence: prints `UNRESOLVED (needs curator/human)` with the residual finding list

## Related Concepts

- `curator-agent` calls the `heal` command as the first step of the auto-heal pass
- `core/git.ts` provides `ensureRepo`, `applyCheckpointMode`, `commitHeal`, `push`
- The self-heal loop is the programmatic equivalent of the curator-agent's "judgment fixes"
