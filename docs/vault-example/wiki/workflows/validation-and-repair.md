---
title: "Validation and Repair"
type: concept
aliases: ["Validation and Repair", "validation and repair", "lint", "repair"]
parent: "[[Workflows]]"
path: "workflows"
sources:
  - "[[Review, Validate, Fix]]"
  - "[[Check the Dashboard]]"
  - "[[Using claude-wiki-pages]]"
related:
  - "[[Hook-Enforced Guarantees]]"
  - "[[Ingest Pipeline]]"
  - "[[Dashboard Monitoring]]"
depends_on:
  - "[[claude-wiki-pages Plugin]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Validation and Repair

A three-level system for maintaining wiki integrity, progressing from a quick smoke test through a read-only audit to automated structural repair.

## Definition

Validation and repair addresses the reality that the ingest pipeline and hooks catch most errors at write time, but some structural issues — orphan pages, near-duplicate bodies, stale confidence values, index drift — only become visible after multiple ingest runs. The three levels are designed to be run in order: Level 1 first (fast), Level 2 when Level 1 passes (thorough), Level 3 when Level 2 finds errors (automated fix).

Level 1 is the `/claude-wiki-pages:status` command, which exercises every hook path and runs `verify-ingest.sh`. Level 2 is the `/claude-wiki-pages:lint` skill, which performs a read-only audit beyond what `verify-ingest.sh` checks. Level 3 is the `/claude-wiki-pages:claude-wiki-pages-curator-agent`, which applies automated fixes in phases and is gated by `subagent-lint-gate.sh` on completion.

## Key Principles

Status before lint — the one-command smoke test at Level 1 covers the most common structural failures in seconds. Only escalate to the full lint audit when Level 1 reports clean or when specific errors need deeper diagnosis.

Lint only reports — the Level 2 lint skill reads and reports; it does not write. The human reviews the report and decides which findings to address before running the repair agent.

The curator agent will not delete — the repair agent fixes broken links, mismatched indexes, missing aliases, and parent/path errors. It will not delete content, merge near-duplicate pages, create links to non-existent pages, or lower a confidence value. Those decisions are left to the human (Level 4 — manual review).

Cadence — run Level 1 after every pipeline run (it is already part of the pipeline gate); run Level 2 every 10 ingests or whenever warnings appear; run Level 3 when Level 2 finds errors or warnings.

## Examples

After a batch ingest, `/claude-wiki-pages:status` reports one red path: `verify-ingest.sh` found a source summary not cited by any wiki page. The fix is to find the relevant entity page and add the source to its `sources:` array.

After ten ingests, `/claude-wiki-pages:lint` reports two warnings: a concept page has `confidence: 0.8` with only one source (suspiciously confident), and one folder has grown to 14 direct children (flat-folder sprawl). The human drops confidence to 0.6, then runs the curator agent to restructure the oversized folder.

## Related Concepts

- [[Hook-Enforced Guarantees]] — the hook layer that catches errors before they reach the lint workflow.
- [[Ingest Pipeline]] — the workflow that validation and repair follows after.
- [[Dashboard Monitoring]] — the live view that surfaces the same findings as lint in Obsidian.
- [[Provenance-Tracked Wiki]] — the property that validation and repair keeps intact.
