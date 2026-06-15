---
title: "Installation"
type: concept
aliases: ["Installation", "installation", "plugin install"]
parent: "[[how-it-works|How It Works]]"
path: "how-it-works"
sources: ["[[_sources/install|Installation Guide]]", "[[_sources/getting-started|Getting Started (CLI Quickstart)]]", "[[llm-wiki-01-getting-started|User Guide 01: Getting Started]]", "[[_sources/features|Features]]"]
related: ["[[onboarding-wizard|Onboarding Wizard]]", "[[doctor-command|Doctor Command]]", "[[plugin|claude-wiki-pages Plugin]]", "[[git-checkpoint|Git Checkpoint]]"]
tags: ["concept", "install", "reference"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Installation

> [!summary]
> Installation of `claude-wiki-pages` loads the plugin as session context in Claude Code — skills, agents, hooks, scripts, and rules. It does not run an installer or modify system software. Three paths exist: remote (marketplace), local (contributors/forks), and update/reinstall. Bun ≥ 1.2 is recommended but not required — without it, engine commands are disabled but bash hooks still enforce the schema.

## Definition

Installation loads the `claude-wiki-pages` plugin as session context in Claude Code — skills, agents, hooks, scripts, and rules. It does not run a system installer or modify global software. The plugin is loaded from a marketplace entry (remote) or a local directory (contributor/fork path). All plugin artifacts remain in the Claude Code context directory and are not added to the user's project.

## Key Principles

- Installation is context-loading, not software installation: the plugin does not modify system software or the user's project files.
- Bun ≥ 1.2 is recommended but not required: without Bun, bash hooks still enforce the schema and the plugin degrades gracefully.
- The plugin repo ships a `claude-wiki-pages-local` dev marketplace entry (deliberately different from the published `claude-wiki-pages` name) so local and remote installs never collide.
- Always run `/claude-wiki-pages:doctor` after install or update to confirm clean state before proceeding to ingest.
- Uninstall removes only the plugin context; vault files in `raw/` and `wiki/` survive intact.

## Examples

Remote install (marketplace, standard path):

```
/plugin marketplace add odere-pro/claude-wiki-pages-plugin
/plugin install claude-wiki-pages
/claude-wiki-pages:init
/claude-wiki-pages:doctor
```

Local contributor install:

```
/plugin marketplace add /path/to/claude-wiki-pages-plugin
/plugin install claude-wiki-pages
```

## Prerequisites

Before installing `claude-wiki-pages`:

- **Claude Code** `>= 2.0`, signed in (`claude --version` should work)
- **macOS or Linux shell** (Windows/WSL unverified but should work for markdown-only paths)
- **`bash`, `git`, `jq`, `find`** on `PATH` — the plugin's `/claude-wiki-pages:doctor` enumerates anything missing
- **Bun `>= 1.2`** (recommended, not required) — runs the deterministic engine (`verify`/`fix`/`heal`/`doctor`/`config`) and git-checkpointed self-heal. Install: `curl -fsSL https://bun.sh/install | bash` then restart the Claude Code session.

> [!note] Why Bun is manual
> Plugin installation cannot auto-install system software — Claude Code loads a plugin as context (skills, agents, hooks), not as an installer. Bun is a manual one-time step. The `SessionStart` hook prints a notice if it is missing; `/claude-wiki-pages:doctor` flags it as D06.

## Remote — Marketplace (Default)

Pulls the published release:

```
/plugin marketplace add odere-pro/claude-wiki-pages-plugin
/plugin install claude-wiki-pages
/claude-wiki-pages:init
```

The third command runs the [[onboarding-wizard|Onboarding Wizard]], which scaffolds a vault by copying `docs/vault-example/` into the user's project as `docs/vault/`, smoke-tests the install, and prints the next three things to do.

## Local — Contributors and Forks

For developing the plugin or running a fork:

```bash
git clone https://github.com/odere-pro/claude-wiki-pages-plugin
```

Then in a Claude Code session:

```
/plugin marketplace add /path/to/claude-wiki-pages-plugin
/plugin install claude-wiki-pages
/claude-wiki-pages:init
```

> [!note] Dev marketplace name
> The repo ships its own dev marketplace as **`claude-wiki-pages-local`** (`.claude-plugin/marketplace.json`) — deliberately named differently from the published registry listing, so adding both the registry and a local clone never collides. The plugin id is `claude-wiki-pages` in both.

Local source changes take effect on the next Claude Code session — no reinstall needed.

## Update / Reinstall

**Remote:** uninstall then reinstall to pull the latest release.

```
/plugin uninstall claude-wiki-pages
/plugin install claude-wiki-pages
```

**Local:** if `marketplace.json` or `plugin.json` changed, re-add the marketplace first:

```
/plugin marketplace remove claude-wiki-pages-local
/plugin marketplace add /path/to/claude-wiki-pages-plugin
/plugin uninstall claude-wiki-pages
/plugin install claude-wiki-pages
```

## Verify After Install

Always run after install or update:

```
/claude-wiki-pages:doctor
```

Exit `0` and "OK" lines for every check means clean. Any `FAIL[N]` line names the remedy. Exit codes are documented in `docs/operations.md`.

The doctor runs 10+ checks including:

- D05: Vault under git
- D06: Bun present and version sufficient
- D09: `engine.sh verify` passes on the vault
- D11: Obsidian link parity (if Obsidian is running)

## Uninstall

```
/plugin uninstall claude-wiki-pages
```

The vault under `vault/` (or wherever `CLAUDE_WIKI_PAGES_VAULT` points) is **not** touched — only the plugin is removed. Sources in `raw/` and wiki pages in `wiki/` survive.

## Degraded Mode (Without Bun)

Without Bun, the plugin degrades gracefully:

- Bash hooks still enforce the schema at every tool call
- `validate-frontmatter.sh`, `protect-raw.sh`, `check-wikilinks.sh`, `firewall.sh` all work
- Engine commands (`engine.sh verify`, `heal`, `fix`, `doctor`, `search`) are disabled
- Git checkpoint (`snapshot`) falls back to the bash shim mode

This means structural validation, source protection, and write isolation all hold. Only the engine's advanced checks and search are unavailable.

## Related Concepts

- [[onboarding-wizard|Onboarding Wizard]] — the `/claude-wiki-pages:init` step that scaffolds the vault
- [[doctor-command|Doctor Command]] — the health check after install
- [[plugin|claude-wiki-pages Plugin]] — what gets installed
- [[git-checkpoint|Git Checkpoint]] — the safety mechanism that requires git per vault (ADR-0005)
