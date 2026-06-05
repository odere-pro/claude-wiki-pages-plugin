# Plan 0004 — Vault `merge` conflict resolution (design note)

> **Promoted to [ADR-0012](../adr/ADR-0012-vault-merge-conflict-resolution.md) (design accepted; implementation deferred).** This note is superseded by that ADR, which records the signed-off design and the binding build preconditions.

- **Status:** Proposed
- **Date:** 2026-06-05
- **Owner:** Architect (design); PM (scope sign-off before any implementation)
- **Decision anchor:** decision #3 (multi-vault, one active vault); S3 deferred `merge` as the hard
  part (`docs/adr/ADR-0009-multi-vault-confinement.md:19` — "`merge` is explicitly **not** in this
  set (Phase 3)")
- **Scope:** DESIGN ONLY — the PM greenlit designing `merge`, not building it. No code, no fixtures.

> [!summary]
> S3 (ADR-0009) shipped the additive `vaults[]` registry and `add`/`remove`/`switch`, deferring the
> reconciliation step — `merge` — as the hard part. This note designs how to merge one *registered*
> vault's content **into the active vault**, reusing four shipped mechanisms and adding no new one:
> the two-pass dedup model (`skills/ingest/SKILL.md`), the `_proposed/` review gate
> (`src/commands/propose/propose.ts`), the per-vault firewall confinement (ADR-0009), and the git
> commit seam (`src/core/git.ts`). The load-bearing safety property: **merge READS the source vault
> and WRITES only into the active vault** — it is a write *to the active vault*, so S3 confinement
> governs it unchanged and is never weakened.

## Context

The vault registry is additive: `add`/`remove`/`switch` record and select vaults but never move
content (`docs/adr/ADR-0009-multi-vault-confinement.md:19`). `merge` is the deferred operation that
*consolidates* — it takes a second registered vault and folds its wiki content into the active one,
deduplicating by `sources` and title and flagging collisions for human review (the behaviour the
glossary already pins for `vault merge`). It is "the hard part" because content from two
independently-grown vaults will collide: same titles, same sources, divergent claims about the same
entity. Auto-merging those blind would either silently lose data or fabricate a reconciliation no
human approved — both unacceptable under §5 (provenance is structural) and §6 (no second source of
truth).

The discipline this note holds to: **reuse, do not invent.** Every step maps onto a mechanism
already in the shipped tree. `merge` is an orchestration of existing parts, not a new subsystem.

## 1. Conflict detection

`merge` first reads the **source** vault (read-only) and the **active** vault and classifies every
incoming page against four collision kinds. Detection is deterministic — exact string/identity
comparison, never similarity (§5 NO-RAG):

- **Title collisions.** An incoming page whose `title` (or any `aliases` entry) exact-matches a
  page already in the active vault. This reuses the dedup matcher directly — the two-pass existence
  check (`skills/ingest/SKILL.md:90`, pass 1 exact title, pass 2 alias-aware) is the same identity
  test, applied across vaults instead of within one.
- **Same-source collisions.** An incoming page whose `sources[]` contains a source wikilink already
  present on a page in the active vault — i.e. both vaults drew on the same underlying raw source.
  This is the strongest signal that the two pages describe the same thing and should be *one* page
  (the entity-distribution rule, `docs/vault-example/CLAUDE.md:371`: one source rewrites/extends
  existing pages rather than spawning a duplicate).
- **Frontmatter / `schema_version` mismatches.** The two vaults may declare different
  `schema_version` (the engine supports `[1, 2]`, `src/core/schema.ts:7`) or carry frontmatter
  shapes that differ per type. A version mismatch is detected up front and resolved by **migrating
  the source content to the active vault's version first** (reuse `migrate`,
  `src/commands/migrate/migrate.ts`) before any page-level reconciliation — merge never mixes two
  schema versions in one vault.
