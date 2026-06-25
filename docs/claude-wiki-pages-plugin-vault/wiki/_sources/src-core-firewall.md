---
title: "src/core/firewall.ts — Write Isolation Authority"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "core", "firewall", "security"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/core/firewall.ts — Write Isolation Authority

## Metadata

- **Source**: `raw/repo/src/core/firewall.ts`
- **Type**: TypeScript implementation

## Summary

The sole decision authority for "may an agent write here?". Since firewall-twin-retire the bash hook is a thin stdin→engine wrapper — this is the only implementation. Writes are confined to the resolved vault, plus `firewall.allowPaths` roots, minus `firewall.denyPaths` globs (which win even inside an allowed root).

## Key Claims

- `decide(filePath, policy)`: the decision function — allowed/blocked with matched rule
- Decision precedence: `deny` rules win everywhere, then cross-vault, then vault-allowed, then allowPaths, then outside-vault blocks
- `FirewallMode`: `"enforce" | "warn" | "off"` — `warn` never blocks, `off` is pass-through
- `FirewallPolicy`: `enabled`, `mode`, `vault` (always implicitly allowed), `allowPaths`, `denyPaths`, `otherVaults`
- `globToRegExp()`: the ONE glob dialect — `*` within segment, `**` across segments — exported and reused by backlog's wired-source filter; no second dialect
- Symlink safety (S3/F1): target and every boundary root reduced to physical paths before checks; a symlink inside the vault pointing at a sibling cannot smuggle writes out
- `physicalPath()`: dereferences symlinks including dangling leaf, bounded by `SYMLINK_LOOP_MAX` (40, Linux MAXSYMLINKS)
- `otherVaults`: writes to sibling registered vaults blocked as "cross-vault" — cannot be overridden by `allowPaths`
- Anti-drift: gate-11 checks this engine against a GOLDEN verdict table (not a bash twin)
Covers: Firewall Decision, Write Isolation, Glob Dialect, Symlink Safety, Cross-Vault Protection
