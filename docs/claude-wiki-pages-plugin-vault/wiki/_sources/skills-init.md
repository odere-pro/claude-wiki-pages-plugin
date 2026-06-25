---
title: "Init Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "init"]
aliases: ["Init Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Init Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/init/SKILL.md`
- Type: Skill definition for the `init` verb

## Summary

The `init` skill bootstraps a fresh vault in a user's project by copying from the plugin's reference scaffold at `skills/init/template/`. It is idempotent and self-repairing: running it twice on a healthy vault is a no-op. The skill owns initialization only — ingest, lint, and query are separate responsibilities.

## Key Claims

Covers: Init Skill, Vault Scaffolding, Vault Location Resolution, Schema Version, Settings Persistence, Project Intake, Wire Source, READY Signal, NEXT_STEP Signal.

The skill resolves the vault path in four-tier order: explicit env var, settings.json, auto-detect by scanning for a CLAUDE.md with `schema_version`, then default `docs/vault`. It persists the chosen path via `scripts/set-vault.sh` before touching the vault directory. After scaffolding, it git-inits the vault if not already covered by an outer repo. The completion signal uses exactly one of three READY forms or a WARN form; a FAILED is reserved for filesystem permission errors only. A `NEXT_STEP:` line with `ingest_pending=<true|false>` follows every READY/WARN line so the orchestrator can chain ingest automatically.
