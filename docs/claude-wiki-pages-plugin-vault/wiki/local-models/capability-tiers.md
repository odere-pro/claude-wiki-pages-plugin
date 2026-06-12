---
title: "Capability Tiers"
type: concept
aliases: ["Capability Tiers", "capability tiers", "local model tiers"]
parent: "[[Local Models]]"
path: "local-models"
sources: ["[[local-models]]"]
related: ["[[Local Model Quality Gate]]", "[[Approved Local Models]]", "[[Offline Policy]]"]
tags: [local-models, capability]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Capability Tiers

Local-model scope widens one capability tier at a time, each gated on its own measured evidence (ADR-0011/0018). A tier with no gate-approved model is **WIRED but BLOCKED**: its config is accepted, but the engine fails closed.

## Tier Status

| Tier | Status | Approved model(s) | Notes |
| --- | --- | --- | --- |
| `ingest-extract` | UNLOCKED | `qwen3-coder:30b` | Measured golden-set evidence (ADR-0011/0017) |
| `query` | UNLOCKED | `qwen3-coder:30b` | Both ADR-0019 golden-set cases pass with perfect scores; runtime answer verification applies on every answer |
| `draft` | WIRED but BLOCKED | — (none yet) | No golden-set eval defined yet; enabling fails closed |
| Full ingest / curator / synthesis | Not wired | — | Future tiers; each needs its own golden set, threshold, and ADR |

## The Progression Model

Local-model scope widens **one capability tier at a time**, each gated on its own measured evidence. The pattern:

1. Define a golden set (raw-source inputs + expected structured output)
2. Run the eval
3. If it passes, commit reproducible evidence
4. Add the model to that tier's row in `APPROVED_LOCAL_MODELS_BY_TIER`
5. Amend the ADR

No blanket "Ollama is ready" claim — every tier is independently gated. A model that regresses on a re-run is removed by the reverse edit.

## What Each Tier Permits

- **`ingest-extract`** — extract structured entities/concepts from a raw source, route through `_proposed/` for human review.
- **`query`** — compose a cited answer from wiki pages selected by the deterministic search engine. Read-only; writes nothing.
- **`draft`** (not yet) — full local-ingest stub: draft pages directly into `_proposed/`.
- **Full ingest/curator/synthesis** (not yet) — write directly to `wiki/` without the `_proposed/` gate.

Claude Code stays primary for every tier regardless; local-model use is opt-in and off by default.
