# claude-wiki-pages: SOFTWARE-3.0 deferred work — development plan (brainstorm output)

> **Status:** proposal — sequel to `tmp/SOFTWARE-3-0-plan.md` (Phases 0–2 done/in-flight, OUT OF
> SCOPE here). Produced by the `docs/brainstorm/` SOFTWARE-3.0 deferred-work team (11 personas,
> three-round protocol). **Hand to the `wiki-dev` engineering team** via `docs/teams.md`
> (`wiki-dev-manager` is the entry point). This is a **proposal** — `docs/adr/` is for decisions.
>
> **Renumber note:** the brief named `0004`, but `docs/plan/0004-vault-merge-conflict-resolution.md`
> already exists and is committed. This plan is filed as **0005** to avoid clobbering it.
>
> **How to use:** every phase item is assignable — it names a lane (A retrieval/engine · B
> schema/ontology/multi-vault · C ingest · D ux/docs · QA-func/QA-adv), an effort (S/M/L), the paths
> it touches, and an acceptance check QA can run.

## Context

**Why this run.** The predecessor plan (`tmp/SOFTWARE-3-0-plan.md`) scoped Phase 3 (machine-readable
engine & ontology surfaces) and Phase M (simultaneous multi-vault) as `[engine-dep]` — gated on the
engine-shell-vs-TS state being resolved. **That gate has now largely lifted:** the deterministic
engine is real. This run brainstorms exactly the three remaining buckets:

1. **Phase 3** — `engine capabilities --json`, `engine ontology --json`, opt-in `--json` envelope +
   stable exit codes for the bash gate scripts, and a verb-drift contract test.
2. **Phase M** — simultaneous multi-vault management, read-time audit roll-up, the `entity_type`
   extension allow-list, and the OQ-9 fail-closed fix.
3. **Re-examination of the predecessor cut-list** — re-affirm or resurrect each deferred/vetoed item
   given the now-real engine.

**The re-baseline (engine is real).** `src/cli/cli.ts:23-34` ships an IMPLEMENTED Set of 10 verbs
(`verify, fix, heal, doctor, config, migrate, search, firewall, backlog, propose`), each with
`--json` + stable exit codes; `PLANNED = ["index","link-suggest","checkpoint"]`
(`src/cli/cli.ts:35`). `dist/cli.js` is compiled; `scripts/engine.sh:20-21` prefers it and falls
back to `bun src/cli/cli.ts`. There is **no `capabilities` and no `ontology` verb yet** — Phase 3 is
genuinely net-new but no longer blocked.

**The roster.** 11 personas, three rounds: `product-manager` (facilitator, this writer) +
`architect` (coherence co-owner), `structure-authoring-architect`, `ontology-engineer`,
`senior-engineer`, `plugin-expert`, `plugin-power-user`, `new-claude-user`,
`claude-code-config-expert`, `grill-me-interrogator`, `skeptic` (guardian). Round 1 produced 36
ideas across 8 producing roles; Round 2 cross-critique filed 4 multi-veto clusters and ~40
falsifiability gaps; this Round-3 convergence merges the survivors.

## Vision recap (goals → owner role)

| Goal (TEAM-BRIEF §2) | This run's expression | Owner role / lane |
| --- | --- | --- |
| **3** isolate vaults; manage multiple | Phase M: simultaneous N-vault registry (`PM.1`), read-time audit roll-up (`PM.3`), fail-closed confinement (`PM.2`) | `plugin-power-user` / `config-expert` · Lane B |
| **4** efficient, topic-scoped retrieval | Phase 3: `engine capabilities --json` lets agents discover the safe-to-call verb surface deterministically | `senior-engineer` / `plugin-expert` · Lane A |
| **5** NO RAG / no embeddings | Every item carries a why-not-RAG line; all surfaces are deterministic enumeration/parse/set-math over authored sources | `skeptic` (guardian) · All |
| **8** optimize context/memory for the harness | Read-time audit roll-up folds per-vault `wiki/log.md` + ADR-0010 sessions, no persisted ledger | `architect` / `config-expert` · Lane B |
| **10** formal ontology | `engine ontology --json` projects the closed-core enums + predicate table from the single schema authority; `entity_type` allow-list composition becomes testable | `ontology-engineer` · Lane B |
| **11** structured authoring | `docs/design/_template.md` + hand-authored `07-ontology.md` linking the predicate table (D13 honored) | `structure-authoring-architect` · Lane D |

## Current-state baseline (verified, path-cited)

- **Engine is real, 10 verbs.** `src/cli/cli.ts:23-34` (IMPLEMENTED Set), `:35` (PLANNED array), `:36`
  (`ALL`). The verb surface is **already triple-stated by hand in one file**: the Set, the array, and
  the `usage()` prose which re-types it (`src/cli/cli.ts:114-127`). `dist/cli.js` compiled;
  `scripts/engine.sh:20-21` prefers it.
