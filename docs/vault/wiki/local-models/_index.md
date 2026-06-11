---
title: "Local Models"
type: index
aliases: ["Local Models", "local-models", "local model support", "Ollama integration"]
parent: "[[Wiki Index]]"
path: "local-models"
children:
  - "[[Capability Tier]]"
  - "[[Quality Gate]]"
  - "[[Approved Local Model]]"
  - "[[Degraded Mode Routing]]"
child_indexes: []
tags: [local-models, ollama]
created: 2026-06-11
updated: 2026-06-11
---

# Local Models

Navigation index for local model (Ollama/LM Studio) support in `claude-wiki-pages`. Covers capability tiers, the quality gate governance process, the approved model allow-list, and offline/degraded mode routing.

## Capability Tiers

- [[Capability Tier]] — Named levels of plugin functionality tied to available LLM
- [[Ingest-Extract]] — Tier for extracting structured entities and claims from raw sources
- [[Query Tier]] — Tier for composing cited answers from the deterministic search engine

## Quality Gate

- [[Quality Gate]] — Defined eval metric and pass threshold before a tier is widened
- [[Golden Set]] — Checked-in fixture set used as deterministic reference for eval scoring
- [[Zero Fabrication Floor]] — Hard requirement: zero fabricated sourced claims (ADR-0017)
- [[Answer Verification]] — Per-answer runtime check: citations must resolve, quotes must be verbatim

## Approved Models

- [[Approved Local Model]] — A model that cleared the quality gate; on the allow-list
- [[qwen3-coder:30b]] — Only currently approved model; unlocked for ingest-extract and query

## Offline and Degraded Mode

- [[Degraded Mode Routing]] — Engine `route` command; claude/local/blocked decision
- [[Offline Draft]] — True-offline drafting via `scripts/offline-draft.sh` into `_proposed/`
- [[Offline Mode]] — `offlinePolicy` config (off/prefer-local/strict) + reachability probe
