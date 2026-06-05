# ADR-0015: Engine self-description surfaces — one `CAPABILITIES` table, `capabilities`/`ontology --json` through the existing envelope

- **Status:** Accepted (design accepted; Lane A implements P3.1/P3.2, Lane B implements P3.3 to this
  contract; merges before any capabilities/ontology code per N13)
- **Date:** 2026-06-05
- **SPEC anchor:** Brief §2 goals 4 (efficient, topic-scoped retrieval — agents discover the safe-to-call
  verb surface deterministically) + 10 (formal ontology — projected, not duplicated) + 11 (structured
  authoring, single-sourcing); §5 (NO embeddings ever; DRY single-sourcing — "a fact lives in exactly
  one page; one mechanism per job"; KISS/YAGNI; advertise one entry path); §6 (one mechanism per job —
  one ontology profile, one envelope); §11.1 (retrieval is 100% deterministic, no similarity over latent
  vectors); plan `docs/plan/0005-software-3-0-deferred.md` decisions N1, N2, N3, N6 (and veto V1)
- **Supersedes proposal:** `docs/plan/0005-software-3-0-deferred.md` (Phase 3: P3.1, P3.3) — records the
  signed-off design before any capabilities/ontology code is written

## Context

Phase 3 makes the now-real deterministic engine **self-describing** for the agents that call it: an
agent should be able to ask the engine which verbs are safe to invoke (`capabilities --json`) and what
the vault's ontology contains (`ontology --json`) without parsing prose or guessing. Both are net-new on
an engine that already ships ten implemented verbs and a single structured envelope; neither is blocked
any longer (`docs/plan/0005-software-3-0-deferred.md` "The re-baseline (engine is real)").

Three drift hazards make this an Architect-owned, ADR-gated decision rather than a routine feature:

1. **The verb surface is already triple-stated by hand in one file.** `src/cli/cli.ts` declares the
   `IMPLEMENTED` Set (`:23-34`), the `PLANNED` array (`:35`), `ALL` (`:36`), **and** a free-text
   `usage()` literal that re-types the implemented list a fourth time (`src/cli/cli.ts:123`,
   `"Implemented: verify, fix, …"`). Adding a `capabilities` verb that reads only the Set would leave
   the `usage()` literal as a fourth copy that silently drifts. The fix must *collapse* sources, not add
   a fifth.
2. **There is exactly one structured envelope, and only some verbs use it.** `Report{command, vault,
   findings[], errors, warnings, clean, next?}` with `Finding{severity, check, message, file?}`
   (`src/core/report.ts:19-44`), one `exitCode()` (`:60-63`), one `renderText()` (`:66-81`), emitted
   through the router's single `emit()` (`src/cli/cli.ts:110-112`). Only `verify` currently routes
   through it end-to-end; `doctor/fix/heal/migrate/firewall/propose` emit their own JSON shapes and exit
   expressions inline (`docs/plan/0005-software-3-0-deferred.md` "Current-state baseline"). A blanket
   "make every verb use `exitCode()`" mandate would be an L-effort retroactive refactor of six working
   verbs — out of scope, and risky for no Phase-3 gain.
3. **The ontology is single-sourced in prose and must stay that way (veto V1).** `ontology-profile-v1`
   lives in `docs/vault-example/CLAUDE.md:341-364`: a predicate domain→range table (`:351-364`) and the
   enum list, with the explicit instruction "read these two tables and no other source. Do not duplicate
   or fork either table" (`:343`) and "no parallel enum file and no second list … composed at read time"
   (the D15 coverage note, `:345`). `entity_type` is the **sole vault-extensible axis**; predicates and
   the page-`type` enum are closed. Veto V1 (no ontology fork) forbids extracting these tables to a
   second committed file or a generated `schemas/ontology.json`. Any machine-readable `ontology` surface
   must therefore be a **read-time projection** of that one authored document, never a copy of it.

