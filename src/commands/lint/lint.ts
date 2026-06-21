/**
 * `lint` — structural lint of an Obsidian LLM-Wiki vault.
 *
 * Supports `--check <name>` to run a specific check (default: all checks).
 * Composition mirrors src/commands/verify/verify.ts:
 *   - resolveVault for four-tier vault resolution
 *   - buildReport for a frozen, immutable Report
 *   - findings array composed from check functions
 *
 * Phase 2 (tmp/migration-plan.md): checks run concurrently via Promise.all;
 * findings are deterministically sorted by (file, check, severity, message)
 * before buildReport so byte-identical output is guaranteed regardless of
 * completion order. --concurrency 1 triggers a serial fallback for
 * debuggability.
 *
 * Currently implemented checks (selectable via --check):
 *   - manifests: validate .claude-plugin/plugin.json and marketplace.json
 *     (migrated from scripts/validate-manifests.sh; native JSON.parse, no jq)
 */

import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { buildReport, type Report } from "../../core/report.ts";
import { resolveVault } from "../../core/vault.ts";
import { checkManifests } from "../../core/manifest-check.ts";
import { checkMarkdownLinks } from "../../core/markdown-link-check.ts";
import { checkGhostLinks } from "../../core/ghost-link-check.ts";
import { checkStructural } from "../../core/structural-check.ts";
import { checkOntology } from "../../core/ontology-lint.ts";
import { lintVocabulary } from "../../core/vocabulary-lint.ts";
import { checkDuplicateClaims } from "../../core/duplicate-claims.ts";
import { checkOutput } from "../../core/output-check.ts";
import { checkDocs } from "../../core/docs-check.ts";
import { resolveConcurrency, runChecks, type CheckFn } from "../../core/checks-runner.ts";

/** Named checks selectable via --check. "all" runs every check. */
export type LintCheck =
  | "manifests"
  | "md-links"
  | "ghost-links"
  | "structural"
  | "ontology"
  | "vocabulary"
  | "dup-claims"
  | "output"
  | "docs"
  | "all";

/** The set of known check names (guards against typos at the call site). */
const KNOWN_CHECKS = new Set<LintCheck>([
  "manifests",
  "md-links",
  "ghost-links",
  "structural",
  "ontology",
  "vocabulary",
  "dup-claims",
  "output",
  "docs",
  "all",
]);

/** Resolve a raw --check value to a LintCheck (defaults to "all"). */
export function resolveLintCheck(raw: string | undefined): LintCheck {
  if (raw !== undefined && KNOWN_CHECKS.has(raw as LintCheck)) {
    return raw as LintCheck;
  }
  return "all";
}

export interface LintOptions {
  /** Explicit vault path; overrides four-tier resolution (mirrors `--target`). */
  readonly target?: string;
  readonly cwd?: string;
  /**
   * Maximum parallel check workers (1–32, default: run all in parallel).
   * Set to 1 for serial execution (debuggability). Out-of-range values are clamped.
   */
  readonly concurrency?: number;
  /**
   * Which check to run. Defaults to "all" (every check).
   * Use "manifests" to run only the plugin-manifest check.
   */
  readonly check?: LintCheck;
  /**
   * Minimum page count for a tag form before the vocabulary tag-floor warning
   * fires (vocabulary check only). Mirrors lint-vocabulary.sh `--min-tag-usage`.
   * Defaults to the check's own default (2) when undefined.
   */
  readonly minTagUsage?: number;
  /**
   * Path to a `_proposed/` page to scan for duplicate claims (dup-claims check
   * only). Mirrors check-duplicate-claims.sh `--proposed`. When undefined, the
   * dup-claims check is a no-op (nothing to compare against the wiki).
   */
  readonly file?: string;
}

