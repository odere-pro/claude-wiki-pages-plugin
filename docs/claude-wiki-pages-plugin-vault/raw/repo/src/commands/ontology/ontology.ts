/**
 * `engine ontology --json` — one parser home (ADR-0015 N6, Part C).
 *
 * M16: The parsing primitives (parseOntologyProfile, OntologyManifest,
 * PredicateEntry, ParseResult) have been extracted to src/core/ontology-profile.ts
 * so that src/commands/verify/check-entity-type.ts can import from core/ instead
 * of from a peer commands/ directory (fixing the layering violation per DIP).
 *
 * This file re-exports everything from core/ for back-compat, and adds the
 * report-builder surface (OntologyReport, buildOntologyReport, ontology()).
 *
 * CRITICAL NO-RAG / single-source rule (ADR-0015 V1 honored):
 *   This file contains ZERO enum-value string literals for entity_type or type.
 *   All values come exclusively from parsing the schema markdown.
 *
 * Fail-closed (ADR-0015 Part C item 4):
 *   Malformed or missing tables → non-zero exit + error Finding.
 *   Never a silent empty success.
 */

import { buildReport, type Finding, type Report } from "../../core/report.ts";
import type { OntologyManifest, PredicateEntry } from "../../core/ontology-profile.ts";
import { parseOntologyProfile } from "../../core/ontology-profile.ts";

// Re-export core parsing primitives for back-compat and for CLI router usage.
export type { PredicateEntry, OntologyManifest, ParseResult } from "../../core/ontology-profile.ts";
export { parseOntologyProfile } from "../../core/ontology-profile.ts";

/** A Report carrying the ontology manifest. Flows through emit() unchanged. */
export interface OntologyReport extends Report {
  readonly manifest: OntologyManifest;
}

// ── Report builder ─────────────────────────────────────────────────────────────

/**
 * Build an OntologyReport from a parsed manifest (clean) or from error Findings
 * (fail-closed). Flows through emit()/exitCode() per ADR-0015 N3.
 *
 * On success: report.clean = true, exitCode = 0.
 * On failure: report.clean = false, exitCode = 1 (via exitCode(report)).
 */
export function buildOntologyReport(
  manifest: OntologyManifest | undefined,
  errors?: readonly Finding[],
): OntologyReport {
  const stubManifest: OntologyManifest = Object.freeze({
    enums: Object.freeze({
      type: Object.freeze([]) as readonly string[],
      entity_type: Object.freeze([]) as readonly string[],
    }),
    predicates: Object.freeze([]) as readonly PredicateEntry[],
  });

  if (manifest === undefined || (errors !== undefined && errors.length > 0)) {
    const findings: readonly Finding[] = errors ?? [
      Object.freeze({
        severity: "error" as const,
        check: "ontology",
        message: "ontology-profile-v1 parse failed: no manifest produced",
      }),
    ];
    const base = buildReport("ontology", "", [...findings]);
    return Object.freeze({ ...base, manifest: stubManifest });
  }

  const base = buildReport("ontology", "", []);
  return Object.freeze({ ...base, manifest });
}

/**
 * Run the ontology verb: parse the profile from the given schema path (and
 * optional vault CLAUDE.md), build and return the OntologyReport.
 *
 * This is the dispatch entry called by the router (src/cli/cli.ts).
 *
 * @param options.schemaPath     Path to the profile document.
 * @param options.vaultClaudeMd  Optional vault CLAUDE.md path for entity_type_extensions.
 */
export function ontology(options: {
  readonly schemaPath: string;
  readonly vaultClaudeMd?: string;
}): OntologyReport {
  const result = parseOntologyProfile(options.schemaPath, options.vaultClaudeMd);
  if (!result.ok) {
    return buildOntologyReport(undefined, result.errors);
  }
  return buildOntologyReport(result.manifest);
}
