---
title: "Features"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["docs", "features"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Features

## Metadata

- File: `raw/repo/docs/features.md`
- Type: feature overview

## Summary

Comprehensive overview of what claude-wiki-pages provides: schema features, hook-enforced safety, DX, test harness (five tiers), scaffolding ablation measurements, and competitive comparison.

## Key Claims

Schema: typed pages with YAML frontmatter (six types), structural provenance via sources:, per-folder folder notes (schema v3), confidence discipline (>=0.8 requires two sources; 1.0 requires a direct quote), cross-topic synthesis notes. Hook-enforced safety: protect-raw.sh blocks source rewrites, validate-frontmatter.sh + check-wikilinks.sh on every write, SubagentStop completion gates, append-only log.md. Test harness five tiers: Tier 0 static (shellcheck, shfmt, markdownlint, lychee, gitleaks, glossary gate), Tier 1 Bats unit (~108 tests), Tier 2 smoke, Tier 3 release readiness, Tier 4 adversarial (weekly corpus replay). Scaffolding ablation: plugin arm vs baseline arm — plugin arm: schema_validity 1.00/1.00, claim_source_fidelity 1.00/1.00, dedup_correctness 1.00/1.00, PASS; baseline arm: all three 0.00/0.00, FAIL. Without plugin: zero auditable claims, no schema, no dedup. Competitor comparison: nobody in top 10 ships a security model; this plugin adds four-layer architecture with hook-enforced gates.

Covers: Schema Features, Hook-Enforced Safety, Test Harness, Scaffolding Ablation, Features
