# ADR-0014: Single-source required-field rules from the schema; duplicate-claim WARN in review (exact/normalized only)

- **Status:** Accepted (design accepted; Lane B implements P2.2, Lane C implements P2.4 to this contract)
- **Date:** 2026-06-05
- **SPEC anchor:** Brief §2 goals 2 (DRY, metadata-rich) + 11 (structured authoring: single-sourcing,
  template conformance); §5 (DRY single-sourcing — "a fact lives in exactly one page; one mechanism
  per job"; NO embeddings ever; KISS/YAGNI); §6 (one mechanism per job); §11.1 (retrieval is 100%
  deterministic, no similarity over latent vectors); plan `tmp/SOFTWARE-3-0-plan.md` P2.2 and P2.4
- **Supersedes proposal:** `tmp/SOFTWARE-3-0-plan.md` (P2.2, P2.4) — records the signed-off mechanism
  design before any code is written

## Context

Two Phase-2 M-effort items both touch a §6 shared-mechanism question and both have a sharp
non-negotiable to honor, so they are decided together in one ADR.

**P2.2 — required-field rules must be single-sourced from the schema.** Today the required-field set
per page type is hardcoded as a bash `case` in `scripts/validate-frontmatter.sh:54-68`, while the
schema (`docs/vault-example/CLAUDE.md`) expresses the same information separately as illustrative YAML
code-fences per type (`### Source notes`, `### Entity notes`, … lines 82-262) and the templates
(`docs/vault-example/_templates/*.md`) carry a third copy as instances. That is three places that can
drift; the schema "wins any frontmatter conflict" (Brief §4) but the gate does not read it. Goal 11
(single-sourcing, template conformance) and §5 DRY require exactly one source of truth for "what is
required on a page of type T".

The schema's per-type YAML fences are **not** machine-parseable as a required-field list: they
interleave required and optional fields (e.g. `entity` shows `related`, `tags`, `update_count` —
none of which the gate requires), use `|` enum unions and inline `# comments`, and a fence's mere
presence of a key does not mark it required. So "parse the existing fences" would either over-require
optional fields or need brittle heuristics. The schema needs **one explicit, machine-readable
required-field table** that becomes the single authority; the gate parses that table at gate time with
grep/awk only (the hook path must stay Bun-free — `scripts/engine.sh` is the only bridge to Bun and is
never on the `PreToolUse` hot path; `hooks/hooks.json` wires `validate-frontmatter.sh` directly).

**P2.4 — duplicate-claim warning in the review gate.** When a proposed page carries `source_quotes`
near-identical to an existing `wiki/` page's, the reviewer should be told to wikilink the existing
claim rather than duplicate it (goal 2 DRY). The hard constraint (§5, §11.1) is that the match must be
**exact or normalized string match only** — never fuzzy, never semantic, never embeddings/similarity.
`skills/review/SKILL.md` is prose today (it instructs the human and calls `propose review`); the
duplicate check is new behavior. The question is whether it is skill-prose, a deterministic helper
script, or a change to the Bun engine — and how "normalized" is defined so two engineers cannot
implement two different canonical forms.

## Decision

### Part A — P2.2: one required-field table in the schema, parsed by the gate

1. **Add ONE machine-readable required-field table to `docs/vault-example/CLAUDE.md`**, the canonical
   authority. It lives under the existing `## Frontmatter schema` section as a new subsection
   `### Required fields by type` (single source — `validate-frontmatter.sh` parses this). Shape: a
   markdown table, one row per `type`, columns `Type | Required fields | Conditional`:

   | Type | Required fields | Conditional |
   | --- | --- | --- |
   | `source` | `source_type sources created updated status confidence` | `source_format != text` requires `attachment_path extracted_at` |
   | `entity` | `entity_type parent path sources created updated status confidence` | — |
   | `concept` | `parent path sources created updated status confidence` | — |
   | `topic` | `summary parent path sources created updated status confidence` | — |
   | `project` | `objective project_status parent path sources created updated status confidence` | — |
   | `synthesis` | `synthesis_type sources created updated status confidence` | — |
   | `index` | `aliases created updated` | — |
   | `manifest` | `created updated` | — |
   | `log` | `created updated` | — |

   The two **universal** fields `type` and `title` (required on every typed page) are stated once
   above the table, not repeated per row. The table values are copied verbatim from today's
   `validate-frontmatter.sh:54-68` case (this ADR ratifies the current rules as correct; it does not
   change required-field policy — it relocates the authority).

   **The table is closed-core, identical for every vault** — required fields are a plugin-level
   contract, not vault-calibratable (unlike `entity_type`, which alone is owner-extensible per the enum
   table). It is therefore **mirrored into `skills/init/template/CLAUDE.md`** — the runtime schema
   template copied into user vaults on init — and kept in parity with `docs/vault-example/CLAUDE.md` by
   the existing §6 parity test (`tests/scripts/ontology-profile.bats`). The P1.5 ontology coverage note
   is mirrored the same way and by the same parity test. There is still exactly one authoritative table;
   the two files are a dev↔runtime mirror policed by the parity gate, not two independent sources.

