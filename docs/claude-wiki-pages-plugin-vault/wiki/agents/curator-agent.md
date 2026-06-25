---
title: "Curator Agent"
type: entity
entity_type: tool
aliases: ["Curator Agent", "claude-wiki-pages-curator-agent", "curator"]
parent: "[[agents|Agents]]"
path: "agents"
sources: ["[[claude-wiki-pages-curator-agent|claude-wiki-pages-curator-agent]]"]
related: []
tags: ["agents", "lint", "heal", "git-checkpoint", "structural-repair"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Curator Agent

The wiki's automatic structural repair agent: diagnoses issues, then fixes them under a git checkpoint without requiring user approval.

## Overview

The curator agent (`claude-wiki-pages-curator-agent`) lints the wiki for structural issues — broken wikilinks, orphan pages, frontmatter gaps, index drift, plain-string sources, missing parent/path — and repairs them automatically. Its safety model is a git checkpoint commit rather than approval gating: a checkpoint precedes every change so every fix is reversible with `git revert <healCommit>`.

The agent operates in six phases:

1. **Preflight** — run `engine.sh heal` to create a git checkpoint and clear the structural-error subset.
2. **Diagnose** — run `verify-ingest.sh` plus supplemental checks (ghost links via `heal-ghost-links.sh`, broken links, orphans, title collisions, flat-folder sprawl, stale confidence).
3. **Classify** — categorize every issue as Engine (already fixed), Auto (safe to apply), Judgment (apply automatically under checkpoint), or Report (surface for user).
4. **Auto-apply** — nine safe idempotent fixes in order: wrap plain-string sources, fill missing parent/path, add title to aliases, repair folder-note children drift, repair wiki/index.md, clean ghost wikilinks in log.md, heal ghost links via `heal-ghost-links.sh`, connect orphans (link-only), apply Obsidian config via `apply-obsidian-config.sh`.
5. **Judgment fixes** — restructures (flat folders > 12), title-collision renames, densification, near-duplicate merges; all automatic under the checkpoint.
6. **Re-verify** — run `verify-ingest.sh` + `heal-ghost-links.sh --check` + `apply-obsidian-config.sh --check`; cannot report success while either check reports drift.

## Key Facts

- **Model:** sonnet
- **Tools:** Bash, Read, Write, Edit, Glob, Grep
- **Budget:** max 500 pages per run
- **Safety:** git checkpoint, not approval — rollback is `git revert <healCommit>`
- **Hard rule:** never deletes orphan pages; always connects them
- **Hard rule:** never forges provenance — do not auto-edit `sources:` to link source orphans
- **Ghost-link healer:** `heal-ghost-links.sh` rewrites every title/alias-only ghost to piped basename form; it is the deterministic authority (ADR-0035)
- **Obsidian config:** `apply-obsidian-config.sh` asserts graph filters and color groups idempotently every run

## Related

Invoked by the orchestrator after every ingest as the auto-heal phase. Also invoked directly when the user asks to lint, audit, or repair the wiki.
