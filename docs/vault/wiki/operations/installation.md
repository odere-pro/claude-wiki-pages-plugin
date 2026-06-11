---
title: "Installation"
type: concept
aliases: ["Installation", "installation", "install", "setup", "Bun", "bun"]
parent: "[[Operations]]"
path: "operations"
sources: ["[[Installation (source)]]", "[[Getting Started (source)]]"]
related: ["[[Onboarding]]", "[[Doctor]]", "[[One Advertised Path]]"]
contradicts: []
supersedes: []
depends_on: []
tags: [installation, setup, prerequisites, operations]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Installation

Three installation paths for `claude-wiki-pages`. Always verify with `/claude-wiki-pages:doctor` after any install or update.

## Prerequisites

- **Claude Code** `>= 2.0`, signed in.
- **macOS or Linux** shell. Windows/WSL is unverified but should work for markdown-only paths.
- **`bash`, `git`, `jq`, `find`** on `PATH`. `/claude-wiki-pages:doctor` enumerates anything missing.
- **[Bun](https://bun.sh) `>= 1.2`** (recommended). Enables the deterministic engine (`verify`, `fix`, `heal`, `doctor`, `config`) and git-checkpointed self-heal. Degrades gracefully without it — bash hooks still enforce the schema.

> [!note] Bun is a manual step
> The plugin loads as session context — skills, agents, hooks — it cannot auto-install system software. Install Bun once with `curl -fsSL https://bun.sh/install | bash`, then restart the Claude Code session. The `SessionStart` hook prints a notice if Bun is missing; `/claude-wiki-pages:doctor` flags it as D06.

## Remote — Marketplace (Default)

```text
/plugin marketplace add odere-pro/claude-wiki-pages-plugin
/plugin install claude-wiki-pages
/claude-wiki-pages:init
```

The third command runs the **onboarding wizard**, which scaffolds a vault by copying `docs/vault-example/`, smoke-tests the install, and prints the next three things to do.

## Local — Contributors and Forks

```bash
git clone https://github.com/odere-pro/claude-wiki-pages-plugin
```

Then in a Claude Code session:

```text
/plugin marketplace add /path/to/claude-wiki-pages
/plugin install claude-wiki-pages
/claude-wiki-pages:init
```

Local source changes take effect on the next Claude Code session — no reinstall needed.

## Update / Reinstall

Remote: uninstall then reinstall. Local: if `marketplace.json` or `plugin.json` changed, re-add the marketplace first.

## Uninstall

```text
/plugin uninstall claude-wiki-pages
```

Vault data under `vault/` (or wherever `CLAUDE_WIKI_PAGES_VAULT` points) is **not** touched — only the plugin is removed. Sources in `raw/` and wiki pages in `wiki/` survive.
