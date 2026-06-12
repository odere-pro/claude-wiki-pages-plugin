---
title: "Agent Roles"
type: concept
aliases: ["Agent Roles", "agent roles", "seven agents"]
parent: "[[Agents]]"
path: "agents"
sources: ["[[architecture]]", "[[GLOSSARY]]"]
related: ["[[Agents Layer]]", "[[Orchestrator Agent]]", "[[Skills Layer]]"]
tags: [agents, architecture]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Agent Roles

The plugin ships seven Layer 3 agents. Six are specialists dispatched by the orchestrator; the seventh (the orchestrator itself) is the user-facing entry. The naming convention is `{plugin-name}-{role}-agent` (established in ADR-0002).

## All Seven Agents

**`claude-wiki-pages-orchestrator-agent`** — `user-invocable: true`. Top-level entry for `/claude-wiki-pages:wiki`. Probes vault state and dispatches to exactly one specialist per invocation. Owns routing; specialists must not re-probe state. State conditions and their dispatch targets:

| Vault state | Dispatches to |
| --- | --- |
| No vault or no `schema_version` | init wizard |
| Files in `raw/` not yet logged in `wiki/log.md` | ingest agent |
| Analytical prompt (`what`, `why`, `compare`) | analyst agent |
| Pending drafts in `_proposed/` | review gate |
| Previous ingest not followed by lint | curator agent |

**`claude-wiki-pages-onboarding-agent`** — `user-invocable: true`. Walks a new user from a fresh project to a working, queryable wiki — health check → scaffold → add source → ingest → first cited answer. Idempotent; resumes from wherever the user is.

**`claude-wiki-pages-ingest-agent`** — Runs the full ingest cycle: ingest → verify → curate → synthesize (optionally). Invoked by the orchestrator when pending sources are detected.

**`claude-wiki-pages-curator-agent`** — Audits structural issues (broken wikilinks, orphan pages, frontmatter gaps, index drift). Auto-applies safe mechanical fixes. Gates judgment fixes (restructures, merges) behind explicit user approval. All changes are git-checkpointed.

**`claude-wiki-pages-analyst-agent`** — Answers analytical questions. Five modes: Query, Dashboard, Document Compile, Extract, Challenge.

**`claude-wiki-pages-polish-agent`** — `user-invocable: false`. Tail-of-write step run by the orchestrator after every successful ingest or curator pass. Applies graph colors for new topic folders, refreshes `wiki/index.md`, reconciles per-folder `_index.md` children.

**`claude-wiki-pages-maintenance-agent`** — `user-invocable: false`. Autonomous upkeep specialist. Runs the catch-up loop (ingest → curator → polish → lint) in one pass when `maintenance.enabled` is true and a backlog exists.

## The Specialist Contract

Specialists never re-probe vault state — they trust the orchestrator's dispatch payload. This keeps each specialist focused on its job and the orchestrator as the single place that owns routing logic.
