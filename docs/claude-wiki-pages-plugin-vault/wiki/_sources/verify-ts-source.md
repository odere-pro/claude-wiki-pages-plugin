---
title: "verify.ts Source"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["engine", "typescript", "verify", "integrity"]
aliases: ["verify.ts Source"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# verify.ts Source

## Summary

`src/commands/verify/verify.ts` composes the ported CHECK 0–4 from `scripts/verify-ingest.sh` into one `Report`. It checks schema version, index structure, sources format, MOC consistency, orphan sources, topic folders, legacy index filenames, cited-source staleness, provenance completeness, and entity type validity. The vault's own `CLAUDE.md` is passed as the schema authority for entity-type checks. All checks use the shared `buildReport()` envelope from `src/core/report.ts`.

## Key Claims

- Vault is resolved via four-tier `resolveVault()`; if not found, returns a single error finding.
- CHECK 0 (`checkSchema`) — validates `schema_version`; emits info if CLAUDE.md absent.
- CHECK 1 (`checkIndex`) — index-format and duplicate checks.
- CHECK 2 (`checkSourcesFormat`) — sources fields must use wikilink form.
- CHECK 3 (`checkIndexConsistency`, `checkOrphanSources`, `checkTopicFolders`, `checkLegacyIndexFilename`) — MOC structural integrity.
- CHECK 4 (`checkCitedSourceStaleness`) — staleness detection.
- CHECK 5 (`checkProvenance`) — source-presence + derived/confidence consistency.
- `checkEntityType` validates entity_type against the ontology-profile-v1 allow-list from the vault's CLAUDE.md.
- Parity gate (`gate-05`) asserts verify and verify-ingest.sh produce identical findings on shared fixtures.
