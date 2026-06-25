# ADR-0034: Bun is a required, fail-closed dependency; engine `lint` is the WARN-tier twin of `verify`

- **Status:** Proposed
- **Date:** 2026-06-18
- **Builds on:** [ADR-0015](./ADR-0015-engine-self-description-surfaces.md) (the Bun engine as the self-describing source of truth), [ADR-0016](./ADR-0016-simultaneous-multi-vault-management.md) (fail-closed registry posture), [ADR-0028](./ADR-0028-dangling-wikilink-verify-check.md) (WARN-tier findings on the shared Report model)
- **Supersedes (in part):** the fail-open bridge contract documented in [`../../scripts/engine.sh`](../../scripts/engine.sh) (lines 4–6) for security-relevant calls only
- **Anchor:** §3 tech stack (`bun >= 1.2`, `scripts/engine.sh` bridge), §5 non-negotiables (security gates must fail closed, DRY), the `verify` command contract in [`../architecture.md`](../architecture.md)
- **Owner:** Architect (this ADR); implementation split across Lane A (engine `lint` verb, `src/cli/cli.ts`, `src/commands/lint/`) and Lane D / Orchestration (`scripts/engine.sh` bridge classification, hook wiring)

## Context

Two decisions were ratified together because they share one root cause: the
plugin's Bun engine is the single deterministic source of truth (ADR-0015), but
the **bridge** that hooks and scripts use to reach it,
[`../../scripts/engine.sh`](../../scripts/engine.sh), is **fail-open**. When Bun
is absent the bridge prints a warning and `exit 0` (`engine.sh:4–6,15–17`), so a
hot-path hook degrades gracefully rather than hard-failing. That tradeoff is
correct for *advisory* steps (a reminder, a summary), but it is wrong for a
*security* step: a write-confinement or integrity check that silently no-ops
because Bun is missing is a fail-**open** security gate — the dangerous default
the firewall posture (ADR-0016) otherwise rejects.

Today the pure-bash gates (`scripts/firewall.sh`, `scripts/protect-raw.sh`)
decide write-confinement without spawning Bun, so they are unaffected. The gap
is the class of checks that *do* route through the engine — the `verify` /
`firewall` engine twins kept in parity (gate-05, gate-11), and the engine `lint`
verb introduced below. As the plugin migrates more logic into the Bun engine
(the bun-migration effort), "Bun missing ⇒ check skipped, exit 0" becomes a
widening hole. The ratified position is to make **Bun a required dependency**
and have security-relevant engine calls **fail closed** when it is absent.

