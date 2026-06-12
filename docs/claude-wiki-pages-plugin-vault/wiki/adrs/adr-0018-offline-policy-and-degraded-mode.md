---
title: "ADR-0018 Offline Policy and Degraded Mode"
type: concept
aliases: ["ADR-0018 Offline Policy and Degraded Mode", "ADR-0018", "offline policy ADR", "degraded mode ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0018-offline-policy-and-degraded-mode-routing]]"]
related: ["[[Offline Policy]]", "[[Capability Tiers]]", "[[ADR-0011 Local Model Quality Gate]]", "[[ADR-0019 Query Tier and Answer Verification]]"]
tags: [adr, local-models, offline, degraded-mode]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0018: Offline Policy and Degraded-Mode Routing

**Status:** Accepted | **Date:** 2026-06-11

## Context

The product north star is a full Claude→Ollama swap. Two constraints: (1) the plugin runs *inside* Claude Code — if the network is down, Claude Code is not running, so an agent cannot "notice it is offline and switch" mid-session; and (2) a local model is only as trustworthy as its measured evidence (ADR-0011).

## Decision

Three `offlinePolicy` values: `off` (default), `prefer-local`, `strict`.

**Three Layer 4 pieces implement offline routing:**

| Piece | Role |
| --- | --- |
| `scripts/reachability.sh` | JSON probe of Ollama + Anthropic endpoints. No network when `off`. Fails closed. The Anthropic check is an unauthenticated HEAD (API key never sent). |
| `scripts/engine.sh route` | Pure, network-free routing decision. Reachability is passed in; the orchestrator consults it. Returns `claude` / `local` / `blocked`. |
| `scripts/offline-draft.sh` | True-offline drafting. Reads `raw/`, calls Ollama, writes `_proposed/` drafts for review-gate promotion. Enforces `_proposed/`-only confinement itself (hooks don't fire offline). |
| `scripts/offline-query.sh` | True-offline cited query answering (ADR-0019 `tier: "query"`). Deterministic search selects pages; local model composes answer; runtime answer verification checks every citation. Read-only. |

**Per-tier map** — `APPROVED_LOCAL_MODELS_BY_TIER` in `src/data/config/config.ts`. An unapproved tier is BLOCKED with a teaching message even under `prefer-local`. The `route` command reads this map and the reachability result and never re-derives the decision from raw facts.

**Session-start advisory** — when `localModel.enabled` and `offlinePolicy != off`, `session-start.sh` emits one-line `DEGRADED:` naming tier and reachability state.