2. **The gate parses that table at gate time, grep/awk only, no Bun — target-first with a bundled
   fallback.** `validate-frontmatter.sh` replaces its hardcoded `case` with a deterministic awk/grep
   extraction of the table, keyed on the page's `type`. Resolution order:

   - **(a) Target-vault table, if present.** Read the `### Required fields by type` table from the
     **target vault's own `CLAUDE.md`** (`<vault>/CLAUDE.md`), so a vault that carries the table is its
     own authority.
   - **(b) Bundled reference table, as fallback.** If the target vault has no such table, fall back to
     the plugin's **bundled reference table at `skills/init/template/CLAUDE.md`**, resolved by a
     **script-relative path** from `validate-frontmatter.sh`.

   **Why `skills/init/template/CLAUDE.md` is the fallback and not `docs/vault-example/CLAUDE.md`:** the
   dev-time-vs-runtime rule (root `CLAUDE.md`, "Dev-time vs. runtime") ships **only** `skills/` (plus
   `agents/`, `hooks/`, `scripts/`, `rules/`) at runtime — `docs/vault-example/` is **never** loaded at
   runtime. The validator runs at runtime, so its fallback must point at a path that exists in the
   installed plugin: `skills/init/template/CLAUDE.md` is that runtime-shipped copy and is the source the
   onboarding wizard copies into new vaults. Single-sourcing is preserved because that template is kept
   in parity with `docs/vault-example/CLAUDE.md` by `tests/scripts/ontology-profile.bats` (item 1) —
   there is one authoritative table, mirrored dev↔runtime, with no vault forced to carry its own copy.

3. **Parser contract (deterministic, fail-safe).** The extractor: (a) finds the fixed table heading
   anchor `### Required fields by type`; (b) reads only `|`-delimited rows beneath it until the next
   blank line / heading; (c) skips the header row and the `--- | ---` separator; (d) matches column 1
   against the page's `type` after stripping backticks/whitespace; (e) returns column 2's
   space-separated field list. The conditional column (`source` only) is parsed by the same row but its
   rule stays expressed as today's `source_format != text → attachment_path extracted_at` special-case
   in the script, keyed off the table — the table states the fields, the script states the trigger.

4. **No second hardcoded list.** The `case "$type"` required-field block (`:54-68`) is **removed**;
   the only allowed list of allowed type names that remains is the "Unknown type" error message
   (`:65`), which should itself be derived from the table's row keys so even the allowed-type set is
   single-sourced. The Edit-mode "preserve required fields" hardcoded loop (`:166`) is a **separate,
   coarser guard** (it blocks removal of a fixed superset of frontmatter keys on any edit) — leave it
   as-is for this item; it is not the per-type required-field authority and folding it in is a larger
   change. Note it as a follow-up so it does not silently re-introduce drift.

5. **Failure message — errors that teach (U4), unchanged in shape.** Keep the current behavior: report
   **all** missing fields at once in one message and echo the offending frontmatter block
   (`:45-48`, `:77-80`). The message wording is unchanged; only the source of the field list changes.

