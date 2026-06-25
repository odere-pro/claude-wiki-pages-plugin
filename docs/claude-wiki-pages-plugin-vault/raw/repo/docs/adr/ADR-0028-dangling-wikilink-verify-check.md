# ADR-0028: Dangling-wikilink WARN check in `verify` — one shared resolution model, bash twin in parity

- **Status:** Proposed
- **Date:** 2026-06-14
- **Builds on:** [ADR-0008](./ADR-0008-graph-traversal-primitive.md) (one graph-traversal primitive), [ADR-0022](./ADR-0022-folder-notes-and-graph-quality.md) (folder notes + `graph-quality.sh` dangling scanner), [ADR-0023](./ADR-0023-wiki-only-graph.md) (wiki-only graph)
- **Anchor:** §4 (Layer 1 — Data), the `verify` command contract in [`../architecture.md`](../architecture.md), the engine↔bash parity contract (gate-05)
- **Owner:** Lane A (eng-retrieval) — `src/core/`, `scripts/verify-ingest.sh`, `tests/gates/gate-05-verify-parity.sh`

## Context

The Bun engine's `verify` checks structural integrity (CHECK 0–5, composed in
[`../../src/commands/verify/verify.ts`](../../src/commands/verify/verify.ts))
but does **not** detect dangling `[[wikilinks]]` — links whose target resolves
to no page. Those render as empty grey nodes in Obsidian's graph. The gap is
filled today only by [`../../scripts/graph-quality.sh`](../../scripts/graph-quality.sh),
a read-only advisory scanner the `fill-gaps` skill calls; nothing on the
`verify` path reports them, so a half-linked page passes the gate the rest of
the stack binds to.

Lane A (FU1) proposes surfacing dangling links **inside** `verify` so they ride
the same Report, the same `--json`, and the same hooks every other check uses.
Two design pressures shape the decision: this touches a §6-adjacent shared
mechanism (the `verify` Report and its gate-05 bash twin), and a dangling link
is a quality signal, not a structural defect — it must not change the exit code
or block a write.

## Decision

### 1. WARN-tier finding on the existing Report model — no new surface

The check emits `Finding{ severity: "warn", check: "wikilink-dangling", … }`
through the existing [`../../src/core/report.ts`](../../src/core/report.ts)
`Finding`/`Report` model. There is **no** new command, no new output surface,
no new flag. It composes into `verify()` alongside CHECK 0–5; `renderText`
already renders WARN lines and `--json` already carries them. Because severity
is `warn`, `exitCode` is unchanged (`1` only on error) — a dangling link never
blocks a write or fails the gate, consistent with the Report model's warning
contract.

### 2. One shared resolution model, identical in TS and bash

There is exactly one resolution rule, and it is the one
[`../../scripts/graph-quality.sh`](../../scripts/graph-quality.sh) already
implements (DRY, §5 — no second source of truth). A link `[[Target]]` resolves
iff, **case-insensitively**, its normalized target equals some page's filename
stem, its `title:`, or one of its `aliases:`. Normalization:

- Strip a trailing `|alias` (everything from the first `|`).
- Strip a `#heading` and a `^block` anchor (everything from the first `#`/`^`).
- `strip().lower()` the remainder.

Resolution-set construction mirrors the scanner exactly:

- Scan every `.md` under `wiki/`, **frontmatter included** — `title:` and
  `aliases:` (inline-array and block-list forms) both contribute resolvable
  names, exactly as `parse_title_aliases` in the scanner.
- **BOOKKEEPING pages are skipped** as link _subjects_ (their links are not
  scanned for danglers): the root `index` / `log` / `manifest`, any `_index`,
  and dashboard pages — the same bookkeeping set `verify`'s page-level checks
  already skip. (`_sources/` and `_synthesis/` pages remain in scope as
  subjects, matching the scanner, which only exempts them from the cluster
  metric — not from the dangling scan.)

No space↔hyphen fuzzing: that exact mismatch is what produces empty nodes, so
the resolver must be strict. This rule is **the same constant** in both
implementations; if it ever changes, it changes in both in one commit, or
gate-05 fails.

