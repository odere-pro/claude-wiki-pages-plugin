---
title: "Knowledge Graph"
type: topic
aliases: ["Knowledge Graph", "knowledge-graph", "knowledge graph", "KG", "graph layer"]
parent: "[[Wiki Index]]"
path: "knowledge-graph"
summary: "The Knowledge Graph cluster documents the TypeScript parsing primitives that underpin the plugin's graph layer: the frontmatter parser that reads YAML front-matter from wiki pages, the wikilink extractor that finds and validates internal links, and the config schema that validates user and project configuration. These are the data-access primitives that verification, graph traversal, and schema enforcement all build on."
key_pages:
  - "[[Frontmatter Parser]]"
  - "[[Wikilink Extractor]]"
  - "[[Config Schema]]"
sources:
  - "[[Frontmatter Parser (frontmatter.ts)]]"
  - "[[Wikilink Extractor (wikilinks.ts)]]"
  - "[[Config Schema (config.schema.json)]]"
  - "[[Knowledge Graph Schema (CLAUDE.md)]]"
related:
  - "[[Deterministic Engine]]"
  - "[[Provenance Checks]]"
  - "[[Schema Version Gate]]"
  - "[[Graph Walk Algorithm]]"
  - "[[Schema Authority]]"
  - "[[Auto-Heal]]"
  - "[[Firewall]]"
contradicts: []
supersedes: []
depends_on:
  - "[[Schema Authority]]"
source_quotes: []
derived: false
tags: ["knowledge-graph", "typescript", "parsing", "implementation"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Knowledge Graph

> [!summary]
> The Knowledge Graph cluster covers the three TypeScript modules that form the data-access foundation of the engine: [[Frontmatter Parser]] (`frontmatter.ts`), [[Wikilink Extractor]] (`wikilinks.ts`), and [[Config Schema]] (`config.schema.json`). Every higher-level engine operation — verification, search scoring, graph traversal, MOC repair, schema gating — reads through these primitives. Their key property is **fail-safe parsing**: a malformed file is treated as absent, not as an error that halts the engine.

## Overview

The knowledge graph layer sits at the bottom of the engine stack. It is responsible for one task: turning raw markdown file content into typed data that the engine can reason over. It does not perform any verification or transformation; it only parses.

Three modules form the layer:

1. **`frontmatter.ts`** — reads the leading `--- … ---` YAML block and exposes it as a `Record<string, unknown>`. Uses the `yaml` library for correctness; provides helper functions for common field types.
2. **`wikilinks.ts`** — scans the body (after the frontmatter block) for `[[Target]]` patterns, deduplicates them, and flags markdown-style links as violations.
3. **`config.schema.json`** — the JSON Schema that validates the user's `claude-wiki-pages.json` configuration file before any engine verb runs.

The two parsers have a hard parity requirement with their bash counterparts (`verify-ingest.sh`). Any divergence between the TypeScript and bash behavior on well-formed vault fixtures is a bug. A gate test enforces this parity.

## Key Pages

### Parsing Primitives

[[Frontmatter Parser]] documents the five exported functions from `frontmatter.ts`: `splitFrontmatter` (separate YAML block from body), `parseFrontmatter` (get all fields as a typed object), `titleOf` (page title with filename-stem fallback), `stringList` (normalize inline or block YAML arrays to `string[]`), and `stripWikilink` (unwrap `"[[Target]]"` syntax). The parser returns `{}` on malformed frontmatter — never throws. Unterminated frontmatter (opening `---` with no closing `---`) treats the entire file as body.

[[Wikilink Extractor]] documents `extractWikilinks` (scan body for `[[Target]]` patterns), `duplicates` (find repeated wikilinks), and `markdownLinkViolation` (detect raw markdown-path links that should be converted to `[[wikilinks]]`). The extractor imports `splitFrontmatter` to isolate the body before scanning — frontmatter wikilinks are intentional field values, not body prose links.

### Configuration

[[Config Schema]] documents the JSON Schema for `claude-wiki-pages.json`. The config has five top-level groups: `autoHeal` (enabled, interval, maxPerRun), `gitCheckpoint` (mode: auto/manual/off), `firewall` (enabled, mode, allowPaths, denyPaths), `localModel` (provider, model, endpoint, timeout, maxRetries), and `maintenance` (enabled, maxPerRun, maxParallelExtract). All groups are optional — a missing key falls back to the engine's built-in defaults.

## Open Questions

- `stringList` handles the two YAML array forms used in practice (`["a","b"]` and block scalar). Should it also handle bare strings (no quotes) that some editors produce?
- The config schema is validated by `engine.sh` at startup. Should validation errors produce machine-readable JSON output (like other engine verbs) for easier programmatic handling?
