---
title: "Draft Review Gate"
type: concept
aliases: ["Draft Review Gate", "draft review gate", "_proposed/", "proposed drafts", "review gate", "Offline Mode", "offline mode"]
parent: "[[Operations]]"
path: "operations"
sources: ["[[Operations (source)]]", "[[Glossary]]", "[[Local Models (source)]]"]
related: ["[[Hook-Enforced Safety]]", "[[Degraded Mode Routing]]", "[[Vault Location Resolution]]"]
contradicts: []
supersedes: []
depends_on: ["[[Hook-Enforced Safety]]"]
tags: [drafts, review, offline, proposed]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Draft Review Gate

All drafted content — local-model drafts, durable-memory write-backs, local-ingest stubs — routes through a single `_proposed/` channel. There is exactly one `_proposed/` channel; no second draft mechanism exists.

## How It Works

- Drafts mirror their eventual wiki path: `_proposed/wiki/<topic>/<page>.md`.
- Drafts carry `status: draft` plus `proposed_by: "<source>"` (e.g., `"ollama:llama3"`, `"claude"`).
- Drafts are outside every wiki-scoped check (frontmatter validation, wikilinks, lint, index) until promoted.
- Promotion via `/claude-wiki-pages:review` (backed by the engine `propose` command): sets `status: active`, clears `proposed_by`, stamps `updated`, runs under a git checkpoint.
- Never hand-copy a draft into `wiki/`; promotion via `propose approve` is the only sanctioned path.

For offline-produced drafts (via `scripts/offline-draft.sh`), see [[Degraded Mode Routing]] and [[Offline Draft]].

---

# Offline Mode

When the network or Claude API is unavailable, a gate-approved local model can stand in for basic operations. Opt-in, fail-closed; Claude stays primary by default. The only currently approved model for offline tiers is [[qwen3-coder:30b]]. Governed by two `localModel` config fields:

- **`offlinePolicy`**: `off` (default — never probe, never fall back), `prefer-local` (fall back to approved local tier when Claude unreachable), `strict` (fail if Claude unreachable, no fallback).
- **`tier`**: the capability tier the local model runs at; gated per-tier.

## Layer 4 Implementation

| Piece | Role |
|---|---|
| `scripts/reachability.sh` | Deterministic JSON probe of Ollama + Anthropic reachability; no network call when `offlinePolicy` is `off` |
| `scripts/engine.sh route` | Pure routing decision (`claude` / `local` / `blocked`); reachability passed via `--ollama` / `--claude` |
| `scripts/offline-draft.sh` | True-offline drafting; reads `raw/`, calls Ollama, writes `_proposed/` drafts for review-gate promotion |
| `scripts/offline-query.sh` | True-offline cited query; deterministic lexical search + local model + runtime answer verification |

In-session, `session-start.sh` emits a one-line `DEGRADED:` advisory when a local model is enabled and offline policy is not `off`.

## Glossary

`Degraded mode`: "Operation at a lower capability tier when the full-capability model (Claude) is unavailable. The plugin remains functional for the capabilities of the active tier."
