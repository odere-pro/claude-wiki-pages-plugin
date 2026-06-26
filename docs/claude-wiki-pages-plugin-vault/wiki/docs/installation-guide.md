---
title: "Installation Guide"
type: concept
aliases: ["installation guide", "Installation Guide", "install guide"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-install|Installation]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "install", "setup"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Installation Guide

Three installation paths for claude-wiki-pages: macOS one-command, remote marketplace, and local for contributors.

## Definition

The plugin is installed as a Claude Code plugin. End users use the published marketplace; contributors clone the repo and add a local marketplace. Bun >= 1.2 is a required dependency for the deterministic engine.

## Key Principles

**Prerequisites.** Claude Code >= 2.0 (signed in), macOS or Linux shell, `bash` + `git` + `jq` + `find` on `PATH`, **Bun >= 1.2** (required — security-relevant engine calls fail-closed without it; bash hooks still work but engine commands are disabled). Plugin installation cannot auto-install system software; Bun is a manual one-time step. The `SessionStart` hook prints a notice if Bun is missing; `/claude-wiki-pages:doctor` flags it (D06).

**macOS one-command.** `curl -fsSL install-macos.sh | bash` — installs Homebrew, git, jq, Bun; idempotent. Flags: `--check`, `--dry-run`, `--with-obsidian` (graph parity), `--with-ollama` (offline drafting). Open a new terminal after so PATH change applies.

**Remote marketplace (recommended path).**
```
/plugin marketplace add odere-pro/claude-software-3-0-marketplace
/plugin install claude-wiki-pages
/claude-wiki-pages:init
```
The third command runs the onboarding wizard, scaffolds the vault from `skills/init/template/`, smoke-tests the install, and prints the next step.

**Local / contributor install.** `git clone https://github.com/odere-pro/claude-wiki-pages-plugin`. Add a throwaway `.claude-plugin/marketplace.json` pointing at `./` (named `claude-wiki-pages-local` to avoid collisions with the published listing), then add the local marketplace in Claude Code.

**Per-project enablement.** Run in the project root to enable from the published marketplace via `.claude/settings.json`:
```sh
jq '
  .extraKnownMarketplaces["odere-pro"] = {source:{source:"github",repo:"odere-pro/claude-software-3-0-marketplace"}}
  | .enabledPlugins["claude-wiki-pages@odere-pro"] = true
' .claude/settings.json > tmp && mv tmp .claude/settings.json
```

**Uninstall.** `/plugin uninstall claude-wiki-pages` — vault under `vault/` is not touched; only the plugin is removed.

## Examples

After install or update: always run `/claude-wiki-pages:doctor`. Exit 0 and "OK" on every check = all checks passed. Any `FAIL[N]` line names the remedy.

## Related Concepts

The getting started guide covers the eight-step quickstart. The operations reference documents vault resolution and the hook event table.
