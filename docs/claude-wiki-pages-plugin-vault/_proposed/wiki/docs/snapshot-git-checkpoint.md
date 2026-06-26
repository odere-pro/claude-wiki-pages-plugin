---
title: "Snapshot Git Checkpoint"
type: concept
aliases: ["snapshot", "git checkpoint", "snapshot pre", "snapshot post", "commit backstop"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-architecture|Four-Layer Architecture]]"]
related: []
tags: ["docs", "workflow", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.95
derived: false
proposed_by: "claude"
---

# Snapshot Git Checkpoint

The mechanism that wraps every write-path agent's work in a before/after git commit pair, making every vault mutation revertible with `git revert`.

## Definition

A snapshot is a git-bounding operation applied to an LLM write phase. The engine `snapshot` command and its wrapper `scripts/snapshot.sh` implement two calls:

- **`snapshot pre`** — takes a pre-write checkpoint: commits the current vault state (all clean files) before any writes begin. This is the "before" marker.
- **`snapshot post --label "<description>"`** — commits everything the write phase produced as one labelled commit. This is the "after" marker. Every wiki page, source summary, folder note, and log entry written in the phase lands in this single commit.

The `pre`→`post` pair means each write phase is individually revertible: `git revert <post-sha>` undoes all the writes without touching any other history.

The script always exits 0 — a clean vault (nothing to commit at snapshot post because everything was clean) is reported as success, not an error.

## Key Principles

**Every write phase gets its own snapshot pair.** The ingest pipeline calls `snapshot pre` before Step 1 writes and `snapshot post` after Step 1 completes, then the curator agent takes its own checkpoint for Step 2 heals, and the synthesis step takes another for Step 4 writes. Each phase's writes land in a separate, individually revertible commit.

**`gitCheckpoint.mode` controls behavior.** The config field `gitCheckpoint.mode` governs whether snapshots use Bun's git library (default) or a fallback `git commit` shell invocation when Bun is absent. The snapshot script honors this setting; operators can opt out of git checkpointing entirely (not recommended) by setting `mode: off`.

**Commit backstop is the safety net.** The `SubagentStop` hook runs `scripts/subagent-commit-gate.sh` after every write-path agent returns. If the agent left uncommitted changes (because snapshot post did not run — e.g. due to an agent error), the backstop commits them as a labelled backstop commit. This ensures no agent writes are ever left in a dangling uncommitted state.

**Advisory vault lock serializes sessions.** The `snapshot pre` call takes an advisory vault lock. A second ingest session on the same vault that cannot acquire the lock within 30 seconds aborts with: `"[ingest] vault is locked by another snapshot operation — retry later."` This prevents two sessions from racing on the same git history.

**Not a backup system.** Snapshots are git commits in the vault's own repository — they depend on the vault being a git repo (required by the schema). They are revertibility guarantees within a session, not long-term backup. The user is responsible for remote git hosting for durable backup.

## Examples

An ingest run that writes 12 wiki pages produces two commits: the `snapshot pre` commit (a checkpoint of the pre-ingest state, labeled `snapshot: pre ingest <source titles>`) and the `snapshot post` commit (labeled `snapshot: ingest <source titles>`) containing all 12 pages, 3 source summaries, and the log entry. If the ingest results are unsatisfactory, `git revert <post-sha>` removes all 15 files from history in a single operation.

If the curator agent crashes mid-heal, the `SubagentStop` backstop hook runs, finds uncommitted partial changes, and commits them as `snapshot: backstop after curator heal`. The operator can inspect the partial heal and decide whether to revert or continue from it.

## Related Concepts

The snapshot mechanism uses the engine `snapshot` verb and the wrapper `scripts/snapshot.sh`. It depends on the vault being a git repository. The commit backstop (`subagent-commit-gate.sh`) is the safety net for agents that do not complete their snapshot post call. The advisory vault lock (via `scripts/vault-lock.sh`) prevents concurrent sessions from racing.
---
