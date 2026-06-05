# ADR-0012: Vault `merge` conflict resolution — dedup-and-flag, source-read / active-write

- **Status:** Accepted (design accepted; **implementation deferred** per the PM's Phase-3 verdict —
  the decision is binding, the build is not yet scheduled)
- **Date:** 2026-06-05
- **SPEC anchor:** §6 (Layer 4 — vault management, firewall); Brief §5 (one active vault, NO-RAG),
  §6 (one mechanism); decision #3

## Context

S3 (`docs/adr/ADR-0009-multi-vault-confinement.md`) shipped the additive `vaults[]` registry and the
`add`/`remove`/`switch` lifecycle, and deliberately deferred `merge` as the hard part
(`docs/adr/ADR-0009-multi-vault-confinement.md:19` — "`merge` is explicitly **not** in this set
(Phase 3)"). `merge` is the reconciliation step that consolidates a second registered vault's content
into the active vault. It is the hard part because content from two independently-grown vaults
collides — same titles, same sources, divergent claims about the same entity — and auto-merging those
blind would either silently lose data or fabricate a reconciliation no human approved, both
unacceptable under §5 (provenance is structural) and §6 (no second source of truth).

Plan 0004 designed the reconciliation; the PM **signed off on the design** and directed it be
promoted to an ADR with **implementation deferred** (not yet scheduled) and three binding
preconditions for whenever the build is taken up. This ADR is that record. It changes no code; it
fixes the contract a future implementation must satisfy.

The discipline 0004 held, and this ADR ratifies: **reuse, do not invent.** Every step maps onto a
mechanism already in the shipped tree — the two-pass dedup matcher (`skills/ingest/SKILL.md`), the one
`_proposed/` review gate (`src/commands/propose/propose.ts`), the per-vault firewall confinement
(ADR-0009), and the git commit seam (`src/core/git.ts`). `merge` is an orchestration of existing
parts, not a new subsystem.

## Decision

Adopt vault `merge` as a **dedup-and-flag, two-way, one-direction (source → active)** reconciliation.
It reads a second registered vault and folds its content into the active vault, deduplicating by
`sources` and title and escalating true conflicts to human review — never auto-resolving them.

**Detection.** `merge` reads the source vault (read-only) and the active vault and classifies every
incoming page against four collision kinds, all by **exact string/identity** comparison — never
similarity (§5 NO-RAG):

- **Title / alias collisions** — incoming `title` or any `aliases` entry exact-matches an active-vault
  page. Reuses the two-pass existence check (`skills/ingest/SKILL.md` — pass 1 exact title, pass 2
  alias-aware) across vaults.
- **Same-source (`sources[]`) collisions** — an incoming `sources[]` wikilink already present on an
  active-vault page; the strongest "same entity" signal (entity-distribution rule,
  `docs/vault-example/CLAUDE.md`).
- **Frontmatter / `schema_version` mismatches** — detected up front and resolved by migrating the
  source content to the active vault's version **first** (reuse `migrate`,
  `src/commands/migrate/migrate.ts`); `merge` never mixes two schema versions in one vault.
- **Wikilink-target collisions** — an incoming `[[target]]` that resolves to a different page in the
  active vault than it did in the source vault; detected by resolving every incoming link against
  both vaults' title/alias maps and flagging divergence.

**Resolution.** Reuse the two-pass dedup matcher; route anything that is not a clean dedup to the one
`_proposed/` review gate:

- **Agreement → UPDATE-not-duplicate.** When an incoming page and an active page are the same entity
  (matched by `sources[]` + title/alias), extend the active page rather than create a duplicate
  (`skills/ingest/SKILL.md`, `docs/vault-example/CLAUDE.md`): union `sources[]`, bump `update_count`,
  stamp `updated`. No review needed — the pages agree.
- **New page (no collision) → place directly** into the correct active-vault topic folder with
  `parent`/`path` set, like any ingested page.
- **Divergence → flag to `_proposed/`, NEVER auto-resolved.** When two pages are the same entity but
  carry contradictory claims (conflicting facts/confidence the union cannot reconcile), `merge` writes
  the incoming version as a **draft** into the active vault's `_proposed/wiki/<topic>/<page>.md`
  carrying `proposed_by: "merge:<source-vault>"` and `status: draft`, for a human to resolve through
  the existing `review`/`approve`/`reject` surface (`src/commands/propose/propose.ts`). This reuses
  the one `_proposed/` channel (§6 — no second review path): the merge proposes, the human disposes,
  and the draft is outside every wiki-scoped check until promoted, so a conflict can never pollute the
  active wiki. Unresolvable wikilink-target collisions are flagged the same way.

The split is the safety boundary: **agreement is unioned automatically; divergence is escalated to
review.**

**The load-bearing firewall invariant.** Merge **READS from the source vault and WRITES only into the
active vault, never the reverse.** Merging-in is mechanically a sequence of writes *to the active
vault*, governed by the **same** ADR-0009 per-vault confinement as every other write — the active-vault
allow (`src/core/firewall.ts:174`, `is_under "$VAULT_ABS"` in `scripts/firewall.sh`) and the
`cross-vault` deny for any inactive registered vault (`src/core/firewall.ts:164-168`,
`scripts/firewall.sh:232-242`; precedence deny → cross-vault → vault → allowPaths → outside-vault).
ADR-0009 confinement applies to the merge path with **zero changes and no new allow path**. The source
vault stays read-only and remains an inactive registered vault, so a write *aimed at the source vault*
during merge is blocked by the existing `cross-vault` deny — **not by special-case merge logic**. A
"merge writes to both vaults" design would require punching a hole in confinement; this design forbids
that by construction. Stated plainly: the registry made other vaults knowable, `merge` makes one of
them readable as a source, but the **write boundary is unchanged** — still exactly one active vault.

