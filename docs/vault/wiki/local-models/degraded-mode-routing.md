---
title: "Degraded Mode Routing"
type: concept
aliases: ["Degraded Mode Routing", "degraded mode routing", "degraded mode", "engine route", "offline routing", "Offline Draft", "offline draft", "reachability probe", "Reachability Probe"]
parent: "[[Local Models]]"
path: "local-models"
sources: ["[[Local Models (source)]]", "[[Operations (source)]]", "[[Glossary]]"]
related: ["[[Capability Tier]]", "[[Approved Local Model]]", "[[Draft Review Gate]]", "[[Offline Mode]]", "[[qwen3-coder:30b]]"]
contradicts: []
supersedes: []
depends_on: ["[[Capability Tier]]", "[[Approved Local Model]]"]
tags: [local-models, offline, degraded-mode, routing, local-model]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Degraded Mode Routing

The deterministic routing decision (the engine `route` command) that, given the offline policy, the configured capability tier, model approval, and reachability, returns whether a task runs on Claude, on an approved local tier, or is BLOCKED. Lives in Layer 4; the orchestrator consults it and never re-derives the decision. Governed by ADR-0018.

The only currently approved model for offline tiers is [[qwen3-coder:30b]], unlocked for [[Ingest-Extract]] (ADR-0017) and [[Query Tier]] (ADR-0019).

## `offlinePolicy` Values

- **`off`** (default): never probe, never fall back. The Anthropic check performs no network call.
- **`prefer-local`**: fall back to an approved local tier when Claude is unreachable. Honors the per-tier approval gate — an unapproved tier is BLOCKED with a teaching message, never run silently.
- **`strict`**: fail if Claude is unreachable; no fallback.

## Layer 4 Pieces

| Piece | Role |
|---|---|
| `scripts/reachability.sh` | Deterministic JSON probe of Ollama + Anthropic reachability. No network call when `offlinePolicy` is `off`; fails closed (reports unreachable) on any error. The Anthropic check is an unauthenticated HEAD (API key never sent). |
| `scripts/engine.sh route` | Pure routing decision; reachability passed via `--ollama` / `--claude`; returns `claude`, `local`, or `blocked`. |
| `scripts/offline-draft.sh` | True-offline drafting; reads `raw/`, calls Ollama, writes `_proposed/` drafts with `proposed_by` + `status: draft` for review-gate promotion. Enforces `_proposed/`-only confinement itself (hooks don't fire offline). |
| `scripts/offline-query.sh` | True-offline cited query (ADR-0019); deterministic lexical search selects pages; local model composes cited answer; runtime answer verification checks every citation. Read-only; never writes the vault. |

---

# Offline Draft

A `_proposed/` draft produced with zero dependence on Claude Code by `scripts/offline-draft.sh`. The true-offline counterpart to the in-session `local-ingest-stub`. Requires `localModel.enabled`, an approved model for the `ingest-extract` tier, and `offlinePolicy: prefer-local` or similar. Writes through the one `_proposed/` channel for later review-gate promotion.

---

# Reachability Probe

`scripts/reachability.sh` — the deterministic Layer 4 check that reports, as JSON, whether the local Ollama endpoint and the Anthropic API are reachable. Performs no network call when `offlinePolicy` is `off`, and fails closed (reports unreachable) on any error. Consumed by the `SessionStart` degraded-mode note and the offline draft path.
