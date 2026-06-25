---
title: "ADR-0012: Vault Merge Conflict Resolution"
type: entity
entity_type: standard
aliases: ["ADR-0012", "adr-0012", "merge conflict ADR"]
parent: "[[decisions|Decisions]]"
path: "decisions"
sources: ["[[docs-adr-0012|ADR-0012: Vault Merge Conflict Resolution]]"]
related: []
tags: ["docs", "adrs", "git", "curator"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0012: Vault Merge Conflict Resolution

Defines the deterministic merge strategy for git conflicts in the vault: prefer the higher `update_count` for frontmatter, preserve both sides under a `## Conflict` heading for body text, and treat `raw/` conflicts as fatal errors.

## Overview

ADR-0012 makes vault merge conflicts resolvable without human judgment for most cases. The deterministic rule (higher `update_count` wins on frontmatter) covers the common case of two agents updating the same page independently. Body conflicts require human review; raw conflicts are always fatal.

## Key Facts

**Status:** Accepted

**Merge strategy by area:**
- **Frontmatter:** The side with the higher `update_count` wins. Ties are broken by the more recent `updated` date.
- **Body text:** Both sides are appended under a `## Conflict` heading for human resolution.
- **`raw/` files:** Any merge conflict in `raw/` is a fatal error — raw files are immutable and must not be merged. The user must resolve manually.

**Detection:** The curator's `engine.sh heal` step checks for conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) and flags any found.

**Minimization:** The vault's git checkpoint model (one commit per bounded operation) keeps conflicts rare — each write lands as a small, focused commit.

**Consequences:**
- Most frontmatter conflicts are resolved automatically.
- The `update_count` field becomes a meaningful tie-breaker.
- Raw conflicts surface immediately as fatal errors, preserving the immutability invariant.

## Related

ADR-0005 (git required) is the foundation. The curator agent runs the conflict detection during its `engine.sh heal` phase.
