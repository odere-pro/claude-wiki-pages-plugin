# core — the engine primitives

`core/` holds the ~21 single-responsibility primitives the
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
  [`git.ts`](./git.ts) (checkpoint / heal-commit safety net; every git call is
  bounded by `GIT_TIMEOUT_MS`, default 30 s, override
  `CLAUDE_WIKI_PAGES_GIT_TIMEOUT_MS`, so a stale `index.lock` can't hang the
  engine), [`log.ts`](./log.ts) (append-only `wiki/log.md` writer).
- **Concurrency** — [`vault-lock.ts`](./vault-lock.ts): an in-process, per-vault
  mutex (`withVaultLock` / `withVaultLockSync`) serializing the
  isClean→append/stash→commit critical sections in `snapshot`, `propose`,
  `migrate`, and `heal`. Companion to the cross-process flock in
  [`../../scripts/vault-lock.sh`](../../scripts/vault-lock.sh) — same invariant,
  different mechanism (in-process queue vs. flock), so it is NOT a byte-parity
  twin.
- **Parsing** — [`frontmatter.ts`](./frontmatter.ts) (split `---` block, parse
  with the `yaml` lib), [`wikilinks.ts`](./wikilinks.ts) (extract `[[Target]]`),
  [`manifest.ts`](./manifest.ts) (schema-v2 source manifest),
  [`ontology-profile.ts`](./ontology-profile.ts) (parse the `ontology-profile-v1`
  predicate/enum tables from the schema — shared by the `ontology` command and
  the `verify` entity-type check; lives in `core/` so neither command depends on
  the other).
- **Search support** — [`vocabulary.ts`](./vocabulary.ts) (the curated
  `_vocabulary.md` synonym lexicon), [`stem.ts`](./stem.ts) (pure Porter 1980
  stemmer), and [`graph.ts`](./graph.ts) again for opt-in neighbourhood
  expansion.

## Parity mirrors

- [`firewall.ts`](./firewall.ts) — the SOLE write-isolation decision authority.
  Since firewall-twin-retire (migration-plan.md Phase 3) the bash hook
  [`../../scripts/firewall.sh`](../../scripts/firewall.sh) is a thin
  stdin→engine wrapper (no independent `decide()`), so this is no longer a
  byte-for-byte twin — anti-drift is now `engine == checked-in GOLDEN verdict
  table` in `tests/gates/gate-11-firewall-parity.sh`.
- [`vault.ts`](./vault.ts) ↔
  [`../../scripts/resolve-vault.sh`](../../scripts/resolve-vault.sh) — the
  four-tier vault resolution.

## Dependency direction

Commands depend on `core`; `core` depends only on Node built-ins (`node:fs`,
`node:path`, `node:crypto`, `node:child_process`) plus the `yaml` library. Core
never imports from `commands/` or `cli/`.

## Tests-as-documentation gate

[`feature-coverage.ts`](./feature-coverage.ts) is a dev-time gate, not a runtime
primitive: it parses the FEATURE INDEX in
[`../../tests/scripts/CLAUDE.md`](../../tests/scripts/CLAUDE.md), the `@test`
titles, and the `Feature:` describe prefixes to assert the suite still reads as
the technical documentation (titles conform, the INDEX is fresh, every feature is
documented). It is invoked standalone by
[`../../tests/gates/gate-14-feature-coverage.sh`](../../tests/gates/gate-14-feature-coverage.sh)
and unit-tested by its colocated `feature-coverage.test.ts`. No command imports
it, so it stays out of the `dist/cli.js` bundle.
