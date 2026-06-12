---
title: "ADR-0012 Vault Merge Conflict Resolution"
type: concept
aliases: ["ADR-0012 Vault Merge Conflict Resolution", "ADR-0012", "vault merge ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0012-vault-merge-conflict-resolution]]"]
related: ["[[Multi-Vault Registry]]", "[[ADR-0009 Multi-Vault Confinement]]"]
tags: [adr, vault, merge]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0012: Vault Merge Conflict Resolution

**Status:** Accepted (design accepted; implementation deferred to Phase 3)

## Context

ADR-0009 shipped the `add`/`remove`/`switch` lifecycle and deliberately deferred `merge` as "the hard part." `merge` consolidates a second registered vault into the active vault. It is hard because content from two independently-grown vaults collides — same titles, same sources, divergent claims — and auto-merging blind would either silently lose data or fabricate a reconciliation no human approved.

## Decision (Design Only)

The reconciliation design maps every step onto mechanisms already in the shipped tree:

1. **Two-pass dedup** — match by `sources` (exact wikilink match) then by title. Pages with identical sources are merged; pages with colliding titles but different sources are flagged.
2. **`_proposed/` channel for collisions** — collision resolution routes through the one `_proposed/` review gate (`src/commands/propose/propose.ts`). The human resolves each collision.
3. **Per-vault firewall confinement** — source vault is read-only during merge; all writes go to the active vault.
4. **Git checkpointed throughout** — every merge step is a commit; revert is `git revert <commit>`.

The design is binding. A future implementation must satisfy all four constraints.

## What Is Not Yet Done

No code. `merge` is not in the lifecycle commands. The PM directed implementation deferred (not scheduled). Three preconditions for any future build:
1. The golden-set eval for merge conflicts must be defined.
2. The collision-review UX must be designed (the `_proposed/` gate UX for collisions is uncharted).
3. Gate-11 fixtures must extend to cover cross-vault read during merge.
