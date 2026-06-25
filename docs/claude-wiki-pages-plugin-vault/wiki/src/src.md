---
title: "Src"
type: index
aliases: ["src", "Source", "Engine Source", "TypeScript Engine"]
parent: "[[index|Wiki Index]]"
path: "src"
children:
  - "[[engine-cli|Engine CLI]]"
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
  - "[[config-loading|Config Loading]]"
child_indexes:
  - "[[core|Core Primitives]]"
  - "[[src-commands|Src Commands]]"
tags: ["src", "engine", "typescript", "architecture"]
created: 2026-06-25
updated: 2026-06-25
---

# Src

The `src/` directory is the deterministic Bun/TypeScript engine powering the claude-wiki-pages plugin. It indexes, links, verifies, and self-heals an Obsidian LLM-Wiki vault with zero network, zero embeddings, and no ML. Same vault in, same report out.

## Overview

The engine compiles to `dist/cli.js` via `bun build` and bash hooks shell out to it through `scripts/engine.sh`. It is dev-time only — NOT shipped to end-users and NOT loaded as plugin runtime context.

Entry point: `cli/cli.ts` — a router that parses argv, dispatches to a command handler, emits JSON or text, and returns an exit code.

## Subtrees

- [[core|Core Primitives]] — ~21 single-responsibility primitives: checks, builders, IO, parsing, concurrency lock, result model
- [[src-commands|Src Commands]] — 19 implemented engine verbs; one handler per subdir

## Key Modules

### CLI Layer

- [[engine-cli|Engine CLI]] — the argv router (`cli/cli.ts`), CAPABILITIES table, verb registry, `parseArgs`, `emit`

### Core Primitives

- [[report-model|Report Model]] — `Finding`, `Report`, `buildReport`, `renderText`, `exitCode` (functional value-objects, `Object.freeze`d)
- [[vault-resolution|Vault Resolution]] — four-tier resolution: env var → settings file → auto-detect → default
- [[firewall-module|Firewall Module]] — sole write-isolation authority; symlink-safe, cross-vault protection
- [[frontmatter-parser|Frontmatter Parser]] — YAML parsing with `yaml` lib; `splitFrontmatter`, `parseFrontmatter`, `stringList`
- [[graph-traversal|Graph Traversal]] — one deterministic N≤2 BFS over typed wikilinks (ontology-profile-v1 predicates)
- [[wikilink-extraction|Wikilink Extraction]] — `extractWikilinks`, markdown-link guard, fenced-block stripping
- [[link-resolver|Link Resolver]] — Obsidian-accurate four-tier resolution (path → basename → alias → title)
- [[spine-module|Spine Module]] — strict-tree spine derivation: orphans, multi-parent, cycles (ADR-0036)
- [[schema-check|Schema Check]] — schema_version gate; CHECK 0
- [[link-demote|Link Demote]] — one demote-not-delete core; backs strict-tree reducer
- [[tree-metric|Tree Metric]] — one strict-tree edge classifier: spine vs non-spine, cross-tree

### Commands

- [[verify-command|Verify Command]] — read-only integrity check composing CHECK 0–5
- [[search-command|Search Command]] — deterministic full-text + frontmatter search with scored channels
- [[heal-command|Heal Command]] — git-bounded verify→fix→re-verify loop
- [[snapshot-command|Snapshot Command]] — git checkpoints for LLM write phases
- [[hook-gate|Hook Gate]] — PreToolUse security gate dispatcher
- [[config-loading|Config Loading]] — four-layer config merge (defaults ← user ← project ← env)

## Shell ↔ TS Parity

Bash hooks are the hot path — decide and verify without spawning Bun on every tool call. The engine is the full implementation; two bash twins mirror latency-critical slices, pinned byte-for-byte by parity gates:

- `verify` ↔ `scripts/verify-ingest.sh` (gate-05)
- `core/firewall.ts` is the SOLE write-isolation authority; `scripts/firewall.sh` is a thin stdin→engine wrapper (gate-11)
