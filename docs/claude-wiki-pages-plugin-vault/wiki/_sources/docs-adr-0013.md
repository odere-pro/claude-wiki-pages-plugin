---
title: "ADR-0013: Design Drift Gate"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-09
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0013: Design Drift Gate

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-09
- **URL:** —

## Summary

ADR-0013 adds Check 5 to `validate-docs.sh`: a design-drift gate that grounds path-shaped tokens, resolves repo-relative links, enforces wired-hook coverage, verifies feature-relations counts, requires authority links per doc, checks router parity, and grounds ontology predicates. The gate runs in CI Tier 0.

## Key Claims

Status: Accepted. Check 5 has seven sub-checks: 5a (node grounding — path tokens must point to real files), 5b (repo-relative link resolution), 5c (wired-hook coverage — every hook in hooks.json has a script), 5d (feature-relations count verification), 5e (authority link per doc), 5f (router parity), 5g (ontology predicate grounding). The `[speculative]` marker exempts a doc from 5a. Runs alongside gate-10 (markdownlint), gate-05 (verify parity), gate-11 (firewall parity) in CI Tier 0.

Covers: Design Drift Gate, Validate-Docs Check 5, Node Grounding, CI Tier 0