6. **MISSING falls back; MALFORMED fails closed (corrected — these are different cases).** A
   **missing** table in the target vault is **not** an error: it triggers the bundled-fallback path
   (item 2b). Fail-closing on a *missing* table is too aggressive — it would score every page in a
   table-less vault as invalid. That regression is real and observed: `eval-ingest-extract.sh` runs
   `validate-frontmatter.sh --target <candidate>` against emitted candidate vaults that carry no schema
   `CLAUDE.md` table, which fail-closed turned into `schema_validity 0.0000` across six eval tests; any
   real vault created before this change would break the same way. So:

   - **Table missing from the target vault** → fall back to the bundled reference table (item 2b). Not
     an error.
   - **Table missing from BOTH the target vault AND the bundled fallback** → that is a broken plugin
     install; **fail closed** with a clear error ("required-field table not found in target vault or
     bundled template; cannot validate <file>").
   - **Table present but MALFORMED** (found but unparseable — e.g. a `type` row that cannot be read, a
     broken delimiter structure) → **fail closed** with a clear error, never fail open (silently
     requiring nothing). A gate that finds its authority but cannot parse it must not pass writes.

   The distinction is the fix: absence routes to the fallback (graceful, dev-time-vs-runtime aware);
   corruption of a present table is a hard failure.

### Part B — P2.4: a small deterministic helper script + a review-skill WARN, exact/normalized only

1. **Match is exact/normalized string equality ONLY (hard line, §5/§11.1).** A proposed `source_quotes`
   quote duplicates an existing one **iff their normalized canonical forms are byte-identical**. No
   fuzzy distance, no token overlap ratio, no embeddings, no similarity score — ever. This is the
   absolute NO-RAG boundary; a future reviewer must not "improve" this into similarity.

2. **Canonical (normalized) form — defined once, deterministically.** Normalize each quote string by,
   in this exact order: (a) Unicode NFC is **not** attempted in bash — operate on bytes as-is;
   (b) strip surrounding quotes/brackets from the YAML scalar; (c) lowercase (ASCII `tr '[:upper:]'
   '[:lower:]'`); (d) replace every run of whitespace (space, tab, newline) with a single space;
   (e) strip leading/trailing whitespace; (f) remove a fixed ASCII punctuation set — these exact
   characters: period, comma, semicolon, colon, exclamation mark, question mark, double quote, single
   quote, backtick, open/close parenthesis, open/close square bracket, and dashes (hyphen-minus, en
   dash, em dash) — a fixed, documented character class, not a locale-dependent `[:punct:]`. Two
   quotes are duplicates iff steps (a)-(f) produce the
   identical string. This canonical form is specified in the helper script's header comment and in
   `skills/review/SKILL.md` so there is exactly one definition.

3. **A small deterministic helper script is warranted (not pure skill-prose, not the Bun engine).**
   Rationale: the check scans every existing `wiki/**.md` page's `source_quotes`, normalizes, and
   compares — that is deterministic text processing that must produce identical output every run and
   be testable in Bats (Tier-1). Skill-prose ("compare the quotes") cannot guarantee the engineer or
   the model applies the exact canonical form, so it cannot hold the NO-RAG line by construction.
   Putting it in the Bun engine is rejected: review is a Tier-1 bash-skill flow and the engine bridge
   is heavier than needed (KISS/YAGNI); a focused `scripts/check-duplicate-claims.sh` matches the
   existing gate-script idiom (`check-wikilinks.sh`, `validate-frontmatter.sh`) and stays off any hot
   path. The script reads the active vault, gathers `source_quotes` from `wiki/**`, and for a given
   `_proposed/` page reports any quote whose canonical form already exists, naming the existing page.

4. **It WARNs, never blocks.** Output is advisory: the script exits 0 and prints, per duplicate, the
   proposed quote, the existing page that already carries it, and a suggested wikilink
   (`[[existing-page]]`) to reference instead of restating the claim. `skills/review/SKILL.md` presents
   this to the human reviewer as a non-blocking suggestion. A genuine restatement is sometimes correct
   (e.g. quoting the same primary source on two legitimately distinct pages), so this is human
   judgment, not a gate. It does **not** raise `VIOLATIONS` and is **not** a CI-failing gate.

5. **Scope and provenance.** The check compares only `source_quotes` (the claim-level provenance field,
   schema v2, `docs/vault-example/CLAUDE.md:315`), not body prose. `_proposed/` pages are out of
   wiki-scoped checks (`skills/review/SKILL.md:48-54`), so the helper is invoked **by review**, not
   wired as a `wiki/`-scoped hook — it reads `_proposed/` against `wiki/` on demand.

## Alternatives considered

- **P2.2: parse the existing per-type YAML code-fences in the schema.** Rejected — the fences
  interleave required and optional fields, use `|` enum unions and inline comments, and presence of a
  key does not mean "required". Parsing them would either over-require optional fields or need brittle,
  drift-prone heuristics. An explicit required-field table is the deterministic single source; the
  fences remain the human-facing illustration (presentation independence, goal 11).
- **P2.2: keep the rules in the script and add a CI gate asserting script == schema.** Rejected — that
  is two sources of truth plus a third mechanism to police them (the opposite of §6 one-mechanism). The
  schema must be the **one** authority the gate reads at runtime, not a copy the gate is checked
  against.
- **P2.2: call the Bun engine to supply required fields.** Rejected — the `PreToolUse` hook path must
  stay Bun-free (the bridge `scripts/engine.sh` is never on the hot path; `hooks/hooks.json` invokes
  `validate-frontmatter.sh` directly). A grep/awk table read is the §5 KISS choice and keeps the hook
  dependency-free and fast.
- **P2.2: fail-closed on every missing table (the original draft of this ADR).** Rejected on
  integration — it scored every page in a table-less vault as invalid, regressing six
  `eval-ingest-extract.sh` tests to `schema_validity 0.0000` and breaking any pre-existing vault. The
  corrected rule distinguishes MISSING (fall back to the bundled reference table) from MALFORMED (fail
  closed); only a present-but-unparseable table, or absence from both vault and bundled fallback, fails
  the build.
- **P2.2: fall back to `docs/vault-example/CLAUDE.md`.** Rejected — `docs/vault-example/` is **not**
  shipped at runtime (only `skills/` and the other runtime trees are; root `CLAUDE.md`,
  "Dev-time vs. runtime"). A runtime validator cannot depend on a dev-only path. The fallback is the
  runtime-shipped `skills/init/template/CLAUDE.md`, kept in parity with the dev copy by
  `tests/scripts/ontology-profile.bats`.
- **P2.4: fuzzy / similarity / embedding matching of quotes.** Rejected absolutely (§5, §11.1,
  decision #1) — any similarity over latent vectors or edit-distance heuristics is out by
  non-negotiable. Exact/normalized string equality is the only permitted comparison.
- **P2.4: pure skill-prose, no helper script.** Rejected — prose cannot guarantee a deterministic
  canonical form, so it cannot hold the NO-RAG line by construction and cannot be unit-tested. A small
  testable helper is the §6-honest single mechanism for the duplicate check.
- **P2.4: make it a blocking gate.** Rejected — restating the same source quote on two genuinely
  distinct pages is sometimes legitimate; the call is human judgment at review time, so WARN, not
  block (consistent with the review skill being the human-in-the-loop gate, `skills/review/SKILL.md`).

## Consequences

**Positive.**

- One source of truth for required fields: the schema table the gate reads at runtime (the target
  vault's own, else the bundled reference at `skills/init/template/CLAUDE.md`). Templates and the
  per-type fences become **instances/illustrations** of it (goal 11 template conformance), and
  author-time, gate-time, and schema can no longer drift.
- **Table-less vaults keep working.** A vault with no required-field table (a pre-existing vault, or an
  eval candidate emitted by `eval-ingest-extract.sh`) is validated against the bundled reference table
  instead of being scored invalid — the corrected MISSING→fallback rule (item 6) averts the six-test
  `schema_validity 0.0000` eval regression that fail-closed-on-missing caused.
- The gate stays Bun-free, Tier-0/Tier-1 friendly, and fast — grep/awk only.
- The duplicate-claim check is deterministic, testable, and provably NO-RAG: byte-identical canonical
  forms, no similarity anywhere.
- Review keeps DRY honest at write-back time (goal 2) without ever blocking a legitimate restatement.

**Negative.**

- **The schema gains a maintenance obligation, mirrored across two files.** Changing a type's required
  fields means editing the table — in **both** `docs/vault-example/CLAUDE.md` and
  `skills/init/template/CLAUDE.md`, which `tests/scripts/ontology-profile.bats` keeps in parity.
  Accepted — that is the §6 dev↔runtime mirror, not two independent sources: the parity gate fails the
  build if the two diverge, so they cannot drift. The per-type YAML fence remains an illustration kept
  consistent by review (the fence is illustration, the table is law).
- **awk table parsing is format-sensitive.** A malformed table row could mis-parse; mitigated by the
  fail-closed rule (4/6 above) and by markdownlint (gate-10) keeping the table well-formed, plus the
  Bats tests (TDD-first) covering each type row.
- **The Edit-mode preserve-fields loop (`:166`) remains a second, coarser hardcoded list.** Accepted
  for this item and flagged as a follow-up; it is a removal-guard superset, not the per-type required
  authority, so it does not contradict single-sourcing of *required* fields, but it should eventually
  derive from the same table.
- **Normalized-match misses true paraphrases.** A claim reworded by the author is not flagged.
  Accepted — that is the deliberate NO-RAG boundary; catching paraphrase would require semantics, which
  is forbidden.

## Revisit when

- A new page `type` is added (a schema change, new ADR + templates + lint case per the enum table
  note, `docs/vault-example/CLAUDE.md:353`). Outcome: add one row to the required-field table; the gate
  needs no code change.
- The Edit-mode preserve-fields guard is unified with the table. Outcome: a follow-up that derives the
  Edit-mode field set from the same table; amend this ADR.
- Someone proposes "smarter" duplicate detection. Outcome: **no** — exact/normalized only is a
  non-negotiable (§5/§11.1); a request for similarity is out of scope by contract, not a revisit.

## Glossary note (for Lane D)

This ADR uses `single source of truth` / `single-sourcing` (already canonical, Brief §5), `canonical
form` / `normalized match`, and `claim-level provenance` (the `source_quotes` field). If `normalized
match` or `canonical form` are not yet rows in `docs/GLOSSARY.md`, they belong there before the prose
in `skills/review/SKILL.md` and the helper-script header ship (glossary-first, Brief §5). This ADR does
not add the rows; Lane D owns them.
