# data — config and embedded templates

`data/` holds the engine's static and layered data: the configuration loader and
the embedded frontmatter skeletons. It is read by commands; it owns no vault
logic of its own.

## Config layering

[`config/config.ts`](./config/config.ts) builds the effective config by deep-merging four
layers, lowest precedence first:

1. **Defaults** — `DEFAULT_CONFIG` in `config/config.ts`.
2. **User** — `${CLAUDE_CONFIG_DIR:-~/.config}/claude-wiki-pages/config.json`.
3. **Project** — `.claude/claude-wiki-pages.json`.
4. **Env** — `CLAUDE_WIKI_PAGES_*` leaf overrides (mapped via `ENV_MAP`).

The merged result is validated by `validateConfig` against
[`../../schemas/config.schema.json`](../../schemas/config.schema.json) (enum +
nested-object checks). `loadConfig` returns the config plus which layers were
present; the [`config`](../commands/CLAUDE.md) command surfaces both. The schema
is also pinned in CI by `tests/gates/gate-07-config-schema.sh`.

## Templates

[`templates.ts`](./templates.ts) holds the embedded `topic` / `project`
frontmatter skeletons that [`migrate`](../commands/CLAUDE.md) writes into an
upgrading vault's `_templates/` directory. Embedding them lets `migrate` upgrade
a v1 vault without locating the plugin's template directory at runtime. These
copies must stay in sync with the on-disk source of truth in
[`../../docs/vault-example/_templates/`](../../docs/vault-example/_templates/)
and the copies `init` ships in
[`../../skills/init/template/_templates/`](../../skills/init/template/_templates/);
`rules/templates.md` is the contract.
