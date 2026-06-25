---
title: "hooks.json"
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
tags: ["hooks", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# hooks.json

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages-plugin
- **Published:** 2026-06-25
- **URL:** raw/repo/hooks/hooks.json

## Summary

Claude Code hooks configuration for the claude-wiki-pages plugin. Declares six hook events (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, SubagentStop, Stop/SessionEnd) and the scripts bound to each. Write-path hooks form a fail-closed firewall; read-path hooks are advisory only.

## Key Claims

- SessionStart: runs session-start.sh (heartbeat and backlog recommendation).
- UserPromptSubmit: runs prompt-guard.sh.
- PreToolUse (Read|Grep|Glob): runs scope-guard.sh as an advisory notice (non-blocking by design).
- PreToolUse (Write|Edit|MultiEdit): five scripts in sequence — firewall.sh (fail-closed), validate-frontmatter.sh, check-wikilinks.sh, protect-raw.sh, validate-attachments.sh.
- PreToolUse (Write|Edit|MultiEdit): also runs enforce-dmi.sh (blocks SKILL.md edits adding side-effecting verbs without disable-model-invocation: true) and enforce-must-rule.sh (warns when a must/never/always rule is added without a corresponding hook).
- PostToolUse (Write|Edit|MultiEdit): runs post-wiki-write.sh and post-ingest-summary.sh.
- SubagentStop: runs subagent-lint-gate.sh, subagent-ingest-gate.sh, subagent-tree-gate.sh (strict-tree conformance, non-blocking), and subagent-commit-gate.sh (commit backstop; always exit 0).
- Stop/SessionEnd: runs session-memory.sh to persist session learning as source_type: agent-session (lazy, no-op when scratch absent).

Covers: Hooks Configuration, SessionStart, PreToolUse Firewall, PostToolUse, SubagentStop, Commit Backstop, Session Memory
