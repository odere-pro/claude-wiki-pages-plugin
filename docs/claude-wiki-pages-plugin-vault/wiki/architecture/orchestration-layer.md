---
title: "Orchestration Layer"
type: concept
aliases: ["Orchestration Layer", "Layer 4", "Layer 4 — Orchestration"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[architecture]]", "[[operations]]", "[[GLOSSARY]]"]
related: ["[[Four-Layer Stack]]", "[[Agents Layer]]", "[[Hook System]]"]
tags: [architecture, hooks, orchestration]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Orchestration Layer

Layer 4 — Orchestration is where the architecture becomes a contract. Hooks, scripts, and rules enforce the schema at every tool call. The orchestration layer is what makes the four-layer stack a system rather than a set of conventions.

## Components

**Commands** (`commands/`) — user-facing slash commands. `/claude-wiki-pages:wiki` delegates to the orchestrator agent; `/claude-wiki-pages:doctor` runs the environment health check.

**Hooks** (`hooks/hooks.json`) — lifecycle handlers wired to five event types:
- `SessionStart` — resolves vault, emits status, creates settings if needed
- `UserPromptSubmit` — `prompt-guard.sh` warns on dangerous phrasing
- `PreToolUse` — blocking hooks: firewall, frontmatter validation, wikilink check, raw protection, attachment validation
- `PostToolUse` — reminders to update `_index.md` and `index.md` after writes
- `SubagentStop` — runs `verify-ingest.sh` after the ingest pipeline; commits any uncommitted vault changes

**Scripts** (`scripts/`) — ~30 bash implementations of the hook logic plus utilities: `resolve-vault.sh`, `firewall.sh`, `validate-frontmatter.sh`, `check-wikilinks.sh`, `protect-raw.sh`, `doctor.sh`, `snapshot.sh`, and more.

**Rules** (`rules/`) — path-scoped declarative guidance for the LLM. Examples: "files under `raw/` are immutable", "the wiki uses `[[wikilinks]]`, not markdown links".

## Blocking vs. Advisory Hooks

Hooks exit with code 2 to block a write (PreToolUse blocking), or emit a warning without blocking (PostToolUse advisory). The firewall, frontmatter validator, and `protect-raw.sh` are all blocking. The commit backstop (`subagent-commit-gate.sh`) never blocks — it only commits uncommitted changes after a write-path agent finishes.

## The Firewall

`scripts/firewall.sh` and `src/core/firewall.ts` confine all agent writes to the resolved vault plus its `allowPaths`, minus `denyPaths`. Cross-vault writes are unconditionally blocked. Gate-11 pins the shell and TypeScript twins byte-for-byte.

See [[Hook System]] and [[Operations Guide]] for full lifecycle detail.
