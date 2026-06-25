---
title: "claude-wiki-pages-polish-agent"
type: source
source_type: manual
source_format: text
attachment_path: ""
extracted_at: 2026-06-25
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages-plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["agents", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# claude-wiki-pages-polish-agent

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages-plugin
- **Published:** 2026-06-25
- **URL:** raw/repo/agents/claude-wiki-pages-polish-agent.md

## Summary

Agent definition for the tail-of-write specialist. Runs after every successful ingest or curator pass to keep the Obsidian-side experience in sync. Operates in four steps: graph self-heal (heal-ghost-links, strict-tree-reduce, heal-orphan-sources), apply graph colors (apply-obsidian-config.sh), regenerate wiki/index.md, and reconcile per-folder MOC consistency (append-only).

## Key Claims

- Not user-invocable; the orchestrator calls it as the tail of every successful ingest or curator run.
- Step 0 runs heal-ghost-links, strict-tree-reduce --apply, and heal-orphan-sources before asserting Obsidian config.
- apply-obsidian-config.sh is the deterministic authority for graph filters and color groups (ADR-0035).
- Idempotency is mandatory: two consecutive runs produce zero diffs.
- Never deletes pages, links, or children: entries — append-only.
- Model: sonnet. Tools: Bash, Read, Write, Edit, Glob, Grep.

Covers: Polish Agent, Graph Colors, Index Refresh, MOC Consistency, Ghost Links, Strict-Tree Reduce, Obsidian Config
