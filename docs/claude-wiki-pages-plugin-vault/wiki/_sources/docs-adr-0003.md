---
title: "ADR-0003: Polish Agent and Obsidian Side"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-05-05
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0003: Polish Agent and Obsidian Side

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-05-05
- **URL:** —

## Summary

ADR-0003 adds a dedicated polish agent (`claude-wiki-pages-polish-agent`) responsible for the Obsidian-side tail of every write: regenerating the vault MOC, applying graph color groups for new topic folders, and reconciling folder note children lists. The decision separates "content write" (ingest/curator) from "Obsidian presentation sync" (polish).

## Key Claims

Status: Accepted. The polish agent owns three idempotent steps: graph color application, vault MOC regeneration from folder notes, and folder note child-list reconciliation (append-only). It runs after the curator returns successfully. The agent is orchestrator-dispatched only; not user-invocable directly. Separation of concerns: ingest writes content, polish ensures Obsidian renders it correctly.

Covers: Polish Agent, Obsidian Graph Colors, MOC Regeneration, Folder Note Reconciliation
