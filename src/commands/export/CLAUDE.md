# export — wiki page export

`export` converts the wiki into plain markdown that can be consumed without Obsidian.
It is the Bun/TS migration of `scripts/distribute-wiki.sh` (Phase 1,
`tmp/migration-plan.md`).

## Modes

| Mode | Output | Trigger |
| ---- | ------ | ------- |
| single (default) | `<vault>/output/wiki.md` — all pages concatenated | no flag |
| tree | `<vault>/output/wiki/` — one file per page, mirroring `wiki/` | `--tree` |

Output lives under `<vault>/output/` which is schema-free, git-ignored scratch space
per vault `CLAUDE.md`. No hook or validator touches it.

## Flags

| Flag | Effect |
| ---- | ------ |
| `--target <vault>` | Override the resolved vault path. |
| `--links` | Render `[[Title]]` as `[Title](title-slug.md)` instead of flattening to `Title`. |
| `--tree` | Mirror-tree mode: one file per wiki page. |
| `--clean` | Remove the existing output target before writing. |
| `--json` | Emit the structured `ExportReport` (wired by the router in `src/cli/cli.ts`). |

## Transformation rules

1. **Frontmatter stripped** — the leading `--- … ---` YAML block is removed from
   every page before output.
2. **Wikilink flattening (default)** — `[[Target]]` → `Target`;
   `[[Target|Display]]` → `Display`.
3. **Wikilink conversion (`--links`)** — `[[Target]]` → `[Target](target-slug.md)`;
   `[[Target|Display]]` → `[Display](target-slug.md)`.
   Slug rules: lowercase, `[^a-z0-9]+` → `-`, trim leading/trailing hyphens.

## Section ordering (single-file mode)

Matches `scripts/distribute-wiki.sh` `collect_paths()` for dual-run equivalence:

1. `wiki/index.md` (always first)
2. `wiki/log.md` (always second)
3. Topic folders (sorted alphabetically), each with:
   - Folder note (`<dir>/<dirname>.md` with `type: index`) or `_index.md` first.
   - Children sorted alphabetically.
   - Folders whose name begins with `_` (e.g. `_sources`, `_synthesis`) are skipped
     in this pass.
4. `wiki/_sources/` pages (sorted).
5. `wiki/_synthesis/` pages (sorted).

## ExportReport

```ts
interface ExportReport {
  command: "export";
  vault: string;         // resolved vault path
  ok: boolean;           // false when vault/wiki not found
  mode: "single" | "tree";
  count: number;         // pages written
  output: string;        // absolute path to the output file or directory
  message: string;       // "READY: N pages …" mirrors bash script stdout
}
```

Exit code is `0` on success and `1` on error (vault not found).
The router (once wired in `src/cli/cli.ts`) maps `ok: false` to exit code 1.

## Covered by

- [`export.test.ts`](./export.test.ts) — 36 tests covering single/tree/links/clean
  modes, section ordering, slug generation, determinism, error handling.
  Coverage target: ≥ 80% on `export.ts`.

## Migration status

This module is the TypeScript implementation of `scripts/distribute-wiki.sh`.
Dual-run equivalence (same page count on `tests/fixtures/reference-vault`) and
bash-logic retirement are deferred to the integration step per
`tmp/migration-plan.md` Phase 1 workflow.
