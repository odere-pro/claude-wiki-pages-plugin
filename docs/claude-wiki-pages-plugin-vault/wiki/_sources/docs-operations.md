---
title: "Operations"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["docs", "operations"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Operations

## Metadata

- File: `raw/repo/docs/operations.md`
- Type: user operations guide

## Summary

The complete user-facing operations reference: the one entry verb, the orchestrator dispatch table, day-to-day verbs, power-user bypasses, single-purpose skills, draft review gate, offline/degraded mode, vault location resolution, multi-vault registry, and the what-runs-when hook event table.

## Key Claims

/claude-wiki-pages:wiki is the single advertised entry point; the orchestrator probes vault state (no vault → init, pending raw/ → ingest, lint drift → curator, analytical prompt → analyst, pending drafts → review gate). Multi-vault registry lives in .claude/claude-wiki-pages/settings.json with current_vault_path, default_vault_path, and vaults array. Vault resolution is a four-tier order: env var CLAUDE_WIKI_PAGES_VAULT → settings.json current_vault_path → auto-detect (4-level scan for CLAUDE.md with schema_version + wiki/) → default docs/vault. Hook events: SessionStart → session-start.sh; UserPromptSubmit → prompt-guard.sh; Write/Edit → validate-frontmatter.sh + check-wikilinks.sh + protect-raw.sh; PostToolUse → post-wiki-write.sh; SubagentStop → subagent-lint-gate.sh + subagent-commit-gate.sh.

Covers: Vault Resolution, Multi-Vault Registry, Hook Event Table, Offline Mode, Draft Review Gate
