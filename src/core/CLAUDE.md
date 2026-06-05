# core — the engine primitives

`core/` holds the ~18 single-responsibility primitives the
[commands](../commands/CLAUDE.md) compose. Each one is small, pure where it can
be, and deterministic: sorted output, no network, no embeddings, no hidden
state. The canonical output schema lives here, and two modules are byte-for-byte
mirrors of bash twins in [`../../scripts/`](../../scripts/) so the hot-path hooks
and the engine never diverge. Tests are colocated `*.test.ts`, run with
`bun test`.

## Result model

[`report.ts`](./report.ts) is the canonical output schema for every command:
`Report` and `Finding` (severity `error` / `warn` / `info`), plus `buildReport`
(builds a frozen report and tallies errors/warnings), `renderText` (color-free,
CI-safe rendering), and `exitCode` (`1` on any error, else `0`). `Finding`
mirrors the `ERROR:` / `WARN:` lines emitted by the bash verifiers so the port
is checkable line-for-line.

## Grouped primitives

- **Verify checks** — [`schema.ts`](./schema.ts) (CHECK 0),
  [`index-check.ts`](./index-check.ts) (CHECK 1–2),
  [`moc.ts`](./moc.ts) (CHECK 3 / 3b + topic folders),
  [`staleness.ts`](./staleness.ts) (CHECK 4, cited-source staleness),
  [`provenance.ts`](./provenance.ts) (CHECK 5a/5b),
  [`graph.ts`](./graph.ts) (the one deterministic N≤2 link-walk).
- **Builders** — [`moc-build.ts`](./moc-build.ts): the idempotent MOC repairs
  `fix` applies (dedupe index links, sync `children`, build `_index` stubs).
- **IO** — [`fs.ts`](./fs.ts) (sorted, deterministic listing helpers),
  [`git.ts`](./git.ts) (checkpoint / heal-commit safety net),
  [`log.ts`](./log.ts) (append-only `wiki/log.md` writer).
- **Parsing** — [`frontmatter.ts`](./frontmatter.ts) (split `---` block, parse
  with the `yaml` lib), [`wikilinks.ts`](./wikilinks.ts) (extract `[[Target]]`),
  [`manifest.ts`](./manifest.ts) (schema-v2 source manifest).
- **Search support** — [`vocabulary.ts`](./vocabulary.ts) (the curated
  `_vocabulary.md` synonym lexicon), [`stem.ts`](./stem.ts) (pure Porter 1980
  stemmer), and [`graph.ts`](./graph.ts) again for opt-in neighbourhood
  expansion.

## Parity mirrors

- [`firewall.ts`](./firewall.ts) ↔
  [`../../scripts/firewall.sh`](../../scripts/firewall.sh) — write-isolation
  decision; pinned by `tests/gates/gate-11-firewall-parity.sh`.
- [`vault.ts`](./vault.ts) ↔
  [`../../scripts/resolve-vault.sh`](../../scripts/resolve-vault.sh) — the
  four-tier vault resolution.

## Dependency direction

Commands depend on `core`; `core` depends only on Node built-ins (`node:fs`,
`node:path`, `node:crypto`, `node:child_process`) plus the `yaml` library. Core
never imports from `commands/` or `cli/`.
