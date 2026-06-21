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
 *
 * Aggregate root: VaultAggregate encapsulates the vault directory structure
 * (root, wiki sub-path, schema authority) so check functions receive cohesive
 * domain paths rather than independently derived strings. The aggregate is the
 * single source of truth for "what does this vault look like on disk" within
 * the verify command.
 */

import { join } from "node:path";
import { existsSync } from "../../core/fs.ts";
import { buildReport, type Report, type Finding } from "../../core/report.ts";
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
import { resolveConcurrency, runChecks, type CheckFn } from "../../core/checks-runner.ts";

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

// ---------------------------------------------------------------------------
// Vault aggregate root
//
// VaultAggregate is the domain object that encapsulates vault structure within
// the verify command. It holds the three canonical paths that checks require
// and is the single place where their derivation is expressed. Callers obtain
// it only through VaultAggregate.fromRoot(), which enforces the existence
// precondition — the aggregate cannot be constructed for a missing vault.
// ---------------------------------------------------------------------------

interface VaultPaths {
  /** Normalised vault root (no trailing slash). */
  readonly root: string;
  /** wiki/ sub-directory — the content tree all wiki-level checks operate on. */
  readonly wiki: string;
  /**
   * Vault's CLAUDE.md — the schema authority (ontology-profile-v1 tables) and
   * the extension source (entity_type_extensions). checkEntityType calls
   * parseOntologyProfile which handles missing tables fail-open, so this path
   * may not exist on disk; that is fine and intentional.
   */
  readonly schemaFile: string;
}

/**
 * Aggregate root for a resolved vault.
 *
 * Encapsulates the three canonical sub-paths (root, wiki, schemaFile) so that
 * verify()'s check-assembly receives a single cohesive value instead of three
 * independently derived strings. The factory method enforces the existence
 * check-first invariant: you cannot obtain a VaultAggregate for a vault that
 * does not exist on disk.
 */
class VaultAggregate implements VaultPaths {
  readonly root: string;
  readonly wiki: string;
  readonly schemaFile: string;

  private constructor(root: string) {
    this.root = root;
    this.wiki = join(root, "wiki");
    this.schemaFile = join(root, "CLAUDE.md");
  }

  /**
   * Build a VaultAggregate from a raw vault root path, or return a "missing
   * vault" Finding when the root directory does not exist on disk.
   *
   * Schema-check-first is enforced structurally: the aggregate is only
   * obtainable once the vault root is confirmed present, which is the
   * precondition checkSchema() requires.
   */
  static fromRoot(rawRoot: string): VaultAggregate | Finding {
    const root = rawRoot.replace(/\/+$/, "");
    if (!existsSync(root)) {
      return {
        severity: "error",
        check: "vault",
        message: `Vault directory not found at '${root}'`,
        file: root,
      };
    }
    return new VaultAggregate(root);
  }
}

export async function verify(opts: VerifyOptions = {}): Promise<Report> {
  const rawRoot = opts.target ?? resolveVault({ cwd: opts.cwd });
  const vaultOrFinding = VaultAggregate.fromRoot(rawRoot);

  // If the factory returned a Finding the vault is missing — short-circuit.
  if (!(vaultOrFinding instanceof VaultAggregate)) {
    return buildReport("verify", rawRoot.replace(/\/+$/, ""), [vaultOrFinding]);
  }

  const vault = vaultOrFinding;
  const concurrency = resolveConcurrency(opts.concurrency);

  // Each check is a thunk returning Finding[]; runChecks (core/checks-runner.ts)
  // executes them concurrently — or serially when concurrency === 1 — and returns
  // the findings deterministically sorted by (file, check, severity, message), so
  // completion order never affects output (parity-safe: byte-identical guaranteed).
  const checks: CheckFn[] = [
    () => checkSchema(vault.root),
    () => checkIndex(vault.wiki),
    () => checkSourcesFormat(vault.wiki),
    () => checkIndexConsistency(vault.wiki),
    () => checkOrphanSources(vault.wiki),
    () => checkTopicFolders(vault.wiki),
    () => checkLegacyIndexFilename(vault.root, vault.wiki),
    () => checkCitedSourceStaleness(vault.wiki),
    () => checkProvenance(vault.wiki),
    () => checkEntityType(vault.wiki, vault.schemaFile, vault.schemaFile),
    () => checkDanglingWikilinks(vault.wiki),
    () => checkCollisions(vault.wiki),
  ];

  const sorted = await runChecks(checks, concurrency);

  return buildReport("verify", vault.root, sorted);
}
