---
title: "ADR-0005 Git Required Per Vault Init"
type: concept
aliases: ["ADR-0005 Git Required Per Vault Init", "ADR-0005", "git required ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0005-git-required-per-vault-init]]"]
related: ["[[Operations Guide]]", "[[Hook System]]"]
tags: [adr, git, initialization]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0005: Git Required Per Vault Init

**Status:** Accepted | **Date:** 2026-06-04

## Problem

Decision #4 settled that git is required for every vault (every vault is its own git repo; `init` git-inits it; structural writes commit). But the *how* needed recording — specifically: the tension between git being a hard dependency and Bun being optional (bun-absent install is a supported degraded mode), plus the case where the vault sits inside another repo.

## Decision

One git contract with two availability tiers, wired into `scripts/scaffold-vault.sh`:

1. **Nesting guard first** — before any git-init, check if the vault is already inside a work tree (`git -C <vault> rev-parse --is-inside-work-tree`). If yes, skip. This protects the plugin repo and user project repos from a nested `.git`.

2. **Primary seam — reuse `ensureRepo` via the engine** — when Bun is present, run `engine.sh doctor --target <vault> --fix`, which routes through D05 to `ensureRepo`. One git seam; the shell does not re-implement it.

3. **Bun-absent availability shim** — when Bun is absent, fall back to a minimal `git init` + initial commit that reproduces `ensureRepo`'s end state exactly (same identity, same flags, same initial-commit message). Annotated as the bun-absent path only.

4. **Doctor parity** — bash `doctor.sh` gains a git check mirroring TS D05: git binary absent is fatal (hard dependency); vault-not-a-repo is advisory/NOTE.

The shim is an **availability shim, not a logic fork** — it changes who runs git (shell vs. engine) when Bun is missing, never what git contract is produced.

## Key Alternative Rejected

**Make git-init bun-required** — rejected because it demotes a hard non-negotiable (git required) to "best-effort when Bun happens to be installed." The hard requirement must not be gated on the soft one.