The second decision settles a naming/tier question the migration surfaced. The
engine has one integrity verb, `verify` (`src/commands/verify/`), composed of
structural checks that error and set a non-zero exit code (CHECK 0–5 in
[`../../src/commands/verify/verify.ts`](../../src/commands/verify/verify.ts)).
The migration moves a body of *advisory* audits — drift signals that should be
reported but must never block a write or fail a gate — into the engine. Folding
these into `verify` would force its exit-code contract to carry warnings, muddying
"did the vault pass the gate". The ratified position is a separate engine verb,
`lint`, whose findings are WARN-tier and never change the exit code — the engine
twin of the Layer-2 `lint` skill (which "audits the wiki for structural and
provenance drift", per the glossary), riding the same `Finding`/`Report` model
ADR-0028 already established for WARN-tier checks.

## Decision

### 1. Bun is a required dependency; security-relevant engine calls fail closed

Bun (`>= 1.2`, per `package.json` / §3) is **required**, not optional. The
bridge [`../../scripts/engine.sh`](../../scripts/engine.sh) gains a **call
classification** so the fail-open vs fail-closed choice is explicit per call,
never implicit in the global `exit 0`:

- **Security-relevant calls** (engine `verify`, `firewall`, the engine `lint`
  gate path below, and any future check whose verdict gates a write or asserts
  vault integrity) **fail closed** when Bun is missing: the bridge emits a
  teaching message naming the missing dependency and the install URL, and exits
  **non-zero** (block). A missing runtime must read as "could not verify," never
  as "passed."
- **Advisory calls** (reminders, summaries, self-description) keep today's
  fail-open behavior (warn + `exit 0`) so a missing Bun degrades a non-gating
  nicety gracefully — unchanged for that class.

The classification is a property of the **call site**, surfaced as an explicit
flag the bridge reads (e.g. an opt-in `--require-bun` / security marker passed by
the security call sites), not a hardcoded list of verb names inside `engine.sh`
— so a new security verb opts in at its call site and the bridge stays a thin
router (§5 KISS). `doctor` continues to check Bun is present (the same posture as
the §5 git-required check), so the missing-runtime condition is also reported
proactively, not only at the moment a gate fires.

This is strictly **safer** than today: a security check can no longer pass by
being skipped. It does not weaken the advisory path, and it does not change any
caller's *signature* — the same `engine.sh <verb> …` invocation now returns a
blocking exit code instead of a silent `0` when Bun is genuinely absent.

### 2. Engine `lint` is the WARN-tier advisory twin of error-tier `verify`

The engine gains a `lint` verb alongside `verify`, with a clean tier split:

- **`verify` = error-tier integrity.** Structural defects (schema mismatch,
  broken provenance, missing required fields). Findings can be ERROR severity;
  ERROR drives a non-zero `exitCode`. `verify` answers "is this vault
  structurally valid" — it gates.
- **`lint` = WARN-tier advisory audit.** Quality/curation/drift signals
  (staleness, vocabulary drift, advisory structural smells) that should be
  surfaced for a human or agent to act on but must **never** block a write or
  fail a gate. `lint` emits `Finding{ severity: "warn", … }` exclusively;
  WARN never raises `exitCode`. `lint` answers "what should be improved" — it
  advises.

Both verbs compose from the **one** shared `Finding`/`Report` model in
[`../../src/core/report.ts`](../../src/core/report.ts) (the same model ADR-0028
uses) and both support `--json` for agents and rendered text for humans. `lint`
is **not** a second ranker, a second report surface, or a second resolution
model — where `lint` and `verify` need the same rule (e.g. wikilink resolution),
they share the single specification, per the DRY non-negotiable (§5). The engine
`lint` verb is the deterministic twin of the Layer-2 `lint` skill; the skill
delegates its mechanical structural/provenance audit to the engine verb rather
than re-implementing it (one mechanism per job).

The migrated bash audit logic becomes a **thin wrapper** preserving every
existing caller (CI, skills, `fill-gaps`); the bash logic is **not** deleted in
the same step that adds the engine verb — dual-run equivalence (identical
counts/verdicts on `tests/fixtures/reference-vault`) is proven first, then the
bash twin is retired in a separate step under the parity gate, exactly as the
firewall (gate-11) and verify (gate-05) twins are handled.

## Alternatives considered

- **Keep the bridge fail-open everywhere (status quo).** Rejected: a
  security/integrity check that silently no-ops when Bun is missing is a
  fail-open security gate — the precise posture ADR-0016 and §5 reject. "Could
  not verify" must not read as "passed."
- **Fail closed on *every* engine call, advisory included.** Rejected: a missing
  Bun would then block a session merely to print a non-gating reminder or
  summary, harming the degrade-gracefully UX for no security benefit. The split
  is by call *purpose*, not blanket.
- **Hardcode the security verb list inside `engine.sh`.** Rejected: that forks a
  second source of truth about which verbs gate, drifting from the call sites
  that actually know. The marker rides the call site; the bridge stays a thin
  router (§5 KISS / DRY).
- **Fold the advisory audits into `verify` (no new verb).** Rejected: it forces
  `verify`'s exit-code contract to carry warnings, blurring "did the vault pass
  the gate" — the same separation-of-concerns reason `lint` and `verify` are
  distinct Layer-2 skills today. A WARN-only finding inside an error-gating verb
  invites a future bug where a warning leaks into the exit code.
- **A new `audit` (or `check`) verb name.** Rejected: `lint` is already the
  established term for "advisory drift audit" across the skill layer, the
  user-facing verbs, and the glossary. Reusing it activates the existing prior
  (glossary "input weight" rationale) and keeps the skill↔engine mapping 1:1;
  inventing `audit` would split one concept across two names.

## Consequences

- A missing Bun now **blocks** a security-relevant engine call instead of
  silently passing it — strictly safer, and surfaced proactively by `doctor`.
  The advisory path is unchanged.
- The engine grows one verb (`lint`) on the existing Report model — no new
  output surface, no new flag family. `verify` keeps its error-tier gating
  contract; `lint` carries the WARN-tier advisory contract.
- `scripts/engine.sh` gains a per-call security marker (a small, additive bridge
  change); no caller signature changes.
- The migration sequence is preserved: each migrated bash audit becomes a thin
  wrapper first; bash deletion only follows a proven dual-run equivalence under
  the parity gate.
- The glossary lands three new rows ahead of any prose/code using them
  (glossary-first, §5): `lint (engine verb)`, `verify (engine verb)`, and
  `fail-closed engine bridge`. The pre-existing `lint`/`verify` *skill* and
  *user-facing-verb* rows are unchanged; the new rows name the **engine** twins
  and the bridge posture.

## Revisit when

- A third tier of finding is needed (e.g. INFO-only notices distinct from WARN)
  — that is a Report-model extension, recorded as its own ADR, applied once to
  the shared model both verbs read.
- The plugin gains a runtime other than Bun (e.g. a compiled binary), changing
  what "the required engine runtime is present" means for the fail-closed check.
- A security-relevant call legitimately needs to degrade rather than block in a
  specific offline tier — that is a deliberate widening, recorded against the
  offline-policy ADRs (ADR-0018), not an ad-hoc bridge exception.
