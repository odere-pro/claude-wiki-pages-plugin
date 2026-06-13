---
title: "Hook System"
type: concept
aliases: ["Hook System", "hook system", "hooks", "lifecycle hooks"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture Documentation]]", "[[Design: Component Design]]", "[[Operations Guide]]", "[[Design: Feature Relations]]"]
related: ["[[Four-Layer Stack]]", "[[Firewall]]", "[[Git Checkpoint]]", "[[Deterministic Engine]]"]
tags: ["concept", "hooks"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Hook System

## Definition

The hook system is Layer 4's enforcement mechanism. Hooks are lifecycle handlers wired in `hooks/hooks.json`. Blocking hooks reject writes via exit code 2. The hook system catches failures that skills and agents cannot self-enforce.

## Key Principles

Seven hook events fire at defined lifecycle points:

| Event | Scripts | What it does |
| --- | --- | --- |
| `SessionStart` | `session-start.sh` | Vault status, settings init, DEGRADED advisory |
| `UserPromptSubmit` | `prompt-guard.sh` | Warns on phrases suggesting raw/ edits or destructive ops |
| `PreToolUse` (Write/Edit) | `validate-frontmatter.sh`, `check-wikilinks.sh`, `protect-raw.sh`, `firewall.sh`, `validate-attachments.sh` | Block bad writes before they land |
| `PostToolUse` (Write/Edit) | `post-wiki-write.sh`, `post-ingest-summary.sh` | Emit reminders and counts after writes |
| `SubagentStop` | `subagent-lint-gate.sh`, `subagent-ingest-gate.sh`, `subagent-commit-gate.sh` | Gate bad completions; commit backstop |

- **Blocking hooks** exit code 2 to reject the tool call.
- **`subagent-commit-gate.sh`** (the commit backstop): after a write-path agent returns, any vault changes left uncommitted are committed as one labelled backstop commit. Pathspec-scoped to the vault; never blocks.

## Examples

- A write to `raw/taxonomy.md` is blocked by `protect-raw.sh` before it reaches the filesystem.
- After the ingest agent returns, `subagent-ingest-gate.sh` runs `verify-ingest.sh` and aborts the completion if the wiki is in a half-written state.

## Related Concepts

- [[Four-Layer Stack]] — the hook system is Layer 4 enforcement
- [[Firewall]] — `firewall.sh` fires on every PreToolUse Write/Edit
- [[Git Checkpoint]] — `subagent-commit-gate.sh` creates the commit backstop
- [[Deterministic Engine]] — engine verbs called by hooks (verify, firewall)
