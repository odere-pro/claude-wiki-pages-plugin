---
title: "Provenance Checks"
type: concept
aliases: ["Provenance Checks", "CHECK 5a", "CHECK 5b", "provenance-completeness", "provenance-consistency"]
parent: "[[Engine — Index]]"
path: "engine"
sources: ["[[provenance.ts Source]]", "[[verify.ts Source]]", "[[Engine API Skill (SKILL.md)]]"]
related: ["[[Schema Version Gate]]", "[[Deterministic Engine]]", "[[Lint Rules]]"]
contradicts: []
supersedes: []
depends_on: ["[[Schema Version Gate]]"]
tags: ["engine", "verify", "provenance", "integrity"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Provenance Checks

## Definition

Provenance Checks are two orthogonal integrity checks in `src/core/provenance.ts` that extend the `verify` command's check-set. They enforce the vault's sourcing discipline: every content page must be traceable to a raw source, and derived inferences must carry appropriately lower confidence.

## Key Principles

- **CHECK 5a — source-presence**: pages of type `entity`, `concept`, `topic`, `project`, or `synthesis` MUST have at least one entry in their `sources:` list. An empty array (or absent field) is an ERROR-severity `provenance-completeness` finding.
- **CHECK 5b — derived/confidence consistency**: a page with `derived: true` MUST have `confidence < 0.8`. Granting high confidence to LLM-inferred content would misrepresent its evidentiary weight. Any violation is a WARN-severity `provenance-consistency` finding.
- **Exempt types**: `source`, `index`, `manifest`, and `log` — these are bookkeeping or are the citations themselves.
- **Avoid-double-flag contract**: CHECK 5a fires only when `sources.length === 0`. A page with one malformed (non-wikilink) source entry already caught by CHECK 2 (sources-format) is NOT also flagged by CHECK 5a — presence is counted by array length, not format validity.
- **`derived` coercion**: accepts both boolean `true` and string `"true"` (YAML parsers may coerce differently).
- **Parity gate (gate-05)**: the counts from `checkProvenance()` must match the bash `scripts/verify-ingest.sh` CHECK 5 on `CLEAN_VAULT`, `DIRTY_VAULT`, and the reference vault `docs/vault-example/`.

## Examples

Error finding example:

```
severity: "error"
check: "provenance-completeness"
message: "no-sources: \"Concept Name\" (concept-name.md) has type \"concept\" but no sources entries"
```

Warning finding example:

```
severity: "warn"
check: "provenance-consistency"
message: "derived-high-confidence: \"Synthesis\" (synthesis.md) has derived: true but confidence 0.9 >= 0.8"
```

## Related Concepts

- [[Schema Version Gate]] — another check within the same verify pipeline
- [[Deterministic Engine]] — the engine command (`verify`) that runs these checks
- [[Lint Rules]] — the broader set of lint principles the curator enforces
