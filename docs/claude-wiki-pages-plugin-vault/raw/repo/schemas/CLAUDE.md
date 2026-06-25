# schemas/ — config JSON Schema

This directory holds the JSON Schema that validates the plugin's user and
project configuration. [`config.schema.json`](./config.schema.json) is a
draft-07 schema describing every key the plugin reads from the user config
(`~/.config/claude-wiki-pages/config.json`, or `$CLAUDE_CONFIG_DIR`) and the
project config (`.claude/claude-wiki-pages.json`). It is consumed by
[`../src/data/config/config.ts`](../src/data/config/config.ts) (`validateConfig`)
and surfaced through the `claude-wiki-pages config validate` engine command.
The directory SHIPS in the npm package — it is listed in the `files` array of
[`../package.json`](../package.json) — so installed consumers validate against
the same schema the repo does. See [`../CLAUDE.md`](../CLAUDE.md) for the
four-layer model and where config sits in the Layer 4 Orchestration path.

## What it validates

[`config.schema.json`](./config.schema.json) is closed
(`additionalProperties: false`) at every level — unknown keys are a hard error,
which catches typos early. It validates these sections:

- `version` — config schema version (`const: 1`).
- `vault.path` — explicit vault path; when omitted, the four-tier resolution in
  [`../scripts/resolve-vault.sh`](../scripts/resolve-vault.sh) applies.
- `autoHeal` — `enabled`, `aggressiveness`
  (`mechanical` / `structural` / `aggressive`), `maxIterations`.
- `gitCheckpoint` — how auto-heal snapshots the vault before changing it
  (`mode`: `commit` / `branch` / `both` / `off`; `push`: `off` / `auto`).
- `firewall` — vault write isolation (`enabled`, `mode`, `allowPaths`,
  `denyPaths`); mirrored by the hot-path gate
  [`../scripts/firewall.sh`](../scripts/firewall.sh).
- `maintenance` — backlog detection and the catch-up loop (`enabled`,
  `autoCatchupOnSessionStart`, `lintEveryDays`, `maxPerRun`, `cooldownMinutes`).
- `localModel` — optional local-model drafting into `_proposed/` (`enabled`,
  `provider`, `endpoint`, `model`, `draftTarget`, `tier`, `offlinePolicy`).
- `modelHints` — free-form per-task model hint map.

## Lockstep with the template

[`config.schema.json`](./config.schema.json) stays in lockstep with
[`../templates/default.config.json`](../templates/default.config.json): the
template is the seed config the plugin writes, and it MUST validate against this
schema. The `gate-07` config-schema check pins the two together — every default
in the template must be an allowed value, and every key must be a known
property. Change one and you change the other in the same commit, or the gate
fails.