/**
 * Resolve the repository root from a vault path.
 *
 * The manifest check operates on `.claude-plugin/plugin.json` which lives at
 * the repository root, not inside the vault. This function walks up from the
 * vault directory looking for a `.claude-plugin/` ancestor.
 *
 * Strategy (no git dependency, conservative):
 *  1. Start at `vault` and walk up to 6 levels.
 *  2. Return the first directory that contains `.claude-plugin/`.
 *  3. Fallback to `dirname(vault)` when none found (covers vault == repo root).
 *
 * The manifest check itself reports an error finding when
 * `.claude-plugin/plugin.json` is absent, so a wrong root surfaces as a lint
 * error rather than a silent skip.
 */
function resolveRepoRoot(vault: string): string {
  let cur = vault.replace(/\/+$/, "");
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(cur, ".claude-plugin"))) {
      return cur;
    }
    const parent = dirname(cur);
    if (parent === cur) break; // reached filesystem root
    cur = parent;
  }
  // Fallback: one level up from vault (covers vault nested inside project root).
  return dirname(vault);
}

export async function lint(opts: LintOptions = {}): Promise<Report> {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");

  const concurrency = resolveConcurrency(opts.concurrency);
  const check = opts.check ?? "all";

  // Each entry is a named check thunk: { name, fn }. runChecks
  // (core/checks-runner.ts) executes them concurrently or serially (n=1) and
  // returns the findings deterministically sorted — byte-identical output.
  type NamedCheck = { name: string; fn: CheckFn };

  const selectedChecks: NamedCheck[] = [];

  // Check: manifests — validate .claude-plugin/plugin.json and marketplace.json.
  //
  // When --check manifests is explicit: always run (missing file → error finding).
  // When check=all: only run when .claude-plugin/ exists in the resolved repo
  // root; vault-only runs (CI on content vaults, test sandboxes) are not plugin
  // repositories and should not fail on a missing plugin manifest.
  if (check === "manifests") {
    const repoRoot = resolveRepoRoot(vault);
    selectedChecks.push({ name: "manifests", fn: () => checkManifests(repoRoot) });
  }

  // Check: md-links — detect [text](file.md) links that should be [[wikilinks]].
  //
  // Migrated from scripts/check-wikilinks.sh CLI half (Phase 1, tmp/migration-plan.md).
  // The hook half (PreToolUse stdin-JSON path) stays in bash until Phase 3.
  // Skips bookkeeping files and folder notes (mirrors check_content() exemptions).
  if (check === "md-links") {
    selectedChecks.push({ name: "md-links", fn: () => checkMarkdownLinks(vault) });
  }

  // Check: ghost-links — links that resolve only via alias/title, never
  // path/basename. Obsidian resolves a written link by path/basename only, so
  // these render as gray ghost nodes (ADR-0033 island graph). The remedy is the
  // piped basename form. Deliberately NOT part of `check=all`: `all` is the
  // byte-stable per-vault lint pinned by tests + shared fixtures that still
  // carry legacy bare-title links; this check is opt-in, invoked explicitly by
  // the lint skill and the curator's link auto-fix path.
  if (check === "ghost-links") {
    selectedChecks.push({ name: "ghost-links", fn: () => checkGhostLinks(join(vault, "wiki")) });
  }

  // Check: structural — template-skeleton conformance + no-raw-HTML (S2).
  //
  // Migrated from scripts/lint-structural.sh (Phase 1, tmp/migration-plan.md §3).
  // WARN-tier advisory audit; never blocks a write. Skips bookkeeping files,
  // folder notes, _proposed/ drafts, and type-exempt pages (source/index/manifest/log).
  if (check === "structural") {
    selectedChecks.push({ name: "structural", fn: () => checkStructural(vault) });
  }

  // Check: ontology — predicate domain→range lint (S1-check).
  //
  // Migrated from scripts/lint-ontology.sh (Phase 1, tmp/migration-plan.md §4).
  // WARN-tier advisory audit; never blocks a write. Reads ontology-profile-v1 from
  // vault/CLAUDE.md and checks each typed wikilink field against domain/range rules.
  // Gracefully skips when vault/CLAUDE.md is absent or has no predicate table.
  if (check === "ontology") {
    selectedChecks.push({ name: "ontology", fn: () => checkOntology(vault) });
  }

  // Check: vocabulary — controlled-vocabulary freshness (orphaned forms,
  // unreferenced groups, tags below the usage floor).
  //
  // Migrated from scripts/lint-vocabulary.sh (Phase 1, tmp/migration-plan.md §3).
  // WARN-tier advisory audit; never blocks a write. Reuses the lexicon loader
  // (vocabulary.ts) + stemming. Absent _vocabulary.md → one info finding.
  if (check === "vocabulary") {
    selectedChecks.push({
      name: "vocabulary",
      fn: () => lintVocabulary(vault, { minTagUsage: opts.minTagUsage }),
    });
  }

  // Check: dup-claims — warn when a _proposed/ page restates a claim already in
  // the wiki (advisory; suggests linking instead of duplicating).
  //
  // Migrated from scripts/check-duplicate-claims.sh (Phase 1, tmp/migration-plan.md §3).
  // WARN-tier; needs --file <proposed page>. A no-op (returns []) without one.
  if (check === "dup-claims") {
    selectedChecks.push({ name: "dup-claims", fn: () => checkDuplicateClaims(vault, opts.file) });
  }

  // Check: output — portable-markdown contract for files under output/.
  //
  // Migrated from scripts/verify-output.sh (Phase 1, tmp/migration-plan.md §3).
  // Audits <vault>/output/ only; absent/empty output/ → no findings. The bash
  // wrapper remaps these warn findings to exit 1 to preserve its gate contract.
  if (check === "output") {
    selectedChecks.push({ name: "output", fn: () => checkOutput(vault) });
  }

  // Check: docs — the glossary / design-drift CI Tier-0 gate (validate-docs.sh).
  //
  // Migrated from scripts/validate-docs.sh (Phase 1 #9, tmp/migration-plan.md).
  // REPO-scoped, not vault-scoped: it scans git-tracked *.md/*.json/*.sh/*.yml
  // files across the whole plugin repo for banned/SEO terms, layer capitalization,
  // slash-command resolution, and the design-drift pillar (ADR-0013, Check 5).
  // Runs only when explicitly selected (NOT under check=all, which is vault-scoped),
  // since the bash gate is a standalone whole-repo CI gate, not a per-vault lint.
  // git:true → checkDocs scans the git-tracked tree and runs Check 5 (matching the
  // bash `git ls-files` discipline + the hooks/hooks.json gate).
  if (check === "docs") {
    const repoRoot = resolveRepoRoot(vault);
    selectedChecks.push({ name: "docs", fn: () => checkDocs(repoRoot, { git: true }) });
  }

  if (check === "all") {
    const repoRoot = resolveRepoRoot(vault);
    if (existsSync(join(repoRoot, ".claude-plugin"))) {
      selectedChecks.push({ name: "manifests", fn: () => checkManifests(repoRoot) });
    }
    // md-links: run unconditionally on all vaults (no optional-gate needed).
    selectedChecks.push({ name: "md-links", fn: () => checkMarkdownLinks(vault) });
    // structural: run unconditionally on all vaults.
    selectedChecks.push({ name: "structural", fn: () => checkStructural(vault) });
    // ontology: run unconditionally on all vaults (graceful-skip in checkOntology
    // when CLAUDE.md or predicate table is absent).
    selectedChecks.push({ name: "ontology", fn: () => checkOntology(vault) });
    // vocabulary: run unconditionally (absent _vocabulary.md → one info finding).
    selectedChecks.push({
      name: "vocabulary",
      fn: () => lintVocabulary(vault, { minTagUsage: opts.minTagUsage }),
    });
    // dup-claims: only meaningful with --file (a _proposed/ page); no-op otherwise.
    selectedChecks.push({ name: "dup-claims", fn: () => checkDuplicateClaims(vault, opts.file) });
    // output: audit <vault>/output/ (absent/empty → no findings).
    selectedChecks.push({ name: "output", fn: () => checkOutput(vault) });
  }

  const sorted = await runChecks(
    selectedChecks.map((c) => c.fn),
    concurrency,
  );

  return buildReport("lint", vault, sorted);
}
