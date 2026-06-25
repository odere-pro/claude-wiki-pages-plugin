---
title: "src/commands/heal.ts — Git-Bounded Self-Heal"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "commands", "heal", "git"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/commands/heal.ts — Git-Bounded Self-Heal

## Metadata

- **Source**: `raw/repo/src/commands/heal.ts`
- **Type**: TypeScript implementation

## Summary

Fully automatic, git-bounded self-heal. No approval prompts: safety comes from git. Before changing anything the loop writes a checkpoint commit, then runs `verify → fix → re-verify` until the verifier is clean or stops making progress (default: 5 iterations). On success, auto-fixes land in a single revertible `heal:` commit.

## Key Claims

- Loop: verify once (if clean, no-op); checkpoint commit; repeat up to `maxIterations`: fix → re-verify; break on `errors === 0` or `changed === 0` (no progress)
- `HealReport`: `command`, `vault`, `errorsBefore`, `errorsAfter`, `iterations`, `clean`, `checkpoint`, `healCommit`, `changes`, `unresolved`
- Already-clean vault: pure no-op — `iterations === 0`, `checkpoint === null`, no git commits
- DIP fix (M17): `VerifyFn` and `FixFn` are injectable function types on `HealOptions`; real implementations are defaults; enables testing without pulling sibling modules
- Uses `withVaultLockSync` (vault-lock.ts) to serialize the heal critical section
- `commitHeal` squashes fixes into one revertible commit; `ensureRepo` + `applyCheckpointMode` handles git setup
- Config-driven: `autoHeal.maxIterations`, `autoHeal.aggressiveness`, `gitCheckpoint.push`
- Commits use internal identity with GPG signing disabled (CI-safe)
Covers: Heal Command, Git Checkpoint, Verify-Fix Loop, DIP Injection, HealReport
