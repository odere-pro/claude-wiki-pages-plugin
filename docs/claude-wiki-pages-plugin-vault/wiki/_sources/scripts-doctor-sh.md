---
title: "scripts/doctor.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["scripts", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# scripts/doctor.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/doctor.sh

## Summary

Health-check script for the plugin. Wrapped by the `/claude-wiki-pages:doctor` slash command. Verifies five conditions in sequence and exits with a specific code for each failure class: vault path resolves (exit 1), schema_version present and supported (exit 2), raw/ readable and wiki/ writable (exit 3), hooks executable (exit 4), validate-docs.sh clean (exit 5).

## Key Claims

A vault that is not a git repo is a WARN/advisory, not fatal. Checks hook script executability by listing references in hooks.json and verifying each is executable. Reads PLUGIN_ROOT from CLAUDE_PLUGIN_ROOT env var or derives it from the script's location. Validates schema_version against the plugin manifest's supported list via jq.

Covers: Health Check, Vault Validation, Hook Executability, Doctor Command
