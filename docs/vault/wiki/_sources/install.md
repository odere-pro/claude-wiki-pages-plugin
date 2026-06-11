---
title: "Installation"
type: source
source_type: manual
source_format: text
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-11
date_ingested: 2026-06-11
tags: [installation, setup, prerequisites]
aliases: ["Installation"]
sources: []
created: 2026-06-11
updated: 2026-06-11
status: active
confidence: 1.0
---

# Installation

## Summary

Three installation paths: remote marketplace (default), local contributor/fork path, and update/reinstall. Prerequisites include Claude Code ≥2.0, bash/git/jq/find, and Bun ≥1.2 (recommended, degrades gracefully without it). Always verify with `/claude-wiki-pages:doctor` after install. Uninstall removes only the plugin, not vault data.

## Key Claims

- Prerequisites: Claude Code ≥2.0 signed in; macOS or Linux (Windows/WSL unverified); bash, git, jq, find on PATH; Bun ≥1.2 recommended.
- Bun is manual one-time install; the plugin cannot auto-install system software. Without Bun, bash hooks still enforce schema but engine commands (`verify`, `fix`, `heal`, `doctor`, `config`) are disabled.
- Remote: `/plugin marketplace add odere-pro/claude-wiki-pages-plugin` → `/plugin install claude-wiki-pages` → `/claude-wiki-pages:init`.
- Local: `git clone`, then `/plugin marketplace add /path/to/claude-wiki-pages` → `/plugin install claude-wiki-pages` → `/claude-wiki-pages:init`. Changes take effect on next Claude Code session.
- Verify: `/claude-wiki-pages:doctor` — exit 0 + OK lines = good; FAIL[N] names the remedy.
- Uninstall removes plugin only; vault data under `vault/` survives.

## Entities Mentioned

- [[claude-wiki-pages]]
- [[Bun]]

## Concepts Covered

- [[Installation]]
- [[Onboarding Wizard]]
- [[Doctor]]
