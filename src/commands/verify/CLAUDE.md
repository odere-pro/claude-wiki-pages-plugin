# verify — deterministic vault integrity

`verify` is the read-only integrity check at the heart of the engine: it resolves
the vault, walks `wiki/`, and composes the ported CHECK 0–5 from
[`../../../scripts/verify-ingest.sh`](../../../scripts/verify-ingest.sh) into one
frozen [`Report`](../../core/report.ts). Same vault in, same findings out — no
writes, no network, no ML. It is the single source of truth the rest of the stack
binds to: [`doctor`](../doctor/CLAUDE.md) D09 calls it, [`heal`](../heal/CLAUDE.md)
loops on it, and the Layer 4 hooks shell out to its bash twin. The command itself
is thin — [`verify.ts`](./verify.ts) is just the composition; every check lives in
[`../../core/`](../../core/CLAUDE.md).

## Input and flags

- `claude-wiki-pages verify` — verify the resolved vault (four-tier resolution via
  [`resolveVault`](../../core/vault.ts)).
- `--target <vault>` — explicit vault path, bypassing resolution.
- `--json` — emit the structured `Report` instead of the human text rendering.

A missing vault directory short-circuits to a single `error`-severity `vault`
finding rather than throwing.

## The composed checks (CHECK 0–5)

`verify()` concatenates the findings of eight pure check functions, each a port of
a labelled block in the bash verifier. They map onto the spec's logical CHECK
numbering as follows.

| Check | Core function | Module | Severity on fail |
| --- | --- | --- | --- |
| CHECK 0 — schema_version | `checkSchema` | [`schema.ts`](../../core/schema.ts) | error |
| CHECK 1 — index duplicates / pages missing from index | `checkIndex` | [`index-check.ts`](../../core/index-check.ts) | error / warn |
| CHECK 2 — `sources:` use `[[wikilinks]]` | `checkSourcesFormat` | [`index-check.ts`](../../core/index-check.ts) | error |
| CHECK 3 — `_index.md` consistency | `checkIndexConsistency` | [`moc.ts`](../../core/moc.ts) | error / warn |
| CHECK 3b — orphan source summaries | `checkOrphanSources` | [`moc.ts`](../../core/moc.ts) | warn |
| topic-folder — every topic folder has `_index.md` | `checkTopicFolders` | [`moc.ts`](../../core/moc.ts) | error |
| CHECK 4 — cited-source staleness | `checkCitedSourceStaleness` | [`staleness.ts`](../../core/staleness.ts) | warn |
| CHECK 5 — wikilink/citation provenance | `checkProvenance` | [`provenance.ts`](../../core/provenance.ts) | error / warn |

### Severity model

`checkSchema` and `checkOrphanSources` also emit `info`-severity findings (no
`CLAUDE.md`, no `_sources/` directory). These mirror the two bash `yellow` lines
that are printed but intentionally NOT counted — informational skips, not
warnings. Counting them would diverge from the bash verifier.

## Report and exit-code semantics

`verify` returns the shared [`Report`](../../core/report.ts) directly:
`{ command, vault, findings, errors, warnings, clean }`, where `clean` is
`errors === 0`. The router maps it through `renderText` (human) or
`JSON.stringify` (`--json`), and `exitCode` returns `1` on any error-severity
finding, else `0` — matching the bash verifier's exit contract. Warnings never
change the exit code.

## The parity gate

[`parity.test.ts`](./parity.test.ts) spawns
[`../../../scripts/verify-ingest.sh`](../../../scripts/verify-ingest.sh) on the
shared `CLEAN_VAULT` and `DIRTY_VAULT` fixtures and asserts the TypeScript engine
yields the identical error/warning counts. The CI gate
`tests/gates/gate-05-verify-parity.sh` pins the same invariant, so the Bun port can
never silently drift from the bash hot path the Layer 4 hooks rely on. When you
add or change a check here, update the bash twin in the same commit or the gate
fails.

## Edge cases

- An unreadable file degrades to empty content (`readFileSafe` returns `null`),
  never a throw — a verify run always completes.
- Bookkeeping pages (`index`, `log`, `_index`, `manifest`, `dashboard`,
  `.gitkeep`) are skipped by the page-level checks; they are targets, not
  subjects.
- `_sources/` and `_synthesis/` subtrees are exempt from provenance-completeness:
  source pages are the citations, not the citing pages.

## Covered by

- [`verify.test.ts`](./verify.test.ts) — per-check behavior on synthesized vaults.
- [`parity.test.ts`](./parity.test.ts) — byte-level agreement with the bash twin.
