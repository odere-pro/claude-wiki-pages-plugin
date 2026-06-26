---
title: "ADR-0034: Bun Required and Engine Lint Verb"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-18
date_ingested: 2026-06-25
tags: ["docs", "adr", "engine"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0034: Bun Required and Engine Lint Verb

## Metadata

- File: `raw/repo/docs/adr/ADR-0034-bun-required-and-lint-verb.md`
- Status: Proposed

## Summary

Two decisions sharing one root cause: (1) Bun is now a required, fail-closed dependency for security-relevant engine calls; (2) engine lint is introduced as the WARN-tier advisory twin of engine verify, riding the same Finding/Report model.

## Key Claims

Root cause: engine.sh bridge was fail-open — when Bun absent, prints warning and exit 0. Correct for advisory steps but wrong for security steps: a write-confinement check that no-ops is a fail-open security gate. Decision 1: Bun >= 1.2 is required; engine.sh gains a call classification — security-relevant calls (verify, firewall, lint gate, any check that gates a write or asserts integrity) emit teaching message and exit non-zero (BLOCK) when Bun absent; advisory calls (reminders, summaries, self-description) keep fail-open degradation. Decision 2: engine lint is a new WARN-tier verb (src/commands/lint/) whose findings are WARN-severity and never change the exit code — the engine twin of the Layer-2 lint skill, riding the shared Finding/Report model from ADR-0028. verify = ERROR-tier (gates writes), lint = WARN-tier (advises only). Both compose from one src/core/report.ts Report model.

Covers: Bun Required, Fail-Closed Engine Bridge, Engine Lint Verb, verify vs lint
