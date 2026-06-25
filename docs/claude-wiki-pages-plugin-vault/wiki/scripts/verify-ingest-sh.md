---
title: "verify-ingest.sh"
type: entity
entity_type: tool
aliases: ["verify-ingest.sh", "Post-Ingest Verifier"]
parent: "[[scripts|Scripts]]"
path: "scripts"
sources: ["[[scripts-verify-ingest-sh|scripts/verify-ingest.sh]]"]
related: []
tags: ["scripts", "verification", "ingest", "parity"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# verify-ingest.sh

Post-ingest verification script that checks wikilink format, index consistency, orphan sources, and schema compliance.

## Overview

`scripts/verify-ingest.sh` is the bash twin of the Bun engine's `verify` command. It checks that every wiki page meets structural and provenance requirements after an ingest operation. Parity between the bash and engine implementations is enforced by gate-05 in CI.

## Key Facts

- Checks: duplicate index entries, wikilink format in `sources:` fields (must be `[[basename|Display]]` form, not bare strings), index consistency, derived-page confidence ceiling, and schema version support.
- Handles three YAML list shapes: inline flow, multi-line flow, and block dash lists.
- `DERIVED_CONFIDENCE_CEILING = 0.8`: a `derived: true` page with confidence ≥ 0.8 is a lint finding.
- Shared helpers: `_extract_yaml_list` (YAML list extraction from stdin), `_fm_title` (frontmatter title extractor from file).
- Exit 0 = all clean, exit 1 = issues found.
- Used by the ingest agent's Step 2 lint-fix pass and by CI Tier 1.

## Related

The Bun twin is invoked via `engine.sh verify`. gate-05 (`tests/scripts/verify-parity.bats`) verifies byte-identical output between both implementations.
