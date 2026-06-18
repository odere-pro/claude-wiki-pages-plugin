/**
 * `lint` — structural lint of an Obsidian LLM-Wiki vault.
 *
 * Supports `--check <name>` to run a specific check (default: all checks).
 * Composition mirrors src/commands/verify/verify.ts:
 *   - resolveVault for four-tier vault resolution
 *   - buildReport for a frozen, immutable Report
 *   - findings array composed from check functions
 *
 * `concurrency` is parsed and validated here but currently unused.
 * It is reserved for parallel check execution in a later milestone.
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
import { checkStructural } from "../../core/structural-check.ts";
import { checkOntology } from "../../core/ontology-lint.ts";
import type { Finding } from "../../core/report.ts";

/** Minimum allowed concurrency value. */
const CONCURRENCY_MIN = 1;

/** Maximum allowed concurrency value. */
const CONCURRENCY_MAX = 32;

/** Named checks selectable via --check. "all" runs every check. */
export type LintCheck = "manifests" | "md-links" | "structural" | "ontology" | "all";

/** The set of known check names (guards against typos at the call site). */
const KNOWN_CHECKS = new Set<LintCheck>(["manifests", "md-links", "structural", "ontology", "all"]);

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
   * Maximum parallel check workers (parsed, validated, currently unused).
   * Must be between 1 and 32 inclusive. Out-of-range values are clamped.
   */
  readonly concurrency?: number;
  /**
   * Which check to run. Defaults to "all" (every check).
   * Use "manifests" to run only the plugin-manifest check.
   */
  readonly check?: LintCheck;
}

/**
 * Validate and clamp a concurrency value to the allowed range.
 * Returns 1 for undefined/NaN/negative inputs (safe default).
 */
function resolveConcurrency(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) return 1;
  return Math.max(CONCURRENCY_MIN, Math.min(CONCURRENCY_MAX, Math.floor(raw)));
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

export function lint(opts: LintOptions = {}): Report {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");

  // Validate the concurrency flag now (clamp to range) so an out-of-range value
  // surfaces at parse time rather than being silently dropped later. The result
  // is intentionally discarded until a later milestone wires it to parallel
  // check execution.
  void resolveConcurrency(opts.concurrency);

  const check = opts.check ?? "all";

  // Collect findings from selected checks.
  const findings: Finding[] = [];

  // Check: manifests — validate .claude-plugin/plugin.json and marketplace.json.
  //
  // When --check manifests is explicit: always run (missing file → error finding).
  // When check=all: only run when .claude-plugin/ exists in the resolved repo
  // root; vault-only runs (CI on content vaults, test sandboxes) are not plugin
  // repositories and should not fail on a missing plugin manifest.
  if (check === "manifests") {
    const repoRoot = resolveRepoRoot(vault);
    findings.push(...checkManifests(repoRoot));
  }

  // Check: md-links — detect [text](file.md) links that should be [[wikilinks]].
  //
  // Migrated from scripts/check-wikilinks.sh CLI half (Phase 1, tmp/migration-plan.md).
  // The hook half (PreToolUse stdin-JSON path) stays in bash until Phase 3.
  // Skips bookkeeping files and folder notes (mirrors check_content() exemptions).
  if (check === "md-links") {
    findings.push(...checkMarkdownLinks(vault));
  }

  // Check: structural — template-skeleton conformance + no-raw-HTML (S2).
  //
  // Migrated from scripts/lint-structural.sh (Phase 1, tmp/migration-plan.md §3).
  // WARN-tier advisory audit; never blocks a write. Skips bookkeeping files,
  // folder notes, _proposed/ drafts, and type-exempt pages (source/index/manifest/log).
  if (check === "structural") {
    findings.push(...checkStructural(vault));
  }

  // Check: ontology — predicate domain→range lint (S1-check).
  //
  // Migrated from scripts/lint-ontology.sh (Phase 1, tmp/migration-plan.md §4).
  // WARN-tier advisory audit; never blocks a write. Reads ontology-profile-v1 from
  // vault/CLAUDE.md and checks each typed wikilink field against domain/range rules.
  // Gracefully skips when vault/CLAUDE.md is absent or has no predicate table.
  if (check === "ontology") {
    findings.push(...checkOntology(vault));
  }

  if (check === "all") {
    const repoRoot = resolveRepoRoot(vault);
    if (existsSync(join(repoRoot, ".claude-plugin"))) {
      findings.push(...checkManifests(repoRoot));
    }
    // md-links: run unconditionally on all vaults (no optional-gate needed).
    findings.push(...checkMarkdownLinks(vault));
    // structural: run unconditionally on all vaults.
    findings.push(...checkStructural(vault));
    // ontology: run unconditionally on all vaults (graceful-skip in checkOntology
    // when CLAUDE.md or predicate table is absent).
    findings.push(...checkOntology(vault));
  }

  return buildReport("lint", vault, findings);
}
