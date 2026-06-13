---
title: "Engine — Index"
type: index
aliases: ["Engine — Index", "engine-index", "Engine Index", "Wiki Engine Index"]
parent: "[[Wiki Index]]"
path: "engine"
children:
  - "[[engine.sh]]"
  - "[[cli.ts]]"
  - "[[Engine CLI Router]]"
  - "[[Engine Verb Surface]]"
  - "[[Search Scoring Algorithm]]"
  - "[[Tier-2 Deterministic Recall]]"
  - "[[Graph Walk Algorithm]]"
  - "[[Porter Stemmer]]"
  - "[[Synonym Lexicon]]"
  - "[[Provenance Checks]]"
  - "[[MOC Repair Primitives]]"
  - "[[Schema Version Gate]]"
  - "[[Draft Review Surface]]"
  - "[[Degraded-Mode Routing]]"
  - "[[Scripts Layer]]"
  - "[[Wiki Engine]]"
child_indexes: []
tags: ["engine", "index"]
created: 2026-06-13
updated: 2026-06-13
---

# Engine — Index

Map of Content for the Wiki Engine cluster. Covers the deterministic TypeScript core of the claude-wiki-pages plugin: the shell bridge, CLI router, search and retrieval stack, verification primitives, and workflow verbs.

## Shell Bridge and CLI

- [[engine.sh]] — 23-line bash bridge from hooks and agents to the Bun TypeScript engine
- [[cli.ts]] — TypeScript CLI entry point; dispatches via the CAPABILITIES table
- [[Engine CLI Router]] — `ParsedArgs`, `emit()`, `usage()`, and dispatch logic
- [[Engine Verb Surface]] — the CAPABILITIES table as single source of truth for implemented verbs
- [[Scripts Layer]] — full Layer 4 shell anatomy: sourceable vs executable, hook wiring, naming conventions

## Search and Retrieval

- [[Search Scoring Algorithm]] — scoring channels, `MatchComponent` breakdown, weighted sum
- [[Tier-2 Deterministic Recall]] — synonym expansion and Porter stemming passes
- [[Graph Walk Algorithm]] — BFS `walk()`, N≤2 hops, hop-decay scoring
- [[Porter Stemmer]] — pure TypeScript Porter 1980 suffix-stripping
- [[Synonym Lexicon]] — `_vocabulary.md`, union-find connected components, `synonymsOf()` API

## Verification and Integrity

- [[Provenance Checks]] — CHECK 5a (source presence) and CHECK 5b (derived/confidence)
- [[MOC Repair Primitives]] — `replaceYamlListField`, `syncChildren`, `buildIndexStub`
- [[Schema Version Gate]] — `SUPPORTED_SCHEMA_VERSIONS`, fail-closed on unknown schema

## Workflow Verbs

- [[Draft Review Surface]] — `_proposed/` gate: review, approve, reject under git checkpoint
- [[Degraded-Mode Routing]] — `decideRoute()` matrix: Bun, Claude, Ollama, offline policy

## Narrative Overview

- [[Wiki Engine]] — topic page orienting the full engine cluster
