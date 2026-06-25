---
title: "Maintain Contract Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "maintain-contract"]
aliases: ["Maintain Contract Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Maintain Contract Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/maintain-contract/SKILL.md`
- Type: Skill definition for the `maintain-contract` reference skill

## Summary

The `maintain-contract` skill documents the safe procedure any agent follows when operating on a vault. Three invariants: ground then judge then verify; `raw/` is immutable; git is the safety net not approval. Covers ingest, retrieve, maintain procedures, hard rules, and multi-vault operating rules.

## Key Claims

Covers: Maintain Contract, Ground-Judge-Verify Invariant, Raw Immutability, Git Safety Net, Multi-Vault Confinement Rules.

Five multi-vault rules: always pass `--target <active-vault>`; pass `--other-vaults` from the registry for confinement; reads from non-active registered vaults are permitted; writes to any non-active vault are firewall-BLOCKED regardless of `--other-vaults`; a malformed registry resolves FAIL-CLOSED (zero writable roots). Hard rules: never create a `[[wikilink]]` to a non-existent page; never forge provenance; never delete page content; always read `vault/CLAUDE.md` first.
