# lint — structural vault linter

`lint` is the structural linter for an Obsidian LLM-Wiki vault. It reads `wiki/`,
applies a set of deterministic structural checks, and returns a frozen
[`Report`](../../core/report.ts). Same vault in, same findings out — no writes,
no network, no embeddings.

This file documents the **scaffold state**: the command is wired and dispatches
correctly; no checks are implemented yet. Checks will be added in subsequent
milestones and documented here.

## Input and flags

- `claude-wiki-pages lint` — lint the resolved vault (four-tier resolution via
  [`resolveVault`](../../core/vault.ts)).
- `--target <vault>` — explicit vault path, bypassing resolution.
- `--json` — emit the structured `Report` instead of the human text rendering.
- `--concurrency <n>` — maximum parallel check workers (1–32, default 1).
  Parsed and validated; currently unused. Reserved for parallel check execution
  in a later milestone.

## Composition pattern

`lint()` mirrors [`verify.ts`](../verify/verify.ts):

- Vault resolution via `resolveVault` (four-tier, `--target` override).
- Findings accumulated from pure check functions (each imported from
  [`../../core/`](../../core/CLAUDE.md)).
- Report built with `buildReport` — frozen, immutable, tallied.
- Router (`cli.ts`) owns stdout emission and exit-code mapping.

When check functions are added they will follow the same pattern as `verify`:

```ts
const findings = [
  ...checkFoo(wiki),
  ...checkBar(wiki),
];
return buildReport("lint", vault, findings);
```

## LintOptions

```ts
interface LintOptions {
  target?: string;      // explicit vault path (--target)
  cwd?: string;         // cwd for four-tier resolution
  concurrency?: number; // 1–32, default 1 (parsed; unused until checks land)
}
```

## Report semantics

`lint` returns the shared [`Report`](../../core/report.ts):
`{ command: "lint", vault, findings, errors, warnings, clean }`.
`clean` is `errors === 0`. The router maps it through `renderText` (human text)
or `JSON.stringify` (`--json`). Exit code follows `exitCode(report)`: `1` on any
error-severity finding, else `0`.

## Scaffold state

- No checks are implemented. `findings` is always `[]`.
- `clean` is always `true`; exit code is always `0`.
- `--concurrency` is validated and clamped (1–32) but the value is not used.

## Covered by

- [`lint.test.ts`](./lint.test.ts) — empty Report contract, CLI dispatch, flag
  parsing (concurrency, --json, --target).
