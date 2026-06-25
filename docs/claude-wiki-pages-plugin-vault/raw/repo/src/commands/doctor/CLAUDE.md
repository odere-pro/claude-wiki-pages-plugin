# doctor — environment + vault health check

`doctor` is the wellness probe: twelve checks (D01–D12) over both the environment and
the vault, each returning `pass` / `warn` / `fail` / `fixed` / `skip`. It answers
"is this install healthy and is the vault sound?" in one pass, and with `--fix`
repairs the auto-fixable subset (D04, D05, D08) — diagnose-only checks are never
mutated. Each check is a pure `(ctx: DoctorContext) => CheckResult` registered in
an ordered `CHECKS` array, so adding a check is one array entry plus one function.
The hot-path equivalent for the Layer 4 `SessionStart` hook is the bash twin
[`../../../scripts/doctor.sh`](../../../scripts/doctor.sh); this engine handler in
[`doctor.ts`](./doctor.ts) is the full implementation behind
`/claude-wiki-pages:doctor`.

## Input and flags

- `claude-wiki-pages doctor` — run all twelve checks against the resolved vault.
- `--target <vault>` — explicit vault path.
- `--fix` — apply the auto-fixable repairs (D04 chmod, D05 git init, D08 settings
  copy).
- `--strict` — change the exit contract (see below).
- `--json` — emit the structured `DoctorReport`.

## The twelve checks

| ID | Title | Auto-fix |
| --- | --- | --- |
| D01 | Vault path resolves and exists | — |
| D02 | `schema_version` present and supported | — |
| D03 | `raw/` readable, `wiki/` writable | — |
| D04 | Every `hooks.json` script exists and is executable | `--fix` chmod +x |
| D05 | Vault is a git repo (self-heal is reversible) | `--fix` git init |
| D06 | Bun engine present (this check ran in it) | — |
| D07 | User config presence | — |
| D08 | Legacy settings path migrated to the current one | `--fix` copy |
| D09 | Vault integrity — delegates to [`verify`](../verify/CLAUDE.md) | — |
| D10 | Glossary gate present (repo-context only) | — |
| D11 | Obsidian link parity — asks a running Obsidian for `unresolvedLinks` (advisory: any CLI failure is `skip`, never `fail`) | — |
| D12 | Strict-tree conformance — `treeConformance`, island count, non-spine / cross-tree / transitive-redundant edges, cycles, multi-parent, max saturation (ADR-0036; diagnose-only, `warn` on drift) | — |

D02 reuses [`schema.ts`](../../core/schema.ts) (`declaredSchemaVersion`,
`SUPPORTED_SCHEMA_VERSIONS`); D05 reuses [`git.ts`](../../core/git.ts) (`isRepo`,
`ensureRepo`); D09 calls [`verify`](../verify/CLAUDE.md) and folds its
error/warning counts into a status. Checks that are only meaningful inside the
plugin repo (D04, D10) `skip` cleanly outside it. D11 shells out to the
`obsidian` CLI through an injectable runner (`DoctorOptions.runner`, default
`spawnSync` with a 5 s timeout) so the check stays pure in tests; it counts the
entries in `app.metadataCache.unresolvedLinks` and warns with a lint hint when
any are dangling — CLI absent, vault not open, or unparseable output all `skip`.
D12 reuses [`tree-metric.ts`](../../core/tree-metric.ts) (`computeTreeMetric`, which
consumes the one [`spine.ts`](../../core/spine.ts) derivation) and `warn`s when the
graph carries non-spine edges, cycles, or multi-parent pages (ADR-0036); it never
fails or mutates — the remediation is `/claude-wiki-pages:fix` (strict-tree-reduce).

## Exit codes

`doctorExit` returns `0` by default regardless of findings — `doctor` is a
diagnostic, not a gate. Under `--strict` it returns `3` when the worst status is
`warn` or `fail`. The `worst` field is computed by `worstOf`, ranking
`pass`/`skip` (0) < `fixed` (1) < `warn` (2) < `fail` (3).

## DoctorReport / HealthReport

```ts
interface CheckResult {
  id: string;          // "D01" … "D12"
  title: string;
  status: "pass" | "warn" | "fail" | "fixed" | "skip";
  message: string;
  hint?: string;       // remediation, e.g. "run with --fix"
}

interface DoctorReport {
  command: "doctor";
  vault: string;
  results: readonly CheckResult[];
  worst: DoctorStatus;
}
```

The router renders each result with a status glyph and a worst-status footer; the
`Status` union is single-sourced in [`../../core/report.ts`](../../core/report.ts).

## Edge cases

- A non-existent vault makes the vault-scoped checks `skip` rather than `fail`,
  so `doctor` is still useful pre-onboarding.
- D04/D08 are no-ops outside the plugin repo (no `hooks.json`, no legacy
  settings) and report `skip`/`pass` accordingly.
- `--fix` only ever touches the three fixable checks; D01–D03, D06, D07, D09–D12
  are pure diagnosis.

## Covered by

- [`doctor.test.ts`](./doctor.test.ts) — status rollup, the auto-fix subset, and
  the strict-mode exit code.
