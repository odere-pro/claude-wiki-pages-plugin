---
title: "Offline Policy"
type: concept
aliases: ["Offline Policy", "offline policy", "offlinePolicy", "degraded mode", "prefer-local"]
parent: "[[Reference]]"
path: "reference"
sources: ["[[ADR-0018: Offline Policy]]", "[[ADR-0019: Query Tier]]", "[[Operations Guide]]", "[[Local Models]]"]
related: ["[[Approved Local Model]]", "[[Capability Tier]]", "[[Degraded Mode]]", "[[Reachability Probe]]", "[[Vault Resolution]]"]
tags: ["concept", "offline", "local-model"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Offline Policy

## Definition

The offline policy is the `localModel.offlinePolicy` config field that governs whether the plugin falls back to a local model when Claude is unavailable.

## Key Principles

Three values:
- **`off` (default):** never probe reachability, never fall back. Claude is always required.
- **`strict`:** fail if Claude is unreachable; no fallback. Good for scripts that must use Claude.
- **`prefer-local`:** fall back to an approved local tier when Claude is unreachable. Honours the per-tier approval gate: an unapproved tier is BLOCKED with a teaching message, never run silently.

Three Layer 4 pieces implement offline routing:
1. **`scripts/reachability.sh`:** probes Ollama + Anthropic API reachability as JSON. No network call when policy is `off`; fails closed.
2. **`engine route`:** pure network-free routing decision (claude / local / blocked). Orchestrator consults it.
3. **`scripts/offline-draft.sh`:** true-offline drafting via Ollama into `_proposed/`.
4. **`scripts/offline-query.sh`:** true-offline query with runtime answer verification.

## Examples

- Default (policy `off`): a missing network connection → Claude fails → session ends. No local fallback.
- Policy `prefer-local` + `qwen3-coder:30b` approved at `ingest-extract`: Claude unreachable → route to local → drafts land in `_proposed/` for review.
- Policy `prefer-local` + unapproved model: route returns BLOCKED → teaching message → no silent fallback.

## Related Concepts

- [[Approved Local Model]] — the allow-list the routing decision consults
- [[Capability Tier]] — the tier the routing decision checks
- [[Degraded Mode]] — operating at a lower tier when Claude is unavailable
- [[Reachability Probe]] — `scripts/reachability.sh` that feeds the routing decision
