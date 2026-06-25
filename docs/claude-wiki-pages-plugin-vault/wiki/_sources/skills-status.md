---
title: "Status Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "status"]
aliases: ["Status Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Status Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/status/SKILL.md`
- Type: Skill definition for the `status` verb

## Summary

The `status` skill exercises every hook path and reports pass/fail per hook without writing to the vault. It answers "if I ran the pipeline right now, which hooks would fire?" Ten checks cover dependency availability, SessionStart preamble, PreToolUse gates, PostToolUse reminder, SubagentStop gates, and schema readability.

## Key Claims

Covers: Status Skill, Hook Health Check, Zero-Write Contract, Status Report Format.

The skill enforces its own non-mutation invariant by comparing `git status vault/` before and after — any diff is a skill bug. Exit 0 = all green; exit 1 = any FAIL; exit 2 = vault was mutated. Transient test payloads go to `$TMPDIR`, never inside `vault/`. No log append (diagnostic skills do not clutter the log).
