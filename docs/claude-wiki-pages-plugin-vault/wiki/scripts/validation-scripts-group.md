---
title: "Validation and Lint Scripts"
type: concept
aliases: ["Validation Scripts", "Lint Scripts", "scripts validation group"]
parent: "[[scripts|Scripts]]"
path: "scripts"
sources: ["[[scripts-validate-docs-sh|scripts/validate-docs.sh]]", "[[scripts-validate-frontmatter-sh|scripts/validate-frontmatter.sh]]", "[[scripts-check-duplicate-claims-sh|scripts/check-duplicate-claims.sh]]", "[[scripts-lint-structural-sh|scripts/lint-structural.sh]]", "[[scripts-enforce-dmi-sh|scripts/enforce-dmi.sh]]", "[[scripts-enforce-must-rule-sh|scripts/enforce-must-rule.sh]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["scripts", "validation", "lint", "ci"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 0.9
---

# Validation and Lint Scripts

The cluster of validation and linting scripts that enforce schema correctness, structural conformance, and authoring quality at hook time and in CI.

## Definition

The validation and lint scripts are thin wrappers over Bun engine lint verbs, collectively ensuring that every page written to the wiki meets the schema's structural and provenance requirements. They operate at two activation points: PreToolUse hooks (runtime enforcement) and CI gates (batch enforcement at commit time).

## Key Principles

The scripts group into three enforcement tiers:

- **Security gates (fail-closed):** `validate-frontmatter.sh` blocks wiki writes with missing required frontmatter fields. `enforce-dmi.sh` hard-blocks SKILL.md writes that introduce side-effecting verbs without the `disable-model-invocation` flag.
- **Advisory hooks (fail-open):** `enforce-must-rule.sh` warns when a CLAUDE.md edit introduces unenforced imperative rules. Never blocks.
- **CI/batch gates:** `validate-docs.sh` (glossary drift, Tier-0), `lint-structural.sh` (template-skeleton conformance), and `check-duplicate-claims.sh` (advisory duplicate detection) run in batch over the whole vault or project.

## Examples

In the pre-commit hook, `validate-docs.sh` catches glossary drift before it lands on the main branch. During ingest, the ingest agent calls `lint-structural.sh` after writing pages to verify every page matches its type's template skeleton. The fill-gaps command calls `check-duplicate-claims.sh` before promoting a proposed page.

## Related Concepts

The Bun engine's `lint` verb provides the implementation for all engine-delegated scripts. The verify-ingest.sh script provides the post-ingest structural check that is distinct from these lint scripts.
