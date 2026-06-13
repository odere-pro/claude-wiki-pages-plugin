---
title: "Frontmatter Validation"
type: concept
aliases: ["Frontmatter Validation", "frontmatter validation", "validate-frontmatter.sh", "frontmatter checker"]
parent: "[[Wiki Pages]]"
path: "wiki-pages"
sources: ["[[ADR-0014: Single-Source Required Fields]]"]
related: ["[[Required Fields]]", "[[Schema Authority]]", "[[Lint Rules]]", "[[Design-Drift Gate]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "reference", "schema", "frontmatter", "validation"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Frontmatter Validation

> [!summary]
> Frontmatter validation is the process of checking that every wiki page's YAML frontmatter contains all [[Required Fields]] for its type and that field values conform to the schema's enum and format constraints. It is implemented in `scripts/validate-frontmatter.sh` using grep/awk only — no Bun required. The script reads the required-fields table from `vault/CLAUDE.md` at run time, making the table the single source of truth.

## Definition

Frontmatter validation covers two categories of checks:

1. **Required field presence** — every field listed in the `### Required fields by type` table in `vault/CLAUDE.md` must be present in the page's frontmatter.
2. **Enum value conformance** — fields with constrained value sets (`type`, `entity_type`, `status`, `source_type`, `synthesis_type`, etc.) must hold only allowed values from the schema.

`scripts/validate-frontmatter.sh` implements both checks. It:
- Parses the required-fields table from `CLAUDE.md` using grep/awk (Tier 0 — no Bun, no external tool)
- For each wiki page, reads the `type:` field and checks presence of all required fields for that type
- Checks that `status:` is one of `active | stale | superseded | draft`
- Checks that `source_type:` is one of the allowed enum values
- Emits `missing-field` findings for any absent required field
- Emits `invalid-value` findings for any enum violation

## Relationship to the Required-Fields Table

The key design decision (ADR-0014): the required-fields table in `CLAUDE.md` is the machine-readable authority. `validate-frontmatter.sh` reads this table at run time rather than hard-coding the field lists. This means:

- Adding a new required field to a type: edit the table in `CLAUDE.md`, and the script picks it up on the next run.
- No JSON schema to maintain separately.
- A human reading `CLAUDE.md` sees the same specification the validator enforces.

## Duplicate-Claim Detection

ADR-0014 also added duplicate-claim detection: if the same claim appears in two pages' body text with the same exact string (or whitespace-normalized equivalent), the validator emits a WARN finding. This catches accidental copy-paste where a claim should have been a wikilink to the source page instead. Fuzzy or semantic similarity is out of scope; only exact and whitespace-normalized matches are flagged.

## Integration with Verify

`validate-frontmatter.sh` is called by `scripts/verify-ingest.sh` as part of the full verification suite. The findings feed into the same `Finding` result model as all other verify checks, so the output is consistent across all verification modes.

## Related Concepts

- [[Required Fields]] — the per-type field requirements that frontmatter validation enforces
- [[Schema Authority]] — `vault/CLAUDE.md` as the single source of truth for the required-fields table
- [[Lint Rules]] — the broader set of checks; frontmatter validation is the structural subset
- [[Design-Drift Gate]] — a sibling check in `validate-docs.sh` that catches design document drift
