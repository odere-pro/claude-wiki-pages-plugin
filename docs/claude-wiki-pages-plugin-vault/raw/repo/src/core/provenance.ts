/**
 * I3 — provenance-completeness checks.
 *
 * Two orthogonal rules, both extending the existing verify check-set:
 *
 * CHECK 5a — source-presence: a source-requiring page type
 * (`entity` / `concept` / `topic` / `project` / `synthesis`) MUST carry at
 * least one entry in `sources:`. An empty array (or absent field) is an
 * ERROR-severity `provenance-completeness` finding.
 *
 * CHECK 5b — derived/confidence consistency: a page with `derived: true` MUST
 * keep `confidence < 0.8`. `derived: true` signals LLM inference synthesised
 * across sources rather than a direct statement in any single source; granting
 * it high confidence (≥ 0.8) would misrepresent its evidentiary strength. Any
 * violation is a WARN-severity `provenance-consistency` finding.
 *
 * Parity invariant (gate-05): the counts produced here must match the bash
 * CHECK 5 added to `scripts/verify-ingest.sh` on CLEAN_VAULT, DIRTY_VAULT,
 * and the reference vault `skills/init/template/`.
 *
 * Avoid-double-flag contract:
 * - The presence check counts source *entries*, not their format. A page that
 *   has one malformed plain-string entry (already caught by CHECK 2 in
 *   `checkSourcesFormat`) has `sources.length === 1` and therefore does NOT
 *   receive a `provenance-completeness` finding. Only a page with zero entries
 *   fires this check.
 * - Types that are NOT source-requiring (`source`, `index`, `manifest`, `log`)
 *   are fully exempt.
 */

import { basename, join } from "node:path";
import { listMarkdownRecursive, readFileSafe, isBookkeepingFile } from "./fs.ts";
import { parseFrontmatter, stringList, titleOf } from "./frontmatter.ts";
import type { Finding } from "./report.ts";

/**
 * Page types that MUST carry at least one `sources:` entry.
 * `source` is the citation itself; `index`/`manifest`/`log` are bookkeeping —
 * all four are exempt.
 */
const SOURCE_REQUIRING_TYPES = new Set(["entity", "concept", "topic", "project", "synthesis"]);

/**
 * Directories whose pages are not subject to provenance-completeness.
 * `_sources/` pages are the citations, not the citing pages.
 */
const SKIP_DIRS = ["_sources", "_synthesis"];

/**
 * Confidence ceiling above which a `derived: true` page is inconsistent.
 * The single source of truth for this threshold — `frontmatter-validate.ts`
 * Rule 7b imports it so the verify-WARN and gate-ERROR paths can never diverge.
 * Keep the value `0.8` to preserve gate-05 parity with verify-ingest.sh CHECK 5b.
 */
export const DERIVED_CONFIDENCE_CEILING = 0.8;

/** CHECK 5a + 5b: provenance-completeness and derived/confidence consistency. */
export function checkProvenance(wiki: string): Finding[] {
  const findings: Finding[] = [];

  for (const filepath of listMarkdownRecursive(wiki)) {
    // Skip bookkeeping files (by name, or a folder note).
    if (isBookkeepingFile(filepath)) continue;

    // Skip _sources/ and _synthesis/ directories.
    if (SKIP_DIRS.some((d) => filepath.includes(`${join(wiki, d)}/`))) continue;

    const content = readFileSafe(filepath) ?? "";
    const fm = parseFrontmatter(content);
    const pageType = typeof fm["type"] === "string" ? fm["type"].trim() : "";

    // ── CHECK 5a: source-presence ──────────────────────────────────────────
    if (SOURCE_REQUIRING_TYPES.has(pageType)) {
      const sources = stringList(fm["sources"]);
      if (sources.length === 0) {
        const title = titleOf(content, filepath);
        findings.push({
          severity: "error",
          check: "provenance-completeness",
          message: `no-sources: "${title}" (${basename(filepath)}) has type "${pageType}" but no sources entries`,
          file: filepath,
        });
      }
    }

    // ── CHECK 5b: derived/confidence consistency ───────────────────────────
    // `derived` may be boolean true or the string "true" depending on how the
    // yaml library coerces an unquoted `true`. Accept both.
    const derivedRaw = fm["derived"];
    const isDerived = derivedRaw === true || derivedRaw === "true";
    if (isDerived) {
      const confidenceRaw = fm["confidence"];
      let confidence: number | null = null;
      if (typeof confidenceRaw === "number") confidence = confidenceRaw;
      else if (typeof confidenceRaw === "string") {
        const parsed = Number(confidenceRaw);
        if (!Number.isNaN(parsed)) confidence = parsed;
      }
      if (confidence !== null && confidence >= DERIVED_CONFIDENCE_CEILING) {
        const title = titleOf(content, filepath);
        findings.push({
          severity: "warn",
          check: "provenance-consistency",
          message: `derived-high-confidence: "${title}" (${basename(filepath)}) has derived: true but confidence ${confidence} >= ${DERIVED_CONFIDENCE_CEILING} — lower confidence to reflect inferred status`,
          file: filepath,
        });
      }
    }
  }

  return findings;
}
