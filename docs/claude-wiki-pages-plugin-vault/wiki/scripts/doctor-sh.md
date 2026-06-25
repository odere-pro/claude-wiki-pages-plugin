---
title: "doctor.sh"
type: entity
entity_type: tool
aliases: ["doctor.sh", "Health Check Script"]
parent: "[[scripts|Scripts]]"
path: "scripts"
sources: ["[[scripts-doctor-sh|scripts/doctor.sh]]"]
related: []
tags: ["scripts", "health-check", "diagnostics", "layer-4"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# doctor.sh

Health-check script for the plugin. Wrapped by the `/claude-wiki-pages:doctor` slash command.

## Overview

`scripts/doctor.sh` runs a five-step sequential health check of the plugin installation and vault. Each step has a distinct exit code so the caller can identify exactly which condition failed.

## Key Facts

- **Exit 1:** vault path unresolvable, git absent, or jq absent.
- **Exit 2:** schema_version absent or not in the plugin manifest's supported list.
- **Exit 3:** raw/ unreadable or wiki/ unwritable.
- **Exit 4:** hooks not executable (references in hooks.json that are missing or not marked +x).
- **Exit 5:** `validate-docs.sh` fails (glossary drift in plugin prose).
- A vault not yet a git repo is a WARN/advisory, not fatal (fixable with `engine.sh --fix`).
- Validates schema_version by cross-referencing the plugin's `.claude-plugin/plugin.json` supported list via jq.
- Resolves `PLUGIN_ROOT` from the `CLAUDE_PLUGIN_ROOT` env var or derives it from the script directory.

## Related

`validate-docs.sh` is the glossary gate invoked by step 5. The `/claude-wiki-pages:doctor` command is the user-facing wrapper.
