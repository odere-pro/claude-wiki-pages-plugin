---
title: "Core Primitives"
type: index
aliases: ["core", "Engine Core", "Core Modules"]
parent: "[[src|Src]]"
path: "src/core"
children:
  - "[[report-model|Report Model]]"
  - "[[vault-resolution|Vault Resolution]]"
  - "[[firewall-module|Firewall Module]]"
  - "[[frontmatter-parser|Frontmatter Parser]]"
  - "[[graph-traversal|Graph Traversal]]"
  - "[[wikilink-extraction|Wikilink Extraction]]"
  - "[[link-resolver|Link Resolver]]"
  - "[[spine-module|Spine Module]]"
  - "[[schema-check|Schema Check]]"
  - "[[link-demote|Link Demote]]"
  - "[[tree-metric|Tree Metric]]"
child_indexes: []
tags: ["src", "core", "primitives"]
created: 2026-06-25
updated: 2026-06-25
---

# Core Primitives

The ~21 single-responsibility primitives the command handlers compose. Each is small, pure where it can be, and deterministic: sorted output, no network, no embeddings, no hidden state.

## Dependency Rule

Commands depend on `core`; `core` depends only on Node built-ins (`node:fs`, `node:path`, `node:crypto`, `node:child_process`) plus the `yaml` library. Core never imports from `commands/` or `cli/`.

## Result Model

- [[report-model|Report Model]] — canonical output schema: `Finding`, `Report`, `buildReport`, `renderText`, `exitCode`. Functional value-objects (not OO), `Object.freeze`d.

## Verify Checks

- [[schema-check|Schema Check]] — CHECK 0: schema_version gate
- `index-check.ts` — CHECK 1–2: index duplicates, sources format
- `moc.ts` — CHECK 3/3b: index consistency, orphan sources, topic folders
- `staleness.ts` — CHECK 4: cited-source staleness
- `provenance.ts` — CHECK 5a/5b: wikilink provenance

## Builders

- `moc-build.ts` — idempotent MOC repairs: dedupe index links, sync `children`, build stubs

## IO

- `fs.ts` — sorted, deterministic listing helpers
- `git.ts` — checkpoint/heal-commit safety net; every call bounded by `GIT_TIMEOUT_MS` (30 s)
- `log.ts` — append-only `wiki/log.md` writer

## Concurrency

- `vault-lock.ts` — in-process, per-vault mutex (`withVaultLock`/`withVaultLockSync`) serializing snapshot/propose/migrate/heal critical sections

## Parsing

- [[frontmatter-parser|Frontmatter Parser]] — YAML-lib frontmatter parsing
- [[wikilink-extraction|Wikilink Extraction]] — extract `[[Target]]`, markdown-link guard
- `manifest.ts` — schema-v2 source manifest
- `ontology-profile.ts` — parse ontology-profile-v1 predicate/enum tables

## Link Resolution and Graph

- [[link-resolver|Link Resolver]] — Obsidian-accurate four-tier resolution (ADR-0030)
- [[graph-traversal|Graph Traversal]] — ONE deterministic N≤2 BFS (ADR-0008)
- [[spine-module|Spine Module]] — strict-tree spine derivation (ADR-0036)
- [[link-demote|Link Demote]] — ONE demote-not-delete core (ADR-0036)
- [[tree-metric|Tree Metric]] — ONE strict-tree edge classifier (ADR-0036)

## Vault Resolution

- [[vault-resolution|Vault Resolution]] — four-tier vault resolution; parity twin of `scripts/resolve-vault.sh`

## Security

- [[firewall-module|Firewall Module]] — SOLE write-isolation authority (no second implementation)

## Search Support

- `vocabulary.ts` — curated `_vocabulary.md` synonym lexicon
- `stem.ts` — pure Porter 1980 stemmer

## Parity Mirrors

- `firewall.ts` — sole write-isolation decision authority (bash hook is thin stdin→engine wrapper)
- `vault.ts` ↔ `scripts/resolve-vault.sh` — four-tier vault resolution
