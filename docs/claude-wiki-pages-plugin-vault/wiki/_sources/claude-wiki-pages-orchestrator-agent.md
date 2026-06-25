---
title: "claude-wiki-pages-orchestrator-agent"
type: source
source_type: manual
source_format: text
attachment_path: ""
extracted_at: 2026-06-25
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages-plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["agents", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# claude-wiki-pages-orchestrator-agent

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages-plugin
- **Published:** 2026-06-25
- **URL:** raw/repo/agents/claude-wiki-pages-orchestrator-agent.md

## Summary

Agent definition for the top-level orchestrator of the claude-wiki-pages plugin. This agent owns vault state probing, routing decisions, and specialist fan-out. It dispatches to the appropriate specialist (onboarding, ingest, maintenance, analyst, polish) based on a structured decision table, composes the final report, and enforces a single-specialist-per-invocation discipline.

## Key Claims

- The orchestrator probes seven facts (vault_exists, schema_version, raw_pending, last_log_entry, autonomous, pending_drafts, graph_health) before routing.
- It dispatches via a top-to-bottom decision table where the first matching row wins.
- Project-intake intent triggers the ingest agent with wire_project: true.
- The polish agent is always run as a tail-of-write step after ingest or curator returns successfully.
- The orchestrator is read-only; it never writes vault content.
- Allowed Bash commands are strictly enumerated; all others are prohibited.
- Model: sonnet. Tools: Bash, Read, Glob, Grep, Task.

Covers: Orchestrator Agent, Vault State Probe, Routing Decision Table, Specialist Fan-Out, Polish Tail-of-Write
