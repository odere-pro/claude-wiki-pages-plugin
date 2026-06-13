---
title: "Engine — Index"
type: index
aliases: ["Engine — Index", "engine", "Engine", "engine implementation"]
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
child_indexes: []
tags: ["engine", "implementation"]
created: 2026-06-13
updated: 2026-06-13
---

# Engine — Index

Implementation-level knowledge about the `claude-wiki-pages` deterministic engine: the Bun CLI, its TypeScript command modules, bash bridge, and core library functions. These pages cover the _how_ of the engine — source-level contracts, algorithms, and data structures — complementing the design-level pages in `[[Architecture]]`.

## Pages

### Shell Bridge
- [[engine.sh]] — bash-to-Bun bridge; graceful degradation when Bun absent
- [[Scripts Layer]] — Layer 4 shell anatomy; hook wiring; sourceable vs executable files

### CLI Entry Point
- [[cli.ts]] — TypeScript CLI router; CAPABILITIES table; arg parsing; dispatch
- [[Engine CLI Router]] — how the CLI dispatches commands; ParsedArgs; emit(); usage()
- [[Engine Verb Surface]] — CAPABILITIES as single source of truth; implemented vs planned verbs

### Search and Retrieval
- [[Search Scoring Algorithm]] — scoring channels, weights, MatchComponent breakdown
- [[Tier-2 Deterministic Recall]] — synonym expansion + Porter stemming layered into search
- [[Graph Walk Algorithm]] — BFS walk() over typed wikilinks; hop-decayed scoring; determinism contract
- [[Porter Stemmer]] — pure Porter 1980 suffix-stripping; stem() steps; stemTokens()
- [[Synonym Lexicon]] — _vocabulary.md; union-find connected components; loadLexicon(); synonymsOf()

### Verification and Integrity
- [[Provenance Checks]] — CHECK 5a source-presence; CHECK 5b derived/confidence consistency
- [[MOC Repair Primitives]] — replaceYamlListField; syncChildren; buildIndexStub; idempotent
- [[Schema Version Gate]] — SUPPORTED_SCHEMA_VERSIONS; declaredSchemaVersion()

### Workflow Verbs
- [[Draft Review Surface]] — _proposed/ gate; review/approve/reject; git-bounded promotion
- [[Degraded-Mode Routing]] — decideRoute() pure matrix; offlinePolicy routing logic

## Subtopics

_No sub-folders; all engine pages are siblings in this folder._
