---
title: "Verify Command"
type: concept
aliases: ["verify-command", "vault verify", "verify verb"]
parent: "[[src-commands|Src Commands]]"
path: "src/commands"
sources: ["[[src-commands-verify|src/commands/verify.ts — Vault Integrity Check]]"]
related: []
tags: ["src", "commands", "verify", "integrity"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Verify Command

The read-only integrity check at the heart of the engine. Composes CHECK 0–5 from `scripts/verify-ingest.sh` into one frozen `Report`. Same vault in, same findings out — no writes, no network, no ML.

## Definition

`commands/verify/verify.ts` resolves the vault, walks `wiki/`, and runs all check functions concurrently, sorting findings deterministically before assembling the final `Report`.

## Key Principles

**`VaultAggregate` pattern**: an aggregate root encapsulating vault structure — `root`, `wiki`, `schemaFile`. The factory `fromRoot()` enforces the existence precondition: a VaultAggregate cannot be constructed for a missing vault. Returns a `Finding` (not throwing) when the vault is absent.

**Composed checks (concurrent by default)**:
- CHECK 0: `checkSchema` — schema_version gate
- CHECK 1: `checkIndex` — index duplicates, pages missing from index
- CHECK 2: `checkSourcesFormat` — `sources:` wikilink format
- CHECK 3: `checkIndexConsistency` — index consistency, orphan sources, topic folders, legacy index filenames
- CHECK 4: `checkCitedSourceStaleness` — cited-source staleness
- CHECK 5: `checkProvenance` — wikilink/citation provenance
- Plus: `checkEntityType`, `checkDanglingWikilinks`, `checkCollisions`

**Concurrency**: checks run via `runChecks()` from `core/checks-runner.ts`. Findings sorted by `(file, check, severity, message)` before `buildReport` — completion order never affects output (parity-safe).

**`--concurrency 1`**: serial fallback for debuggability.

**`info`-severity findings**: `checkSchema` (no CLAUDE.md) and `checkOrphanSources` (no `_sources/`) emit `info` — NOT counted; mirrors bash yellow lines.

**Parity gate**: `parity.test.ts` + gate-05 assert byte-identical error/warning counts vs the bash twin.

## Examples

- `claude-wiki-pages verify --target /my/vault` → text report
- `claude-wiki-pages verify --json` → `Report` JSON for agent consumption
- Missing vault → single `error` severity `vault` finding, exit 1

## Related Concepts

- `doctor` D09 calls `verify` to assess vault health
- `heal` loops on `verify` until `errors === 0`
- Layer 4 hooks shell out to the bash twin `scripts/verify-ingest.sh` (hot path)
