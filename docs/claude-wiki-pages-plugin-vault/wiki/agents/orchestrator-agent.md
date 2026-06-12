---
title: "Orchestrator Agent"
type: entity
entity_type: tool
aliases: ["Orchestrator Agent", "orchestrator", "claude-wiki-pages-orchestrator-agent"]
parent: "[[Agents]]"
path: "agents"
sources: ["[[architecture]]", "[[operations]]", "[[GLOSSARY]]"]
related: ["[[Agent Roles]]", "[[Ingest Agent]]", "[[Analyst Agent]]"]
tags: [agents, orchestration]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Orchestrator Agent

`claude-wiki-pages-orchestrator-agent` is the top-level entry point behind `/claude-wiki-pages:wiki`. It is the only agent marked `user-invocable: true` among the specialists (the onboarding agent is also user-invocable but runs separately).

## Responsibility

The orchestrator owns exactly one job: probe vault state and dispatch to the correct specialist. It does not write wiki pages, does not run lint, and does not answer questions. It is a routing layer.

## Dispatch Logic

The orchestrator performs a filesystem-only state probe (no MCP calls, no writes) and routes:

- **No vault / no `schema_version`** → init wizard (scaffold + orient)
- **Unprocessed raw sources** (files in `raw/` with no matching `wiki/log.md` entry) → [[Ingest Agent]]
- **Analytical prompt** (verbs: `what`, `why`, `compare`, `query`, `list`) → [[Analyst Agent]]
- **Pending drafts** in `_proposed/` → review gate
- **Overdue lint** (last lint older than `lintEveryDays`) → [[Curator Agent]]

Ambiguous prompts receive one clarifying question; the orchestrator never fans out on ambiguity.

## ADR Context

ADR-0001 established the single top-level command + state-probing dispatch pattern. Before this design, users had to manually chain five commands: scaffold → ingest → audit → repair → verify. The orchestrator collapses this to one verb.

## Power-User Bypass

When routing overhead is unnecessary (e.g., scripted batch workflows), users can invoke specialists directly: `/claude-wiki-pages:claude-wiki-pages-ingest-agent`, `/claude-wiki-pages:claude-wiki-pages-analyst-agent`, etc. The orchestrator's state probe is always faster than picking the wrong specialist by hand, so bypass should be deliberate.
