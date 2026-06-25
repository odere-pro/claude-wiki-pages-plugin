---
title: "tests/smoke/fresh-install.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["tests", "smoke"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

## Metadata

- File: `tests/smoke/fresh-install.sh`
- Role: Tier 2 smoke test — end-to-end clone → onboard → ingest → verify flow

## Summary

Runs in two modes depending on Claude Code CLI availability. Without the CLI it prints `[SKIP]` and exits 0 but still runs `verify-ingest.sh` against a prebuilt fixture (not a complete no-op). With the CLI present it would run the full onboarding wizard, drop a source into a scratch vault, ingest it, and verify the result. The CLI-driven steps are currently STUBbed pending Phase E wiring.

## Key Claims

Covers: Smoke Tests, End-to-End Testing Pattern
- Self-skip pattern: `command -v claude || exit 0` keeps CI green without the CLI.
- Even in skip mode the script does real work against the committed minimal-vault fixture.
- The STUB blocks are placeholders documenting what Phase E will wire: plugin install, init wizard, and ingest.
