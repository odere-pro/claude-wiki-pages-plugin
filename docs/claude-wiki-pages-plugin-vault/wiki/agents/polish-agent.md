---
title: "Polish Agent"
type: entity
entity_type: tool
aliases: ["Polish Agent", "claude-wiki-pages-polish-agent", "polish agent"]
parent: "[[agents|Agents]]"
path: "agents"
sources: ["[[claude-wiki-pages-polish-agent|claude-wiki-pages-polish-agent]]"]
related: []
tags: ["agents", "polish", "obsidian", "graph-colors", "moc"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Polish Agent

The tail-of-write specialist that keeps the Obsidian-side experience in sync after every ingest or curator pass.

## Overview

The polish agent (`claude-wiki-pages-polish-agent`) is the post-write finisher. The orchestrator calls it automatically after every successful ingest or curator run. Users do not invoke it directly. It is idempotent: two consecutive runs against the same vault produce zero diffs.

The agent operates in four steps:

1. **Graph self-heal (Step 0)** — runs three deterministic scripts in sequence:
   - `heal-ghost-links.sh`: rewrites title/alias-only ghost wikilinks to piped basename form.
   - `strict-tree-reduce.sh --apply`: demotes non-spine wikilinks among visible topic pages to prose and nested tags; records cross-tree demotions as `topic/<tree>` tags.
   - `heal-orphan-sources.ts --write`: re-anchors uncited `_sources/*` summaries to their modal topic hub.
2. **Graph colors (Step 1)** — runs `apply-obsidian-config.sh` which asserts graph filters, wiki-only exclusions, and per-topic color groups idempotently. Also optionally refreshes Obsidian's open graph views via `obsidian eval` if CLI is available.
3. **Regenerate `wiki/index.md` (Step 2)** — walks all per-folder indexes, counts pages, and rewrites the vault MOC from a stable template. Preserves user-authored prose between section headers.
4. **Per-folder MOC consistency (Step 3)** — ensures every folder note's `children:` and `child_indexes:` match actual filesystem siblings. Append-only; never removes entries.

## Key Facts

- **Model:** sonnet
- **Tools:** Bash, Read, Write, Edit, Glob, Grep
- **Not user-invocable:** the orchestrator calls it as the tail of every successful write-path specialist
- **Idempotent:** mandatory; no-op runs produce no diff
- **Destructive ops:** none — append, regenerate, or no-op only
- **Obsidian config authority:** `apply-obsidian-config.sh` is the deterministic writer for `.obsidian/graph.json` and `.obsidian/app.json` (ADR-0035); it asserts filters every run regardless of what Obsidian left behind

## Related

Always called by the orchestrator after the ingest agent or curator agent returns. In the maintenance agent's loop, polish is the third sequential step.
