---
title: "Sequence Diagrams"
type: concept
aliases: ["Sequence Diagrams", "sequence diagrams", "ingest sequence", "session start sequence"]
parent: "[[Design]]"
path: "design"
sources: ["[[03-sequences]]"]
related: ["[[System Context]]", "[[Component Design]]", "[[Hook System]]", "[[Data Flow]]"]
tags: [design, sequences, hooks]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# Sequence Diagrams

Key interaction sequences across the four-layer stack.

## Session Start Sequence

1. Claude Code emits `SessionStart` hook event.
2. `session-start.sh` fires: resolves vault path (four-tier resolution), emits MOC pointer (`wiki/index.md`), writes session ID to `.claude/claude-wiki-pages/session-state.json`.
3. `heartbeat.sh` fires: counts pending `raw/` files, computes days-since-lint, emits advisory if either threshold exceeds config.
4. Session context includes vault path; every subsequent tool call has the vault location for firewall checks.

## Ingest Write-Path Sequence

1. Human runs `/claude-wiki-pages:wiki`.
2. Orchestrator probes state: pending sources detected → dispatch to ingest agent.
3. Ingest agent reads `CLAUDE.md` (schema authority).
4. Ingest agent writes `_sources/` stub → **PreToolUse fires**: `firewall.sh`, `validate-frontmatter.sh`, `check-wikilinks.sh`, `protect-raw.sh`.
5. If any gate blocks: write is rejected with error; ingest agent fixes and retries.
6. Ingest agent writes wiki page → same PreToolUse chain.
7. Ingest agent updates `_index.md` → same PreToolUse chain.
8. Ingest agent appends to `log.md` → same PreToolUse chain.
9. **PostToolUse fires**: `post-wiki-write.sh` (counts pages written), `post-ingest-summary.sh`.
10. Ingest agent terminates → **SubagentStop fires**: `subagent-lint-gate.sh`, `subagent-ingest-gate.sh`, `subagent-commit-gate.sh`.
11. Orchestrator dispatches to polish agent.
12. Polish agent updates graph colors, regenerates `wiki/index.md`, reconciles `_index.md` children.

## PreToolUse Chain Order

The order matters because earlier gates are cheaper and fail-fast:
1. `firewall.sh` — path confinement (cheapest; blocks everything outside the vault)
2. `validate-frontmatter.sh` — schema correctness
3. `check-wikilinks.sh` — internal link resolution
4. `protect-raw.sh` — raw immutability
5. `validate-attachments.sh` — binary file allowlist
6. `enforce-dmi.sh` — DMI (Durable Memory Invariant) gate for agent-session files
7. `enforce-must-rule.sh` — required-field completeness per page type

See [[Data Flow]] for the full 13-step ingest data flow, and [[Hook System]] for hook event contracts.