**Reversibility.** `merge` is a single git-committed operation, revertible like every other structural
write, reusing `src/core/git.ts`: checkpoint the pre-merge active state (`checkpoint`,
`src/core/git.ts:97`), perform all merge writes (dedup unions, new-page placements, `_proposed/`
drafts), then commit the whole merge as one labelled commit via the engine identity (`commit`,
`src/core/git.ts:126`; `COMMIT_IDENTITY`, `src/core/git.ts:42`). Rollback is `git revert <merge-commit>`
(decision #4); a reverted merge reverts its `_proposed/` drafts along with the rest, leaving **no
orphaned drafts**, and the **source vault is untouched** (it was read-only throughout).

**The PM's three sign-off conditions (binding preconditions for the deferred build).** When `merge`
is implemented, it is not done until:

1. **The §confinement assertion is a live-verified test.** A merge run writes **only** under the
   active-vault root, and a write aimed at the source vault is blocked by the existing `cross-vault`
   rule — verified **on disk**, **including the symlink case**: a symlink inside the active vault
   pointing at the source vault must not let a merge write escape into the source vault. The 16-path
   firewall parity must still hold with the merge path exercised. (The symlink-escape hardening is the
   precedent — `docs/adr/ADR-0009-multi-vault-confinement.md:41`.)
2. **No divergent claim is ever auto-resolved.** Every true conflict goes to `_proposed/`;
   QA-adversarial must **fail to construct a silent-winner merge** (a merge that picks a side on
   contradictory claims without a human in the loop). The inability to build one is the acceptance
   evidence.
3. **`schema_version` migration-first, reusing `migrate`.** A version mismatch is resolved by
   migrating source → active **before** page-level reconciliation, reusing `migrate`
   (`src/commands/migrate/migrate.ts`) — do not fork a second migrator — and `merge` never mixes two
   schema versions in one vault.

**Out of scope (deferred).** The first cut is a narrow dedup-and-flag merge. Deferred: three-way merge
(no common-ancestor base), git-history reconciliation (content is folded as new commits; the source
DAG is not grafted), rename detection (no heuristic that an un-aliased page with no shared source is
the same entity), automatic resolution of divergent claims (always escalated to `_proposed/`),
N-way / bidirectional merge (one source into the active vault per operation), and source-vault deletion
on merge (`merge` never deletes or deregisters the source — that is `remove`, which never deletes data
either, ADR-0009).

## Alternatives considered

- **A "merge writes to both vaults" design.** Rejected — it would require punching a hole in ADR-0009
  confinement (a write to a non-active registered vault), exactly the `cross-vault` deny that keeps
  single-active safe. Source-read / active-write reuses all of ADR-0009 instead of relaxing any of it.
- **Similarity-based entity matching (embed-and-compare to find "same entity").** Rejected — it
  violates the absolute NO-embeddings non-negotiable (Brief §5). Detection is exact title/alias match,
  `sources[]` membership, and wikilink resolution — identity, not latent-space distance.
- **Auto-resolving divergent claims (pick a winner by confidence or recency).** Rejected. Choosing
  between contradictory claims is a human decision; an automatic winner silently loses or rewrites
  evidence, breaking §7 provenance. True conflicts escalate to `_proposed/`.
- **A parallel merge-review path (a merge-specific review surface).** Rejected (one-mechanism
  discipline). Conflict flagging reuses the one `_proposed/` channel
  (`src/commands/propose/propose.ts`); a second review path would be a second source of truth for
  "what is pending human review" (Brief §6).

## Consequences

**Positive.**

- The hardest multi-vault step has a ratified contract that reuses four shipped mechanisms (dedup,
  `_proposed/`, firewall, git) and adds **no** new safety surface and **no** new source of truth.
- The write boundary is provably unchanged: source-read / active-write means ADR-0009 confinement
  governs merge unweakened, with the source vault blocked by the same `cross-vault` deny as any other
  inactive vault.
- Provenance holds: agreement is unioned from real `sources[]`; divergence is escalated to human
  review; the source vault is read-only. No claim loses its traceable origin and no contradiction is
  silently reconciled.
- One commit = one atomic, revertible merge; a disliked result reverts once, drafts and all, with the
  source vault untouched.

**Negative.**

- **Implementation is deferred, so the contract is unexercised in code.** The confinement invariant and
  the no-silent-winner rule are asserted here but not yet tested. Mitigated by recording them as
  binding build preconditions (the PM's three conditions) that gate the eventual implementation —
  including the on-disk symlink-case verification.
- **A narrow first cut leaves real cases unhandled** (renames, three-way, history). Accepted — each is
  explicitly deferred, and a human can alias-and-re-merge or resolve via a later curator pass.
- **Model-step-free but human-gated for conflicts.** Divergent merges require human review rather than
  completing unattended. Accepted by design: that is the provenance guarantee, not a limitation to
  engineer away.

## Revisit when

- The implementation is scheduled. Outcome: build to this contract under the PM's three conditions —
  the live-verified confinement test (incl. symlink), the QA-adversarial no-silent-winner proof, and
  migration-first via `migrate` — and update this ADR's status from deferred to implemented.
- A deferred capability is needed (three-way merge, git-history reconciliation, rename detection).
  Outcome: a new ADR extending this one for that capability, never relaxing the source-read /
  active-write invariant.
- A user needs to merge more than two vaults routinely. Outcome: evaluate sequential reviewed merges
  versus an N-way design, keeping one-direction-per-operation confinement intact.
