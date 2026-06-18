/**
 * `lint` — structural lint of an Obsidian LLM-Wiki vault.
 *
 * Scaffold only: returns an empty Report with no findings.
 * Lint checks will be added in subsequent milestones.
 *
 * Composition mirrors src/commands/verify/verify.ts:
 *   - resolveVault for four-tier vault resolution
 *   - buildReport for a frozen, immutable Report
 *   - findings array composed from (future) check functions
 *
 * `concurrency` is parsed and validated here but currently unused.
 * It is reserved for parallel check execution in a later milestone.
 */

import { buildReport, type Report } from "../../core/report.ts";
import { resolveVault } from "../../core/vault.ts";

/** Minimum allowed concurrency value. */
const CONCURRENCY_MIN = 1;

/** Maximum allowed concurrency value. */
const CONCURRENCY_MAX = 32;

export interface LintOptions {
  /** Explicit vault path; overrides four-tier resolution (mirrors `--target`). */
  readonly target?: string;
  readonly cwd?: string;
  /**
   * Maximum parallel check workers (parsed, validated, currently unused).
   * Must be between 1 and 32 inclusive. Out-of-range values are clamped.
   */
  readonly concurrency?: number;
}

/**
 * Validate and clamp a concurrency value to the allowed range.
 * Returns 1 for undefined/NaN/negative inputs (safe default).
 */
function resolveConcurrency(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) return 1;
  return Math.max(CONCURRENCY_MIN, Math.min(CONCURRENCY_MAX, Math.floor(raw)));
}

export function lint(opts: LintOptions = {}): Report {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");

  // Validate the concurrency flag now (clamp to range) so an out-of-range value
  // surfaces at parse time rather than being silently dropped later. The result
  // is intentionally discarded until a later milestone wires it to parallel
  // check execution.
  void resolveConcurrency(opts.concurrency);

  // Scaffold: no checks yet — return a clean empty Report.
  // Checks will be added here in the form:
  //   const findings = [...checkFoo(wiki), ...checkBar(wiki), ...];
  const findings: readonly never[] = [];

  return buildReport("lint", vault, findings);
}
