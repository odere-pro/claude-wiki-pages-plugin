---
title: "ADR-0015: Engine Self-Description Surfaces"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "engine", "capabilities"]
aliases: ["ADR-0015: Engine Self-Description Surfaces"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0015: Engine Self-Description Surfaces

## Summary

Establishes the `CAPABILITIES` table in `src/cli/cli.ts` as the single source of truth for the engine's verb surface. Two machine-readable endpoints: `capabilities --json` and `ontology --json`. These are projections of the same truth, not forks.

## Key Claims

- `CAPABILITIES` table in `cli.ts` is the authoritative list of all engine verbs.
- `capabilities --json` emits the table as JSON for agent consumption.
- `ontology --json` emits the ontology profile as JSON.
- Neither endpoint adds new facts — they project the existing authoritative tables.
- The engine is self-describing; an agent reading `capabilities --json` can discover all supported operations.

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- Engine Capabilities (`CAPABILITIES` table in `cli.ts`; projected as `capabilities --json`)
- Self-Description (engine exposes its own verb surface as machine-readable JSON at runtime)

## Grounded Pages

Wiki pages that cite this source:

- [[Deterministic Engine]] — capabilities --json, ontology --json endpoints
