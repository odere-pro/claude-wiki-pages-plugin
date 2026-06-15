---
title: "Engine — Index"
type: index
aliases: ["Engine — Index", "engine-index", "Engine Index", "Wiki Engine Index"]
parent: "[[index|Wiki Index]]"
path: "engine"
children:
  - "[[engine-sh|engine.sh]]"
  - "[[cli-ts|cli.ts]]"
  - "[[engine-cli-router|Engine CLI Router]]"
  - "[[engine-verb-surface|Engine Verb Surface]]"
  - "[[search-scoring-algorithm|Search Scoring Algorithm]]"
  - "[[tier-2-deterministic-recall|Tier-2 Deterministic Recall]]"
  - "[[graph-walk-algorithm|Graph Walk Algorithm]]"
  - "[[porter-stemmer|Porter Stemmer]]"
  - "[[synonym-lexicon|Synonym Lexicon]]"
  - "[[provenance-checks|Provenance Checks]]"
  - "[[moc-repair-primitives|MOC Repair Primitives]]"
  - "[[schema-version-gate|Schema Version Gate]]"
  - "[[draft-review-surface|Draft Review Surface]]"
  - "[[degraded-mode-routing|Degraded-Mode Routing]]"
  - "[[scripts-layer|Scripts Layer]]"
  - "[[engine|Wiki Engine]]"
child_indexes: []
tags: ["engine", "index"]
created: 2026-06-13
updated: 2026-06-13
---

# Engine — Index

Map of Content for the Wiki Engine cluster. Covers the deterministic TypeScript core of the claude-wiki-pages plugin: the shell bridge, CLI router, search and retrieval stack, verification primitives, and workflow verbs.

## Shell Bridge and CLI

- [[engine-sh|engine.sh]] — 23-line bash bridge from hooks and agents to the Bun TypeScript engine
- [[cli-ts|cli.ts]] — TypeScript CLI entry point; dispatches via the CAPABILITIES table
- [[engine-cli-router|Engine CLI Router]] — `ParsedArgs`, `emit()`, `usage()`, and dispatch logic
- [[engine-verb-surface|Engine Verb Surface]] — the CAPABILITIES table as single source of truth for implemented verbs
- [[scripts-layer|Scripts Layer]] — full Layer 4 shell anatomy: sourceable vs executable, hook wiring, naming conventions

## Search and Retrieval

- [[search-scoring-algorithm|Search Scoring Algorithm]] — scoring channels, `MatchComponent` breakdown, weighted sum
- [[tier-2-deterministic-recall|Tier-2 Deterministic Recall]] — synonym expansion and Porter stemming passes
- [[graph-walk-algorithm|Graph Walk Algorithm]] — BFS `walk()`, N≤2 hops, hop-decay scoring
- [[porter-stemmer|Porter Stemmer]] — pure TypeScript Porter 1980 suffix-stripping
- [[synonym-lexicon|Synonym Lexicon]] — `_vocabulary.md`, union-find connected components, `synonymsOf()` API

## Verification and Integrity

- [[provenance-checks|Provenance Checks]] — CHECK 5a (source presence) and CHECK 5b (derived/confidence)
- [[moc-repair-primitives|MOC Repair Primitives]] — `replaceYamlListField`, `syncChildren`, `buildIndexStub`
- [[schema-version-gate|Schema Version Gate]] — `SUPPORTED_SCHEMA_VERSIONS`, fail-closed on unknown schema

## Workflow Verbs

- [[draft-review-surface|Draft Review Surface]] — `_proposed/` gate: review, approve, reject under git checkpoint
- [[degraded-mode-routing|Degraded-Mode Routing]] — `decideRoute()` matrix: Bun, Claude, Ollama, offline policy

## Narrative Overview

- [[engine|Wiki Engine]] — topic page orienting the full engine cluster
