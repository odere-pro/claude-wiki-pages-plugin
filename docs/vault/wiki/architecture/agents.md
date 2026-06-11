---
title: "claude-wiki-pages-orchestrator-agent"
type: entity
entity_type: tool
aliases: ["claude-wiki-pages-orchestrator-agent", "orchestrator agent", "orchestrator", "claude-wiki-pages-ingest-agent", "claude-wiki-pages-curator-agent", "claude-wiki-pages-analyst-agent", "claude-wiki-pages-polish-agent", "claude-wiki-pages-maintenance-agent", "claude-wiki-pages-onboarding-agent"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture (source)]]", "[[Glossary]]", "[[Operations (source)]]"]
related: ["[[Four-Layer Stack]]", "[[Layer 3 — Agents]]", "[[Orchestrator Routing]]", "[[Agent Teams]]", "[[layers]]"]
tags: [agent, orchestration, tool]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# claude-wiki-pages-orchestrator-agent

Top-level user-facing entry agent (`user-invocable: true`). Probes vault state and dispatches to exactly one specialist per invocation. Lives in `agents/`. Part of the [[Four-Layer Stack]] at [[Layer 3 — Agents]].

## Routing Table

| State found | Dispatches to |
|---|---|
| No vault or no `schema_version` | init wizard (scaffold + orient) |
| Files in `raw/` not yet in `wiki/log.md` | ingest pipeline |
| Previous ingest not followed by lint | curator (audit-and-repair) |
| Analytical prompt | analyst |
| Pending drafts in `_proposed/` | review gate |

## Design Contract

- Probes vault state; specialists must not re-probe state — they trust the orchestrator's payload.
- Dispatches to exactly one specialist per turn.
- Polish (`claude-wiki-pages-polish-agent`) runs as a tail step after every successful ingest or curator pass.

---

# claude-wiki-pages-ingest-agent

Runs the full ingest-then-verify-then-curate-then-synthesize cycle. Renamed from `llm-wiki-ingest-pipeline` in `0.2.0`.

---

# claude-wiki-pages-curator-agent

Audits, auto-repairs, and gates judgment fixes (restructures, merges) behind explicit user approval. Renamed from `llm-wiki-lint-fix` in `0.2.0`. Runs git-checkpointed self-heal (`engine.sh heal`).

---

# claude-wiki-pages-analyst-agent

Answers analytical questions requiring traversal of the topic tree. Five operating modes: Query, Dashboard, Document Compile, Extract, Challenge.

---

# claude-wiki-pages-polish-agent

Tail-of-write step run after every successful ingest or curator pass. Owns: graph colors for new top-level topics, vault MOC regeneration, per-folder `_index.md` consistency. New in `0.2.0`.

---

# claude-wiki-pages-maintenance-agent

Autonomous catch-up loop. Detects backlog (pending raw sources, overdue lint) and runs ingest → curator → polish → lint in one invocation, bounded by `maintenance.maxPerRun` and git-checkpointed throughout.

---

# claude-wiki-pages-onboarding-agent

Guided first-run executor. Walks from a fresh project to a working, queryable wiki — health check → scaffold → add source → ingest → first cited answer. Idempotent; probes state and resumes.
