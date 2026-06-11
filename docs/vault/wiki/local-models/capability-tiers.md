---
title: "Capability Tier"
type: concept
aliases: ["Capability Tier", "capability tier", "capability tiers", "Ingest-Extract", "ingest-extract", "Query Tier", "query tier"]
parent: "[[Local Models]]"
path: "local-models"
sources: ["[[Local Models]]", "[[Glossary]]", "[[Operations]]"]
related: ["[[Quality Gate]]", "[[Approved Local Model]]", "[[Degraded Mode Routing]]", "[[Offline Mode]]"]
contradicts: []
supersedes: []
depends_on: []
tags: [local-models, capability-tiers]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Capability Tier

A named level of plugin functionality tied to the available LLM. Local-model scope widens one capability tier at a time, each gated on its own measured evidence (ADR-0011/0018). A tier with no gate-approved model is **WIRED but BLOCKED**: its config is accepted, but the engine fails closed.

## Current Tier Map

| Tier | Status | Approved model(s) | Notes |
|---|---|---|---|
| `ingest-extract` | UNLOCKED | `qwen3-coder:30b` | Measured golden-set evidence (ADR-0011/0017) |
| `query` | UNLOCKED | `qwen3-coder:30b` | Perfect recall/quote coverage; zero fabrications; runtime answer verification on every answer |
| `draft` | WIRED but BLOCKED | — (none yet) | No golden-set eval defined yet |
| full ingest / curator / synthesis | Not wired | — | Future tiers; each needs its own golden set, threshold, and ADR |

The per-tier allow-list is `APPROVED_LOCAL_MODELS_BY_TIER` in `src/data/config/config.ts`.

## Ingest-Extract Tier

The sub-step of the ingest pipeline that reads a raw source and extracts structured entities, concepts, and claims before writing wiki pages. Distinct from the write step. Unlocked for `qwen3-coder:30b` via ADR-0011/0017.

## Query Tier

The capability tier (`localModel.tier: "query"`) at which a local model composes cited answers from wiki pages selected by the deterministic search engine. Read-only — writes nothing. Additionally protected by per-answer runtime verification: each citation must name an existing wiki page; each cited quote must be a verbatim (whitespace-normalized) substring of that page. Any violation throws a warning and denies the answer (ADR-0019).

## Capability Progression

The roadmap plan to widen local-model scope one capability tier at a time, gated on each tier meeting a defined quality threshold before the next tier is unlocked. This prevents premature expansion of Ollama scope beyond proven ability.
