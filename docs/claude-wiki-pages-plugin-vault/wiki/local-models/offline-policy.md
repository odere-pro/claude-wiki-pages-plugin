---
title: "Offline Policy"
type: concept
aliases: ["Offline Policy", "offline policy", "degraded mode routing", "ADR-0018"]
parent: "[[Local Models]]"
path: "local-models"
sources: ["[[local-models]]", "[[operations]]"]
related: ["[[Approved Local Models]]", "[[Capability Tiers]]", "[[Local Model Quality Gate]]"]
tags: [local-models, offline, degraded-mode]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Offline Policy

The offline policy (ADR-0018) governs what happens when the network or Claude API is unavailable. The fallback is opt-in, fail-closed, and Claude-primary by default.

## The Three Policies

`localModel.offlinePolicy` controls the behavior:

| Policy | Behavior |
| --- | --- |
| `off` (default) | Never probe, never fall back. If Claude is unavailable, nothing runs. |
| `prefer-local` | Fall back to an approved local tier when Claude is unreachable. An unapproved tier is BLOCKED with a teaching message — never run silently. |
| `strict` | Fail if Claude is unreachable; no fallback. |

## Layer 4 Implementation

Three deterministic Layer 4 pieces implement offline routing:

| Piece | Role |
| --- | --- |
| `scripts/reachability.sh` | JSON probe of Ollama + Anthropic reachability. No network when `offlinePolicy` is `off`. Fails closed on any error. |
| `scripts/engine.sh route` | Pure, network-free routing decision (`claude` / `local` / `blocked`). Reachability is passed in; the orchestrator consults it and never re-derives the decision. |
| `scripts/offline-draft.sh` | True-offline drafting with Claude Code stopped — reads `raw/`, calls Ollama, writes `_proposed/` drafts for review-gate promotion. |
| `scripts/offline-query.sh` | True-offline cited query answering (ADR-0019 `tier: "query"`). Deterministic search selects pages; local model composes an answer; runtime answer verification checks every citation. Read-only. |

## Answer Verification (ADR-0019)

Every local-model query answer is checked at runtime: each citation must name an existing wiki page, and each cited quote must be a verbatim (whitespace-normalized) substring of that page. Any violation throws a warning and denies the answer — it is never shown. Exact string containment, never similarity.

## Session-Start Advisory

When `localModel.enabled` and `offlinePolicy != off`, `session-start.sh` emits a one-line `DEGRADED:` advisory naming which tier is available or BLOCKED and the reachability state.