### 3. Counting unit: one finding per (page, distinct-normalized-target)

A page that links a missing `[[Foo]]` three times yields **one** finding; a
page that links `[[Foo]]` and `[[Bar]]`, both missing, yields **two**. The
counting key is `(page, normalized-target)` — deduplicated on the normalized
form so `[[Foo]]` and `[[foo#intro]]` on the same page count once. This is the
unit gate-05 compares: the bash twin in
[`../../scripts/verify-ingest.sh`](../../scripts/verify-ingest.sh) must emit the
**identical warning count** as the TS check, on `docs/vault-example` and on the
fixtures.

### 4. Reference vault gains ~4 distinct dangling targets (10 findings) — left as WARN

Measured on `docs/vault-example` today (`graph-quality.sh --json`): **4
distinct dangling targets** — `wikilink`, `wikilinks`, `Page Title`,
`Source Title` — across **10** `(page, target)` findings. These are
documentation placeholders in prose that _explains_ wikilink syntax (e.g.
`patterns/provenance-tracked-wiki.md` writes `[[Page Title]]` as an example),
not broken knowledge links.

So `verify docs/vault-example` will go from **0** to **10** WARN findings, and
gate-05 must be re-pinned to that count. The clean (zero-error) status is
unaffected — these are warnings, not errors. **Recommendation: cleaning
vault-example is out of scope for FU1.** The reference vault is schema-pinned
and must not be edited by this team (it is the shipped parity anchor); rewriting
example prose to dodge an advisory warning would distort the docs to serve a
gate. The ~4 WARN findings are accepted as the honest, expected output of a
correct check on a vault that legitimately contains syntax examples. If a
maintainer later wants them silenced, that is a separate Lane D content task,
not a prerequisite for landing the check.

## Alternatives considered

- **A new `wikilinks` command (or a `verify --links` flag).** Rejected: a new
  surface where extending `verify` works (§5 KISS/YAGNI). The signal belongs on
  the same Report every consumer already reads.
- **ERROR severity (block on dangling).** Rejected: a dangling link is a
  quality/curation signal, not a structural break — erroring would block
  legitimate in-progress drafts and the syntax-example prose above, and would
  force vault-example surgery. WARN matches the advisory nature.
- **Reuse `graph-quality.sh` output by shelling out from `verify`.** Rejected:
  `verify`'s bash twin must stay self-contained bash (gate-05 runs it
  standalone), and the engine `verify` must not depend on python3. The rule is
  shared as a _specification_ (this ADR + colocated tests), re-implemented
  natively on each side and pinned by the parity gate — the same pattern as the
  firewall twin (gate-11).
- **Space↔hyphen fuzzy resolution (treat `[[My Page]]` as resolving
  `my-page.md`).** Rejected: that fuzzing hides exactly the mismatch that
  produces empty Obsidian nodes; the resolver is deliberately strict.

## Consequences

- `verify` becomes the single place dangling links surface, for agents (`--json`)
  and humans (text), and for any hook that already shells to the bash twin.
- `docs/vault-example` verify output gains ~4 distinct (10 total) WARN findings;
  `clean` stays `true`; gate-05's pinned counts are bumped accordingly in the
  same PR.
- `graph-quality.sh` keeps its richer role (per-target ref counts, the cluster
  metric) for the `fill-gaps` skill; the `verify` check is the lean gate-path
  twin of its dangling scan, not a replacement.
- Any future change to the resolution rule is a two-file edit (TS + bash) gated
  by gate-05 — the rule cannot fork.

## Revisit when

- A controlled-vocabulary / alias-expansion change (Lane B tag taxonomy, synonym
  lexicon) makes resolution want to consider synonyms — that is a deliberate
  widening, recorded as its own ADR, applied to both twins at once.
- Obsidian changes link-resolution semantics (e.g. introduces case-sensitive or
  fuzzy matching by default) such that "resolves in the engine" and "renders in
  Obsidian" diverge.
