---
title: "ADR-0032: Piped and Path-Qualified Wikilinks"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-17
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0032: Piped and Path-Qualified Wikilinks

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-17
- **URL:** —

## Summary

ADR-0032 formalizes the piped-basename wikilink convention (`Display Text`) as the normative link form, and defines when path-qualification is required: only when a basename occurs in 2+ files anywhere in the vault. Path-qualified links use the target's actual wiki-relative path (verified to exist); guessing the folder produces dangling links.

## Key Claims

Status: Accepted. Default link form: `Display Text`. Path-qualify only on a genuine vault-wide collision (basename in 2+ files). When path-qualifying, use the target's actual wiki-relative path (e.g., `ADR-0001: X`) — never a guessed folder. Over-qualifying a unique basename with a wrong folder creates a dangling link. The `heal-ghost-links.sh` script rewrites bare `Title` links that slipped through. The `migrate-piped-links.ts` script rewrites the entire vault to the piped-basename convention.

Covers: Piped Wikilinks, Path-Qualified Wikilinks, Basename Collision, heal-ghost-links.sh
