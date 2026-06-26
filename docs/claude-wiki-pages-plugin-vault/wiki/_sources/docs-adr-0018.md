---
title: "ADR-0018: Offline Policy and Degraded-Mode Routing"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-11
date_ingested: 2026-06-25
tags: ["docs", "adr", "local-models"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0018: Offline Policy and Degraded-Mode Routing

## Metadata

- File: `raw/repo/docs/adr/ADR-0018-offline-policy-and-degraded-mode-routing.md`
- Status: Accepted (amended by ADR-0019)

## Summary

Builds the complete Claude→Ollama swap machinery, with every capability tier fail-closed until it clears its own quality gate. Three config dimensions: offlinePolicy (off/prefer-local/strict), tier (ingest-extract/query/draft), and model name. Four Layer 4 scripts implement it.

## Key Claims

Two constraints: plugin runs inside Claude Code (if network is down, Claude Code is not running — so only Layer 4 scripts run with zero network); local model is only as trustworthy as measured evidence (ADR-0011 quality gate). offlinePolicy: off (default — never probe, never fall back), prefer-local (fall back to approved local tier when Claude unreachable), strict (fail if Claude unreachable). Four scripts: reachability.sh (JSON probe of Ollama + Anthropic; fails closed; no network in off policy), engine.sh route (pure network-free routing decision: claude/local/blocked — passes reachability via --ollama/--claude flags), offline-draft.sh (true-offline drafting to _proposed/ with zero Claude Code dependence), offline-query.sh (true-offline cited query; runtime answer verification applied). In-session: session-start.sh emits one-line DEGRADED: advisory when localModel.enabled and offlinePolicy != off.

Covers: Offline Policy, Degraded Mode Routing, Reachability Probe, Offline Draft, Local Model
