---
title: "Agents Layer"
type: concept
aliases: ["Agents Layer", "Layer 3", "Layer 3 — Agents"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[architecture]]", "[[GLOSSARY]]"]
related: ["[[Four-Layer Stack]]", "[[Skills Layer]]", "[[Orchestration Layer]]", "[[Agent Roles]]"]
tags: [architecture, agents]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Agents Layer

Layer 3 — Agents contains seven multi-step executors that chain skills and tools. Agents own sequencing, retries, and quality gates. They are where multi-step reliability lives.

## The Seven Agents

| Agent | Role | User-invocable |
| --- | --- | --- |
| `claude-wiki-pages-orchestrator-agent` | Top-level entry; probes vault state, dispatches to one specialist | yes |
| `claude-wiki-pages-onboarding-agent` | Guided first-run scaffold and orientation | yes |
| `claude-wiki-pages-ingest-agent` | Full ingest → verify → curate → synthesize cycle | yes (power user) |
| `claude-wiki-pages-curator-agent` | Audits, auto-repairs, gates judgment fixes behind approval | yes (power user) |
| `claude-wiki-pages-analyst-agent` | Answers analytical questions; five modes | yes (power user) |
| `claude-wiki-pages-polish-agent` | Tail-of-write step: graph colors, vault MOC, per-folder MOC | no |
| `claude-wiki-pages-maintenance-agent` | Autonomous catch-up loop on a schedule | no |

## The Orchestrator Pattern

The orchestrator agent is the single user-facing entry point behind `/claude-wiki-pages:wiki`. It probes vault state and dispatches to exactly one specialist per invocation. Specialists must not re-probe state — they trust the orchestrator's payload. This pattern means:

- No vault → runs the init wizard
- Unprocessed raw sources → fans out to the ingest agent
- Analytical prompt → fans out to the analyst agent
- Pending drafts → routes to the review gate

## Naming Convention

All agents follow the `{plugin-name}-{role}-agent` convention (ADR-0002). The `-agent` suffix is mandatory; it disambiguates an agent from a skill on first read of a slash command. The plugin-prefix matches the plugin ID exactly.

See [[Four-Layer Stack]] for the layer context, and [[Agent Roles]] for detailed per-agent description.
