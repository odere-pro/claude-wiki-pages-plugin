---
title: "Capability Tier"
type: concept
aliases:
  [
    "Capability Tier",
    "capability tier",
    "capability tiers",
    "model tier",
    "ingest-extract tier",
    "query tier",
    "draft tier",
  ]
parent: "[[LLM]]"
path: "llm"
sources:
  [
    "[[ADR-0011: Local-Model Quality Gate]]",
    "[[ADR-0018: Offline Policy and Degraded-Mode Routing]]",
    "[[ADR-0019: Query Tier and Answer Verification]]",
    "[[Local Models]]",
  ]
related:
  [
    "[[Local Model Quality Gate]]",
    "[[Approved Local Model]]",
    "[[Zero-Fabrication Floor]]",
    "[[Offline Policy]]",
    "[[Golden Set]]",
  ]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "local-model", "quality-gate"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Capability Tier

> [!summary]
> A capability tier is a named, independently gateable slot that controls which model executes a specific plugin operation. Three tiers are defined: `ingest-extract` (structure raw sources into wiki pages), `query` (compose cited answers), and `draft` (produce `_proposed/` draft pages). Each tier requires its own golden-set evaluation before a local model is approved. Claude Code is the primary for all tiers; a local model is the fallback only when `offlinePolicy: prefer-local` is set and the model has passed its tier's gate.

## Examples

Checking the current routing decision for a vault:

```bash
bash scripts/engine.sh route --target <vault> --json
# Output: { "decision": "claude" | "local" | "blocked", "tier": "ingest-extract", "reason": "..." }
```

Tier progression is sequential and evidence-gated:

| Tier             | Status                | What is needed to unlock                                |
| ---------------- | --------------------- | ------------------------------------------------------- |
| `ingest-extract` | UNLOCKED (qwen3:30b)  | ADR-0011 golden-set evidence committed                  |
| `query`          | UNLOCKED (qwen3:30b)  | ADR-0019 runtime verification evidence committed        |
| `draft`          | WIRED but BLOCKED     | Golden set for the draft tier must be defined and run   |
| full ingest etc. | Not wired             | Future tier; needs its own golden set and ADR amendment |

## Definition

The capability tier system partitions the plugin's LLM-dependent operations into distinct, independently evaluated slots. Each slot has its own quality requirements, its own golden set, and its own entry in `APPROVED_LOCAL_MODELS_BY_TIER`. A model approved for one tier is not automatically eligible for another — progression is one tier at a time on measured evidence.

The three tiers:

| Tier             | Operation                                                         | Status                                    |
| ---------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| `ingest-extract` | Structure raw source content into schema-valid wiki pages         | UNLOCKED for `qwen3-coder:30b`            |
| `query`          | Compose cited answers from pages selected by deterministic search | UNLOCKED for `qwen3-coder:30b`            |
| `draft`          | Produce `_proposed/` draft pages via `offline-draft.sh`           | WIRED but BLOCKED — no golden set defined |

## Key Principles

**Tier isolation.** Each tier operates at a different trust level. `ingest-extract` writes to the wiki (high trust). `query` is read-only composition (medium trust). `draft` produces staged pages that require human review before promotion (lower trust). The tiers reflect these risk levels.

**Fail-closed.** A tier with no approved local model is BLOCKED. The engine emits a teaching message naming the missing evaluation rather than running silently with an unapproved model. Partial approval (one tier passing, another not) means the approved tier uses the local model and the other tiers stay Claude-first.

**One mechanism.** The `APPROVED_LOCAL_MODELS_BY_TIER` allow-list in `src/data/config/config.ts` is the single enforcement point. The engine's `route` verb reads this list and the current `offlinePolicy` to make a pure, network-free routing decision.

**No silent fallback.** If `offlinePolicy` is `off` (the default), the system never falls back to a local model regardless of what is approved. The fallback only activates when `offlinePolicy: prefer-local` is set and the Claude API is unreachable.

## Relationship to the Quality Gate

The [[Local Model Quality Gate]] (ADR-0011) defines the evaluation methodology for any new tier unlock. A model candidate must run against the tier's golden set and clear all four thresholds (schema-validity ≥ 0.98, claim-source fidelity ≥ 0.97, field accuracy ≥ 0.90, dedup correctness ≥ 0.90) plus the zero-fabrication hard floor. Passing the gate for `ingest-extract` does not grant `query` access; each tier requires its own measured evidence artifact.

The `draft` tier is currently BLOCKED not because it is impossible but because no golden set has been defined and no evaluation has been run. It is wired so that when the evaluation is done, unlocking it requires only adding a passing model to the allow-list.

## Implementation

```bash
# Check current routing decision for a vault
bash /path/to/scripts/engine.sh route --target <vault> --json
# Output: { "decision": "claude" | "local" | "blocked", "tier": "...", "reason": "..." }
```

The `route` command is pure: it reads config and Bun/Claude/Ollama availability from its inputs, makes no network calls, and always exits 0.

## Related Concepts

- [[Local Model Quality Gate]] — the evaluation methodology that gates tier unlock
- [[Approved Local Model]] — the allow-list result of a passed gate
- [[Zero-Fabrication Floor]] — the hard floor all tier evaluations enforce
- [[Offline Policy]] — the config dimension that activates local-model routing
- [[Golden Set]] — the fixtures used to evaluate a model against a tier
