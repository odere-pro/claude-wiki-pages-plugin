---
title: "ADR-0014: Single-Source Required Fields and Duplicate-Claim Warning"
type: entity
entity_type: standard
aliases: ["ADR-0014", "adr-0014", "single source required fields ADR", "duplicate claim warning"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0014|ADR-0014: Single-Source Required Fields and Duplicate-Claim Warning]]"]
related: []
tags: ["docs", "adrs", "schema", "validation"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0014: Single-Source Required Fields and Duplicate-Claim Warning

Makes the required-fields table in `vault/CLAUDE.md` the single truth for frontmatter validation (parseable by grep/awk, no Bun needed), and adds a post-ingest duplicate-claim warning that flags potential merge candidates.

## Overview

ADR-0014 solves two related problems: the risk of the required-field list drifting between CLAUDE.md and the validator script, and the risk of the same claim being stated on two different pages from the same source (which signals a missing merge). Both are addressed without adding a Bun dependency to the validation path.

## Key Facts

**Status:** Accepted

**Single-source required fields:**
- The `### Required fields by type` table in `vault/CLAUDE.md` is the authoritative contract.
- `validate-frontmatter.sh` parses that table by grep/awk only (no Bun dependency).
- Changing a required field means editing only that table.

**Duplicate-claim warning:**
- `check-duplicate-claims.sh` runs post-ingest.
- It produces a WARN (not a block) when two wiki pages cite the same exact claim from the same source.
- A duplicate-claim WARN is a signal to merge the two pages into one.

**Consequences:**
- A single table is the contract; no drift between the table and the enforcer.
- The bash-only parser path (`grep/awk`) keeps the validation path dependency-free.
- Duplicate-claim WARNs accumulate over ingests as a quality signal, not a hard failure.

## Related

The required-fields table lives in `vault/CLAUDE.md` (schema authority). `validate-frontmatter.sh` is wired as the second hook in the PreToolUse chain (after firewall, before check-wikilinks).