- **One structured envelope exists.** `Report{command,vault,findings[],errors,warnings,clean,next?}`
  with `Finding{severity,check,message,file?}` (`src/core/report.ts:19-44`), one `exitCode()`
  (`report.ts:60-63`), one `renderText()` (`report.ts:66-81`). Only `verify` currently routes through
  it; `doctor/fix/heal/migrate/firewall/propose` emit their own JSON shapes and exit expressions
  inline (per senior-eng-feasibility, verified against the dispatch ladder).
- **No `capabilities`, no `ontology` verb.** Not in IMPLEMENTED (`src/cli/cli.ts:23-34`); no
  `src/commands/ontology/` directory exists.
- **Multi-vault is switch-only + confined.** `vault_add/remove/switch/list` +
  `registry_other_vaults` in `scripts/resolve-vault.sh`; registry shape documented as an additive
  comment at `scripts/resolve-vault.sh:107-118` (`vaults: [{path,name}]`, invariant
  `current_vault_path == one vaults[].path`). Cross-vault confinement + symlink hardening in both
  firewall twins (`scripts/firewall.sh`, `src/core/firewall.ts`), pinned by
  `tests/gates/gate-11-firewall-parity.sh`.
- **OQ-9 fail-OPEN is live today.** `_vaults_read` (`scripts/resolve-vault.sh:122-132`) swallows
  malformed JSON with a bare `except Exception: pass` and prints nothing. The firewall then derives an
  empty `OTHER_VAULTS`, the cross-vault rule never fires, and the active vault stays writable — silent
  fail-OPEN.
