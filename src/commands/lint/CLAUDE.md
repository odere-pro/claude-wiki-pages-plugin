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
  Known values: `manifests`, `md-links`, `structural`, `ontology`, `vocabulary`,
  `dup-claims`, `output`, `docs`, `all`. Note `docs` is repo-scoped (not part of
  `all`, which is vault-scoped) — it is the CI Tier-0 glossary/design-drift gate.

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
  ...checkStructural(vault),     // --check structural
];
return buildReport("lint", vault, findings);
```

## LintOptions

```ts
interface LintOptions {
  target?: string;      // explicit vault path (--target)
  cwd?: string;         // cwd for four-tier resolution
  concurrency?: number; // 1–32, default 1 (parsed; unused until checks land)
  check?: LintCheck;    // "manifests" | "md-links" | "structural" | "all" (default: "all")
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

### `structural` — template-skeleton conformance + no-raw-HTML (S2)

Migrated from `scripts/lint-structural.sh` (Phase 1, `tmp/migration-plan.md §3`).
WARN-tier advisory audit; never blocks a write. Two sub-checks per eligible wiki page:

1. **Template-skeleton conformance** — every required `## Section` heading from
   `_templates/<type>.md` must be present in the page body. Placeholder headings
   (`## {{something}}`) in the template are excluded from the required list.
   Skipped when `_templates/` is absent or has no template for the page's type.

2. **No-raw-HTML** — block-level HTML elements (`<div>`, `<span>`, `<table>`, etc.)
   in the page body violate presentation-independence (TEAM-BRIEF §5). Frontmatter
   and fenced code blocks are excluded from the scan.

Exemptions (mirrors `lint-structural.sh`):

- Bookkeeping files: `index.md`, `log.md`, `dashboard.md`, `manifest.md`, `_index.md`, `.gitkeep`.
- Folder notes: `<dir>/<dir>.md` where frontmatter has `type: index`.
- `_proposed/` drafts.
- Pages with no `type` frontmatter field.
- Types exempt from skeleton check: `source`, `index`, `manifest`, `log`.

Both sub-checks emit `warn`-severity findings; `exitCode` stays `0` for warn-only
results. The `file` field on each finding is the vault-relative path.

When `check=all`: runs unconditionally on all vaults.

Covered by: [`structural-check.ts`](../../core/structural-check.ts),
[`structural-check.test.ts`](../../core/structural-check.test.ts)

### `docs` — glossary / design-drift CI Tier-0 gate

Migrated from `scripts/validate-docs.sh` (Phase 1 #9, `tmp/migration-plan.md`).
**Repo-scoped, not vault-scoped** — it scans the whole plugin repo's git-tracked
`*.md`/`*.json`/`*.sh`/`*.yml` tree, so it is NOT part of `--check all` (which is
per-vault). `scripts/validate-docs.sh` is now a thin wrapper over
`engine lint --check docs --target <root>`.

ERROR-tier (unlike the other lint checks, which are WARN-tier) — this is a
merge-gating CI invariant, so violations exit 1. Two pillars:

- **Checks 0–4 (glossary)** — banned/retired strings, the retired init-skill
  alias, SEO-register leaks, Layer capitalization, bare slash commands, and
  `/claude-wiki-pages:<name>` resolution. Covered by
  [`docs-check.ts`](../../core/docs-check.ts).
- **Check 5 (design-drift, ADR-0013)** — mermaid node grounding (5a), relative
  link resolution (5b), hook set-equality + PreToolUse-order WARN (5c),
  feature-relation counts (5d), authority presence (5e), router parity (5f), and
  ontology predicate-node grounding (5g). Gated on `hooks/hooks.json` being
  tracked. Covered by [`design-drift.ts`](../../core/design-drift.ts).

File discovery uses a git-backed `RepoIO` ([`repo-io.ts`](../../core/repo-io.ts))
so the scan scope is byte-identical to the bash `git ls-files` discipline. The
retirement of the bash logic was gated on a whole-repo dual-run proving identical
verdicts, violation counts, and per-file/per-check messages bash vs engine.

Covered by: [`docs-check.ts`](../../core/docs-check.ts),
[`design-drift.ts`](../../core/design-drift.ts),
[`repo-io.ts`](../../core/repo-io.ts) and their colocated `*.test.ts`.

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
- [`structural-check.test.ts`](../../core/structural-check.test.ts) —
  structural unit tests (missing-section, raw-html, exemptions) + integration
  with `lint --check structural`.
