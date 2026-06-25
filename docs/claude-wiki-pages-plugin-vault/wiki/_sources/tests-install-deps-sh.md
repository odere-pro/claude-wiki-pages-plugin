---
title: "tests/install-deps.sh — Dependency Installer"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["tests", "tooling"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

## Metadata

- File: `tests/install-deps.sh`
- Role: Idempotent installer for all dev and test dependencies

## Summary

Detects the platform (macOS/brew or Linux/apt) and installs the native tools needed for all test tiers: jq, bats-core, parallel, shellcheck, shfmt, markdownlint-cli2, lychee, gitleaks. Also clones the three Bats assertion helpers (bats-support, bats-assert, bats-file) into `tests/test_helper/` via git. Supports `--check` (status only) and `--dry-run` modes.

## Key Claims

Covers: Test Tier Structure, Bats Test Framework
- The Bats assertion helpers are NOT checked into git — cloned by this script and CI.
- Idempotent: re-running skips already-installed tools.
- `--check` reports status without installing; `--dry-run` prints what would be installed.
