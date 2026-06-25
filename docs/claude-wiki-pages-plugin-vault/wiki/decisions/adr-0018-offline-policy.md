---
title: "ADR-0018: Offline Policy"
type: entity
entity_type: standard
aliases: ["ADR-0018", "adr-0018", "offline policy ADR"]
parent: "[[decisions|Decisions]]"
path: "decisions"
sources: ["[[docs-adr-0018|ADR-0018: Offline / Local-Model Routing Policy]]"]
related: []
tags: ["docs", "adrs", "local-models"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0018: Offline Policy

The decision to route to a local model (Ollama) when the Claude API is unreachable, using a per-tier allow-list with fail-closed blocking for unapproved tiers.

## Overview

ADR-0018 establishes the offline routing policy: when `offlinePolicy: prefer-local` and the Claude API is unreachable, the engine `route` command returns `local` and the agent routes to the approved local tier. Unapproved tiers are BLOCKED with a teaching message — never silently routed.

## Key Facts

**Status:** Accepted

**Drivers:**
- Air-gapped environments and network-restricted CIs need deterministic local fallback.
- Allowing an unapproved model to run silently would bypass the quality gate and potentially land fabricated content in the wiki.
- Existing `doctor` checks, scripts, and engine verbs are fully deterministic — they need no model and always work offline.

**Decision architecture:**

The `engine route --json` command decides: `{"decision": "claude" | "local" | "blocked", "model": <string>, "reason": <string>}`. Consumers check `decision` before invoking any model.

Per-tier allow-list (`APPROVED_LOCAL_MODELS_BY_TIER` in `src/data/config/config.ts`):
- `ingest-extract`: `qwen3-coder:30b` (UNLOCKED, gate-green)
- `query`: `qwen3-coder:30b` (UNLOCKED, gate-green)
- `draft`: none yet (WIRED but BLOCKED)
- full curator / synthesis / onboarding: not wired

Local-produced content routes to `_proposed/` and requires review-gate promotion — never lands directly in `wiki/`.

**Consequences:**
- A user with `offlinePolicy: offline-only` and no approved local model gets a clear `blocked` decision with a teaching message, not a silent failure or a locally-hallucinated wiki entry.
- Unlocking a new tier requires updating the allow-list, committing quality-gate evidence to `tests/eval/runs/`, and amending the ADR — all in one change.

## Related

The local model support concept page documents the quality gate methodology (ADR-0011/0017) and the measured evidence for qwen3-coder:30b. The parallel extract ADR (ADR-0026) documents how the routing decision integrates with the fan-out dispatch.
