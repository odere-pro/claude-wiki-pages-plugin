/**
 * Shared concurrency helpers for engine commands that run sets of check functions.
 *
 * `verify` and `lint` both need to:
 *   1. Validate and clamp a `--concurrency` flag to [1, 32].
 *   2. Run an array of check thunks either serially (n=1) or concurrently (n>1).
 *   3. Deterministically sort the collected findings by (file, check, severity, message)
 *      so byte-identical output is guaranteed regardless of completion order.
 *
 * Centralising these three concerns here removes the golden-hammer duplication
 * (CONCURRENCY_MIN/MAX re-declared, resolveConcurrency + sortFindings copied
 * verbatim) without pulling command-specific logic into core.
 *
 * Dependency direction: this module depends only on core/report.ts (Finding type).
 * It does NOT import from commands/ or cli/.
 */

import type { Finding } from "./report.ts";

/** Minimum allowed concurrency value. */
export const CONCURRENCY_MIN = 1;

/** Maximum allowed concurrency value. */
export const CONCURRENCY_MAX = 32;

/**
 * Validate and clamp a raw `--concurrency` value to [CONCURRENCY_MIN, CONCURRENCY_MAX].
 * Returns CONCURRENCY_MAX (run all in parallel) for undefined / NaN / non-finite inputs.
 * Returns 1 for exactly 1, so callers can detect the serial-fallback case.
 */
export function resolveConcurrency(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) return CONCURRENCY_MAX;
  return Math.max(CONCURRENCY_MIN, Math.min(CONCURRENCY_MAX, Math.floor(raw)));
}

/**
 * Sort findings deterministically by (file, check, severity, message).
 * Pure sort — returns a new sorted array; the input is not mutated.
 */
export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const fa = a.file ?? "";
    const fb = b.file ?? "";
    if (fa !== fb) return fa < fb ? -1 : 1;
    if (a.check !== b.check) return a.check < b.check ? -1 : 1;
    if (a.severity !== b.severity) return a.severity < b.severity ? -1 : 1;
    return a.message < b.message ? -1 : a.message > b.message ? 1 : 0;
  });
}

/** A synchronous check thunk that returns zero or more findings. */
export type CheckFn = () => Finding[] | readonly Finding[];

/**
 * Run an array of check thunks and return the collected findings, deterministically sorted.
 *
 * - When `concurrency === 1`: serial execution (debuggability, predictable stack traces).
 * - Otherwise: all checks run concurrently via `Promise.all` (each thunk is wrapped in
 *   `Promise.resolve` to allow future async checks without API breakage).
 *
 * Findings are sorted by (file, check, severity, message) before returning, so completion
 * order never affects the final output (parity-safe: byte-identical output guaranteed).
 */
export async function runChecks(
  checks: readonly CheckFn[],
  concurrency: number,
): Promise<Finding[]> {
  let allFindings: readonly Finding[];

  if (concurrency === 1) {
    // Serial fallback (n=1) for debuggability — same checks, one at a time.
    const acc: Finding[] = [];
    for (const fn of checks) {
      acc.push(...fn());
    }
    allFindings = acc;
  } else {
    // Bounded parallel: run checks in batches of `concurrency` to honour the
    // configured limit (thread-pool pattern). Promise.all within each batch
    // keeps intra-batch parallelism; the outer loop serialises batches so no
    // more than `concurrency` tasks are in-flight at once.
    // Findings are sorted afterwards so completion order never affects output.
    const acc: Finding[] = [];
    for (let i = 0; i < checks.length; i += concurrency) {
      const batch = checks.slice(i, i + concurrency);
      const results = await Promise.all(batch.map((fn) => Promise.resolve(fn())));
      acc.push(...results.flat());
    }
    allFindings = acc;
  }

  return sortFindings(allFindings);
}
