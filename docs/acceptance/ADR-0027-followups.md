# Acceptance spec — ADR-0027 deferred follow-ups (FU1, FU2)

> Owner: PM (`wiki-dev-pm`). Hand this to the assigned engineer at assignment and
> to QA for verification; PM signs off before the Delivery Lead integrates.
> Authority: [ADR-0027](../adr/ADR-0027-fill-gaps-and-graph-quality.md) §Consequences
> (the two explicit "deliberate future follow-up" items). Team Brief §10 (Definition
> of Done) and §5 (non-negotiables) apply on top of the per-item criteria below.

Dogfood vault for verification:
`docs/claude-wiki-pages-plugin-vault` (pass `--target` to every script; export
`CLAUDE_WIKI_PAGES_VAULT` to the same path). Never edit `docs/vault-example/`.

Baseline measured 2026-06-14 on the dogfood vault (the "before" both items move from):

- `engine verify` and `verify-ingest.sh`: **0 errors / 0 warnings** (no dangling check exists).
- `graph-quality.sh`: **dangling targets: 0**.
- `lint-structural.sh`: **157 WARNINGS**, all of kind `missing-section`
  (template-skeleton conformance), across 110 pages checked.

---

## FU1 — `wikilink-dangling` WARN check in `verify` + its bash twin

**Goal served (Brief §2):** Goal 2 (data grounded, DRY, rich in metadata) and Goal 4
(efficient retrieval) — a `[[link]]` that resolves to no page is an empty grey node in
Obsidian's graph that `verify` today swears is clean (ADR-0027 §Context #1). Closing it
makes "verify clean" mean what a user sees in the graph.

**User-visible outcome:** A vault author (agent or human) who runs `verify` on a vault
containing a `[[Target]]` with no resolving page now sees a `wikilink-dangling` WARNING
naming the source page and the unresolved target — instead of a false "0 warnings".

**Resolution model (matches ADR-0027 §2 / graph-quality.sh, no new mechanism):** a link
resolves against the union of {filename stem, `title`, `aliases`}, case-insensitively, with
no space↔hyphen fuzzing (mirror Obsidian). WARN-tier only; never an error; never a write-block.

### Given / When / Then

1. **Detection (engine).**

   - Given a vault with a body or frontmatter `[[Target]]` that resolves to no page,
   - When `bun src/cli/cli.ts verify --target <vault>` runs,
   - Then the Report contains at least one `wikilink-dangling` finding at `severity: warn`
     naming the source page and the unresolved target, and the WARNING is visible in both
     human and `--json` output.

2. **Detection (bash twin).**

   - Given the same vault,
   - When `scripts/verify-ingest.sh --target <vault>` runs,
   - Then it emits a matching `wikilink-dangling` WARN line and counts it in `Warnings:`.

3. **"Clean" still means 0 errors.**

   - Given a vault whose only finding is one or more `wikilink-dangling` warnings,
   - When either path runs,
   - Then `Errors: 0` and the tool exit status reflects "clean" (clean = 0 errors); the
     dangling finding raises the warning count, never the error count.

4. **Parity holds (gate-05).**

   - Given the reference vault `docs/vault-example` and the `tests/fixtures/minimal-vault` fixture,
   - When `tests/gates/gate-05-verify-parity.sh` runs,
   - Then both rows stay **OK**: `engine verify` and the bash twin agree field-for-field on
     error and warning counts. (If adding the check changes the reference-vault count, the
     engineer must land the same count on both paths so parity stays green — never one side only.)

5. **No false positive on a clean vault.**
   - Given a vault with every `[[link]]` resolving (e.g. the dogfood vault, baseline 0 dangling),
   - When either path runs,
   - Then **zero** `wikilink-dangling` findings are produced.

### Smallest viable cut

One new WARN-tier CHECK (a `checkWikilinkDangling`, numbered as the next CHECK after the
current CHECK 0–6) ported identically into engine `verify` and `verify-ingest.sh`, reusing
the existing resolution rule. No new flag, no new command, no severity beyond `warn`. The
existing `graph-quality.sh` dangling scan is the reference algorithm; this item brings it
into `verify` as ADR-0027 §Consequences anticipated.

### Definition of done (item-specific, on top of Brief §10)

- [ ] A fixture vault with a known dangling link yields exactly the `wikilink-dangling`
      WARNING on both the engine and bash paths (TDD: failing `verify.test.ts` +
      `verify-ingest` Bats first).
