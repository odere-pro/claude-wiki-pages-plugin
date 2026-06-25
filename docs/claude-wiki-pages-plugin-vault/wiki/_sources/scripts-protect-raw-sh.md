---
title: "scripts/protect-raw.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["scripts", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# scripts/protect-raw.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/protect-raw.sh

## Summary

PreToolUse hook that blocks edits to existing files in the vault's raw/ directory, enforcing source immutability. Allows Write to new files (adding sources) but blocks Edit to existing files. After Phase 3 migration the decision authority moved to the Bun engine (`src/core/protect-raw-check.ts`). This script is a thin stdin-to-engine wrapper.

## Key Claims

Fail-closed security gate: when Bun is absent, any write to a path under vault/raw/ is blocked with an install-Bun reason. Scope is limited to raw/ so a missing Bun does not block unrelated edits. Canonicalises directory paths to resist traversal/symlink evasion. Sanctioned agent-session carve-out for raw/agent-sessions/ is implemented in the engine module.

Covers: Raw Immutability, Source Protection, Fail-Closed Security
