/**
 * `verify` — deterministic vault integrity check.
 *
 * Composes the ported CHECK 0–4 from scripts/verify-ingest.sh into one Report.
 * The parity gate asserts this yields the same error/warn set as the bash
 * script on the shared fixtures, so the command contract (docs/architecture.md) keeps holding under the port.
 *
 * Phase 2 (tmp/migration-plan.md): checks run concurrently via Promise.all;
 * findings are deterministically sorted by (file, check, severity, message)
 * before buildReport so byte-identical output is guaranteed regardless of
 * completion order. --concurrency 1 triggers a serial fallback for
 * debuggability.
 */

import { join } from "node:path";
import { existsSync } from "../../core/fs.ts";
import { buildReport, type Finding, type Report } from "../../core/report.ts";
import { checkSchema } from "../../core/schema.ts";
import { checkIndex, checkSourcesFormat } from "../../core/index-check.ts";
import {
  checkIndexConsistency,
  checkOrphanSources,
  checkTopicFolders,
  checkLegacyIndexFilename,
} from "../../core/moc.ts";
import { checkCitedSourceStaleness } from "../../core/staleness.ts";
import { checkProvenance } from "../../core/provenance.ts";
import { checkEntityType } from "./check-entity-type.ts";
import { checkDanglingWikilinks } from "../../core/wikilink-check.ts";
import { checkCollisions } from "../../core/collision-check.ts";
import { resolveVault } from "../../core/vault.ts";

/** Minimum allowed concurrency value. */
const CONCURRENCY_MIN = 1;

/** Maximum allowed concurrency value. */
const CONCURRENCY_MAX = 32;

export interface VerifyOptions {
  /** Explicit vault path; overrides four-tier resolution (mirrors `--target`). */
  readonly target?: string;
  readonly cwd?: string;
  /**
   * Maximum parallel check workers (1–32, default: run all in parallel).
   * Set to 1 for serial execution (debuggability). Out-of-range values are clamped.
   */
  readonly concurrency?: number;
}

/**
 * Validate and clamp a concurrency value to the allowed range.
 * Returns undefined (run all in parallel) for undefined/NaN/values > 1.
 * Returns 1 for 1, so callers can detect the serial-fallback case.
 */
function resolveConcurrency(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) return CONCURRENCY_MAX;
  return Math.max(CONCURRENCY_MIN, Math.min(CONCURRENCY_MAX, Math.floor(raw)));
}

/**
 * Sort findings deterministically by (file, check, severity, message).
 * Pure sort — no mutation of the input array (returns a new sorted array).
 */
function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const fa = a.file ?? "";
    const fb = b.file ?? "";
    if (fa !== fb) return fa < fb ? -1 : 1;
    if (a.check !== b.check) return a.check < b.check ? -1 : 1;
    if (a.severity !== b.severity) return a.severity < b.severity ? -1 : 1;
    return a.message < b.message ? -1 : a.message > b.message ? 1 : 0;
  });
}

export async function verify(opts: VerifyOptions = {}): Promise<Report> {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");

  if (!existsSync(vault)) {
    return buildReport("verify", vault, [
      {
        severity: "error",
        check: "vault",
        message: `Vault directory not found at '${vault}'`,
        file: vault,
      },
    ]);
  }

  const wiki = join(vault, "wiki");
  // The vault's own CLAUDE.md is both the schema authority (ontology-profile-v1
  // tables) and the extension source (entity_type_extensions). checkEntityType
  // calls parseOntologyProfile which handles missing tables fail-open — so this
  // check emits zero findings when the vault CLAUDE.md lacks the profile tables.
  const vaultClaudeMd = join(vault, "CLAUDE.md");

  const concurrency = resolveConcurrency(opts.concurrency);

  // Each check is a thunk returning Finding[] — we run them concurrently or
  // serially depending on the resolved concurrency value.
  type CheckFn = () => Finding[] | readonly Finding[];
  const checks: CheckFn[] = [
    () => checkSchema(vault),
    () => checkIndex(wiki),
    () => checkSourcesFormat(wiki),
    () => checkIndexConsistency(wiki),
    () => checkOrphanSources(wiki),
    () => checkTopicFolders(wiki),
    () => checkLegacyIndexFilename(vault, wiki),
    () => checkCitedSourceStaleness(wiki),
    () => checkProvenance(wiki),
    () => checkEntityType(wiki, vaultClaudeMd, vaultClaudeMd),
    () => checkDanglingWikilinks(wiki),
    () => checkCollisions(wiki),
  ];

  let allFindings: readonly Finding[];

  if (concurrency === 1) {
    // Serial fallback (n=1) for debuggability — same checks, one at a time.
    const acc: Finding[] = [];
    for (const fn of checks) {
      acc.push(...fn());
    }
    allFindings = acc;
  } else {
    // Parallel: run all checks concurrently. Promise.all collects results in
    // declaration order, but we sort afterwards so completion order does not
    // affect the final output.
    const results = await Promise.all(checks.map((fn) => Promise.resolve(fn())));
    allFindings = results.flat();
  }

  // Deterministic sort by (file, check, severity, message) so the same vault
  // always produces the same findings in the same order regardless of which
  // check finished first (parity-safe: byte-identical output guaranteed).
  const sorted = sortFindings(allFindings);

  return buildReport("verify", vault, sorted);
}
