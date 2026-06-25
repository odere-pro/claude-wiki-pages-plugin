---
title: "tests/smoke/skill-schema.sh"
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

- File: `tests/smoke/skill-schema.sh`
- Role: Tier 2 smoke test — schema and skill behavior validation

## Summary

Copies the minimal-vault fixture into a temp vault and runs each Layer 2 skill (ingest, lint, fix, synthesize) against it, asserting every output file has well-formed YAML frontmatter and a `sources:` field holding `[]` or `[[wikilinks]]`. Assertions are pure shell plus `jq` — no Python dependency. Self-skips without the Claude Code CLI for the live skill path; the YAML/sources assertions run regardless.

## Key Claims

Covers: Smoke Tests, Frontmatter Schema Enforcement
- The YAML and sources assertions run even when the CLI is absent — the fixture is prebuilt.
- Tests that `sources:` is never a plain string (even after the skill runs) — guarding against schema regression.
- Pure shell + jq, no Python — intentionally avoids adding a language dependency.
