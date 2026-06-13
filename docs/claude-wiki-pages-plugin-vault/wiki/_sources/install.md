---
title: "Installation Guide"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["reference", "install"]
aliases: ["Installation Guide"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Installation Guide

## Summary

Three installation paths: remote (marketplace), local (contributors/forks), and update/reinstall. Prerequisites: Claude Code ≥ 2.0, bash/git/jq/find, Bun ≥ 1.2 (recommended). Always verify with `/claude-wiki-pages:doctor` after install.

## Key Claims

- Remote: `/plugin marketplace add odere-pro/claude-wiki-pages-plugin` → `/plugin install claude-wiki-pages` → `/claude-wiki-pages:init`.
- Local: `git clone` the repo → `/plugin marketplace add /path/` → same install + init.
- The repo ships `claude-wiki-pages-local` marketplace (`.claude-plugin/marketplace.json`) — different name from registry to prevent collision.
- Plugin install loads skills, agents, hooks, scripts as context; it does not run an installer (so Bun must be installed manually).
- Bun is recommended but not required: the plugin degrades gracefully without it (bash hooks still enforce the schema; engine commands are disabled).
- Uninstall: `/plugin uninstall claude-wiki-pages` — vault files are never touched.

## Entities Mentioned

- [[claude-wiki-pages Plugin]]

## Concepts Covered

- [[Onboarding Wizard]]
- [[Doctor Command]]
