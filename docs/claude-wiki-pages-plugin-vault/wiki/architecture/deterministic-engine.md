---
title: "Deterministic Engine"
type: entity
entity_type: tool
aliases: ["Deterministic Engine", "deterministic engine", "Bun CLI", "engine"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture Documentation]]", "[[Glossary]]", "[[ADR-0015: Engine Self-Description]]", "[[ADR-0005: Git Required Per-Vault]]"]
related: ["[[Four-Layer Stack]]", "[[Wiki-Native Recall]]", "[[Graph Traversal Primitive]]", "[[Firewall]]"]
tags: ["tool", "engine"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Deterministic Engine

## Overview

The deterministic engine is the Bun CLI (`src/cli/cli.ts`) that validates the vault and runs quality checks. The invariant: same input always produces the same result. It requires Bun ≥ 1.2. No embeddings, no inference — every operation is a deterministic parse or check.

The plugin degrades gracefully without Bun: bash hooks still enforce the schema, but engine commands are disabled until Bun is installed.

## Key Facts

- **Entry point:** `bash scripts/engine.sh <verb>` (shell bridge to the Bun TS engine).
- **Self-description:** `capabilities --json` emits the verb table; `ontology --json` emits the ontology profile. Both are projections, not forks (ADR-0015).
- **Verbs:** verify, heal, search, doctor, propose, migrate, route, backlog, snapshot, firewall.
- **NO embeddings:** Every operation is keyword matching, graph traversal, or frontmatter parsing.
- **CAPABILITIES table** in `cli.ts` is the single source of truth for the verb surface (ADR-0015).
- **Git integration:** `snapshot pre/post` creates git checkpoints for every write phase.

## Related

- [[Four-Layer Stack]] — the engine is a Layer 4 peer
- [[Wiki-Native Recall]] — deterministic retrieval the engine implements
- [[Graph Traversal Primitive]] — `src/core/graph.ts:walk()` shared function
- [[Git Checkpoint]] — snapshot verb enables reversible write phases
- [[Local Model Quality Gate]] — allow-list enforced fail-closed by the engine
