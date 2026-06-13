---
title: "Installation"
type: concept
aliases: ["Installation", "installation", "install", "plugin install"]
parent: "[[Reference]]"
path: "reference"
sources: ["[[Installation Guide]]", "[[Getting Started (CLI Quickstart)]]", "[[User Guide 01: Getting Started]]"]
related: ["[[Onboarding Wizard]]", "[[Doctor Command]]", "[[claude-wiki-pages Plugin]]"]
tags: ["concept", "install", "reference"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Installation

## Definition

Installation of `claude-wiki-pages` loads the plugin as session context in Claude Code — skills, agents, hooks, scripts, and rules. It does not run an installer or modify system software.

## Key Principles

Three paths:

**Remote (marketplace):**
```
/plugin marketplace add odere-pro/claude-wiki-pages-plugin
/plugin install claude-wiki-pages
/claude-wiki-pages:init
```

**Local (contributors / forks):**
```bash
git clone https://github.com/odere-pro/claude-wiki-pages-plugin
```
Then in Claude Code: `/plugin marketplace add /path/to/clone` → `/plugin install claude-wiki-pages` → `/claude-wiki-pages:init`

**Update:** uninstall → reinstall. For local: re-add marketplace if `marketplace.json` changed.

- **Bun ≥ 1.2 is recommended** but not required. Without Bun, engine commands are disabled; bash hooks still enforce the schema.
- **Uninstall:** `/plugin uninstall claude-wiki-pages` — vault files are never touched.
- **Always verify:** run `/claude-wiki-pages:doctor` after install or update.

## Examples

The repo ships `claude-wiki-pages-local` marketplace (`.claude-plugin/marketplace.json`) — differently named from the registry listing to prevent collision when both are added.

## Related Concepts

- [[Onboarding Wizard]] — the `/claude-wiki-pages:init` step that scaffolds the vault
- [[Doctor Command]] — the health check after install
- [[claude-wiki-pages Plugin]] — what gets installed
