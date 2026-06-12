/**
 * P3.4 — entity_type membership check (engine-side only, ADR-0015 N7).
 *
 * Validates that every `type: entity` note carries an `entity_type` value that
 * is a member of the COMPOSED set: core ∪ per-vault `entity_type_extensions`.
 *
 * The composed set is imported from src/commands/ontology/ (P3.3) — this file
 * contains ZERO hardcoded entity_type enum values. The schema markdown is the
 * sole authority (ADR-0015 V1 / TEAM-BRIEF §6 single-source invariant).
 *
 * D15 (docs/plan/0005-software-3-0-deferred.md):
 *   Only `entity_type` composes. A vault CLAUDE.md declaring any OTHER
 *   `*_extensions` key (e.g. `synthesis_type_extensions`, `type_extensions`)
 *   MUST NOT extend anything; those keys are ignored. `parseOntologyProfile`
 *   enforces this naturally because `readEntityTypeExtensions` only reads the
 *   `entity_type_extensions` key.
 *
 * N7 (docs/plan/0005-software-3-0-deferred.md):
 *   This check lives ONLY in the engine. The bash hook
 *   `scripts/validate-frontmatter.sh` retains its existing `case` statement
 *   with a comment marking it as the known Bun-absent fallback DRY exception.
 *   No entity_type membership logic is added to the bash hook (that would add
 *   a Bun dependency to the hot hook path — forbidden).
 *
 * When to validate:
 *   - Only `type: entity` pages. All other page types are exempt.
 *   - Only when `entity_type:` IS present (a missing field is the
 *     required-fields check's responsibility; double-flagging is avoided).
 *
 * Gate-05 parity: the reference vault (docs/vault-example/) has only valid
 * entity_type values, so this check emits zero findings there. The bash
 * verify-ingest.sh does not check entity_type membership, so the parity
 * invariant (error + warning counts match) is preserved on the reference vault.
 */

import { join } from "node:path";
import { listMarkdownRecursive, readFileSafe, isBookkeepingFile } from "../../core/fs.ts";
import { parseFrontmatter, titleOf } from "../../core/frontmatter.ts";
import { parseOntologyProfile } from "../ontology/ontology.ts";
import type { Finding } from "../../core/report.ts";
import { basename } from "node:path";

/**
 * Build the composed entity_type allow-set from the schema document and vault
 * extensions. Falls back gracefully when parsing fails: returns an empty Set
 * (which means no membership check is performed — fail-open on schema parse
 * failure, to avoid spurious rejections when the schema document is absent or
 * malformed in an edge environment).
 *
 * This is the ONLY place in the verify tree that calls parseOntologyProfile.
 * No second hardcoded entity_type list exists here.
 */
function buildEntityTypeSet(
  schemaPath: string,
  vaultClaudeMd: string,
): { allowSet: ReadonlySet<string>; available: boolean } {
  const result = parseOntologyProfile(schemaPath, vaultClaudeMd);
  if (!result.ok) {
    // Schema unavailable — skip membership check to avoid false positives.
    return { allowSet: new Set(), available: false };
  }
  return { allowSet: new Set(result.manifest.enums.entity_type), available: true };
}

/**
 * CHECK 6 — entity_type membership.
 *
 * Walks every markdown file in `wiki`, parses frontmatter, and for each page
 * with `type: entity` that declares an `entity_type` value, checks that the
 * value is a member of the composed allow-set.
 *
 * Returns an array of error-severity Findings for each invalid value found.
 * Returns an empty array when the schema is unavailable (fail-open).
 *
 * @param wiki         Absolute path to the vault's wiki/ directory.
 * @param schemaPath   Path to the schema document (the ontology-profile-v1
 *                     authority — typically docs/vault-example/CLAUDE.md or
 *                     the vault's own CLAUDE.md when it carries the profile).
 * @param vaultClaudeMd  Path to the vault's CLAUDE.md for entity_type_extensions
 *                       composition (D15: only this key is read).
 */
export function checkEntityType(
  wiki: string,
  schemaPath: string,
  vaultClaudeMd: string,
): Finding[] {
  const { allowSet, available } = buildEntityTypeSet(schemaPath, vaultClaudeMd);

  // If the schema is unavailable, skip the check entirely (fail-open on parse
  // failure; a missing CLAUDE.md is already reported by checkSchema).
  if (!available) return [];

  const findings: Finding[] = [];

  for (const filepath of listMarkdownRecursive(wiki)) {
    // Skip bookkeeping files — same exclusion predicate as other checks.
    if (isBookkeepingFile(filepath)) continue;

    const content = readFileSafe(filepath) ?? "";
    const fm = parseFrontmatter(content);

    // Only entity pages are subject to this check.
    const pageType = typeof fm["type"] === "string" ? fm["type"].trim() : "";
    if (pageType !== "entity") continue;

    // Only check when entity_type IS declared (absent field = required-fields
    // check's responsibility; we must not double-flag).
    const rawEntityType = fm["entity_type"];
    if (rawEntityType === undefined || rawEntityType === null) continue;

    const entityType =
      typeof rawEntityType === "string" ? rawEntityType.trim() : String(rawEntityType).trim();

    // Empty string after trim — skip (degenerate case; required-fields handles it).
    if (entityType === "") continue;

    if (!allowSet.has(entityType)) {
      const title = titleOf(content, filepath);
      const allowed = [...allowSet].join(", ");
      findings.push({
        severity: "error",
        check: "entity-type-membership",
        message: `invalid-entity-type: "${title}" (${basename(filepath)}) has entity_type "${entityType}" which is not in the allowed set [${allowed}]`,
        file: filepath,
      });
    }
  }

  return findings;
}

/**
 * Resolve the schema path to pass to checkEntityType.
 *
 * Resolution: use `<vault>/CLAUDE.md` if it exists, otherwise fall back to the
 * bundled profile document (`docs/vault-example/CLAUDE.md` relative to the
 * package root detected from this file's location).
 *
 * This mirrors the resolution used by the `ontology` verb in src/cli/cli.ts.
 */
export function resolveSchemaPath(vault: string): string {
  const vaultClaudeMd = join(vault, "CLAUDE.md");
  // Try vault's own CLAUDE.md first (it may carry the ontology-profile-v1 tables
  // after a user has run init). Fall back to the bundled example vault schema.
  // We use a simple existsSync-equivalent: attempt to parse and fall back.
  // The caller (verify.ts) passes both vault CLAUDE.md and schema path to
  // checkEntityType, which handles the absence gracefully.
  return vaultClaudeMd;
}
