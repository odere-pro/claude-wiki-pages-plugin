# ADR-0030: Obsidian-accurate link resolution + `wikilink-collision` WARN check — one resolver, bash twin in parity

- **Status:** Proposed
- **Date:** 2026-06-15
- **Builds on:** [ADR-0008](./ADR-0008-graph-traversal-primitive.md) (one graph-traversal primitive), [ADR-0022](./ADR-0022-folder-notes-and-graph-quality.md) (folder notes + `graph-quality.sh`), [ADR-0023](./ADR-0023-wiki-only-graph.md) (wiki-only graph), [ADR-0028](./ADR-0028-dangling-wikilink-verify-check.md) (dangling-wikilink check + the shared resolution model it pins)
- **Anchor:** §4 (Layer 1 — Data), the `verify` command contract in [`../architecture.md`](../architecture.md), the engine↔bash parity contract (gate-05)
- **Owner:** Lane A (eng-retrieval) — `src/core/`, `scripts/verify-ingest.sh`, `tests/gates/gate-05-verify-parity.sh`

## Context

ADR-0028 gave `verify` a dangling-wikilink check built on a **flat resolvable set**: a link `[[T]]` resolves iff its normalised target is a member of `{ filename stem } ∪ { title: } ∪ { aliases: }` over all pages, case-insensitively. That set answers *does this link resolve to anything?* but cannot answer *which page does Obsidian open?* — it has no priority and no page association.

Obsidian does have a priority: it resolves `[[T]]` by **exact vault path > file basename (case-insensitive) > alias (case-insensitive)**, breaking ties by shortest path, then same-folder-as-source, then alphabetical. **A real file basename always beats an alias.** Because the engine's flat set treats basename and alias as equal members, two silent failure classes pass `verify` clean:

