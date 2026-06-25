---
title: "Hooks Configuration"
type: entity
entity_type: tool
aliases: ["Hooks Configuration", "hooks.json", "claude-wiki-pages hooks"]
parent: "[[hooks|Hooks]]"
path: "hooks"
sources: ["[[hooks-json|hooks.json]]"]
related: []
tags: ["hooks", "security", "firewall", "lifecycle"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Hooks Configuration

The Claude Code hooks wiring for claude-wiki-pages: six lifecycle events, each bound to one or more scripts that enforce safety, validate writes, and maintain session state.

## Overview

`hooks/hooks.json` declares the plugin's Claude Code lifecycle hooks. It covers six event types and distinguishes sharply between read-path hooks (advisory only) and write-path hooks (fail-closed). All script paths use the `${CLAUDE_PLUGIN_ROOT}` variable so they resolve correctly at both plugin-install and in-repo paths.

**Six hook events:**

| Event | Scripts | Notes |
|-------|---------|-------|
| `SessionStart` | `session-start.sh` | Heartbeat; recommends catch-up if backlog detected |
| `UserPromptSubmit` | `prompt-guard.sh` | Prompt safety screen |
| `PreToolUse` (Read/Grep/Glob) | `scope-guard.sh` | Advisory only (non-blocking) — emits a stderr notice when a read targets a path outside the active vault |
| `PreToolUse` (Write/Edit/MultiEdit) | `firewall.sh`, `validate-frontmatter.sh`, `check-wikilinks.sh`, `protect-raw.sh`, `validate-attachments.sh`, `enforce-dmi.sh`, `enforce-must-rule.sh` | Fail-closed; blocks any write that fails firewall, frontmatter, wikilink, raw-protection, or attachment checks |
| `PostToolUse` (Write/Edit/MultiEdit) | `post-wiki-write.sh`, `post-ingest-summary.sh` | Post-write telemetry and summary |
| `SubagentStop` | `subagent-lint-gate.sh`, `subagent-ingest-gate.sh`, `subagent-tree-gate.sh`, `subagent-commit-gate.sh` | Structural gate + strict-tree conformance (non-blocking) + commit backstop (always exits 0) |
| `Stop` / `SessionEnd` | `session-memory.sh` | Lazy session-learning persistence; no-op when scratch absent |

## Key Facts

- **Read-path posture:** advisory only — `scope-guard.sh` warns but never blocks. Read operations carry no mutation risk to vault data.
- **Write-path posture:** fail-closed — the firewall chain blocks writes that violate vault path confinement, frontmatter schema, wikilink validity, raw immutability, or attachment constraints.
- **Commit backstop:** `subagent-commit-gate.sh` always exits 0 (non-blocking). It commits any vault changes left uncommitted when a write-path agent returns, so no LLM write escapes git coverage.
- **Strict-tree gate:** `subagent-tree-gate.sh` warns (non-blocking) when cross-tree edges, parent-chain cycles, or multi-parent pages remain after a polish/maintenance pass (ADR-0036).
- **DMI enforcement:** `enforce-dmi.sh` blocks SKILL.md edits that add side-effecting verbs without `disable-model-invocation: true`.
- **Must-rule enforcement:** `enforce-must-rule.sh` warns when a must/never/always rule is added to CLAUDE.md without a corresponding hook.
- **Session memory:** `session-memory.sh` persists session learning as `source_type: agent-session` into `vault/raw/`; it does NOT ingest to the wiki — that happens on the next `/claude-wiki-pages:wiki` or maintenance pass.

## Related

The hooks configuration is the Layer 4 (Orchestration) safety boundary. It enforces the policies declared in `vault/CLAUDE.md` at tool-use time rather than relying solely on agent instructions.
