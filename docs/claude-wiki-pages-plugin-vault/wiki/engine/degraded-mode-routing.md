---
title: "Degraded-Mode Routing"
type: concept
aliases: ["Degraded-Mode Routing", "route verb", "decideRoute", "offline routing", "RouteDecision"]
parent: "[[Engine — Index]]"
path: "engine"
sources: ["[[route.ts Source]]", "[[Engine API Skill (SKILL.md)]]"]
related: ["[[Engine Verb Surface]]", "[[Deterministic Engine]]", "[[Offline Policy]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["engine", "routing", "offline", "local-model"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Degraded-Mode Routing

## Definition

Degraded-Mode Routing is the `route` engine verb (ADR-0018) that determines whether a task should run on Claude, on an approved local model, or be blocked entirely. The decision is pure and network-free: reachability probes are performed upstream (by `scripts/reachability.sh`) and passed in as CLI flags. The engine never initiates a network call. The orchestrator reads this decision and never re-derives it.

## Key Principles

- **`decideRoute()` is a pure function**: given `(offlinePolicy, claudeReachable, tierApproved, ollamaUp)`, it returns `{decision: RouteDecision, reason: string}`. No side effects, no I/O.
- **`RouteDecision` is `"claude" | "local" | "blocked"`**: three terminal outcomes.
- **Default-to-primary**: unprobed Claude state is treated as "reachable" (prefer primary); unprobed Ollama is "not-up" (do not assume fallback exists).
- **BLOCKED is fail-closed**: a BLOCKED decision emits an error-severity finding so `exitCode()` returns 1. No write happens when the route is blocked.
- **Policy matrix (ADR-0018 §4)**:

| offlinePolicy  | Claude reachable | Tier approved | Ollama up | Decision |
| -------------- | ---------------- | ------------- | --------- | -------- |
| `off`          | —                | —             | —         | claude   |
| `strict`       | true             | —             | —         | claude   |
| `strict`       | false            | —             | —         | blocked  |
| `prefer-local` | true             | —             | —         | claude   |
| `prefer-local` | false            | true          | true      | local    |
| `prefer-local` | false            | true          | false     | blocked  |
| `prefer-local` | false            | false         | —         | blocked  |

- **Tier approved only when fully configured**: `localModel.enabled` must be true AND `checkLocalModelApproval()` must return no errors. This reuses the same gate as `config validate`.

## Examples

```bash
# Claude reachable (default)
bash scripts/engine.sh route --json
# {"decision":"claude","reason":"Claude is reachable — primary.","tier":"none","offlinePolicy":"off"}

# Claude unreachable, strict policy
bash scripts/engine.sh route --claude unreachable --json
# {"decision":"blocked","reason":"offlinePolicy is strict and Claude is unreachable..."}
```

## Related Concepts

- [[Offline Policy]] — the configuration that drives the offlinePolicy input to this decision
- [[Engine Verb Surface]] — the full set of engine verbs `route` is part of
- [[Deterministic Engine]] — the engine providing this routing verb
