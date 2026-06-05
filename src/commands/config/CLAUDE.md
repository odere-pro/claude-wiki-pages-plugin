# config — show and validate the effective config

`config` is the window onto the engine's layered configuration: it shows the
effective settings, says where each layer came from, or validates the merged
result against the JSON Schema. There is no `set` verb here — configuration is
edited by hand in the user/project files and overridden by env vars; `config` only
reads and reports. The handler in [`config.ts`](./config.ts) is thin, delegating
all resolution and validation to [`../../data/config/config.ts`](../../data/config/config.ts).

## Subcommands and flags

- `claude-wiki-pages config` (or `config show`) — print the effective config and
  which layers were loaded.
- `claude-wiki-pages config validate` — validate the merged config; exit `1` with
  the list of problems.
- `claude-wiki-pages config path` — print the user and project config file paths
  and whether each is present.
- `--json` — emit the structured `ConfigReport` for any subcommand.

An unrecognized subcommand falls back to `show`.

## Effective config resolution

The effective config is a four-layer merge, last write wins:

```text
DEFAULT_CONFIG  ←  user file  ←  project file  ←  env overrides
```

| Layer | Source |
| --- | --- |
| defaults | `DEFAULT_CONFIG` in [`../../data/config/config.ts`](../../data/config/config.ts) |
| user | `${CLAUDE_CONFIG_DIR:-~/.config}/claude-wiki-pages/config.json` |
| project | `.claude/claude-wiki-pages.json` (cwd-relative) |
| env | `CLAUDE_WIKI_PAGES_*` leaf overrides (`ENV_MAP`) |

`loadConfig` deep-merges user then project over the defaults, then applies the
`ENV_MAP` env overrides as explicit leaf writes (coerced to boolean/number where
the schema expects it). The same `loadConfig` is reused by
[`heal`](../heal/CLAUDE.md), [`migrate`](../migrate/CLAUDE.md),
[`firewall`](../firewall/CLAUDE.md), and [`propose`](../propose/CLAUDE.md), so every
command sees one consistent effective config.

## Validation

`config validate` reads `schemas/config.schema.json` from the plugin root and runs
`validateConfig`, a structural check that walks enums and nested objects and
returns a list of human-readable problems (`group.leaf: "value" not in a|b|c`). A
missing or malformed schema file is itself reported as an error. Validation is
enum + nested-object only; it is not a full JSON Schema validator.

## ConfigReport

```ts
interface ConfigReport {
  command: "config";
  sub: "show" | "validate" | "path";
  paths: ConfigPaths;            // { user, project }
  loaded: { user: boolean; project: boolean };
  config: Config;                // the effective merged config
  errors: readonly string[];     // populated only by `validate`
}
```

`configExit` returns `1` only when `sub === "validate"` and `errors` is non-empty;
`show` and `path` always exit `0`.

## Edge cases

- Absent user/project files are not errors — the defaults simply apply, and
  `loaded` reports `false`.
- Unparseable JSON in a config file is treated as absent (the layer contributes
  nothing) rather than throwing.
- `config validate` must run from the plugin repo to find the schema; outside it,
  the missing-schema error is the expected result.

## Covered by

- [`../../data/config/config.test.ts`](../../data/config/config.test.ts) — layer
  merge precedence, env coercion, path derivation, and schema validation.
