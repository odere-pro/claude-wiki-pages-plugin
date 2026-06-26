---
title: "Installation"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["docs", "install"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Installation

## Metadata

- File: `raw/repo/docs/install.md`
- Type: installation guide

## Summary

Three installation paths: macOS one-command (install-macos.sh via curl), Remote marketplace, and Local for contributors. Prerequisites are Claude Code >= 2.0, bash/git/jq/find, and Bun >= 1.2 (required for deterministic engine). The onboarding wizard scaffolds the vault on first run.

## Key Claims

Prerequisites: Claude Code >= 2.0, macOS or Linux shell, bash + git + jq + find on PATH, Bun >= 1.2 (required — fail-closed engine; bash hooks still work without Bun but engine commands are disabled). macOS one-command: curl install-macos.sh | bash (installs Homebrew, git, jq, Bun; idempotent). Remote install: /plugin marketplace add odere-pro/claude-software-3-0-marketplace; /plugin install claude-wiki-pages; /claude-wiki-pages:init. Local/contributor install: git clone + throwaway .claude-plugin/marketplace.json pointing at ./. Vault is not touched on uninstall (/plugin uninstall claude-wiki-pages). Always verify with /claude-wiki-pages:doctor after install or update.

Covers: Installation, Prerequisites, Bun Dependency, Marketplace, Doctor Verification
