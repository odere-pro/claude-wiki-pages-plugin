# Migration to schema_version 2

Schema version 2 is a **minor, additive** upgrade. It adds three page types
(`topic`, `project`, `manifest`), two optional provenance fields (`source_quotes`,
`derived`), and a source manifest. **Nothing is renamed or removed** — a vault
that declares `schema_version: 1` keeps working unchanged. You only need to
migrate when you want the new features.

## What changed

| Area              | schema_version 1                              | schema_version 2                                                                 |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| `type` values     | `source`, `entity`, `concept`, `synthesis`, `index`, `log` | + `topic`, `project`, `manifest`                                    |
| templates         | `source`, `entity`, `concept`, `synthesis`, `index` | + `topic.md`, `project.md`                                                 |
| provenance fields | `sources` (page-level)                        | + `source_quotes` (claim-level, optional), + `derived` (optional)               |
| source tracking   | scan `wiki/log.md`                            | `wiki/_sources/manifest.md` (per-source processed state + checksum)             |
| `plugin.json`     | `supported_schema_versions: [1]`              | `supported_schema_versions: [1, 2]`                                              |

### New page types

- **`topic`** — a narrative landing page for a topic, distinct from the folder's
  `_index.md` (which is a mechanical Map of Content). Required fields:
  `summary`, `parent`, `path`, `sources`, `created`, `updated`, `status`, `confidence`.
- **`project`** — a goal/initiative with a lifecycle that aggregates related
  pages. Required fields: `objective`, `project_status`
  (`planned`/`active`/`paused`/`done`/`abandoned`), `parent`, `path`, `sources`,
  `created`, `updated`, `status`, `confidence`.
- **`manifest`** — bookkeeping at `wiki/_sources/manifest.md`; tracks each raw
  source's processed state and a content checksum. Exempt from the
  `sources`-required and index-membership checks (like `index.md`/`log.md`).

### New optional fields (any typed page)

- **`source_quotes`** — `[{ source: "[[note]]", quote: "verbatim text" }]`. Pins
  individual claims to the exact source sentence behind them. Leave `[]` when
  page-level `sources` is enough.
- **`derived`** — `true` when the page is LLM inference synthesised across
  sources rather than stated in one. Keep `confidence` below `0.8` unless several
  sources independently support it.

## How to migrate

### Engine (recommended)

```sh
# preview the plan (no writes)
bash scripts/engine.sh migrate --target <vault>

# apply under a git checkpoint
bash scripts/engine.sh migrate --target <vault> --write
```

The migration is **idempotent** (re-running on a v2 vault is a no-op) and
**git-bounded**: `--write` first writes a `checkpoint:` commit, so the whole
upgrade reverts with `git revert <checkpoint>` (the SHA is printed on completion).

It performs three additive steps, each skipped when already done:

1. Bump the declared `schema_version` in `vault/CLAUDE.md`.
2. Write `_templates/topic.md` and `_templates/project.md` when absent.
3. Generate `wiki/_sources/manifest.md` when absent (raw files matched to
   existing source summaries by filename stem; unmatched files are `pending`).

Existing pages are **not** rewritten — `source_quotes`/`derived` are optional and
added lazily by `ingest`.

### Manual (no Bun)

If Bun is unavailable, do the three steps by hand:

1. Change `schema_version: 1` → `schema_version: 2` in `vault/CLAUDE.md`.
2. Copy `topic.md` and `project.md` from the plugin's
   `docs/vault-example/_templates/` into your vault's `_templates/`.
3. Optionally create `wiki/_sources/manifest.md` with `type: manifest`
   frontmatter and a table of your raw sources.

## Rollback

```sh
git revert <checkpoint-sha>   # the SHA printed by `migrate --write`
```

Or simply set `schema_version` back to `1` — v1 tooling ignores the v2 additions.

See [`SPEC.md`](../SPEC.md) §7, §12 and [`CHANGELOG.md`](../CHANGELOG.md).
