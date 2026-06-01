# Installation

Three ways to install `claude-wiki-pages`. Pick the one that matches your situation.

## Prerequisites

- [Claude Code](https://docs.claude.com/en/docs/claude-code) `>= 2.0`, signed in.
- macOS or Linux shell. Windows/WSL is unverified but should work for the markdown-only paths.
- `bash`, `git`, `jq`, `find` on `PATH`. The plugin's `/claude-wiki-pages:wiki-doctor` enumerates anything missing.

## Remote — marketplace

The default path. Pulls the published release.

```text
/plugin marketplace add odere-pro/claude-wiki-pages
/plugin install claude-wiki-pages
/claude-wiki-pages:init
```

The third command runs the **onboarding wizard**, which scaffolds a vault by copying [`docs/vault-example/`](./vault-example/), smoke-tests the install, and prints the next three things to do. Walkthrough: [`docs/llm-wiki/01-getting-started.md`](./llm-wiki/01-getting-started.md).

## Local — contributors and forks

Use when developing the plugin or running a fork.

```bash
git clone https://github.com/odere-pro/claude-wiki-pages
```

Then in a Claude Code session:

```text
/plugin marketplace add /path/to/claude-wiki-pages
/plugin install claude-wiki-pages
/claude-wiki-pages:init
```

Local source changes take effect on the next Claude Code session — no reinstall needed.

## Update / reinstall

**Remote.** Uninstall and reinstall to pull the latest release.

```text
/plugin uninstall claude-wiki-pages
/plugin install claude-wiki-pages
```

**Local.** If `marketplace.json` or `plugin.json` changed, re-add the marketplace first:

```text
/plugin marketplace remove claude-wiki-pages
/plugin marketplace add /path/to/claude-wiki-pages
/plugin uninstall claude-wiki-pages
/plugin install claude-wiki-pages
```

## Verify

Always run after install or update:

```text
/claude-wiki-pages:wiki-doctor
```

Exit `0` and "OK" lines for every check means you're good. Any `FAIL[N]` line names the remedy. Exit codes documented in [`/SPEC.md` §10](../SPEC.md).

## Uninstall

```text
/plugin uninstall claude-wiki-pages
```

Your vault under `vault/` (or wherever `CLAUDE_WIKI_PAGES_VAULT` points) is **not** touched — only the plugin is removed. Sources in `raw/` and wiki pages in `wiki/` survive.
