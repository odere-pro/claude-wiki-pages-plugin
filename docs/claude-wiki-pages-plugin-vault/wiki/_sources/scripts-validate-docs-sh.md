---
title: "scripts/validate-docs.sh"
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

# scripts/validate-docs.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/validate-docs.sh

## Summary

Glossary and design-drift CI Tier-0 gate. Thin wrapper over `engine lint --check docs`. The full bash implementation (checks 0-4 glossary/SEO/layer/slash and check 5 design-drift from ADR-0013) was migrated into the Bun engine. Run in CI, pre-commit hooks, and by doctor.sh.

## Key Claims

Fail-closed on missing Bun: this is a CI gate, so it exits 2 with an install-Bun message rather than silently passing. Positional first argument is the scan root (defaults to repo root). Exit 0 = clean, exit 1 = violations, exit 2 = setup error. Callers include gate-04, tests/run-tests.sh tier0, and .pre-commit-config.yaml.

Covers: Glossary Gate, Design Drift Detection, CI Tier-0 Gate, Docs Validation
