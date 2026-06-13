---
title: "ADR-0018: Offline Policy and Degraded-Mode Routing"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "offline", "local-model", "routing"]
aliases: ["ADR-0018: Offline Policy and Degraded-Mode Routing"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0018: Offline Policy and Degraded-Mode Routing

## Summary

Establishes the `offlinePolicy` config dimension (off/strict/prefer-local) and three Layer 4 pieces: `reachability.sh`, `engine route`, `offline-draft.sh`. The `route` command makes a pure, network-free routing decision based on policy, tier, model approval, and reachability.

## Key Claims

- Three offline policies: `off` (default — never probe, never fall back), `strict` (fail if Claude unreachable), `prefer-local` (fall back to approved local tier when Claude unreachable).
- `scripts/reachability.sh` probes Ollama and Anthropic API reachability; no network call when policy is `off`; fails closed.
- `engine route` makes the routing decision (claude / local / blocked) without network; reachability passed in.
- `scripts/offline-draft.sh` produces `_proposed/` drafts via Ollama with no Claude Code dependency.
- A tier without an approved model is BLOCKED with a teaching message, never run silently.

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[Offline Policy]]
- [[Degraded Mode]]
- [[Degraded-Mode Routing]]
- Reachability Probe (`scripts/reachability.sh`; fails closed; no network call when policy is `off`)
- [[Capability Tier]]

## Grounded Pages

Wiki pages that cite this source:

- [[Offline Policy]] — offlinePolicy config, reachability.sh, engine route