The existing `verify` parser does **not** already read the enum table — `src/core/schema.ts:13` extracts
only `schema_version`, not the predicate/enum tables — so `ontology --json` needs a new markdown-table
parser, not a reuse of the verify parser. This was checked, not assumed.

## Decision

### Part A — N1/N2: one in-place `CAPABILITIES` table; `capabilities --json` derives from it

1. **One source of truth for the verb surface (N1).** Replace the hand-maintained `IMPLEMENTED` Set
   (`src/cli/cli.ts:23-34`), the `PLANNED` array (`:35`), and the `usage()` `"Implemented: …"` literal
   (`:123`) with **one in-code `CAPABILITIES` table** from which `IMPLEMENTED`, `PLANNED`, `ALL`,
   `usage()`, and the new `capabilities` verb all derive. The `:123` literal is **deleted**; `usage()`
   renders the verb list from the table. `capabilities --json` serializes the same table. After this,
   adding or retiring a verb is a one-line table edit and every consumer follows — there is no second
   place to update and nothing left to drift.

2. **The table lives in-place in `src/cli/cli.ts`, NOT a new `src/core/capabilities.ts` module (N2).**
   A separate core module is YAGNI until a second consumer of the table exists; the router is the only
   consumer today (`usage()`, dispatch, the `capabilities` emit step all sit in the router). Keeping the
   table in-place is the KISS choice and avoids inventing a core surface to hold a list the router owns.
   This is recorded so a later contributor does not "tidy" it into a module without a second consumer to
   justify the new surface — the move would add a layer with no caller.

3. **`capabilities` is the verb-emit step on the one table, not a new branch reading the old Set (N1).**
   It is a dispatch case that serializes the `CAPABILITIES` table; it does **not** re-read `IMPLEMENTED`
   independently. A branch that read the Set would re-introduce the drift this ADR closes.

### Part B — N3: capabilities/ontology JSON emits through the existing `emit()`/`exitCode()` path

1. **JSON for both new verbs flows through the existing router `emit()` (`src/cli/cli.ts:110-112`).**
   No new serialization path. Where the payload is genuinely a key/value manifest rather than a
   `findings[]` list (the capability table; the ontology enums/predicates), it is a **named typed model
   reviewed here in this ADR**, never a third bespoke ad-hoc shape invented inline. The capabilities
   manifest is `{ verbs: [{ name, status }] }` where `status ∈ {implemented, planned}`; the ontology
   manifest is the model in Part C. Both are typed, both go out through `emit()`.

2. **`exitCode()` (`src/core/report.ts:60-63`) is mandated for the Phase-3 NEW verbs only (N3).**
   `capabilities` and `ontology` MUST derive their process exit code from `exitCode()` (a malformed or
   unparseable ontology table exits non-zero — see Part C item 4; a clean enumeration exits 0). The
   mandate is **scoped to the new verbs**: the six existing verbs that already use their own exit
   expressions (`doctor/fix/heal/migrate/firewall/propose`) are **not** retroactively refactored. A
   blanket mandate would be an L-effort change to working code for no Phase-3 benefit and is explicitly
   out of scope (senior-eng `OBJ-senioreng-architect-2-1`). New verbs adopt the discipline; old verbs are
   left as-is and converge only if a future item independently warrants it.

### Part C — N6/V1: `ontology --json` is one parser home that projects `ontology-profile-v1`

1. **One parser home: a new `src/commands/ontology/` (N6).** `ontology --json` reads
   `ontology-profile-v1` from the schema (`docs/vault-example/CLAUDE.md:341-364`) at read time and
   **regex-/awk-parses the two markdown tables** — it does not import a pre-parsed structure (none
   exists; `src/core/schema.ts:13` reads only `schema_version`). This is a **new** markdown-table row
   extractor; sizing stays M, with a row extractor budgeted.

