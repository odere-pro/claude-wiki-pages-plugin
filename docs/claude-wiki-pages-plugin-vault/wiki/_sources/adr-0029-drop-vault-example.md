---
title: "ADR-0029: Drop docs/vault-example"
type: source
source_type: manual
source_format: text
date_published: 2026-06-14
date_ingested: 2026-06-15
tags: ["adr", "vault-example", "schema-authority", "golden-tests", "reference-vault"]
aliases: ["ADR-0029: Drop docs/vault-example", "ADR-0029"]
sources: []
created: 2026-06-15
updated: 2026-06-15
status: active
confidence: 1.0
---

# ADR-0029: Drop docs/vault-example

## Summary

Deletes `docs/vault-example/` entirely. Consolidates schema authority to `skills/init/template/CLAUDE.md` (already the runtime fallback). Moves golden/parity/lint tests to a new dedicated fixture `tests/fixtures/reference-vault/` — small, schema-v3, deliberately clean. Its `CLAUDE.md` is pinned to `skills/init/template/CLAUDE.md` by `ontology-profile.bats`.

## Key Claims

- `vault-example/CLAUDE.md` and `_templates/` were byte-identical duplicates of the shipped template, kept in sync only by a parity gate — pure duplication.
- Runtime scaffold: `/claude-wiki-pages:init` copies `skills/init/template/`, NOT vault-example. vault-example never served this job at runtime.
- Schema authority now has one home: `skills/init/template/CLAUDE.md`. `validate-frontmatter.sh`, `validate-docs.sh` (5g predicate extraction), and the eval harness all read the template directly.
- Golden/parity/lint tests target `tests/fixtures/reference-vault/` — a small, stable vault that exercises every `verify` CHECK, all three opt-in lints, and the dangling-wikilink check at zero warnings.
- The `maintenance-run` safety guard (don't run scheduled upkeep against the dev reference vault) now protects `tests/fixtures/reference-vault`.
- Historical ADRs and dogfood vault content still mention vault-example as a record of how things were — that is documentary, not load-bearing, and is left untouched.
