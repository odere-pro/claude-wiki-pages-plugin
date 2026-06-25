---
title: "doctor command (/claude-wiki-pages:doctor)"
type: source
source_type: manual
source_format: text
attachment_path: ""
extracted_at: 2026-06-25
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages-plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["commands", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# doctor command (/claude-wiki-pages:doctor)

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages-plugin
- **Published:** 2026-06-25
- **URL:** raw/repo/commands/doctor.md

## Summary

Slash command definition for the environment health check. Runs engine.sh doctor with ten checks (D01–D10); falls back to doctor.sh when Bun is unavailable. Read-only by contract.

## Key Claims

- Primary: runs `engine.sh doctor --json` with checks D01–D10 covering vault path, schema version, raw/wiki readability, hook permissions, git init, Bun presence, config validity, settings migration, verify health, and glossary gate.
- --fix flag auto-repairs D04 (hook perms), D05 (git init), and D08 (settings migration).
- --strict flag exits 3 on any warn/fail, enabling CI gating.
- Fallback when Bun is absent: `doctor.sh` with coarser exit codes 0–5.
- Allowed tools: Bash only.

Covers: doctor command, Health Check, D01–D10 Checks, engine.sh doctor, Bun Fallback