- **Ontology is single-sourced in prose.** `ontology-profile-v1` at `docs/vault-example/CLAUDE.md:323`
  ("read these two tables and no other source. Do not duplicate or fork either table"); enum rows at
  `:349-354`; `entity_type` core + `entity_type_extensions` composition rule at `:354,:361` ("no
  parallel enum file and no second list … composed at read time"); predicate domain→range table at
  `:331-345`.
- **Cut-list items are absent today.** No `docs/design/07-ontology.md`, no `docs/design/_template.md`,
  no `wiki/_audit/` ledger (verified via `ls`). ADRs 0001–0013 exist; **ADR-0013 (design-drift gate,
  Check 5) is on this branch** (`scripts/validate-docs.sh:280-631`, guarded to run only in the full
  plugin repo). ADR-0009 = multi-vault confinement; ADR-0012 = vault-merge design-accepted, impl
  deferred.

## Guiding constraints (non-negotiable)

TEAM-BRIEF §5 holds in full: **NO RAG / no embeddings** · structural provenance · DRY single-sourcing ·
ontology in schema+frontmatter+wikilinks (never a triplestore/vector store) · structured authoring ·
advertise one entry path · glossary-first · KISS/YAGNI · dev-time vs runtime separation. Plus the
**added non-negotiables for this run:**

- **OQ-9 fail-closed is FIXED, not debated.** A malformed/inconsistent registry MUST yield ZERO
  wiki-writable roots. Resolution stays ADR-0009; the fix lives in the **single confinement-derivation
  path** (`registry_other_vaults` / `_vaults_read`), not in the twins. Default-fallback applies only
  when **no** `vaults` key is configured.
- **Reuse before build.** Phase 3 rides the existing `src/cli/cli.ts` dispatch + the one `Report`
  envelope; Phase M extends `scripts/resolve-vault.sh` / `gate-11-firewall-parity.sh` / per-vault
  `wiki/log.md` (+ ADR-0010). **NO new ledger, NO parallel resolver, NO triplestore/RDF/vector store,
  NO RAG.** Audit roll-up aggregates per-vault logs **at read time** — no persisted index/ledger file.
- **Honored vetoes (carry over unless a path-cited, Skeptic-surviving reason overturns):** V1 (no
  ontology fork — link the in-place `ontology-profile-v1`), V3 (no `_audit/` ledger), D13 (no
  generated+committed ER diagram — hand-author one linked fence), D14 (no agent-authored diagrams),
  closed-core schema (only `entity_type` is vault-extensible; predicates + page-type enum stay closed).

## Decisions log (resolved — convergence + every Skeptic veto)

ADR-flavored: Decision → Rationale → Rejected alternative. The four Round-2 multi-vetoes are each
**accepted** (collapse N proposals into one canonical item); two narrower vetoes are noted.

| # | Decision | Rationale / rejected alternative |
| --- | --- | --- |
| **N1** | `capabilities --json` ships as **one in-code `CAPABILITIES` table** that `IMPLEMENTED`/`PLANNED`/`ALL`/`usage()`/the new verb all derive from; the `usage()` literal at `src/cli/cli.ts:123` is deleted | **Skeptic veto ACCEPTED** (capabilities-as-new-branch vetoed; senior-1/plugin-expert-1 fold in as the verb-emit step). Rejected: a new `if(command==='capabilities')` branch reading the existing Set, which leaves the `usage()` literal as a 4th drifting copy. |
| **N2** | The `CAPABILITIES` table lives **in-place in `src/cli/cli.ts`**, NOT a new `src/core/capabilities.ts` module | Grill `OBJ-grill-architect-1` ACCEPTED (KISS): a new core module is YAGNI until a 2nd consumer exists. Rejected: architect-1's separate module. |
| **N3** | `capabilities`/`ontology` JSON emits through the existing `emit()`/`exitCode()` path (`src/cli/cli.ts:110-112`, `report.ts:60-63`); a manifest that is genuinely key/value (not findings) is a **named typed model reviewed in the ADR**, never a third bespoke shape | architect-2 envelope discipline. **Scoped:** the `exitCode()` mandate applies to **Phase-3 NEW verbs only** — existing verbs are not retroactively refactored (senior-eng `OBJ-senioreng-architect-2-1`: 6 existing verbs already use their own exit expressions; a blanket mandate would be L and out of scope). |
| **N4** | OQ-9 fail-closed is **one PM.2 item** fixed at the single derivation point: `_vaults_read` **exits non-zero** on malformed JSON or `current_vault_path ∉ vaults[]`; `firewall.sh` maps the non-zero exit to a `__FAIL_CLOSED__` token **scoped inside `firewall.sh`** (never emitted from `registry_other_vaults` into the path-list stdout) | **Skeptic veto ACCEPTED** (six OQ-9 proposals collapse to one). **Grill veto ACCEPTED** (KISS): sentinel strings must not be injected into a stdout contract that carries vault paths — use exit codes; the token lives only inside `firewall.sh`'s consumption point. Rejected: senior-5's per-twin `--other-vaults` empty-string overload (parallel mechanism); config-1's `__REGISTRY_MALFORMED__` stdout sentinel from `registry_other_vaults`. |
| **N5** | Surviving unique OQ-9 contributions are folded into PM.2: **stderr warning, not silent** (plugin-expert-4); **registry-derived confinement is currently untested** — add the N≥3 env-override-free fixture (config-2); the **malformed-JSON and `current∉vaults`** cases are two distinct gate-11 fixture rows (config-1/config-5) | DRY: one ~M patch, not six line items. The `set-vault.sh list` WARN on an inconsistent registry (power-user-2) is the non-overlapping power-user deliverable, folded as a sub-row of PM.2. |
| **N6** | `ontology --json` is **one parser home** (`src/commands/ontology/`, new) that **regex-parses the `ontology-profile-v1` markdown table** at read time; it composes `entity_type` = core ∪ per-vault `entity_type_extensions` and emits predicates with `extensible:false` | ontology-1 home chosen. Rejected: structure-2's HTML-comment fence markers inserted into the schema (a schema edit that risks the markers drifting from the table); senior-4's "reuse the verify parser" (verified false — `src/core/schema.ts:13` extracts only `schema_version`, not the enum table; this is a **new markdown-table parser**, sizing stays M but budget a row extractor). |
| **N7** | The `entity_type` membership check lives **only in the engine** (a new `verify`-side check that reads the composed set), NOT in the bash hook `validate-frontmatter.sh` | **Skeptic/Grill veto ACCEPTED** (`OBJ-grill-ontology-4`, CRITICAL): forcing the bash hook to call `engine ontology --json` adds a Bun dependency to the hot hook path (`engine.sh` was designed to avoid this); re-implementing the parser inline duplicates the engine. The bash `case` statement keeps its current behavior, documented as a known DRY exception for the Bun-absent fallback. |
| **N8** | The PM.3 roll-up enumerates registered vaults by calling **`_vaults_read` directly** (documented as a semi-public reader), not via a new `registry_all_vaults` wrapper | **Skeptic+senior-eng veto ACCEPTED** (KISS): `registry_all_vaults` is a zero-filter alias for `_vaults_read`, which already emits all vaults; `vault_list()` already iterates it. The roll-up consumer calls `_vaults_read` and checks its exit code for the fail-closed signal (inherits N4 for free). On malformed registry the roll-up reports its **own** read-time "registry malformed" status, NOT the firewall token (`OBJ-skeptic-config-4-1`). |
| **N9** | The verb-drift contract test pins the EXPECTED verb set to a **hardcoded golden fixture list** in the test, not a re-derivation from running code; it asserts (a) every IMPLEMENTED verb has a live dispatch branch (no exit-2 fallthrough), (b) PLANNED verbs return exit 0 + `.status=='not-implemented'`, (c) `capabilities --json` set-equals the golden list. It runs under **`gate-01-engine-tests.sh`'s `bun test`** (no new gate file, D10) | senior-3 + architect-4 + Grill `OBJ-grill-senior-engineer-1/3`. Runs against `src/cli/cli.ts`; `gate-12-stale-dist.sh` already guards `dist/cli.js` staleness (senior-eng `OBJ-senioreng-architect-4-1`) — no dual-target. |
| **N10** | `check-wikilinks.sh --json` ships as a **standalone Finding[] emitter with NO parity gate row** (no engine twin exists); `validate-frontmatter.sh --json` and `firewall.sh --json` get parity rows where engine twins exist | **Skeptic+senior-eng veto ACCEPTED**: a `gate-05` parity row for `check-wikilinks` is structurally impossible (no `wikilinks` verb in IMPLEMENTED). `firewall.sh` may use its existing `jq` (`OBJ-grill-senior-engineer-2`); the no-new-jq constraint applies to `validate-frontmatter.sh` / `check-wikilinks.sh` only. |
| **N11** | The bash-gate `--json` envelope conformance check is a **Tier-1 Bats test** (parses actual `--json` output, compares against `Finding` keys `{severity,check,message,file?}`), NOT a Tier-0 grep/awk gate | senior-eng `OBJ-senioreng-structure-4-1` ACCEPTED: a Tier-0 awk gate cannot parse the TS `Finding` interface; structure-4's `{id,path}` keys were wrong (the real shape is `{severity,check,message,file}` per `report.ts:19-26`, `OBJ-skeptic-structure-4-1`). |
| **N12** | `07-ontology.md` predicate-node grounding is a **new Check 5 sub-check (5g) using grep/awk** that extracts predicate names directly from `docs/vault-example/CLAUDE.md:331-345` and matches them against the diagram nodes — **NOT** by shelling out to `engine ontology --json` | senior-eng+architect `OBJ-senioreng-ontology-3-1` / `OBJ-architect-ontology-engineer-1` ACCEPTED: Check 5 is a Tier-0 grep/awk gate with no Bun; invoking the engine would break that. This is net-new gate logic, not a reuse of the existing 5a file-token loop. **Gated on `07-ontology.md` existing** — until then it is a TODO comment, not a CI-failing check. |
| **N13** | Two ADRs land at convergence: **ADR-A "Engine self-description surfaces"** (records N1–N3, N6, V1 honored) **before** the capabilities/ontology code; **ADR-B "Simultaneous multi-vault management"** (records N4, N8, registry-selects/resolver-confines, no-ledger roll-up) **before** any PM.1 write path | architect-6, with Grill `OBJ-grill-architect-6` sequencing: ADRs precede implementation. Rejected: leaving decisions only in gitignored `tmp/`. ADR-B subsumes the predecessor's PM.4 multi-vault-ADR ask. |
| **N14** | The cross-vault SessionStart BACKLOG line **stays cut** | **Skeptic veto STANDS** (`OBJ-skeptic-plugin-power-user-4-1`): directly resurrects the predecessor's explicitly cut "Cross-vault SessionStart heartbeat" (`tmp/SOFTWARE-3-0-plan.md:162`) with no engine-grounded reason; puts an O(N) find scan on the single-vault hot path. The on-demand roll-up (PM.3) covers the need. **Override considered and declined** — the QA-func critic argued it is a narrower session-start extension, not the vetoed standalone heartbeat, but YAGNI + the existing cut win; the user can ask on demand. Logged as a resurrect-candidate in the cut list. |

## Phases

### Phase 3 — machine-readable engine & ontology surfaces

> Net-new TypeScript on the now-real engine. **Sequencing:** the `CAPABILITIES` table refactor (P3.1)
> lands first — the capabilities verb-emit, the ontology verb, and the verb-drift test all assert
> against it. ADR-A merges before any of this code.

| Item | Owner lane | Goal served | Effort | Touches (paths) | Acceptance |
| --- | --- | --- | --- | --- | --- |
| **P3.1** Refactor the verb surface to ONE in-place `CAPABILITIES` table; add the `capabilities` verb that serializes it via `emit()` (N1, N2, N3) | A | 4 | M | `src/cli/cli.ts` (table + dispatch + `usage()`), `skills/engine-api/SKILL.md` | `bun src/cli/cli.ts capabilities --json` parses; `.verbs[].name` set-equals the golden fixture; `grep -c 'Implemented:' src/cli/cli.ts` returns 0 (the `:123` literal is deleted; `usage()` renders from the table); `diff <(bun src/cli/cli.ts --help) <golden>` is byte-identical for the verb list. **Why-not-RAG:** deterministic enumeration of the engine's own dispatch table — no corpus, no embeddings. |
| **P3.2** Verb-drift contract test pinned to a hardcoded golden list (N9) | QA-func | 4 | S | `tests/engine/capabilities-contract.test.ts` (runs under `gate-01-engine-tests.sh` `bun test`) | Each IMPLEMENTED verb called `--json --target /nonexistent` exits `!= 2`; each PLANNED verb called `--json` (no target) exits `0` with `.status=='not-implemented'`; `capabilities --json` set-equals the golden list. Removing a dispatch branch for an IMPLEMENTED verb fails the test; adding a table row with no branch fails. No new gate file (D10). **Why-not-RAG:** exact set-equality over a known enumerated set. |
| **P3.3** `engine ontology --json` — one parser home that regex-parses `ontology-profile-v1`, composes `entity_type` = core ∪ extensions, emits predicates `extensible:false` (N6) | B | 10 | M | new `src/commands/ontology/`, `src/cli/cli.ts` (table row), `docs/vault-example/CLAUDE.md` (read, not forked) | `ontology --json \| jq '.enums.type'` returns exactly the 9 page-type values from `CLAUDE.md:353` in order; `.enums.entity_type` returns the 7 core values from `:354`; a vault adding `entity_type_extensions:[dataset,model]` makes `.enums.entity_type` include them; absent extensions → core set, exit 0; `.predicates \| length` equals the row count at `CLAUDE.md:331-345`; `.predicates` carries `extensible:false`; malformed/missing table → non-zero exit + error finding (no silent empty success); `grep -rn entity_type src/commands/ontology/` shows zero enum-value string literals (schema stays sole authority). **Why-not-RAG:** YAML/markdown-table parse + set union over one authored document — no similarity, no index. |
| **P3.4** `entity_type` membership check **engine-side only** (N7); the bash `case` keeps its current behavior as a documented DRY exception | B | 10 | S | `src/commands/verify/verify.ts` (new check importing the P3.3 composed set), `scripts/validate-frontmatter.sh` (comment only) | An entity note with `entity_type: persom` (typo) is rejected by `engine verify`; a vault declaring `synthesis_type_extensions:` / `type_extensions:` is rejected/ignored (only `entity_type` composes, D15); the check imports P3.3's composed set (no second core list); `scripts/validate-frontmatter.sh` gains a comment marking the bash `case` as the known Bun-absent fallback exception. **Why-not-RAG:** exact string-in-set membership over a composed allow-list. |
| **P3.5** Opt-in `--json` envelope + stable exit codes for `validate-frontmatter.sh` and `firewall.sh` (Finding shape); standalone `--json` for `check-wikilinks.sh` (N10) | A/B | 2,4 | M | `scripts/validate-frontmatter.sh`, `scripts/check-wikilinks.sh`, `scripts/firewall.sh`, `tests/gates/gate-05-verify-parity.sh` (parity rows), Tier-1 Bats conformance test | Each `--json` output is valid JSON with `findings[]` items keyed `{severity,check,message,file?}` verbatim from `report.ts:19-26`; exit codes unchanged (0 clean / 1 errors / 2 bad args); `gate-05` gains a parity row for `validate-frontmatter.sh` (bash `--json` == engine `verify --json` field-for-field on the minimal-vault fixture); **no** parity row for `check-wikilinks.sh` (no engine twin); a Tier-1 Bats test asserts envelope-key conformance (N11); no NEW jq dependency in `validate-frontmatter.sh`/`check-wikilinks.sh` (`firewall.sh` keeps its existing jq). **Why-not-RAG:** structural JSON wrapping of deterministic checks — output format only, logic unchanged. |
| **P3.6** Agent-teaching doc: graceful-degradation table + ontology-aware write-guard in `skills/engine-api/SKILL.md` | A/B | 4,10 | S | `skills/engine-api/SKILL.md` | A row for each PLANNED verb maps to its approved fallback (`index`→read `wiki/index.md`, `link-suggest`→grep/Glob, `checkpoint`→git commit) matching the existing `query`/`maintain-contract` skills; an "Ontology-aware write guard" section names `entity_type` as the only extensible field, references `.enums.entity_type[]`, and is gated with a note that it activates once P3.3 ships; no new skill file. **Why-not-RAG:** a deterministic procedure/membership table, not retrieval. |

### Phase M — simultaneous multi-vault management + audit roll-up

> Substantial feature beyond switching-only. Confinement already exists (ADR-0009 +
> `gate-11-firewall-parity.sh`) — reuse it. **Sequencing:** the OQ-9 fix (PM.2) lands before PM.1 write
> paths and before PM.3 roll-up, because both rely on a trustworthy registry. ADR-B merges before any
> PM.1 write path.

| Item | Owner lane | Goal served | Effort | Touches (paths) | Acceptance |
| --- | --- | --- | --- | --- | --- |
| **PM.2** **OQ-9 fail-closed (FIXED, not debated)** — `_vaults_read` exits non-zero on malformed JSON or `current_vault_path ∉ vaults[]` (with a stderr warning, not silent); `firewall.sh` maps the non-zero exit to a `__FAIL_CLOSED__` token **scoped inside `firewall.sh`** → ZERO writable roots (N4, N5) | B + QA-adv | 3 | M | `scripts/resolve-vault.sh:122-132` (`_vaults_read`), `scripts/firewall.sh` (exit-code check), `scripts/set-vault.sh` (list WARN), `tests/gates/gate-11-firewall-parity.sh` | `gate-11` gains three fixture rows, both twins agreeing: (a) malformed JSON in `vaults` → write to the active vault root BLOCKED (zero writable roots); (b) `current_vault_path ∉ vaults[]` → BLOCKED; (c) control: NO `vaults` key → active vault ALLOWED (tier-4 fallback intact). Plus the **registry-derived** fixture (config-2): N=3 vaults, no `CLAUDE_WIKI_PAGES_OTHER_VAULTS` env override → writes to the two non-active registered vaults BLOCKED, active ALLOWED. `_vaults_read` emits a stderr warning on parse failure; `set-vault.sh list` prints a WARN for an inconsistent registry. The fix appears only in `resolve-vault.sh`; no new branch added independently to `firewall.ts`. **Why-not-RAG:** JSON parse-validity + set-membership on a confinement boundary — boolean conditions, no inference. |
| **PM.1** Simultaneous N-vault registry (manage N, not just switch); `resolve-vault.sh` stays the **sole resolver** (registry selects, resolver confines — ADR-0009); registry shape frozen once in `docs/operations.md` (matching the `resolve-vault.sh:107-118` comment); `init_vault_settings` keeps the `vaults` key ABSENT until first `vault_add` (progressive disclosure) | B | 3 | L | `scripts/resolve-vault.sh`, `docs/operations.md`, `.claude/claude-wiki-pages/settings.json` shape | N vaults registered; one active; no parallel resolution path (`grep` confirms `resolve_vault` is the only resolver); a fresh `init_vault_settings` produces settings.json with NO `vaults` key; first `vault_add` introduces it; `docs/operations.md` states the shape + `current_vault_path ∈ vaults[]` invariant once. **Why-not-RAG:** a config registry + path-set derivation — no retrieval surface. |
| **PM.3** Read-time audit roll-up across the registry (who/when/which vault/from what source), reusing per-vault `wiki/log.md` + ADR-0010 `source_type:agent-session`; enumerates via `_vaults_read` directly (N8); exposed as a read-only `set-vault.sh cross-vault-log` subcommand | B/Power | 8 | M | `scripts/set-vault.sh` (new subcommand), `scripts/resolve-vault.sh` (`_vaults_read` documented semi-public), reads each `<vault>/wiki/log.md` | Roll-up lists entries from ≥2 registered vaults' `wiki/log.md` at read time, vault-tagged, date-sorted; `--last N` limits per vault; **running it twice creates/modifies NO file under any vault's `wiki/`** (snapshot diff is empty — no `_audit/`, no cache); a malformed registry → reports its OWN "registry malformed" read-time status + zero entries + non-zero exit (NOT the firewall token); a vault with no `wiki/log.md` is skipped with a stderr WARN. **Why-not-RAG:** read-time fold over structured log headings by exact fields — no embeddings, no persisted index. |
| **PM.4** `set-vault.sh list --status` read-only per-vault status column (pending `raw/` count + last `log.md` op), opt-in flag so bare `list` stays fast; pre-switch health-check gate in `vault_switch` (dir exists + `CLAUDE.md` with `schema_version` + `wiki/`) | Power / B | 3 | S | `scripts/resolve-vault.sh` (`vault_list`, `vault_switch`), `scripts/set-vault.sh` | `list --status` with N≥3 prints one row per vault with raw-pending count + last log verb/date, active marked `*`, output awk-parseable; bare `list` unchanged (does not read `log.md`); `switch <deleted-path>` exits 1 naming the missing path, active vault unchanged; `switch <valid>` succeeds; a not-yet-scaffolded vault (CLAUDE.md, no `wiki/`) WARNs with a concrete remediation (`run /claude-wiki-pages:init`) per `OBJ-grill-plugin-power-user-5`. **Why-not-RAG:** filesystem state (file counts, last log line) — deterministic, no semantic data. |
| **PM.5** Multi-vault agent-teaching: "Multi-vault operating rules" section in `skills/maintain-contract/SKILL.md`, linked from the `--other-vaults` description in `skills/engine-api/SKILL.md` | B/D | 3 | S | `skills/maintain-contract/SKILL.md`, `skills/engine-api/SKILL.md` | Section states: always `--target` the active vault; pass `--other-vaults` from the registry for confinement; reads from a non-active registered vault are permitted; writes to any non-active vault are firewall-blocked regardless of `--other-vaults`; references ADR-0009 + `resolve-vault.sh`; the engine-api `--other-vaults` description links to it (resolves under Check 5). **Why-not-RAG:** a procedural contract derivable from ADR-0009 + the firewall twins — documentation, not retrieval. |
| **PM.6** Author ADR-A (engine self-description) and ADR-B (simultaneous multi-vault); correct the `vault registry` glossary `merge` drift (N13) | Architect + D | 3,10 | S | `docs/adr/` (numbered after 0013), `docs/GLOSSARY.md`, relevant `docs/design/` diagram | ADR-A merged before any P3.1 `CAPABILITIES`/ontology code; ADR-B merged before any PM.1 write path; the `vault registry` glossary row no longer lists `merge` as a shipped lifecycle op (notes it is deferred to ADR-0012); `validate-docs.sh` clean; ADR-B's diagram passes Check 5 set-equality. **Why-not-RAG:** ADRs are human/agent-authored decision records linked by wikilink — the project's own ontology-in-docs pattern. |
| **PM.7** `docs/design/_template.md` (zoom, perspective, `> Authority:`, one mermaid fence, single-source footer linking the predicate table) + hand-authored `docs/design/07-ontology.md` instance (D13); new Check 5 sub-check 5g grounds predicate nodes via grep/awk against `CLAUDE.md:331-345` (N12) | D + QA-func | 10,11 | S | `docs/design/_template.md`, `docs/design/07-ontology.md`, `scripts/validate-docs.sh` (Check 5g) | `_template.md` exists; a fresh diagram authored to it passes Check 5; `07-ontology.md` has exactly one mermaid fence, an `> Authority:` line, links the predicate table, restates no row verbatim; every ER node names a real page-class from the closed `type` enum; **5g** fails when a predicate node in `07-ontology.md` is absent from the grep-extracted table set (gated on `07-ontology.md` existing — TODO comment until then); no generator script, no committed generated artifact (D13 holds). **Why-not-RAG:** template conformance + grep/awk set-membership — zero retrieval, single-sourcing by linking. |

### Deferred / out-of-scope (cut list)

Each item carries the Skeptic-justified verdict given the now-real engine.

| Item | Verdict | Reason (Skeptic-surviving) |
| --- | --- | --- |
| Extract ontology tables to a new committed file / generated `schemas/ontology.json` (V1/D3) | **stay-cut** | `engine ontology --json` (P3.3) is a **read-time projection** of the single authored table at `docs/vault-example/CLAUDE.md:323-361` — it writes nothing, so there is no second source to drift. `CLAUDE.md:361` ("no parallel enum file and no second list") is the hard wall. The engine makes the ontology machine-READABLE without machine-DUPLICATING it. ontology-5 re-affirms; Skeptic + both interrogators concur. |
| New `wiki/_audit/` ledger / persisted cross-vault roll-up index (V3/D5) | **stay-cut** | PM.3 is a read-time fold over per-vault `wiki/log.md` + ADR-0010 with NO persisted artifact; acceptance asserts the working tree is unmodified after two runs. The real engine gives a clean read-time accessor, removing any pretext to persist. |
| Generated + committed ER diagram + diff-gate (D13) | **stay-cut** | `07-ontology.md` is hand-authored to the `_template.md` (PM.7), links the predicate table as authority, restates no row; Check 5g grounds its nodes via grep/awk against the schema (N12). The engine's `ontology --json` gives the contract surface WITHOUT a generated committed diagram. No generator + diff-gate is warranted. |
| Agent-authored design diagrams (D14) | **stay-cut** | No Round-1 idea proposes them; all diagram work (PM.7) is hand-authored to the template and gated by Check 5. The engine surfaces give agents READ access to the contract, removing any motivation to have agents author diagrams. Uncontested. |
| Six separate doc/diagram gate files (D10) | **stay-cut** | All new checks ride existing entry points: the verb-drift test under `gate-01-engine-tests.sh` `bun test` (N9); the predicate grounding as Check 5g in `validate-docs.sh` (N12); the OQ-9 fixtures extend `gate-11-firewall-parity.sh` (D12); the envelope conformance is a Tier-1 Bats test (N11). No new top-level gate file. |
| Closed-core schema — only `entity_type` vault-extensible; predicates + page-type enum closed | **stay-cut (re-affirmed, now ENFORCEABLE)** | Today `validate-frontmatter.sh` never checks `entity_type` membership (`scripts/validate-frontmatter.sh:54-65` branches on page `type` only) — the allow-list is documentation. P3.3/P3.4 make `entity_type` the only composing enum (core ∪ extensions, `CLAUDE.md:354,361`) and reject any other `*_extensions` key (D15); predicates (`:331-345`) and the 9 page-types (`:353`) stay closed (`extensible:false`). The engine makes the boundary testable for the first time; opening it further is not proposed. |
| Cross-vault SessionStart heartbeat (BACKLOG line appended to `session-start.sh`) | **stay-cut** (resurrect-candidate logged) | **Skeptic veto STANDS** (N14): directly resurrects the predecessor's cut item (`tmp/SOFTWARE-3-0-plan.md:162`) with no engine-grounded reason; puts an O(N) find scan on the single-vault hot path. The on-demand roll-up (PM.3) covers the need. The QA-func critic argued it is a narrower session-start extension rather than the vetoed standalone heartbeat — logged as a resurrect-candidate, but **declined** for this run on YAGNI; if ever wanted, gate it behind an opt-in flag in `docs/automation.md`, never a default SessionStart append. |

## Glossary debt (add a `docs/GLOSSARY.md` row before the prose/gate name ships)

- **`capabilities` (engine verb)** — agent-facing self-describing manifest. **Gated:** add a row ONLY
  if the term enters user-facing prose; per `OBJ-skeptic-new-user-1-1` it is an agent-only term, so
  prefer defining it in `skills/engine-api/SKILL.md` (agent-facing) and keep onboarding free of it.
- **`ontology` (named artifact / engine surface)** — distinct from `ontology-profile-v1` the schema
  section; needed before P3.3 prose uses it.
- **`deterministic engine`** — plain-language row for the Bun CLI ("validates the vault and runs
  quality checks; same input → same result; requires Bun ≥ 1.2"); grounds the term before Phase 3
  adds two more verbs (new-user-4).
- **`vault registry` / `registered vault roots`** — confirm rows exist; **fix the `merge` drift**
  (PM.6): the row must not list `merge` as a shipped op (deferred to ADR-0012). Add a plain-language
  note: "today only `add`/`remove`/`switch`/`list` are supported".
- `entity_type_extensions` already has a row (`docs/GLOSSARY.md:90`) — reuse; surface its existence in
  the onboarding pointer (defer enumeration to `/claude-wiki-pages:doctor`, new-user-5).

## Open questions

**None block handover.** The added non-negotiables resolved the policy questions this run could have
raised:

- **OQ-9 fail-closed is FIXED, not debated** — resolution stays ADR-0009; the fix is the PM.2
  acceptance, not a decision (N4).
- **ADR-A / ADR-B sequencing** is a decision the team can execute (N13) — they precede their
  respective implementation code; no user sign-off needed.
- The only soft call for the user: whether the **cut SessionStart heartbeat** (N14) should be
  resurrected behind an opt-in `docs/automation.md` flag in a *later* run. Logged as a
  resurrect-candidate; declined for this run. Not blocking.

## Handover checklist (for `wiki-dev-manager`)

1. **ADRs first (N13).** Author + merge **ADR-A** (engine self-description — records N1–N3, N6) before
   any P3.1/P3.3 code; author + merge **ADR-B** (simultaneous multi-vault — records N4, N8) before any
   PM.1 write path. These bind future drift and keep decisions out of gitignored `tmp/`.
2. **Phase 3 sequencing.** Land **P3.1** (the `CAPABILITIES` table refactor) first — P3.2, P3.3, P3.6
   all assert against it. Then P3.2 (drift test), P3.3 (ontology verb), P3.4 (engine-side membership),
   P3.5 (bash `--json`), P3.6 (docs). All ride `gate-01-engine-tests.sh` / `gate-05` / a Tier-1 Bats
   test — no new gate files (D10).
3. **Phase M sequencing.** Land **PM.2** (OQ-9 fail-closed) before PM.1 write paths and PM.3 roll-up —
   both rely on a trustworthy registry. QA-adversarial must prove the three PM.2 fixtures + the
   registry-derived fixture on BOTH firewall twins; confirm CI provisions Bun or `gate-11` SKIPs
   silently.
4. **Honor the closed-core boundary.** Only `entity_type` composes (D15); the bash `case` keeps its
   behavior as a documented DRY exception (N7) — do NOT add a Bun dependency to the hook path.
5. **No-RAG discipline.** Every item is deterministic enumeration/parse/set-math over authored
   sources; no embeddings, no persisted index, no second store. PM.3 must leave the working tree clean
   (snapshot diff).
6. **Glossary-first.** Add the `deterministic engine`, `ontology` (artifact), and `vault registry`
   `merge`-drift rows before the prose/gate names ship; gate the `capabilities` row behind user-facing
   use only.

```
Provenance: predecessor tmp/SOFTWARE-3-0-plan.md (Phases 0–2 done/in-flight) → this sequel run
(11 personas, three-round protocol, docs/brainstorm/). 36 Round-1 ideas → Round-2 cross-critique
(4 multi-veto clusters: capabilities×5→1, OQ-9×6→1, ontology home, registry_all_vaults) → this
convergence. Vetoes honored: V1 (no ontology fork), V3 (no ledger), D13 (no generated ER diagram),
D14 (no agent diagrams), closed-core (only entity_type extends). Engine re-baseline verified:
src/cli/cli.ts:23-35, src/core/report.ts:19-63, scripts/resolve-vault.sh:107-132,
docs/vault-example/CLAUDE.md:323-361, scripts/validate-docs.sh:280-631 (Check 5/ADR-0013 on branch).
```
