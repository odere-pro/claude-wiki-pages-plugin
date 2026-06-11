# 1. Getting started

> Reference. For the day-1 path, see [index.md](./index.md).

Everything you need to go from a fresh plugin install to a verified-green vault. Use this guide when the default path in `index.md` fails, when you need to audit hook wiring, or when you want to see the single-command health check in full.

## Prerequisites

- Claude Code installed (`claude --version` should work in a terminal).
- The plugin installed — remote or local:

  **Remote (marketplace):**

  ```
  /plugin marketplace add odere-pro/claude-wiki-pages-plugin
  /plugin install claude-wiki-pages
  ```

  **Local (contributors / forks):**

  ```
  /plugin marketplace add /path/to/claude-wiki-pages
  /plugin install claude-wiki-pages
  ```

  For update, reinstall, and uninstall steps see [README § Installation](../../README.md#installation).

- Obsidian 1.5+ (optional, but recommended for graph view and Dataview).
- `jq` installed (required by hook scripts — `brew install jq` on macOS).

## Confirm the plugin is loaded

Open a Claude Code session in your project directory:

```bash
claude
```

On session start you should see a short preamble from the `SessionStart` hook reminding the LLM to read `vault/CLAUDE.md` before any wiki operation. If you see that line, the plugin is wired and the hook bus is working.

If you do not see it yet, you have not scaffolded the vault — run `/claude-wiki-pages:wiki` (see below).

## Scaffold the vault and run

From the Claude Code session:

```
/claude-wiki-pages:wiki
```

The orchestrator detects that no vault exists, runs the `init` wizard, and scaffolds
`docs/vault/` in your project. The scaffold includes a bundled sample source in `raw/` so
you can immediately run `/claude-wiki-pages:wiki` a second time to get a real ingest result
— no files needed from you at this stage. You never need to touch files under `skills/`,
`agents/`, `hooks/`, `scripts/`, or the plugin cache — those are plugin internals.

After the wizard runs, your project contains:

```
vault/
├── CLAUDE.md               # authoritative schema for your vault
├── _templates/             # frontmatter templates per type
├── raw/
│   ├── sample-source.md    # bundled sample — ingest this first
│   └── assets/             # images and attachments
├── wiki/
│   ├── index.md            # vault MOC
│   ├── log.md              # operations log
│   ├── _sources/
│   └── _synthesis/
└── output/                 # optional git-ignored scratch space
```

## Confirm the environment is healthy

```
/claude-wiki-pages:doctor
```

`doctor` runs ten checks and prints a green/red report per check. Green everywhere means the
environment is ready. If any check is red, it tells you exactly what to fix. Run
`/claude-wiki-pages:doctor --fix` to auto-repair the fixable subset (hook permissions, git
init, settings migration).

Once `doctor` is green, run:

```
/claude-wiki-pages:status
```

This exercises every hook path — frontmatter validation, wikilink enforcement, `raw/`
immutability, the ingest verifier — and prints a green/red report per path.

## Obsidian setup (optional)

1. Obsidian → **Open folder as vault** → select `vault/`.
2. Install community plugins: **Dataview**, **Templater**, **Web Clipper**.
3. Templater → template folder: `_templates`.
4. Web Clipper → save location: `vault/raw/`.
5. From a Claude session, run `/claude-wiki-pages:obsidian-graph-colors` once to apply per-topic colors to the graph view.

## What the vault is for

`vault/` is an Obsidian vault managed by the plugin following [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). The human curates sources by dropping them into `vault/raw/`; the plugin maintains `vault/wiki/` as a provenance-tracked, typed wiki; hooks enforce the schema at every tool-call boundary.

`vault/output/` is different: git-ignored scratch space for deliverables you compile out of the wiki. No schema, no lint, no frontmatter. See [guide 5](./05-export-outputs.md).

## Next step

Run `/claude-wiki-pages:wiki` — the orchestrator will detect the bundled sample source in
`raw/` and start the ingest pipeline automatically. You will have a cited answer from your
own wiki within a few minutes.

- First-time ingest of a source → [index.md day 1](./index.md#day-1--install-scaffold-ingest-one-source).
- You already have a vault and want to add material → [guide 3](./03-update-existing.md).
- Second vault in a different project → [guide 2](./02-create-new-knowledge-base.md).