2. **It projects, it does not fork (V1 honored).** The command reads the one authored table and emits a
   machine-readable view of it; it writes nothing and copies nothing into a committed second file. The
   schema section's own instruction — "read these two tables and no other source. Do not duplicate or
   fork either table" (`docs/vault-example/CLAUDE.md:343`) — is the hard wall. There is no
   `schemas/ontology.json`, no generated artifact, no second list (the cut-list item "Extract ontology
   tables to a new committed file" stays cut). The engine makes the ontology machine-**readable** without
   machine-**duplicating** it.

3. **Closed-core composition, emitted explicitly (N6, D15).** The ontology manifest emits:
   - `enums.type` — the closed page-`type` enum, in document order;
   - `enums.entity_type` — **core ∪ the target vault's `entity_type_extensions`**, the sole composing
     axis (`docs/vault-example/CLAUDE.md:345`); absent extensions → the core set;
   - `predicates[]` — one entry per row of the domain→range table (`:351-364`), each carrying
     `extensible: false`, so a consumer can see at a glance that predicates are closed.
   The composition happens at read time; no second core list is held anywhere (`grep` for enum-value
   string literals under `src/commands/ontology/` must be empty — the schema stays sole authority).

4. **Malformed/missing table fails closed, never silent-empty (N3 exit discipline).** If the table
   heading is missing or the rows are unparseable, the verb emits an error `Finding` and exits non-zero
   via `exitCode()` — it does **not** emit an empty-but-successful manifest. A self-description surface
   that cannot find its source must say so loudly, not report "the ontology is empty."

### Why this is NO-RAG (the §5/§11.1 line, recorded explicitly)

Both surfaces are **deterministic enumeration and parse over authored sources**, with no corpus, no
index, and no embeddings:

- `capabilities --json` is an exact enumeration of the engine's own in-code dispatch table — same input,
  same output, every run.
- `ontology --json` is a markdown-table parse plus a set union (`core ∪ extensions`) over **one**
  authored document. There is no similarity, no ranking, no latent vector, no second store — it is
  set-math and string extraction. This holds the absolute NO-embeddings non-negotiable by construction;
  a future contributor must not "enrich" either surface with similarity.

## Alternatives considered

- **A new `if (command === 'capabilities')` branch that reads the existing `IMPLEMENTED` Set.** Rejected
  (N1) — it leaves the `usage()` literal (`src/cli/cli.ts:123`) as a fourth drifting copy and reads the
  Set rather than collapsing the sources. The accepted design folds all four into one `CAPABILITIES`
  table that every consumer derives from.
- **A separate `src/core/capabilities.ts` module for the table.** Rejected (N2, KISS/YAGNI) — a new core
  surface is unwarranted until a second consumer exists; the router is the only consumer. Keep the table
  in-place; revisit only when something outside the router needs it.
- **Retroactively route all ten verbs through `exitCode()`.** Rejected (N3, scoped) — six verbs already
  use their own exit expressions; a blanket mandate is an L-effort refactor of working code for no
  Phase-3 gain (senior-eng `OBJ-senioreng-architect-2-1`). The `exitCode()` mandate applies to the new
  verbs only.
- **Extract the ontology tables to a committed `schemas/ontology.json` (or any generated second file).**
  Rejected (veto V1 / cut-list) — it creates a second source that drifts from the authored table, which
  `docs/vault-example/CLAUDE.md:343` ("no other source … do not duplicate or fork") forbids.
  `ontology --json` is a read-time projection that writes nothing, so there is nothing to drift.
- **Insert HTML-comment fence markers into the schema to delimit the parseable tables.** Rejected
  (structure-2) — markers in the schema are a schema edit that can itself drift from the table they
  delimit. The parser anchors on the existing markdown headings/table structure already in the document.
- **Reuse the `verify` parser to read the enum table.** Rejected — verified false: `src/core/schema.ts:13`
  extracts only `schema_version`, not the predicate/enum tables. `ontology --json` is a new markdown-table
  parser; the M sizing accounts for the row extractor.
- **A third bespoke JSON shape emitted inline (bypassing `emit()`).** Rejected (N3) — the manifest is a
  named typed model reviewed in this ADR and emitted through the one router path, keeping the engine's
  single-envelope discipline (§6).

## Consequences

**Positive.**

- One source of truth for the verb surface: the `CAPABILITIES` table. `IMPLEMENTED`, `PLANNED`, `ALL`,
  `usage()`, and `capabilities --json` all derive from it, so a verb cannot exist in one and be missing
  from another (the §6 one-mechanism win). The verb-drift contract test (plan P3.2) pins this against a
  golden list.
- Agents get a deterministic, no-RAG way to discover the safe-to-call verb surface and the vault's
  ontology — projected from the single authored sources, never a duplicated copy.
- The new verbs adopt the single envelope and `exitCode()`, while six working verbs are left untouched —
  the change is additive and minimal.
- `ontology --json` makes the closed-core boundary (`entity_type` composes; predicates and page-`type`
  are closed) machine-visible for the first time, enabling P3.4's engine-side membership check to import
  one composed set rather than hold a second list.

**Negative.**

- **The `CAPABILITIES` table is in-place, not a module.** If a second consumer ever appears, extracting
  it is a follow-up (and an amendment to this ADR), not a silent refactor. Accepted — YAGNI now, recorded
  so the move is deliberate when justified.
- **`ontology --json` carries a markdown-table parser.** A reformatting of the schema tables could break
  the parse; mitigated by the fail-closed rule (Part C item 4), by markdownlint keeping the tables
  well-formed, and by the acceptance checks (P3.3) that pin row counts and values against
  `docs/vault-example/CLAUDE.md`.
- **`exitCode()` discipline is uneven across the engine.** Six verbs keep their own exit expressions;
  only the Phase-3 verbs follow `exitCode()`. Accepted as the scoped, low-risk choice; convergence is a
  separate future call.

## Revisit when

- A second consumer of the verb table appears outside the router. Outcome: extract the `CAPABILITIES`
  table to a core module and amend this ADR (N2 was a YAGNI call, not a permanent ban).
- A future item makes a deliberate case to converge the six legacy verbs onto `exitCode()`. Outcome: a
  new item + ADR amendment; it is out of scope here by N3, not forbidden forever.
- A diagram or consumer needs an ontology relationship the table cannot express. Outcome: extend the
  authored `ontology-profile-v1` table (one source) and let `ontology --json` project the new rows — never
  add a second store (veto V1 stands).
- Phase 3's `entity_type` membership check (P3.4) lands. Outcome: it imports `ontology --json`'s composed
  set; it must not hold a second core enum list.

## Glossary note (for Lane D)

This ADR uses `capabilities` (engine verb — agent-facing, gated to a `docs/GLOSSARY.md` row only if it
enters user-facing prose, per the plan's glossary-debt note), `ontology` (the named artifact / engine
surface, distinct from `ontology-profile-v1` the schema section), and `deterministic engine`. Per
glossary-first (Brief §5), the `ontology` (artifact) and `deterministic engine` rows belong in
`docs/GLOSSARY.md` before the prose/verb names ship; they are in the plan's glossary-debt list
(`docs/plan/0005-software-3-0-deferred.md` "Glossary debt"). This ADR does not add the rows; Lane D owns
them (plan PM.6).

## Related decisions

- [ADR-0004](./ADR-0004-ontology-profile-v1.md) — `ontology-profile-v1`, the single authored ontology
  this surface projects.
- [ADR-0006](./ADR-0006-search-score-object.md) / [ADR-0008](./ADR-0008-graph-traversal-primitive.md) —
  other engine surfaces that consume the one ontology profile; this ADR keeps that source un-forked.
- [ADR-0013](./ADR-0013-design-drift-gate.md) — the Tier-0 design-drift gate; verb/capability drift is a
  **separate** Bun-tier contract test (plan P3.2), never folded into the grep/awk gate (ADR-0013
  "Revisit when").
- [ADR-0016](./ADR-0016-simultaneous-multi-vault-management.md) — the companion Phase-M decision; both
  land at convergence per N13.
