---
title: "Default Config Template"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages-plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["templates", "config", "defaults"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Default Config Template

## Metadata

- **File**: `raw/repo/templates/default.config.json`
- **Scope**: Plugin configuration bootstrapping
- **Type**: JSON seed configuration

## Summary

The seed configuration file the plugin writes when a user first enables it. Contains the minimal opinionated defaults for `version`, `vault`, `autoHeal`, `gitCheckpoint`, and `modelHints`. Must validate against `schemas/config.schema.json` — enforced by the `gate-07` CI check.

## Key Claims

`version: 1`. `vault` block is empty (four-tier resolution applies). `autoHeal.enabled: true`, `aggressiveness: "structural"`, `maxIterations: 5`. `gitCheckpoint.mode: "commit"`. `modelHints: {}`. No `firewall`, `maintenance`, or `localModel` blocks — those are opt-in and default off. Any default value here must be a legal schema value; the gate-07 check fails if they diverge.
Covers: Default Configuration, Plugin Bootstrapping, AutoHeal Defaults, GitCheckpoint Defaults
