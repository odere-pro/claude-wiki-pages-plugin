---
title: "Operations Guide"
type: concept
aliases: ["Operations Guide", "operations guide", "day-to-day operations"]
parent: "[[Operations]]"
path: "operations"
sources: ["[[operations]]"]
related: ["[[Vault Resolution]]", "[[Hook System]]", "[[Orchestrator Agent]]"]
tags: [operations, user-guide]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Operations Guide

> [!summary]
> The plugin's one-verb model is `/claude-wiki-pages:wiki`. The orchestrator probes vault state and runs the right specialist automatically. Secondary entry points (`doctor`, `onboarding`) are progressive-disclosure options. Day-to-day operation requires remembering only one command.

## The One Verb

```text
/claude-wiki-pages:wiki
```

This is the entry point. The orchestrator probes vault state and dispatches to the right specialist:

| State the orchestrator finds | What runs |
| --- | --- |
| No vault or no `schema_version` | init wizard (scaffold + orient) |
| Files in `raw/` not yet in `wiki/log.md` | ingest pipeline |
| Previous ingest not followed by lint | curator (audit-and-repair) |
| Analytical prompt | analyst |
| Pending drafts in `_proposed/` | review gate |

Pass any free-form goal: `/claude-wiki-pages:wiki ingest the new papers` or `/claude-wiki-pages:wiki what does the wiki say about retrieval?`

## When Something Feels Wrong

```text
/claude-wiki-pages:doctor
```

Runs ten checks (D01–D10), reports the first failing prerequisite, and with `--fix` auto-repairs the fixable subset.

## Day-to-Day Verbs

| Verb | Slash command | Notes |
| --- | --- | --- |
| **Query** | `/claude-wiki-pages:query` | Direct query; every answer cites `[[wikilinks]]` |
| **Status** | `/claude-wiki-pages:status` | One-command read of the last operations |
| **Ingest** | `/claude-wiki-pages:ingest` | Process raw sources into wiki pages |
| **Lint** | `/claude-wiki-pages:lint` | Read-only audit; does not repair |
| **Fix** | `/claude-wiki-pages:fix` | Auto-repairs what lint reports |

## Power-User Bypasses

When you already know the routing and want to skip the orchestrator's state probe:

| Slash command | When to use |
| --- | --- |
| `/claude-wiki-pages:claude-wiki-pages-ingest-agent` | Scripted batch ingest |
| `/claude-wiki-pages:claude-wiki-pages-curator-agent` | Direct audit-and-repair |
| `/claude-wiki-pages:claude-wiki-pages-analyst-agent` | Direct query/synthesis |
| `/claude-wiki-pages:claude-wiki-pages-polish-agent` | Manually refresh graph colors + indexes |

> When in doubt, don't bypass. The orchestrator's state probe is faster than picking the wrong specialist.

## What Runs When

| Event | Behaviour |
| --- | --- |
| `SessionStart` | Resolves vault, creates settings if needed, emits degraded-mode advisory if a local model is enabled |
| `UserPromptSubmit` | `prompt-guard.sh` warns on dangerous phrasing |
| Any Write or Edit | Firewall, frontmatter validation, wikilink check, raw protection all run before the write lands |
| After Write or Edit | Reminders to update `_index.md` and `index.md` |
| Subagent finishes | `subagent-lint-gate.sh` and `subagent-ingest-gate.sh` block bad completions; `subagent-commit-gate.sh` commits uncommitted vault changes |
