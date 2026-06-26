---
title: "ADR-0029: Drop Vault Example"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-16
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0029: Drop Vault Example

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-16
- **URL:** —

## Summary

ADR-0029 removes `docs/vault-example/` from the repository and replaces its role as the golden test fixture with `tests/fixtures/reference-vault/`. The schema authority moves from `vault-example/CLAUDE.md` to `skills/init/template/CLAUDE.md`. Around 130 references to `vault-example` were triaged: load-bearing ones were fixed, documentary ones were left or noted.

## Key Claims

Status: Accepted. The `vault-example/` directory was a maintenance burden because every schema change required keeping it in sync. The `tests/fixtures/reference-vault/` is purpose-built as a test fixture and is maintained by the test harness. The schema authority (the shipped CLAUDE.md template) moved to `skills/init/template/CLAUDE.md`. The `golden-tree-sha` must be re-stamped after any change to reference-vault.

Covers: Drop Vault Example, Reference Vault, Schema Authority, skills/init/template
