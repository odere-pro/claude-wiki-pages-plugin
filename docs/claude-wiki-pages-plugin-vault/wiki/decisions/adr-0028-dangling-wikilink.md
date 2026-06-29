---
title: "ADR-0028: Dangling Wikilink Verify Check"
type: entity
entity_type: standard
aliases: ["ADR-0028", "adr-0028", "dangling wikilink ADR", "wikilink verify check"]
parent: "[[decisions|Decisions]]"
path: "decisions"
sources: ["[[docs-adr-0028|ADR-0028: Dangling Wikilink Verify Check]]"]
related: []
tags: ["docs", "adrs", "validation", "wikilinks"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0028: Dangling Wikilink Verify Check

Adds a WARN-level dangling-wikilink check to `verify-ingest.sh`: a link `[[T]]` is resolvable iff its normalized target is a member of `{ filename stem } ∪ { title: } ∪ { aliases: }` over all wiki pages, case-insensitively.

## Overview

ADR-0028 gives the verify step a concrete definition of "resolvable" and a systematic way to detect broken links at validation time. The bash twin in `scripts/check-wikilinks.sh` must stay in parity with the TypeScript engine implementation (gate-05 enforces this).

## Key Facts

**Status:** Accepted

**Resolvable set:** For each page in the vault, collect: the filename stem, the `title:` frontmatter value, all `aliases:` values. A link `[[T]]` is resolvable iff `normalize(T)` is in that set (case-insensitive, normalized to lowercase).

**Check level:** WARN (not ERROR) — a dangling link is a quality issue, not a schema violation. The write is not blocked; the doctor reports the finding.

**Bash-TS parity:** `scripts/check-wikilinks.sh` (bash) and the engine's TypeScript check must produce identical results. `tests/gates/gate-05-verify-parity.sh` enforces this in CI.

**Limitation (addressed by ADR-0030):** The flat resolvable set cannot answer "which page does Obsidian open?" — it has no priority. ADR-0030 tightens the resolution model to match Obsidian's actual priority order.

**Consequences:**
- Every ingest produces a dangling-wikilink count in the doctor report.
- The bash twin ensures shell-only environments (no Bun) produce the same results.
- The WARN level prevents false-positive build failures during active refactors.

## Related

ADR-0030 adds Obsidian-accurate resolution priority (basename > alias) and the `wikilink-collision` WARN. ADR-0027 uses the dangling-wikilink count as the primary graph-quality metric.
