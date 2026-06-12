# migrate — additive schema upgrade

`migrate` upgrades a vault's declared `schema_version` to the version this build
supports. The upgrade is strictly additive and git-bounded: from v1 → v2 it (1)
bumps the `schema_version` in `vault/CLAUDE.md`, (2) writes the new `topic` and
`project` templates into `_templates/` when absent, and (3) generates the source
manifest at `wiki/_sources/manifest.md` when absent. From v2 → v3 it additionally
renames each legacy `wiki/**/_index.md` to its folder note `<dir>/<dirname>.md`
and rewrites the `[[…/_index]]` wikilink forms across `wiki/`; a rename whose
target filename already exists is reported and skipped (the leftover `_index.md`
then carries verify's `legacy-index-filename` WARN). The new optional fields
(`source_quotes`, `derived`) are NOT backfilled into existing pages — they are
optional, so untouched pages stay valid, and ingest adds them lazily. The plan is a
dry-run by default; `--write` applies it under a checkpoint commit. The handler in
[`migrate.ts`](./migrate.ts) composes the manifest builder, the templates, and the
git helpers.

## Input and flags

- `claude-wiki-pages migrate` — show the plan (dry-run); writes nothing.
- `claude-wiki-pages migrate --write` — apply the plan under a checkpoint commit.
- `--target <vault>` — explicit vault path.
- `--json` — emit the structured `MigrateReport`.

`today`, `opId`, and `isoTime` are injectable on the programmatic API for
deterministic tests.

## The planned writes

| Action | Source | Gate |
| --- | --- | --- |
| `bump-schema` | `bumpSchemaVersion` in [`migrate.ts`](./migrate.ts) | `from === null` or `from < to` |
| `add-template` | `TOPIC_TEMPLATE` / `PROJECT_TEMPLATE` from [`../../data/templates.ts`](../../data/templates.ts) | template file absent |
| `generate-manifest` | `buildManifest` from [`../../core/manifest.ts`](../../core/manifest.ts) | `wiki/_sources/` exists and manifest absent |
| `rename-index` | `planIndexRenames` in [`migrate.ts`](./migrate.ts) | a legacy `wiki/**/_index.md` exists and its folder-note target `<dir>/<dirname>.md` is free (v3); conflicts are reported and skipped |
| `rewrite-links` | `rewriteIndexLinks` in [`migrate.ts`](./migrate.ts) | a wiki page contains `[[…/_index]]`, `[[…/_index\|label]]`, or bare `[[_index]]` links into a renamed folder |

The target version is `CURRENT_SCHEMA_VERSION` from
[`../../core/schema.ts`](../../core/schema.ts); the declared starting version is
read with `declaredSchemaVersion`. Each write is gated on absence or staleness, so
nothing is overwritten and re-running is a no-op.

## Idempotency and git-bounding

When `--write` is set, `migrate` calls `ensureRepo` + `checkpoint` (from
[`../../core/git.ts`](../../core/git.ts)) before touching the tree, applies every
planned write, records the operation via [`../../core/log.ts`](../../core/log.ts),
and squashes it into one `migrate:` commit — reversible with `git revert`. Push
happens only when `gitCheckpoint.push === "auto"` (see
[`../config/CLAUDE.md`](../config/CLAUDE.md)). A vault already at the current
version plans zero changes and reports `Already at schema_version N`.

## MigrateReport

```ts
interface MigrateReport {
  command: "migrate";
  vault: string;
  from: number | null;   // declared version before migration
  to: number;            // CURRENT_SCHEMA_VERSION
  applied: boolean;      // false on dry-run / no-op
  changes: readonly MigrateChange[]; // { file, action }
  checkpoint: string | null;
  message: string;       // PLAN / MIGRATED / Already-at / not-found
}
```

The router prints one `PLAN`/`MIGRATED [action] file` line per change plus the
message. Exit code is `1` only on a hard failure (`Vault not found` / `No
CLAUDE.md`), else `0`.

## Edge cases

- A missing vault or absent `vault/CLAUDE.md` is a hard failure (exit `1`) — there
  is nothing to migrate.
- A vault with no `wiki/_sources/` directory skips the manifest step; the schema
  bump and templates still apply.
- Backtick-wrapped `schema_version` forms (`` `schema_version`: `1` ``) are
  preserved by the bump regex.

## Covered by

- [`migrate.test.ts`](./migrate.test.ts) — dry-run plan, `--write` apply under a
  checkpoint, idempotent re-run, and the no-op-when-current path.