- **Wikilink-target collisions.** An incoming page references a `[[target]]` that resolves to a
  *different* page in the active vault than it did in the source vault (the same display name points
  at two different entities across the vaults). Detected by resolving every incoming wikilink
  against both vaults' title/alias maps and flagging where the resolution diverges — these are the
  links that would silently re-point after a naive copy.

## 2. Resolution semantics

Resolution reuses the **two-pass dedup model** and routes anything that is not a clean dedup to the
**one `_proposed/` review gate** — never an auto-merge of divergent content.

- **Clean dedup → UPDATE-not-duplicate.** When an incoming page and an active page are the same
  entity (matched by `sources[]` + title/alias, §1), apply the existing rule: **extend the active
  page rather than create a duplicate** (`skills/ingest/SKILL.md:101`,
  `docs/vault-example/CLAUDE.md:371`). The active page gains the incoming page's `sources[]` (union),
  its `update_count` increments, `updated` is stamped — exactly the merge-into-existing behaviour
  ingest already performs when a new source touches an existing page. No human review needed for a
  clean dedup because nothing is in conflict; the two pages agree and are unioned.
- **New page (no collision) → place directly.** An incoming page with no title/source/wikilink
  collision is new to the active vault. It is written into the correct topic folder of the active
  vault with `parent`/`path` set, like any ingested page. (Still a write to the active vault — §3.)
- **TRUE conflict → flag to `_proposed/` for human review.** When two pages are the same entity but
  carry **divergent claims** (contradictory `confidence`, conflicting facts, incompatible
  frontmatter the union cannot reconcile), `merge` does **not** pick a winner. It writes the
  incoming version as a **draft** into the active vault's `_proposed/wiki/<topic>/<page>.md` carrying
  `proposed_by: "merge:<source-vault>"` and `status: draft`, so a human resolves it through the
  existing `review`/`approve`/`reject` surface (`src/commands/propose/propose.ts`). This reuses the
  one `_proposed/` channel (§6 — no second review path): the merge proposes, the human disposes,
  and the draft is outside every wiki-scoped check until promoted, so a conflict can never pollute
  the active wiki. Wikilink-target collisions (§1) that cannot be auto-resolved are flagged the same
  way.

The split is the safety boundary: **agreement is unioned automatically; divergence is escalated to
review.** No divergent claim is ever silently merged.

## 3. The firewall invariant (load-bearing safety property)

> **Merge READS from the source vault and WRITES only into the active vault — never the reverse —
> and must NOT weaken cross-vault confinement.**

This is the property that keeps `merge` safe and must be stated and tested as such. The reasoning:

- Merging *into* the active vault is, mechanically, a sequence of writes *to the active vault*.
  Those writes are governed by the **same** S3 per-vault confinement that governs every other write
  — the firewall's active-vault allow (`src/core/firewall.ts:174`, `is_under "$VAULT_ABS"`
  `scripts/firewall.sh`) and the `cross-vault` deny for any inactive registered vault
  (`src/core/firewall.ts:164-168`, `scripts/firewall.sh:232-242`; precedence
  deny → cross-vault → vault → allowPaths → outside-vault). ADR-0009's confinement, verified across
  16 paths including symlinks, applies to the merge path with **zero changes**.
- The **source vault is read-only** during merge. `merge` opens it only to read pages and resolve
  links; it never writes there. Crucially, this means merge does **not** need — and must not take —
  any relaxation of the `cross-vault` rule. A naive "merge writes to both vaults" design would
  require punching a hole in confinement; this design forbids that by construction. The source
  vault stays an inactive registered vault, and any *write* aimed at it would correctly hit the
  `cross-vault` deny.
- Therefore `merge` introduces **no new firewall surface and no new allow path**. It is confined
  exactly as a normal active-vault edit is. The first-cut implementation must assert this: a merge
  run produces only writes under the active vault root; an attempt to write the source vault during
  merge is blocked by the existing `cross-vault` rule, not by special-case merge logic.

