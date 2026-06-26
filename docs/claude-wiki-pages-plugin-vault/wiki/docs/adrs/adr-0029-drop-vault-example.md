---
title: "ADR-0029: Drop Vault Example"
type: entity
entity_type: standard
aliases: ["ADR-0029", "adr-0029", "drop vault example ADR", "reference vault"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0029|ADR-0029: Drop Vault Example]]"]
related: []
tags: ["docs", "adrs", "architecture", "testing"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0029: Drop Vault Example

Removes `docs/vault-example/` and replaces it with `tests/fixtures/reference-vault/` as the golden test fixture, and moves the schema authority from `vault-example/CLAUDE.md` to `skills/init/template/CLAUDE.md`.

## Overview

ADR-0029 resolves the maintenance burden of keeping `vault-example/` in sync with every schema change. The replacement (`tests/fixtures/reference-vault/`) is purpose-built as a test fixture maintained by the test harness, and `skills/init/template/CLAUDE.md` is the shipped schema the plugin distributes to users.

## Key Facts

**Status:** Accepted

**What moved:**
- `docs/vault-example/` → deleted
- Schema authority: `vault-example/CLAUDE.md` → `skills/init/template/CLAUDE.md`
- Golden test fixture: `vault-example/` → `tests/fixtures/reference-vault/`

**Reference work:** ~130 references to `vault-example` were triaged: load-bearing references (scripts, CI, tests) were updated; documentary references were left or noted.

**Golden-tree SHA:** After any change to `tests/fixtures/reference-vault/`, the `golden-tree-sha` must be re-stamped. This is a known gotcha — failure to re-stamp causes a CI false failure.

**Consequences:**
- The schema that ships to users (`skills/init/template/CLAUDE.md`) and the test fixture are separate and independently maintained.
- `vault-example/` no longer needs updating on every schema change.
- The `init` skill copies `skills/init/template/` into a user's project as their vault scaffold.

## Related

The reference vault at `tests/fixtures/reference-vault/` is verified by `scripts/verify-ingest.sh`. The `init` skill uses `skills/init/template/` as its scaffold source.
