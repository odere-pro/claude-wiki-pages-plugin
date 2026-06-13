---
title: "Agent Tool Restriction"
type: concept
aliases: ["Agent Tool Restriction", "agent tool restriction", "tool restriction", "tools field", "tool set boundary"]
parent: "[[Plugin]]"
path: "plugin"
sources: ["[[Orchestrator Agent Source]]", "[[Ingest Agent Source]]", "[[Curator Agent Source]]", "[[Analyst Agent Source]]", "[[Onboarding Agent Source]]", "[[Maintenance Agent Source]]", "[[Polish Agent Source]]"]
related: ["[[Agent Contract Table]]", "[[Firewall]]", "[[Ingest Agent]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["agent", "security", "tools"]
created: 2026-06-13
updated: 2026-06-13
update_count: 7
status: active
confidence: 1.0
---

# Agent Tool Restriction

## Definition

Each `claude-wiki-pages` agent declares an explicit `tools:` field in its YAML front-matter. This field is a security and capability boundary: it limits which Claude Code tools the agent may invoke during its run. The `tools:` declaration is normative — it is enforced by the agent loader and cannot be overridden by instructions in the agent body or in raw content.

## Key Principles

**Tool sets per agent:**

| Agent | Tools | Notes |
| --- | --- | --- |
| `claude-wiki-pages-orchestrator-agent` | Bash, Read, Glob, Grep, Task | Task enables specialist fan-out; no Write/Edit (orchestrator never writes wiki content) |
| `claude-wiki-pages-ingest-agent` | Bash, Read, Write, Edit, Glob, Grep, Task | Full write set + Task for curator delegation and extract workers |
| `claude-wiki-pages-curator-agent` | Bash, Read, Write, Edit, Glob, Grep | No Task — curator does not fan out to sub-agents |
| `claude-wiki-pages-analyst-agent` | Bash, Read, Write, Edit, Glob, Grep | No Task — analyst is single-agent |
| `claude-wiki-pages-onboarding-agent` | Task, Bash, Read, Glob, Grep | No Write/Edit — all writes happen inside delegated specialists |
| `claude-wiki-pages-maintenance-agent` | Bash, Read, Glob, Grep, Task | No Write/Edit — sequences specialists only; never writes vault content directly |
| `claude-wiki-pages-polish-agent` | Bash, Read, Write, Edit, Glob, Grep | No Task — polish is single-agent, idempotent |

**The extract-worker invariant:** when the ingest agent fans out parallel extract workers (Step 1.2b), those workers hold `tools: Read, Glob, Grep` exclusively — no Write, no Edit, no Bash, no Task. This is enforced by the Tier-1 grep gate (`tests/scripts/extract-worker-frontmatter.bats`). The ingest agent (the orchestrating writer) is the only entity that writes pages; extract workers return EXTRACT envelopes only.

**Read-only agents:** the orchestrator (no Write/Edit) and onboarding + maintenance (no Write/Edit) are structurally read-only or delegation-only. All vault writes flow through ingest, curator, analyst, or polish. This concentrates write paths in agents where hooks can validate them.

## Examples

The orchestrator's lack of Write/Edit is a deliberate design invariant (ADR-0001): "This agent reads filesystem; it never writes. All wiki writes happen inside specialists." This means the orchestrator's behavior is deterministic from the user's perspective — running `/claude-wiki-pages:wiki` with the same vault state always produces the same dispatch decision, with no side effects of its own.

The maintenance agent's lack of Write/Edit means it is a pure sequencer: it reads the backlog, delegates to ingest/curator/polish in order, and reports. No wiki writes happen in the maintenance agent itself.

## Related Concepts

- [[Agent Contract Table]] — the companion pattern: per-agent contract table with invariants
- [[Firewall]] — the complementary write-confinement mechanism at the filesystem level
- [[Ingest Agent]] — holds the widest tool set (Bash + Read + Write + Edit + Glob + Grep + Task)
