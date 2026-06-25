---
title: "Obsidian Vault Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "obsidian-vault"]
aliases: ["Obsidian Vault Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Obsidian Vault Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/obsidian-vault/SKILL.md`
- Type: Skill definition for the `obsidian-vault` reference skill

## Summary

The `obsidian-vault` skill defines the guard contract for driving the Obsidian CLI safely — always scope every invocation to the resolved vault, never operate on arbitrary paths. It is the behavioral complement to the firewall hook.

## Key Claims

Covers: Obsidian Vault Skill, Safe CLI Scoping, Four Rules, Firewall + Skill Defense in Depth.

Four rules: resolve the vault first via `scripts/resolve-vault.sh`; always pass `--vault "$VAULT"` to every Obsidian CLI call; never operate on a different vault name; file operations stay inside the vault. The hook (`firewall.sh`) enforces the boundary; this skill teaches the intent so the hook rarely has to fire. Configuration via `firewall` section of `claude-wiki-pages.json`: `enabled`, `mode` (enforce/warn/off), `allowPaths`, `denyPaths`.
