# Migration to 1.0.0 — `llm-wiki-stack` → `claude-wiki-pages`

`1.0.0` renames the plugin and its identifiers to a single brand and adds the
deterministic Bun engine. This is a hard rename (pre-1.0 had low back-compat
cost); your **vault content and schema are untouched**.

## What changed

| Old (`≤ 0.2.0`)                                            | New (`1.0.0`)                                       |
| ---------------------------------------------------------- | --------------------------------------------------- |
| plugin id `llm-wiki-stack`                                 | `claude-wiki-pages`                                 |
| slash namespace `/llm-wiki-stack:`                         | `/claude-wiki-pages:`                               |
| agents `llm-wiki-stack-{role}-agent`                       | `claude-wiki-pages-{role}-agent`                    |
| skill `llm-wiki`                                           | `init`                                              |
| skills `llm-wiki-{ingest,query,lint,fix,status,synthesize,index,markdown}` | the bare verb (`ingest`, `query`, …)|
| settings `.claude/llm-wiki-stack/settings.json`            | `.claude/claude-wiki-pages/settings.json`           |
| env `LLM_WIKI_VAULT`                                       | `CLAUDE_WIKI_PAGES_VAULT`                            |
| `docs/VOCABULARY.md`                                       | `docs/GLOSSARY.md`                                  |

The `obsidian-*` skills (`obsidian-graph-colors`, `obsidian-markdown`,
`obsidian-bases`, `obsidian-cli`) keep their names.

## What you need to do

Most users need nothing — the orchestrator entry is now `/claude-wiki-pages:wiki`
and the `SessionStart` hook auto-migrates an existing
`.claude/llm-wiki-stack/settings.json` to the new path on first run.

If you pinned identifiers in scripts or automation, update them:

```sh
# slash commands and the plugin id
sed -i '' 's#/llm-wiki-stack:#/claude-wiki-pages:#g; s/llm-wiki-stack/claude-wiki-pages/g' your-scripts/*

# the onboarding skill and short verbs (note the OLD namespace on the left)
#   /llm-wiki-stack:llm-wiki          → /claude-wiki-pages:init
#   /llm-wiki-stack:llm-wiki-ingest   → /claude-wiki-pages:ingest   (and the other verbs)

# env var (the old name still works as a deprecated fallback for one minor)
export CLAUDE_WIKI_PAGES_VAULT="$LLM_WIKI_VAULT"
```

## What does NOT change

- **Vault schema** (`schema_version: 1`) and all vault content under `raw/` and `wiki/`.
- The slash-command *form* `/claude-wiki-pages:<skill>` — only the namespace and skill names moved.
- Hook behaviour and the four-layer model.

## The new engine

`1.0.0` also ships the deterministic engine (`claude-wiki-pages verify`, more to
come). It is additive — the plugin still works without Bun installed; the engine
is called where a structured check helps and degrades gracefully when absent.
See [`CHANGELOG.md`](../CHANGELOG.md) and [`SPEC.md`](../SPEC.md).
