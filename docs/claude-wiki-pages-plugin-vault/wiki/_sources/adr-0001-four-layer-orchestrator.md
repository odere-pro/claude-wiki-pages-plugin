---
title: "ADR-0001: Four-Layer Orchestrator"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "orchestrator", "architecture"]
aliases: ["ADR-0001: Four-Layer Orchestrator"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0001: Four-Layer Orchestrator

## Summary

Establishes the single top-level `/claude-wiki-pages:wiki` command as the sole advertised entry point. The orchestrator probes vault state and dispatches to one specialist agent per invocation. Specialists must not re-probe state — they trust the orchestrator's payload.

## Key Claims

- One user-facing command: `/claude-wiki-pages:wiki`. All routing is internal.
- The orchestrator (`claude-wiki-pages-orchestrator-agent`) is the only top-level entry agent (`user-invocable: true`).
- Specialists (`ingest`, `curator`, `analyst`, `polish`) are never the primary entry; they accept the orchestrator's state payload.
- State probing (vault scan, log read) is the orchestrator's exclusive responsibility.
- The specialist pattern avoids redundant state probes and keeps each agent's contract small.
