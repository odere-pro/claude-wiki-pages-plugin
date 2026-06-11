---
title: "One Advertised Path"
type: concept
aliases: ["One Advertised Path", "one advertised path", "default verb", "/claude-wiki-pages:wiki", "orchestrator routing", "Orchestrator Routing"]
parent: "[[Operations]]"
path: "operations"
sources: ["[[Operations]]", "[[Features]]", "[[Glossary]]", "[[Getting Started]]"]
related: ["[[claude-wiki-pages-orchestrator-agent]]", "[[Onboarding]]", "[[Doctor]]", "[[Hook-Enforced Safety]]"]
contradicts: []
supersedes: []
depends_on: []
tags: [ux, entry-point, routing]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# One Advertised Path

The UX principle that exactly one verb is promoted as the entry point for each task. For `claude-wiki-pages`, that verb is `/claude-wiki-pages:wiki`.

## Why One Entry Point

- Reduces decision fatigue: users do not need to choose between ingest, curator, or analyst.
- Enables automatic routing: the orchestrator probes vault state and picks the right specialist.
- Supports progressive disclosure: advanced bypasses exist but are documented below a fold.

## Orchestrator Routing

When you run `/claude-wiki-pages:wiki`, the [[claude-wiki-pages-orchestrator-agent]] probes vault state and dispatches:

| State found | What runs |
|---|---|
| No vault or no `schema_version` | init wizard (scaffold + orient) |
| Files in `raw/` not yet in `wiki/log.md` | ingest pipeline |
| Previous ingest not followed by lint | curator (audit-and-repair) |
| Analytical prompt (`what`, `why`, `compare`, …) | analyst |
| Pending drafts in `_proposed/` | review gate |

Pass any free-form goal: `/claude-wiki-pages:wiki ingest the new papers` or `/claude-wiki-pages:wiki what does the wiki say about retrieval?`

## Day-to-Day Verbs

| Verb | Slash command | Notes |
|---|---|---|
| **Query** | `/claude-wiki-pages:query` | Direct query skill; every answer cites `[[wikilinks]]` |
| **Status** | `/claude-wiki-pages:status` | One-command status read |

## Power-User Bypasses

Call agents directly when routing is redundant or the polish tail-step would be wasted work:

| Slash command | When to reach for it |
|---|---|
| `/claude-wiki-pages:claude-wiki-pages-ingest-agent` | Scripted batch ingest |
| `/claude-wiki-pages:claude-wiki-pages-curator-agent` | Direct audit-and-repair |
| `/claude-wiki-pages:claude-wiki-pages-analyst-agent` | Direct query/synthesis when prompt is unambiguous |
| `/claude-wiki-pages:claude-wiki-pages-polish-agent` | Manually refresh graph colors + indexes |

> [!note] When in doubt, don't bypass.
> The orchestrator's state probe is faster than picking the wrong specialist by hand.

## Single-Purpose Skills

For surgical operations on one pipeline slice:

| Skill | Purpose |
|---|---|
| `/claude-wiki-pages:ingest` | Process raw sources — no follow-on lint or synthesis |
| `/claude-wiki-pages:lint` | Read-only audit |
| `/claude-wiki-pages:fix` | Auto-repair what lint reports |
| `/claude-wiki-pages:synthesize` | Write a cross-topic synthesis note |
| `/claude-wiki-pages:index` | Refresh vault MOC |
| `/claude-wiki-pages:markdown` | Render wiki query as portable markdown |
| `/claude-wiki-pages:obsidian-graph-colors` | Apply per-topic colors to graph view |
