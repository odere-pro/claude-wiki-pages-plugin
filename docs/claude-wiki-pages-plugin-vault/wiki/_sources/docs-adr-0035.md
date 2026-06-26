---
title: "ADR-0035: Deterministic Obsidian Config and Ghost-Link Heal"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-22
date_ingested: 2026-06-25
tags: ["docs", "adr", "graph", "obsidian"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0035: Deterministic Obsidian Config and Ghost-Link Heal

## Metadata

- File: `raw/repo/docs/adr/ADR-0035-deterministic-obsidian-config-and-ghost-heal.md`
- Status: Proposed

## Summary

Adds two deterministic backstops for graph configuration and ghost-link repair: apply-obsidian-config (idempotent Bun script that writes graph.json and app.json with correct filters/userIgnoreFilters regardless of Obsidian's defaults) and heal-ghost-links (deterministic rewrite of ghost sources: citations from curator agent).

## Key Claims

Root cause of three symptoms in a real ingest: prose-driven, LLM-executed steps with no deterministic backstop and no end-of-run gate (self-reported "success" hid all three). Symptom 1: graph.json never landed — Obsidian writes defaults on first open, poll agent took "file exists → patch colorGroups only" branch, filters never survived; Symptom 2: 100+ ghost wikilinks survived — sources: citations written as Source: ADR 0006 — full title instead of piped basename; verify showed 0 dangling (title-aware resolver resolved them), Obsidian showed ghost nodes; Symptom 3: no tagging policy — tags were ad-hoc page-unique singletons. Decision 1: apply-obsidian-config Bun script + bash wrapper writes graph.json + app.json idempotently (always full structure, not patch-only) — runs in polish agent and curator; Decision 2: heal-ghost-links Bun script + bash wrapper rewrites ghost sources citations to piped basename form deterministically — runs in curator after every verify pass. apply-obsidian-config is the authoritative source for .obsidian/graph.json structure; the LLM prose is advisory only.

Covers: Deterministic Obsidian Config, Ghost-Link Heal, apply-obsidian-config, heal-ghost-links
