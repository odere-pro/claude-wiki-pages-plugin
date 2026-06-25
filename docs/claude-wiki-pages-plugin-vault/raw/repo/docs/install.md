# Installation

Three ways to install `claude-wiki-pages`. Pick the one that matches your situation.

## Quick start — macOS (one command)

A fresh Mac needs four tools on `PATH`: Homebrew, `git`, `jq`, and **Bun** (the engine). [`install-macos.sh`](../install-macos.sh) installs whichever are missing and patches your shell profile (`~/.zshrc` or `~/.bash_profile`). One-time, idempotent — safe to re-run:

```sh
curl -fsSL https://raw.githubusercontent.com/odere-pro/claude-wiki-pages-plugin/main/install-macos.sh | bash
```

Flags: `--check` (report status, change nothing) · `--dry-run` · `--with-obsidian` (graph parity, D11) · `--with-ollama` (offline drafting). Then open a **new terminal** so the PATH change applies, and confirm with `bun --version`.

**Add the plugin to a project** — run this in the project's root folder. It enables the plugin from the published marketplace via the project's `.claude/settings.json` (merges with any existing settings; needs `jq`, which the installer set up):

```sh
mkdir -p .claude
jq -e . .claude/settings.json >/dev/null 2>&1 || echo '{}' > .claude/settings.json
tmp=$(mktemp) && jq '
    .extraKnownMarketplaces["odere-pro"] = {source:{source:"github",repo:"odere-pro/claude-software-3-0-marketplace"}}
  | .enabledPlugins["claude-wiki-pages@odere-pro"] = true
' .claude/settings.json > "$tmp" && mv "$tmp" .claude/settings.json
```

Start Claude Code in that folder (it fetches and enables the plugin on launch), then run `/claude-wiki-pages:wiki` to scaffold a vault, ingest, self-heal, and query. Prefer doing it interactively instead of editing settings? Use the marketplace commands under [Remote](#remote--marketplace) below.

## Prerequisites

- [Claude Code](https://docs.claude.com/en/docs/claude-code) `>= 2.0`, signed in.
- macOS or Linux shell. Windows/WSL is unverified but should work for the markdown-only paths.
- `bash`, `git`, `jq`, `find` on `PATH`. The plugin's `/claude-wiki-pages:doctor` enumerates anything missing.
- **[Bun](https://bun.sh) `>= 1.2` (recommended).** Runs the deterministic engine (`verify`/`fix`/`heal`/`doctor`/`config`) and git-checkpointed self-heal. Bash hooks still enforce the schema without it, but those commands are disabled until Bun is installed. Install:

  ```sh
  curl -fsSL https://bun.sh/install | bash   # then restart the Claude Code session
  ```

  > Plugin installation cannot auto-install system software like Bun (Claude Code loads a plugin as context — skills, agents, hooks — it does not run an installer). So Bun is a manual one-time step. The `SessionStart` hook prints a notice if it is missing, and `/claude-wiki-pages:doctor` flags it (D06).

## Remote — marketplace

The default path. Pulls the published release from the
[`odere-pro/claude-software-3-0-marketplace`](https://github.com/odere-pro/claude-software-3-0-marketplace)
registry.

```text
/plugin marketplace add odere-pro/claude-software-3-0-marketplace
/plugin install claude-wiki-pages
/claude-wiki-pages:init
```

The third command runs the **onboarding wizard**, which scaffolds a vault by copying [`skills/init/template/`](../skills/init/template/), smoke-tests the install, and prints your next step. Walkthrough: [`docs/llm-wiki/01-getting-started.md`](./llm-wiki/01-getting-started.md).

## Local — contributors and forks

Use when developing the plugin or running a fork.

```bash
git clone https://github.com/odere-pro/claude-wiki-pages-plugin
```

The repo no longer ships its own marketplace manifest — it is published through the
`odere-pro/claude-software-3-0-marketplace` registry above. To install a local clone as a
marketplace, add a throwaway `.claude-plugin/marketplace.json` to the clone that points at
`./` (deliberately named `claude-wiki-pages-local` so it never collides with the published
registry listing — the plugin id is `claude-wiki-pages` either way):

```json
{
  "name": "claude-wiki-pages-local",
  "owner": { "name": "odere-pro", "url": "https://github.com/odere-pro" },
  "plugins": [{ "name": "claude-wiki-pages", "source": "./", "version": "1.0.0" }]
}
```

Then in a Claude Code session:

```text
/plugin marketplace add /path/to/claude-wiki-pages-plugin
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

**Local.** If your throwaway `marketplace.json` or `plugin.json` changed, re-add the local marketplace first:

```text
/plugin marketplace remove claude-wiki-pages-local
/plugin marketplace add /path/to/claude-wiki-pages-plugin
/plugin uninstall claude-wiki-pages
/plugin install claude-wiki-pages
```

## Verify

Always run after install or update:

```text
/claude-wiki-pages:doctor
```

Exit `0` and "OK" on every check means all checks passed. Any `FAIL[N]` line names the remedy. Exit codes documented in [`operations.md`](./operations.md).

## Uninstall

```text
/plugin uninstall claude-wiki-pages
```

Your vault under `vault/` (or wherever `CLAUDE_WIKI_PAGES_VAULT` points) is **not** touched — only the plugin is removed. Sources in `raw/` and wiki pages in `wiki/` survive.
