---
title: "tests/gates/gate-05-verify-parity.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["tests", "gates"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

## Metadata

- File: `tests/gates/gate-05-verify-parity.sh`
- Role: CI engine gate — Bun engine `verify` parity + golden-snapshot anti-drift check

## Summary

Two-row gate. Row 1: compares error/warning counts between `verify-ingest.sh` (bash) and `engine verify` (Bun) on the reference vault — the parity invariant that keeps the TypeScript port honest. Row 2: golden-snapshot check pins the engine's verify counts on both fixtures (reference-vault and minimal-vault) to `0,0` — any new engine check that moves a verdict turns this gate red.

## Key Claims

Covers: Engine-Bash Parity, CI Gates, Vault Structural Verification
- The golden `0,0` for both fixtures means both vaults are maintained clean — any regression is caught immediately.
- Row 1 was previously bash==engine; since the validate-frontmatter CLI became a thin wrapper, Row 2 is now the anti-drift mechanism.
- Update the golden values deliberately, in the same commit as the check change.
