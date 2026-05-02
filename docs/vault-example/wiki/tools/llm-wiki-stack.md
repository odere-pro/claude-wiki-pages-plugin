---
title: "llm-wiki-stack"
type: entity
entity_type: product
aliases: ["llm-wiki-stack"]
parent: "[[Tools — Index]]"
path: "tools"
sources:
  - "[[Using llm-wiki-stack]]"
  - "[[Getting Started]]"
  - "[[Create a New Vault]]"
  - "[[Update an Existing Vault]]"
  - "[[Review, Validate, Fix]]"
  - "[[Export Outputs]]"
related: ["[[Claude Code]]", "[[Obsidian]]", "[[LLM Wiki Pattern]]", "[[Hook-Enforced Guarantees]]"]
tags: ["tool", "plugin"]
created: 2026-04-24
updated: 2026-04-24
update_count: 1
status: active
confidence: 0.9
---

# llm-wiki-stack

## Overview

The Claude Code plugin that implements the [[LLM Wiki Pattern]] on top of an [[Obsidian]] vault. Four layers: Data (vault), Skills (single-responsibility verbs), Agents (multi-step pipelines), and Orchestration (hooks, scripts, rules).

## Key Facts

- Default verb: `/llm-wiki-stack:wiki` — orchestrator entry; probes vault state and dispatches to init, ingest, curator, or analyst.
- Power-user bypass: `/llm-wiki-stack:llm-wiki-stack-ingest-agent` — direct ingest-pipeline call (skip the routing decision).
- Onboarding verb: `/llm-wiki-stack:llm-wiki` — scaffolds `vault/` and writes the per-project `vault/CLAUDE.md` schema. The orchestrator dispatches here automatically on a fresh install.
- Health check: `/llm-wiki-stack:wiki-doctor` — exercises every hook path and reports green/red per path.
- `vault/CLAUDE.md` is the authoritative schema; it wins over any skill default that conflicts.

## Related

- [[Claude Code]] — the CLI harness the plugin runs inside.
- [[Obsidian]] — the reading environment the wiki output targets.
- [[LLM Wiki Pattern]] — the pattern the plugin implements.
- [[Hook-Enforced Guarantees]] — the mechanism that makes the plugin reliable.
