---
title: "Wiki Engine"
type: index
aliases: ["Wiki Engine", "wiki engine", "engine", "Engine", "deterministic engine", "claude-wiki-pages engine"]
parent: "[[Wiki Index]]"
path: "engine"
children:
  - "[[cli.ts]]"
  - "[[Degraded-Mode Routing]]"
  - "[[Draft Review Surface]]"
  - "[[Engine CLI Router]]"
  - "[[Engine — Index]]"
  - "[[Engine Verb Surface]]"
  - "[[Graph Traversal Primitive]]"
  - "[[Graph Walk Algorithm]]"
  - "[[MOC Repair Primitives]]"
  - "[[Porter Stemmer]]"
  - "[[Provenance Checks]]"
  - "[[Schema Version Gate]]"
  - "[[Scripts Layer]]"
  - "[[Search Scoring Algorithm]]"
  - "[[Shell-TS Parity]]"
  - "[[Synonym Lexicon]]"
  - "[[Tier-2 Deterministic Recall]]"
  - "[[engine.sh]]"
  - "[[Active Vault]]"
  - "[[Deterministic Engine]]"
  - "[[Durable Memory]]"
  - "[[Fail-Closed]]"
  - "[[Firewall]]"
  - "[[Vault Resolution]]"
  - "[[Golden Set]]"
  - "[[Search Score Object]]"
  - "[[Auto-Heal]]"
child_indexes: []
tags: ["engine", "implementation", "search", "cli"]
created: 2026-06-13
updated: 2026-06-13
---

# Wiki Engine

> [!summary]
> The Wiki Engine is the deterministic TypeScript core of the claude-wiki-pages plugin. It is invoked through the [[engine.sh]] bash bridge and provides verbs for verify, search, heal, route, backlog, and graph. The search stack layers keyword scoring, [[Synonym Lexicon]] expansion, [[Porter Stemmer|Porter stemming]], and [[Graph Walk Algorithm|graph-walk]] traversal to achieve [[Wiki-Native Recall]] without embeddings. Integrity is enforced by [[Provenance Checks]], [[MOC Repair Primitives]], and the [[Schema Version Gate]]. [[Degraded-Mode Routing]] keeps the system functional when Bun is absent.

## Overview

The engine is the Layer 4 implementation that makes the [[NO-RAG Principle]] practical: keyword-plus-synonym-plus-graph-walk recall finds the right pages without a vector database. It is a Bun TypeScript CLI (`src/cli/cli.ts`) exposed through a 23-line bash bridge (`scripts/engine.sh`) so hook scripts and agents can call it with a single `bash engine.sh <verb> --target <vault>` invocation.

The engine's public surface is the CAPABILITIES table in `cli.ts`: the implemented verbs and their `--json` output contracts. Agents consume this surface through the `skills/engine-api` teaching skill. The engine never exposes internal state beyond what the verb's output contract defines.

When Bun is absent, [[Degraded-Mode Routing]] degrades gracefully: `engine.sh` exits 0 with a WARN message, and the bash validators in the hook layer remain active. Engine-only verbs are unavailable in degraded mode; search and heal fall back to the agent's own grep/read.

## Key Pages

### Shell Bridge

[[engine.sh]] is the 23-line bash bridge from hook scripts and agents to the Bun TypeScript engine. It resolves the plugin root, checks Bun availability, and invokes either the pre-built `dist/cli.js` (npm install path) or `src/cli/cli.ts` (development path). Uses `exec` for zero subshell overhead. When Bun is absent it exits 0 with a WARN — degradation, not failure.

[[Scripts Layer]] documents the full Layer 4 shell anatomy: which scripts are sourceable vs executable, how hooks wire to scripts, and the naming conventions. The bash layer keeps the engine callable from any shell context without requiring Bun in the caller's environment.

### CLI Entry Point

[[cli.ts]] is the TypeScript CLI router. It parses arguments via `ParsedArgs`, looks up the subcommand in the CAPABILITIES table, and dispatches to the matching command module. Unrecognized verbs print the usage text derived from CAPABILITIES and exit non-zero.

[[Engine CLI Router]] documents how the CLI dispatches commands, the `ParsedArgs` structure, the `emit()` JSON output helper, and the `usage()` generator.

[[Engine Verb Surface]] documents the CAPABILITIES table as the single source of truth for implemented versus planned verbs. Adding a new verb means adding a row to CAPABILITIES and a matching command module — no other file needs to change.

### Search and Retrieval

[[Search Scoring Algorithm]] defines the scoring channels (title exact, title partial, alias, body TF-IDF, type boost, confidence weight) and their weights. Each page match produces a `MatchComponent` breakdown. The final score is a weighted sum across channels.

[[Tier-2 Deterministic Recall]] documents the synonym-expansion and Porter-stemming passes that run after the base keyword match. These passes extend recall to morphological variants (run/running/ran) and configured synonyms without touching precision.

[[Graph Walk Algorithm]] documents the BFS `walk()` function that traverses typed wikilinks (`related`, `depends_on`, `sources`) up to N≤2 hops with hop-decay scoring. The walk is deterministic: visit order is alphabetical, not insertion order.

[[Porter Stemmer]] is the pure TypeScript implementation of the Porter 1980 suffix-stripping algorithm. Exports `stem()` (single token) and `stemTokens()` (array). Used by Tier-2 recall for morphological normalization.

[[Synonym Lexicon]] documents `_vocabulary.md`, the union-find connected-component structure that clusters synonyms, and the `loadLexicon()` / `synonymsOf()` API. Expanding synonyms before stemming avoids over-collapsing distinct terms.

### Verification and Integrity

[[Provenance Checks]] documents CHECK 5a (source-presence: every page in `wiki/` must cite at least one `_sources/` page) and CHECK 5b (derived/confidence: a `derived: false` page must have `confidence ≥ 0.8` when `update_count ≥ 2`).

[[MOC Repair Primitives]] documents the three idempotent functions the heal verb uses to repair index files: `replaceYamlListField` (atomic field replacement), `syncChildren` (reconcile `children:` against disk), and `buildIndexStub` (create a missing folder note from template).

[[Schema Version Gate]] documents `SUPPORTED_SCHEMA_VERSIONS` and `declaredSchemaVersion()`. A vault declaring a schema version outside the supported set causes the engine to exit non-zero with a clear error rather than silently operating against an unsupported schema.

### Workflow Verbs

[[Draft Review Surface]] documents the `_proposed/` gate: the `review`, `approve`, and `reject` verbs that promote or discard draft pages under a git checkpoint. The promotion path clears `proposed_by:`, sets `status: active`, stamps `updated:`, and commits.

[[Degraded-Mode Routing]] documents the `decideRoute()` pure function that computes the routing decision (`claude` / `local` / `blocked`) from the environment matrix (Bun present, Claude reachable, Ollama reachable, offline policy). `offlinePolicy` from config overrides all other signals.

## Open Questions

- The engine currently has no streaming output mode. As vault size grows and heal takes longer, should `engine.sh heal` support a progress stream (e.g., JSON-lines) so callers can display progress?
- `_vocabulary.md` is currently a flat markdown file read at startup. At 500+ synonym pairs, should it migrate to a dedicated JSON or YAML format with a schema?