Stating it plainly: the registry made other vaults *knowable*; `merge` makes one of them *readable*
as a source — but the **write boundary is unchanged**, still exactly one active vault. That is what
lets `merge` reuse all of ADR-0009 instead of relaxing any of it.

## 4. Reversibility

`merge` is a **single git-committed operation**, revertible like every other structural write. It
reuses the git seam in `src/core/git.ts`:

- Before mutating, write a checkpoint of the active vault's pre-merge state (`checkpoint`,
  `src/core/git.ts:97`) so the exact prior state is recoverable.
- Perform all merge writes (dedup unions, new-page placements, `_proposed/` drafts) into the active
  vault.
- Commit the whole merge as one labelled commit using the engine's bookkeeping identity (`commit`,
  `src/core/git.ts:126`; `COMMIT_IDENTITY`, `src/core/git.ts:42`), e.g.
  `merge: claude-wiki-pages <source-vault> -> active`.
- Rollback is `git revert <merge-commit>` (or checkout of the checkpoint) — the standard reversible
  path the heal/propose flows already rely on (decision #4: undo/checkpoints ride git). Conflict
  drafts left in `_proposed/` are reverted along with the rest, so a reverted merge leaves no
  orphaned drafts.

One commit = one atomic, revertible merge. A user who dislikes the result reverts once and is back
to the pre-merge active vault, with the source vault untouched (it was read-only).

## 5. Out of scope for the first cut (deferred explicitly)

The first cut is a **dedup-and-flag** merge, deliberately narrow. The following are out of scope and
deferred:

- **Three-way merge.** No common-ancestor reconciliation; the first cut compares source-vault pages
  against the active vault as-is (a two-way fold), not a 3-way merge with a base.
- **Git history reconciliation.** The two vaults' git histories are **not** merged. `merge` folds
  *content* into the active vault as new commits; it does not graft the source vault's commit DAG.
  The source vault's history stays in the source vault.
- **Rename detection.** No heuristic detection that an active-vault page and an incoming page are
  the same entity under different titles with no shared source. The first cut matches on exact
  title/alias and `sources[]` only; an un-aliased rename is treated as two pages (and a human can
  alias-and-re-merge, or merge the duplicates via a later curator pass).
- **Automatic conflict resolution of divergent claims.** Never auto-resolved — always flagged to
  `_proposed/` (§2). Picking a winner between contradictory claims is a human decision by design.
- **Bidirectional / N-way merge.** One source vault into the active vault, one direction, per
  operation. Merging three vaults is three sequential merges, each reviewed.
- **Source-vault deletion on merge.** `merge` never deletes or deregisters the source vault (that
  is `remove`, and `remove` never deletes data either — ADR-0009). A user merges, reviews, then may
  separately `remove` the now-consolidated source vault.

## §5 / §6 compliance check

- **§5 (NO-RAG absolute):** all detection and dedup is exact string/identity comparison
  (title/alias match, `sources[]` membership, wikilink resolution) — never vector similarity. No
  embeddings anywhere on the merge path.
- **§5 (provenance structural):** the source vault is read-only; merged pages carry the union of
  real `sources[]`; divergent claims go to human review rather than being silently reconciled. No
  claim loses its traceable origin.
- **§6 (one mechanism each):** dedup reuses the ingest two-pass model; conflict flagging reuses the
  one `_proposed/` channel; confinement reuses the one firewall (unweakened); atomicity reuses the
  one git commit seam. `merge` adds **no** second source of truth and **no** new safety surface.

## Promotion path

This `docs/plan/0004` note records the design. On PM scope sign-off it is promoted to an ADR (the
binding record of the merge contract — detection kinds, the union-vs-flag boundary, the read-source
/ write-active invariant, single-commit reversibility, and the deferred scope), and this file is
marked superseded-by that ADR. Implementation does not begin before that sign-off (the PM greenlit
*designing* merge, not building it).
