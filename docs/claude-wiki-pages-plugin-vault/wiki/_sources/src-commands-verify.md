---
title: "src/commands/verify.ts — Vault Integrity Check"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "commands", "verify", "integrity"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/commands/verify.ts — Vault Integrity Check

## Metadata

- **Source**: `raw/repo/src/commands/verify.ts`
- **Type**: TypeScript implementation

## Summary

The read-only integrity check at the heart of the engine. Composes the ported CHECK 0–5 from `scripts/verify-ingest.sh` into one frozen `Report`. Same vault in, same findings out — no writes, no network, no ML. `doctor` D09 calls it, `heal` loops on it, and Layer 4 hooks shell out to its bash twin.

## Key Claims

- `VaultAggregate`: aggregate root encapsulating vault structure — `root`, `wiki`, `schemaFile`; factory method `fromRoot()` enforces existence check
- Composed checks: `checkSchema`, `checkIndex`, `checkSourcesFormat`, `checkIndexConsistency`, `checkOrphanSources`, `checkTopicFolders`, `checkLegacyIndexFilename`, `checkCitedSourceStaleness`, `checkProvenance`, `checkEntityType`, `checkDanglingWikilinks`, `checkCollisions`
- Concurrent execution: `runChecks()` via `checks-runner.ts`; findings sorted by (file, check, severity, message) for determinism regardless of completion order
- `--concurrency 1` triggers serial fallback for debuggability
- Missing vault directory short-circuits to single `error`-severity `vault` finding (never throws)
- `checkSchema`/`checkOrphanSources` also emit `info`-severity findings — informational skips, NOT counted; counting them would diverge from bash verifier
- Parity gate: `parity.test.ts` + gate-05 asserts byte-identical error/warning counts vs bash twin
- Bookkeeping pages (`index`, `log`, `_index`, `manifest`, `dashboard`) skipped by page-level checks
Covers: Verify Command, VaultAggregate, Check Composition, Parity Gate, Concurrency
