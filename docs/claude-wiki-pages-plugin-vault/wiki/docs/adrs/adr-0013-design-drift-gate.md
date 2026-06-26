---
title: "ADR-0013: Design Drift Gate"
type: entity
entity_type: standard
aliases: ["ADR-0013", "adr-0013", "design drift gate ADR", "validate-docs Check 5"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0013|ADR-0013: Design Drift Gate]]"]
related: []
tags: ["docs", "adrs", "ci", "validate-docs"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0013: Design Drift Gate

Adds Check 5 to `validate-docs.sh` — a seven-sub-check design-drift gate that grounds path tokens, resolves links, verifies hook coverage, checks feature-relation counts, requires authority links, tests router parity, and grounds ontology predicates. Runs in CI Tier 0.

## Overview

ADR-0013 closes the gap between prose documentation and the actual codebase. Without a gate, a diagram or doc can refer to a file, hook, or feature that no longer exists. Check 5 makes "every node grounded" an enforced rule rather than a convention.

## Key Facts

**Status:** Accepted

**Seven sub-checks in Check 5:**
1. **5a — Node grounding:** every path-shaped token in a doc must point to a real file in the repo. The `[speculative]` marker exempts a doc.
2. **5b — Repo-relative link resolution:** links like `[text](../scripts/foo.sh)` must resolve.
3. **5c — Wired-hook coverage:** every hook listed in `hooks/hooks.json` must have a corresponding script.
4. **5d — Feature-relations count verification:** counts in `docs/design/06-feature-relations.md` (8 agents, 26 skills, 4 commands, ~50 scripts) must match the actual repo.
5. **5e — Authority link per doc:** every design doc must have an "Authority:" line pointing to the canonical source.
6. **5f — Router parity:** the orchestrator's dispatch table must match the listed agents.
7. **5g — Ontology predicate grounding:** predicates in ontology diagrams must appear in `ontology-profile-v1`.

**CI placement:** Runs in Tier 0 alongside gate-10 (markdownlint), gate-05 (verify parity), gate-11 (firewall parity).

**Consequences:**
- A `[speculative]` marker is the documented escape hatch for placeholder nodes.
- Renaming a script or agent now requires updating the docs (or the gate fails).
- Design docs stay provably consistent with the codebase.

## Related

The design drift gate runs as part of `validate-docs.sh`, which is also the vocabulary gate (term enforcement). ADR-0022 folder-notes doc is one of the docs whose link structure is checked.