- [ ] `verify` reports `Errors: 0` for a dangling-only vault; "clean" semantics unchanged.
- [ ] gate-05 verify-parity green (both rows).
- [ ] No `wikilink-dangling` finding on a fully-resolving vault.
- [ ] Glossary: `wikilink-dangling` (and `dangling link` if not already canonical) added to
      `docs/GLOSSARY.md` before it enters code/prose; `scripts/validate-docs.sh` clean.
- [ ] `src/commands/verify/CLAUDE.md` CHECK table and the verify-ingest header comment updated.

### PM acceptance gate

Sign off only when: a known-dangling fixture produces the WARNING on both paths, a clean
vault produces none, `verify` still reports 0 errors as "clean", and gate-05 is green.
Otherwise name the specific gap.

---

## FU2 — drive `lint-structural.sh` to 0 warnings on the dogfood vault, with real content

**Goal served (Brief §2):** Goal 11 (structured-authoring: template conformance) and Goal 2
(rich, grounded data). The 157 `missing-section` warnings mean dogfood pages do not conform to
their template skeletons; closing them makes the vault an honest instance of its own structured-
authoring contract — and dogfoods the gap-fill quality bar ADR-0027 set.

**User-visible outcome:** Running
`lint-structural.sh --target docs/claude-wiki-pages-plugin-vault` reports **0 warnings**
(down from 157). Each previously-missing `## section` now carries real, page-derived content,
so an Obsidian reader opening any typed page sees a complete, populated skeleton — not empty headings.

**Hard constraint — no empty stubs, no fabrication (ADR-0027 §3):** every added `## section`
is filled with content **drawn from the page's own subject and its sources** — never an empty
heading added solely to silence the linter, and never invented facts. A heading with no
substantive body underneath is a failure of this item, not a pass.

### Given / When / Then

1. **Zero structural warnings.**

   - Given the dogfood vault `docs/claude-wiki-pages-plugin-vault` (baseline 157 warnings),
   - When `scripts/lint-structural.sh --target docs/claude-wiki-pages-plugin-vault` runs,
   - Then it prints `WARNINGS: 0` and exits 0.

2. **Every added section has real content.**

   - Given each page that gained a required `## section`,
   - When a reviewer (and QA) reads it,
   - Then the section body is substantive and specific to that page's topic/sources — not a
     placeholder, not "TODO", not boilerplate copied verbatim across pages, not fabricated.

3. **Reference vault untouched.**

   - Given `docs/vault-example/`,
   - When `git status` is checked after the work,
   - Then `docs/vault-example/` has **no** modifications (it is the shipped, schema-pinned reference).

4. **No regression in grounding or graph quality.**
   - Given the edited dogfood vault,
   - When `engine verify` and `graph-quality.sh` run on it,
   - Then `engine verify` stays **0 errors** and `graph-quality.sh` stays **0 dangling targets**.
     (Any `[[link]]` introduced while filling a section must resolve to a real page.)

### Smallest viable cut

Content-only edits to the dogfood vault's typed `wiki/` pages — add and populate the missing
required headings the template skeletons (`_templates/<type>.md`) define, sourcing each from
the page's existing material and its `sources`. No change to `lint-structural.sh` itself, no
template change, no engine change. If a required heading genuinely does not apply to a page,
that is an Architect conversation (template fit), not a license to stub.

### Definition of done (item-specific, on top of Brief §10)

- [ ] `lint-structural.sh --target docs/claude-wiki-pages-plugin-vault` → `WARNINGS: 0`, exit 0.
- [ ] Spot-check (QA + PM) confirms added sections carry real, page-derived content; no empty stubs.
- [ ] `git status` shows `docs/vault-example/` unchanged.
- [ ] `engine verify --target docs/claude-wiki-pages-plugin-vault` → 0 errors.
- [ ] `graph-quality.sh --target docs/claude-wiki-pages-plugin-vault` → 0 dangling.
- [ ] Tier 0 gates green for any vault content touched by doc gates (vault content is "data, not
      prose" and excluded from glossary/markdownlint prose gates — confirm no gate regresses).

### PM acceptance gate

Sign off only when all five DoD checks above hold **and** the no-stub/no-fabrication constraint
is met on a content read. A `WARNINGS: 0` achieved by adding empty headings is an explicit
**reject** under ADR-0027 §3. Otherwise name the specific gap (which page, which section).

---

## Open-questions tracker note

Neither FU1 nor FU2 is user-gated. Both are deterministic, additive, in-scope under the
resolved decisions (Brief §11) and ADR-0027 (Accepted). No open-question sign-off is required
to start either; standard handoff (engineer → QA → PM acceptance → Delivery Lead integrate) applies.
