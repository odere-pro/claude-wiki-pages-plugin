# lint — structural vault linter

`lint` is the structural linter for an Obsidian LLM-Wiki vault. It reads `wiki/`,
applies a set of deterministic structural checks, and returns a frozen
[`Report`](../../core/report.ts). Same vault in, same findings out — no writes,
no network, no embeddings.

## Input and flags

- `claude-wiki-pages lint` — lint the resolved vault (four-tier resolution via
  [`resolveVault`](../../core/vault.ts)).
- `--target <vault>` — explicit vault path, bypassing resolution.
- `--json` — emit the structured `Report` instead of the human text rendering.
- `--concurrency <n>` — maximum parallel check workers (1–32, default 1).
  Parsed and validated; currently unused. Reserved for parallel check execution
  in a later milestone.
- `--check <name>` — run a single check; default is `all`.
  Known values: `manifests`, `md-links`, `all`.

## Composition pattern

`lint()` mirrors [`verify.ts`](../verify/verify.ts):

- Vault resolution via `resolveVault` (four-tier, `--target` override).
- Findings accumulated from pure check functions (each imported from
  [`../../core/`](../../core/CLAUDE.md)).
- Report built with `buildReport` — frozen, immutable, tallied.
- Router (`cli.ts`) owns stdout emission and exit-code mapping.

```ts
const findings = [
  ...checkManifests(repoRoot),   // --check manifests
  ...checkMarkdownLinks(vault),  // --check md-links
];
return buildReport("lint", vault, findings);
```

## LintOptions

```ts
interface LintOptions {
  target?: string;      // explicit vault path (--target)
  cwd?: string;         // cwd for four-tier resolution
  concurrency?: number; // 1–32, default 1 (parsed; unused until checks land)
  check?: LintCheck;    // "manifests" | "md-links" | "all" (default: "all")
}
```

## Implemented checks

### `manifests` — plugin manifest validation

Validates `.claude-plugin/plugin.json` (and optionally `.claude-plugin/marketplace.json`)
against the same rules `scripts/validate-manifests.sh` enforced. Native `JSON.parse` —
no `jq` dependency. Migrated from `validate-manifests.sh` (Phase 1,
`tmp/migration-plan.md`).

When `--check manifests` is explicit: always runs (missing file → error finding).
When `check=all`: only runs when `.claude-plugin/` exists in the resolved repo root;
vault-only runs (CI on content vaults, test sandboxes) skip gracefully.

Covered by: [`manifest-check.ts`](../../core/manifest-check.ts)

### `md-links` — markdown-link guard

Detects `[text](file.md)` links in `wiki/` pages that should be `[[wikilinks]]`.
Mirrors the CLI half of `scripts/check-wikilinks.sh check_content()`. The hook half
(PreToolUse stdin-JSON path) stays in bash until Phase 3 (`tmp/migration-plan.md`).

Detection rules:

- Frontmatter (`---` block) is stripped before scanning.
- Fenced code blocks (triple-backtick) are stripped to avoid false positives on examples.
- Pattern `\[.+\]\([^)]+\.md\)` flags a violation.
- Bookkeeping files (`index`, `log`, `dashboard`, `manifest`, `_index`, `.gitkeep`) and
  folder notes (`<dir>/<dir>.md` + `type: index`) are skipped.
- The first offending fragment is included in the message (U4 errors-that-teach).

When `check=all`: runs unconditionally on all vaults.

Covered by: [`markdown-link-check.ts`](../../core/markdown-link-check.ts)

## Report semantics

`lint` returns the shared [`Report`](../../core/report.ts):
`{ command: "lint", vault, findings, errors, warnings, clean }`.
`clean` is `errors === 0`. The router maps it through `renderText` (human text)
or `JSON.stringify` (`--json`). Exit code follows `exitCode(report)`: `1` on any
error-severity finding, else `0`.

## Covered by

- [`lint.test.ts`](./lint.test.ts) — Report contract, CLI dispatch, flag
  parsing (concurrency, --json, --target, --check), manifests integration.
- [`markdown-link-check.test.ts`](../../core/markdown-link-check.test.ts) —
  md-links unit tests + integration with `lint --check md-links`.
