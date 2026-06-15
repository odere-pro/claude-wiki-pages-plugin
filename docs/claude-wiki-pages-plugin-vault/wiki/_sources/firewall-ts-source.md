---
title: "firewall.ts Source"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["engine", "typescript", "firewall", "security"]
aliases: ["firewall.ts Source"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# firewall.ts Source

## Summary

`src/core/firewall.ts` is the TypeScript authority for "may an agent write here?" It defines `FirewallPolicy`, `FirewallDecision`, `globToRegExp()`, and `decide()`. Symlink safety is handled by `physicalPath()` which dereferences symlinks (including dangling leafs and symlinked ancestors) before any boundary check. The bash hook `scripts/firewall.sh` mirrors this implementation exactly; `tests/gates/gate-11-firewall-parity.sh` pins the two twins together.

## Key Claims

- `FirewallMode` is `"enforce" | "warn" | "off"`.
- `globToRegExp()` is the ONE glob dialect used in both firewall.ts and backlog's wired-source filter — `*` becomes `[^/]*`, `**` becomes `.*`.
- `physicalPath()` dereferences symlinks (including dangling) so a symlink inside the active vault cannot smuggle a write out.
- Rule precedence: deny > cross-vault > vault (allow) > allowPaths > outside-vault.
- The `cross-vault` rule sits before `allowPaths` so allowPaths cannot accidentally permit sibling-vault writes.
- `mode: warn` allows the write but matches the rule; `mode: off` is a pass-through.
- `isUnder()` uses physicalPath() on both sides before comparison.
