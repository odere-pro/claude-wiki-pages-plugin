---
title: "Hook System"
type: concept
aliases: ["Hook System", "hook system", "hooks", "lifecycle hooks"]
parent: "[[Operations]]"
path: "operations"
sources: ["[[operations]]", "[[architecture]]", "[[GLOSSARY]]"]
related: ["[[Orchestration Layer]]", "[[Vault Resolution]]", "[[Operations Guide]]"]
tags: [operations, hooks, lifecycle]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Hook System

The hook system is the enforcement spine of the plugin. Every write, every edit, and every session boundary passes through deterministic bash scripts wired in `hooks/hooks.json`. Nothing reaches the vault unchecked.

## Hook Events

Five event types are defined:

| Event | Scripts | Blocking? |
| --- | --- | --- |
| `SessionStart` | `session-start.sh`, `heartbeat.sh` | No |
| `UserPromptSubmit` | `prompt-guard.sh` | No (advisory) |
| `PreToolUse` (Write/Edit) | `firewall.sh`, `validate-frontmatter.sh`, `check-wikilinks.sh`, `protect-raw.sh`, `validate-attachments.sh`, `enforce-dmi.sh`, `enforce-must-rule.sh` | Yes (exit code 2) |
| `PostToolUse` (Write/Edit) | `post-wiki-write.sh`, `post-ingest-summary.sh` | No (advisory) |
| `SubagentStop` | `subagent-lint-gate.sh`, `subagent-ingest-gate.sh`, `subagent-commit-gate.sh` | Lint/ingest block; commit never blocks |
| `Stop` / `SessionEnd` | `session-memory.sh` | No |

## The PreToolUse Chain

The blocking chain runs in this order before any Write or Edit lands:

1. **`firewall.sh`** — write confinement check (inside resolved vault?)
2. **`validate-frontmatter.sh`** — schema-valid frontmatter?
3. **`check-wikilinks.sh`** — no broken wikilinks?
4. **`protect-raw.sh`** — not modifying `raw/`?
5. **`validate-attachments.sh`** — attachment paths resolve?

If any script exits with code 2, the write is blocked. The chain is enforced in the order wired in `hooks/hooks.json`.

## The SubagentStop Gate

After a write-path agent finishes:

1. `subagent-lint-gate.sh` — checks for unresolved lint errors
2. `subagent-ingest-gate.sh` — runs `verify-ingest.sh` to catch schema drift
3. `subagent-commit-gate.sh` — commits any uncommitted vault changes as a labeled backstop commit (never blocks)

The commit backstop ensures that even if an agent exits without committing its changes, they are still preserved in git history.

## Session Memory

`session-memory.sh` runs on `Stop` and `SessionEnd` (but not `SubagentStop`). It writes and commits a raw session-learning file under `raw/agent-sessions/` if the agent accumulated durable observations. The file is `source_type: agent-session` and enters the wiki only through the `_proposed/` review gate.