- **Collision (#18).** A name is the basename of one page and the alias of another. `[[install]]` resolves — but Obsidian routes to the thin `_sources/install.md` (basename) instead of the rich `how-it-works/installation.md` (alias). The link is "resolved" yet opens the wrong, often emptier, page. A title/alias-based reader can't see the misroute. On the dogfood vault this produced 15 colliding names and the observed "this link opens an empty/thin page" symptom.
- **Wrong edges for connectivity (#17).** Measuring whether the graph is one piece requires resolving each link to a specific page; the flat set can't, so connectivity (ADR-0031) needs a real resolver too.

The fix is one Obsidian-accurate resolver, consumed by the dangling check (membership-equivalent, no behavioural change), by a new collision check, and by the connectivity metric (ADR-0031).

## Decision

### 1. One resolver primitive: `src/core/link-resolver.ts`

`buildLinkIndex(wiki)` walks `wiki/` once and records, per normalised name, the pages that claim it at each tier (`byPath`, `byBasename`, `byAlias`, `byTitle`) plus the page set. `resolveLink(rawTarget, sourceRel, index)` applies the ladder:

1. **exact vault path** (wiki-relative, with or without `.md`),
2. **file basename**, case-insensitive,
3. **alias**, case-insensitive,
4. **title**, case-insensitive — see §3,

returning `{ file, kind }` or `null`. When a tier yields >1 candidate, the tie-break is **shortest vault-relative path → same folder as the source → alphabetical**, fully sorted for determinism (`sourceRel` exists only to serve the same-folder tie-break). The resolution rule lives in exactly one TS place; the python twins (verify-ingest.sh, graph-quality.sh) re-implement the same specification, pinned where a parity gate covers them (§5).

### 2. The dangling check keeps ADR-0028 semantics exactly — no count change

`wikilink-check.ts` is refactored to source its resolvable set from the index, but the set it tests against is exactly `byBasename ∪ byAlias ∪ byTitle` — **identical** to ADR-0028's flat set. The priority ladder and the `byPath` tier are **not** consulted by the dangling predicate. Therefore `verify`'s dangling WARN count is unchanged on every vault, and gate-05 stays green for the dangling rows with **no edit to the verify-ingest.sh dangling block**. Priority only changes *which* page a link routes to — a fact the collision and connectivity checks need, not the dangling check.

### 3. `title` kept as a fourth, lowest-priority tier — a deliberate superset of Obsidian

Obsidian does not resolve by frontmatter `title`. But ADR-0028 and all three current twins include `title` in the resolvable set, and gate-05 pins their agreement. Dropping `title` would change dangling counts and break that contract for no functional gain on a correct vault (where `title` is always the first alias). So the resolver keeps `title` as the lowest tier for the dangling membership set, and the **collision check excludes `title`** (Obsidian never resolves by it, so a title/basename overlap is not an Obsidian misroute — see §4). Pure-Obsidian fidelity (dropping `title` entirely) is recorded under *Revisit when*.

### 4. `wikilink-collision` — WARN-tier finding on the existing Report model

A new check `Finding{ severity: "warn", check: "wikilink-collision", … }` composes into `verify()` alongside the ADR-0028 dangling check — no new command, no new flag, same Report and `--json`. Because severity is `warn`, `exitCode` is unchanged; a collision never blocks a write, consistent with the Report's warning contract and with the dangling precedent.

- **Definition.** Build `claims: name → { distinct files }` over **basename ∪ alias** (the two tiers Obsidian actually resolves; `title` excluded per §3). A name **collides** iff it is claimed by ≥2 distinct pages. A page whose basename equals its own alias claims one file → never flagged.
- **Counting unit.** One finding per colliding **name** (not per reference), deterministically sorted by name.
- **Message.** Names the Obsidian winner (resolved by the ladder — basename beats alias, then the tie-break) and the shadowed loser(s), so a human can rename or drop the duplicate alias: `wikilink-collision: [[install]] resolves to 2 pages — Obsidian opens _sources/install.md (basename), shadowing how-it-works/installation.md (alias); rename or disambiguate`.

### 5. Parity strategy

`link-resolver.ts` is a library, not itself a check, so it has no standalone twin. The **collision check has a bash twin**: a new `wikilink-collision` python block in `scripts/verify-ingest.sh`, emitting one WARN per colliding name with the identical count and the identical winner/loser selection. gate-05 row 1 asserts `verify-ingest.sh` and engine `verify` produce the **same** error/warning counts on `tests/fixtures/reference-vault` — a relative equality, not an absolute pin. The collision count is measured on the reference vault and confirmed identical on both sides in the same change; the makeVault fixtures in `parity.test.ts` are likewise re-confirmed. If the resolver rule ever changes, it changes in the TS resolver and the verify-ingest.sh twin in one commit, or gate-05 fails.

## Alternatives considered

- **Drop `title` from resolution for pure-Obsidian fidelity.** Rejected for now: breaking change to the gate-05-pinned dangling count for no gain on a correct vault. Recorded under *Revisit when*.
- **Put collision in `graph-quality.sh` only (bash, no twin).** Rejected: a collision is a per-write quality signal of the same class as dangling (ADR-0028), so it belongs on the `verify` Report every consumer and hook already reads. `graph-quality.sh` keeps the richer connectivity role (ADR-0031).
- **ERROR severity.** Rejected: a collision is a curation signal, not a structural break; erroring would block legitimate in-progress vaults and force reference-vault surgery. WARN matches the advisory nature, as with dangling.
- **Flag collisions by reference count (per link).** Rejected: the name space is the property, not who links it; one finding per name is the actionable unit.

## Consequences

- `verify` becomes the single place silent-misroute collisions surface, for agents (`--json`) and humans (text), and for any hook that shells to the bash twin.
- The dangling check is unchanged in output; only its internal source-of-truth moves to the shared index.
- The reference vault gains whatever collision WARNs it honestly contains; `clean` stays `true` (warnings only); gate-05 stays green because both twins emit the identical count.
- Any future change to the resolution rule is a two-file edit (TS resolver + verify-ingest.sh twin) gated by gate-05 — the rule cannot fork.

## Revisit when

- A maintainer wants pure-Obsidian fidelity (drop the `title` tier): a deliberate, gate-05-re-pinned change to both twins, recorded as its own ADR.
- Obsidian changes its resolution priority or tie-break order, such that "resolves in the engine" and "opens in Obsidian" diverge again.
