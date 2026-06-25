---
title: "claude-wiki-pages-curator-agent"
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

# claude-wiki-pages-curator-agent

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages-plugin
- **Published:** 2026-06-25
- **URL:** raw/repo/agents/claude-wiki-pages-curator-agent.md

## Summary

Agent definition for the wiki curator. Lints structural issues and repairs them automatically in six phases: deterministic heal (engine.sh heal), diagnose (verifier + ghost-link check), classify fixes, auto-apply safe fixes, judgment fixes (automatic under checkpoint), and re-verify. Safety is a git checkpoint commit, not approval gating.

## Key Claims

- All structural fixes are fully automatic; safety is git revert, not approval prompts.
- engine.sh heal runs first to clear the structural-error subset under a git checkpoint.
- Nine safe auto-fixes are applied in order (wrap sources, fill parent/path, repair index drift, heal ghost links, connect orphans, apply Obsidian config).
- Judgment fixes (restructures, merges, renames) are also automatic under the checkpoint.
- Never deletes orphan pages — only connects them.
- Model: sonnet. Tools: Bash, Read, Write, Edit, Glob, Grep.

Covers: Curator Agent, Lint, Auto-Heal, Ghost Links, Orphan Pages, Git Checkpoint, Judgment Fixes
