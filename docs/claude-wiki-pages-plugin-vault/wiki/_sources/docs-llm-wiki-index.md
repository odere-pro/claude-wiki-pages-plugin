---
title: "LLM Wiki User Guide Index"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["docs", "user-guide"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# LLM Wiki User Guide Index

## Metadata

- File: `raw/repo/docs/llm-wiki/index.md`
- Type: user guide map

## Summary

Navigation map for the seven user guides under docs/llm-wiki/. Describes what claude-wiki-pages does (drops sources in raw/, runs one command, plugin maintains wiki/), the one command (/claude-wiki-pages:wiki), the seven-step path through the guides, and a slash-command reference table.

## Key Claims

claude-wiki-pages turns an Obsidian vault into a provenance-tracked wiki: drop sources in vault/raw/, run one command, plugin maintains vault/wiki/ (structured, cross-linked, cited). The seven guides cover: (1) install and verify; (2) create vault; (3) add sources and ingest; (4) validate and repair; (5) query the wiki; (6) check the dashboard; (7) produce outputs. Two invariants to keep in mind: vault/CLAUDE.md is the schema (wins over any documentation if they disagree); vault/raw/ is immutable (protect-raw.sh blocks writes). Key slash commands: /wiki (orchestrator entry, probes state), /doctor (health check), /init (scaffold vault), /status (quick status), /query (cited answer), /synthesize (cross-topic note). Power-user verbs (ingest, lint, fix, index, obsidian-graph-colors) documented in their domain guide.

Covers: User Guide Map, One Command Entry, Slash Commands Reference, Workflow Overview
