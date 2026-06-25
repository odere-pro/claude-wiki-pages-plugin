---
title: "LLM Wiki Guide 02 — Create a New Knowledge Base"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-01
date_ingested: 2026-06-25
tags: ["docs", "llm-wiki", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# LLM Wiki Guide 02 — Create a New Knowledge Base

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-01
- **URL:** —

## Summary

Guide 02 explains two options for creating a new vault: Option A (first-time scaffold or re-init via `/claude-wiki-pages:init`) and Option B (second vault in a different project using the same global plugin install). It documents what the wizard creates and how to customize the schema.

## Key Claims

Option A: run `/claude-wiki-pages:init` from the project directory. The wizard asks for vault name, domain, and paths; writes `vault/CLAUDE.md`, `_templates/`, `wiki/index.md`, `wiki/log.md`, `wiki/dashboard.md`. Does not overwrite without asking. Option B: plugin install is global; run `/claude-wiki-pages:init` from the second project. Both vaults are independent (different CLAUDE.md, raw/, wiki/ trees). CLAUDE.md is the authoritative schema — customize it (not the skills) to change behavior. Re-initializing with existing content prompts before overwriting.

Covers: Vault Scaffold, Init Wizard, Second Vault, CLAUDE.md Authority
