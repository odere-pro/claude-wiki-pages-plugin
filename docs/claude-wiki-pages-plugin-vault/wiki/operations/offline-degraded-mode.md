---
title: "Offline and Degraded Mode"
type: concept
aliases: ["Offline and Degraded Mode", "offline mode", "degraded mode", "ADR-0018"]
parent: "[[Operations Guide]]"
path: "operations"
sources: ["[[operations]]", "[[ADR-0018 Offline Policy and Degraded Mode]]", "[[local-models]]"]
related: ["[[Approved Local Models]]", "[[Offline Policy]]", "[[Capability Tiers]]", "[[Hook System]]"]
tags: [operations, offline, degraded, local-models]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# Offline and Degraded Mode

How the plugin behaves when network access to Claude is unavailable.

## Three Routing Policies (ADR-0018)

| Policy | When to use | Behavior |
| --- | --- | --- |
| `claude-primary` | Normal operation (default) | All tasks route to Claude. Fail if network unavailable. |
| `local-fallback` | Developer with local model, opt-in | Claude-first; falls back to approved local model for approved tiers. |
| `local-only` | Fully offline environment, explicit opt-in | Routes all tasks to local model. Capability-restricted. |

Policy is set in the vault settings. `claude-primary` is the factory default.

## What Local Models Can Do Offline

Only tasks in an approved tier with an approved model are permitted. Currently approved:

- **`ingest-extract` tier** — `qwen3-coder:30b` (verified, ADR-0011/0017)
- **`query` tier** — `qwen3-coder:30b` (verified, ADR-0019)
- **`draft` tier** — blocked for all local models
- **`full` (synthesis, orchestration)** — not wired

## Session Advisory

`session-start.sh` detects network reachability (`scripts/reachability.sh`). If Claude is unreachable and the policy is `claude-primary`, the session emits a warning advisory. If the policy is `local-fallback` or `local-only`, the session emits a capability-restriction advisory listing what is and is not available.

## Runtime Verification

For `query` responses from local models: every claim is back-checked against the cited wiki page content before the answer is shown to the user (ADR-0019). A claim that cannot be verified is either dropped or flagged with `[UNVERIFIED]`.

See [[Approved Local Models]] for the full approved-model table and [[Offline Policy]] for the Layer 4 script details.
