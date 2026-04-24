# 1. Getting started

> Reference. For the day-1 path, see [index.md](./index.md).

Everything you need to go from a fresh plugin install to a verified-green vault. Use this guide when the default path in `index.md` fails, when you need to audit hook wiring, or when you want to see the single-command health check in full.

## Prerequisites

- Claude Code installed (`claude --version` should work in a terminal).
- The plugin installed — remote or local:

  **Remote (marketplace):**

  ```
  /plugin marketplace add odere-pro/llm-wiki-stack
  /plugin install llm-wiki-stack
  ```

  **Local (contributors / forks):**

  ```
  /plugin marketplace add /path/to/llm-wiki-stack
  /plugin install llm-wiki-stack
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

If you do not see it yet, you have not scaffolded the vault — run `/llm-wiki-stack:llm-wiki` first (see below).

## Scaffold the vault

From the Claude Code session:

```
/llm-wiki-stack:llm-wiki
```

The onboarding wizard copies `docs/vault-example/` from the plugin cache into `vault/` in your project, writes a per-vault `vault/CLAUDE.md`, and prints a short orientation. You never need to touch files under `skills/`, `agents/`, `hooks/`, `scripts/`, or the plugin cache — those are plugin internals.

After the wizard runs, your project contains:

```
vault/
├── CLAUDE.md               # authoritative schema for your vault
├── _templates/             # frontmatter templates per type
├── raw/
│   └── assets/             # images and attachments
├── wiki/
│   ├── index.md            # vault MOC
│   ├── log.md              # operations log
│   ├── dashboard.md        # Dataview dashboard
│   ├── _sources/
│   └── _synthesis/
└── output/                 # optional git-ignored scratch space
```

## Run the health check

```
/llm-wiki-stack:llm-wiki-status
```

This exercises every hook path — frontmatter validation, wikilink enforcement, `raw/` immutability, the ingest verifier — and prints a green/red report per path. Green everywhere means:

- `SessionStart` preamble fires.
- `PreToolUse` frontmatter and wikilink checks block bad writes.
- `protect-raw.sh` blocks any write under `vault/raw/`.
- `verify-ingest.sh` runs clean against your current vault state.

Red on any line means the corresponding hook is not firing or reports drift. The status report tells you which script flagged the issue; fix with [guide 4](./04-review-validate-fix.md).

## Obsidian setup (optional)

1. Obsidian → **Open folder as vault** → select `vault/`.
2. Install community plugins: **Dataview**, **Templater**, **Web Clipper**.
3. Templater → template folder: `_templates`.
4. Web Clipper → save location: `vault/raw/`.
5. From a Claude session, run `/llm-wiki-stack:obsidian-graph-colors` once to apply per-topic colors to the graph view.

## What the vault is for

`vault/` is an Obsidian vault managed by the plugin following [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). The human curates sources by dropping them into `vault/raw/`; the plugin maintains `vault/wiki/` as a provenance-tracked, typed wiki; hooks enforce the schema at every tool-call boundary.

`vault/output/` is different: git-ignored scratch space for deliverables you compile out of the wiki. No schema, no lint, no frontmatter. See [guide 5](./05-export-outputs.md).

## Next step

- First-time ingest of a source → [index.md day 1](./index.md#day-1--install-scaffold-ingest-one-source).
- You already have a vault and want to add material → [guide 3](./03-update-existing.md).
- Second vault in a different project → [guide 2](./02-create-new-knowledge-base.md).
