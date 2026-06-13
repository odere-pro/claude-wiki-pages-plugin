---
title: "Deterministic Engine"
type: entity
entity_type: tool
aliases: ["Deterministic Engine", "deterministic engine", "Bun CLI", "engine"]
parent: "[[Wiki Engine]]"
path: "engine"
sources: ["[[Architecture Documentation]]", "[[Glossary]]", "[[ADR-0015: Engine Self-Description Surfaces]]", "[[ADR-0005: Git Required Per-Vault Init]]", "[[cli.ts Source]]", "[[engine.sh Source]]", "[[Engine API Skill (SKILL.md)]]", "[[verify.ts Source]]"]
related: ["[[Four-Layer Stack]]", "[[Wiki-Native Recall]]", "[[Graph Traversal Primitive]]", "[[Firewall]]", "[[Auto-Heal]]", "[[Lint Rules]]", "[[Local Model Quality Gate]]", "[[Engine Verb Surface]]", "[[Engine CLI Router]]", "[[Scripts Layer]]", "[[engine.sh]]", "[[cli.ts]]"]
tags: ["tool", "engine"]
created: 2026-06-13
updated: 2026-06-13
update_count: 6

status: active
confidence: 1.0
---

# Deterministic Engine

> [!summary]
> The deterministic engine is the Bun CLI (`src/cli/cli.ts`) that validates, repairs, and describes the vault — all without embeddings or inference. Same input, same output, every run. It is invoked via `bash scripts/engine.sh <verb>` and exposes ten implemented verbs. When Bun is unavailable the plugin degrades gracefully: bash hooks still enforce the schema, but engine verbs are disabled. The engine's CAPABILITIES table is the single source of truth for the verb surface (ADR-0015).

## Overview

The deterministic engine is the Layer 4 tool that handles vault validation, structural repair, search, and routing decisions — operations where determinism and auditability matter more than creative judgment. It is called "deterministic" to distinguish it precisely from the LLM components: given the same vault state, the engine always produces the same output.

The engine is implemented in TypeScript and requires Bun ≥ 1.2. It is shipped as part of the plugin's `src/` directory and accessed through the shell bridge `scripts/engine.sh`, which sources `scripts/resolve-vault.sh` for the four-tier vault resolution before invoking the Bun entry point.

## No Embeddings — Ever

The engine's core invariant is that no operation uses embeddings, vector stores, or similarity scoring. All retrieval operations are keyword matching, frontmatter parsing, or graph traversal. This is enforced at the CI level by `gate-13-no-rag.sh`, which scans `src/commands/search/` and related files for forbidden imports (HTTP clients, embedding libraries) and self-tests by planting a known violation and asserting the gate catches it.

## The CAPABILITIES Table (ADR-0015)

The single source of truth for the verb surface lives in-code in `src/cli/cli.ts` as one `CAPABILITIES` table. Every consumer derives from it:

- The `usage()` function that prints help text
- The dispatch router's `IMPLEMENTED` set
- The `PLANNED` array
- The `capabilities --json` verb output

This means adding or retiring a verb is a one-line table edit and every consumer follows — there is no second place to update. Before ADR-0015, the verb list was triple-stated by hand (Set, array, and a free-text `usage()` literal), causing silent drift. The `CAPABILITIES` table collapse closed that.

## Implemented Verbs

| Verb | Purpose |
| --- | --- |
| `verify` | Validate the vault against the schema; emit JSON findings |
| `heal` | Git-checkpoint + verify + fix structural errors + re-verify loop |
| `search` | Keyword search with synonym expansion and stemming (wiki-native recall) |
| `doctor` | Environment health checks (D01–D12); `--fix` auto-repairs |
| `propose` | Route a draft through the `_proposed/` review gate |
| `migrate` | Upgrade schema version (e.g. rename `_index.md` → folder notes) |
| `route` | Network-free routing decision: claude / local / blocked |
| `backlog` | O(1) pending-source and overdue-lint detection via the source manifest |
| `snapshot` | Create git checkpoint commits (pre/post) |
| `firewall` | Evaluate a path against the per-vault write confinement rules |
| `capabilities` | Emit the CAPABILITIES table as JSON (ADR-0015) |
| `ontology` | Parse and emit the ontology-profile-v1 as JSON (ADR-0015) |

The `verify` verb is the primary gate: it emits `Report{command, vault, findings[], errors, warnings, clean}` through a single structured envelope (`src/core/report.ts`). The `heal` verb wraps `verify` in a checkpoint loop. Most other verbs use their own exit expressions, a deliberate scoping decision (ADR-0015: retroactively refactoring working verbs would be an L-effort change for no gain).

## Self-Description (ADR-0015)

Two verbs make the engine self-describing for agents that call it:

**`capabilities --json`** emits `{ verbs: [{ name, status }] }` where `status ∈ {implemented, planned}`. Agents can discover the safe-to-call verb surface deterministically without parsing prose.

**`ontology --json`** parses the `ontology-profile-v1` block from `vault/CLAUDE.md` at read time — a markdown-table extraction, never a duplicate file — and emits:
- `enums.type` — the closed page-type enum
- `enums.entity_type` — the core ∪ the vault's `entity_type_extensions`
- `predicates[]` — one entry per predicate row (domain, range, direction, cardinality)

If the table is malformed or missing, the verb emits an error finding and exits non-zero. It never returns a silent-empty manifest (fail-closed).

## Git Integration

The engine's `snapshot` verb creates git checkpoint commits that the [[Curator Agent]] and [[Ingest Agent]] use to bracket their write phases:

```bash
bash scripts/engine.sh snapshot pre --target <vault>
# ... write changes ...
bash scripts/engine.sh snapshot post --target <vault> --label "description"
```

Each snapshot is a separate revertible commit. The `heal` verb creates its own `heal:` checkpoint commit before the verify-fix loop.

## Graceful Degradation

When Bun is unavailable (`which bun` returns nothing), `engine.sh` emits a warning and exits 0 rather than failing. The bash hooks (`validate-frontmatter.sh`, `check-wikilinks.sh`, `firewall.sh`) continue to enforce the schema independently of Bun, so the vault's write-time protections remain active. Engine-only verbs (`search`, `route`, `backlog`) are unavailable until Bun is installed.

## graph.ts — the Shared Walk Function

The engine's retrieval operations share one graph-traversal primitive in `src/core/graph.ts:walk()`. This function follows typed wikilinks (`sources`, `related`, `depends_on`) from a seed page to a N-hop neighbourhood (N≤2), with hop-decayed scoring. All consumers of graph traversal call this one function — there is no second traversal implementation. See [[Graph Traversal Primitive]] for the full contract.

## Related

- [[Four-Layer Stack]] — the engine is Layer 4's primary deterministic tool
- [[Wiki-Native Recall]] — the deterministic retrieval methodology the engine implements
- [[Graph Traversal Primitive]] — `src/core/graph.ts:walk()` used by search and the analyst
- [[Git Checkpoint]] — the `snapshot` verb creates these
- [[Firewall]] — the `firewall` engine verb evaluates path confinement
- [[Local Model Quality Gate]] — the allow-list enforced fail-closed by `config validate`
