/**
 * S4-derivation: cited-source staleness — ports scripts/verify-ingest.sh CHECK 4.
 *
 * For each wiki page carrying a `sources:` list, resolve each `[[wikilink]]` to
 * the matching file in `wiki/_sources/` (by `title:` or `aliases:` match), find
 * the newest date on that source (precedence: `updated` → `date_ingested` →
 * `date_published`), and emit a WARN-severity finding when a cited source is
 * strictly newer than the page's own `updated`. An unresolvable cited source is
 * reported as a separate, labelled WARN — never silently treated as fresh.
 *
 * Source-relative, not calendar-relative: this is "a source moved on but the
 * page did not", distinct from the 30-day calendar staleness rule. Derive-and-
 * flag only — no `status:` mutation (that is the curator/fix path). Counts must
 * match the bash CHECK 4 on the same vault (parity gate-05).
 */

import { basename, join, relative } from "node:path";
import { listMarkdownRecursive, readFileSafe, isBookkeepingFile } from "./fs.ts";
import { parseFrontmatter, stringList, stripWikilink, titleOf } from "./frontmatter.ts";
import { buildLinkIndex, resolveLink } from "./link-resolver.ts";
import type { Finding } from "./report.ts";

/** Wiki-relative path with `/` separators (Obsidian's path form). */
function toRel(wiki: string, file: string): string {
  return relative(wiki, file).split(/[\\/]/).join("/");
}

const WIKILINK_SOURCE = /^\[\[.+\]\]$/;

/** Coerce a YAML date/string field to a trimmed string, or "" when absent. */
function dateField(fm: Record<string, unknown>, key: string): string {
  const v = fm[key];
  if (typeof v === "string") return v.trim();
  // `yaml` may parse an unquoted `YYYY-MM-DD` as a Date; normalise to ISO day.
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return String(v);
  return "";
}

/** Best available date on a source page: updated → date_ingested → date_published. */
function sourceBestDate(fm: Record<string, unknown>): string {
  return (
    dateField(fm, "updated") || dateField(fm, "date_ingested") || dateField(fm, "date_published")
  );
}

/** CHECK 4: cited-source staleness across the wiki. */
export function checkCitedSourceStaleness(wiki: string): Finding[] {
  const findings: Finding[] = [];
  const sourcesDir = join(wiki, "_sources");

  // One Obsidian-accurate resolver over wiki/. A cited `sources:` wikilink is
  // resolved by path ∪ basename (ADR-0031) — so a path-qualified
  // `[[_sources/adr-0001-…|ADR-0001: …]]` or a piped basename both resolve,
  // not only an exact title/alias string match.
  const index = buildLinkIndex(wiki);

  // Pre-parse every _sources/ page's frontmatter once, keyed by wiki-rel path.
  const sourceFmByRel = new Map<string, Record<string, unknown>>();
  for (const file of listMarkdownRecursive(wiki)) {
    if (!file.includes(`${sourcesDir}/`)) continue;
    if (basename(file) === ".gitkeep") continue;
    sourceFmByRel.set(toRel(wiki, file), parseFrontmatter(readFileSafe(file) ?? ""));
  }

  for (const filepath of listMarkdownRecursive(wiki)) {
    // Skip bookkeeping pages (by name, or a folder note); _sources/ are the targets, not the checkers.
    if (isBookkeepingFile(filepath)) continue;
    if (filepath.includes(`${sourcesDir}/`)) continue;
    if (filepath.includes(`${join(wiki, "_synthesis")}/`)) continue;

    const content = readFileSafe(filepath) ?? "";
    const fm = parseFrontmatter(content);

    // No `updated:` → cannot evaluate staleness (matches bash skip).
    const pageUpdated = dateField(fm, "updated");
    if (pageUpdated === "") continue;

    const sources = stringList(fm["sources"]);
    if (sources.length === 0) continue;

    const sourceRel = toRel(wiki, filepath);

    for (const entry of sources) {
      // Only `[[wikilink]]` entries; plain strings are CHECK 2's concern.
      if (!WIKILINK_SOURCE.test(entry)) continue;
      // Strip the `[[ ]]` wrapper and any `|display` suffix (bash CHECK 4 does
      // `cut -d'|' -f1`) so the displayed target matches the bash twin.
      const target = stripWikilink(entry).split("|")[0]?.trim() ?? "";

      // Resolve the cited link to a wiki page; only a _sources/ page counts as a
      // resolved source date carrier.
      const resolved = resolveLink(target, sourceRel, index);
      const srcFm =
        resolved !== null && sourceFmByRel.has(resolved.file)
          ? (sourceFmByRel.get(resolved.file) as Record<string, unknown>)
          : null;
      if (srcFm === null) {
        findings.push({
          severity: "warn",
          check: "stale-source",
          message: `dangling-source: "${target}" cited by ${basename(filepath)} could not be resolved in _sources/`,
          file: filepath,
        });
        continue;
      }

      const sourceDate = sourceBestDate(srcFm);
      if (sourceDate === "") continue; // source has no date — cannot evaluate.

      // ISO YYYY-MM-DD strings compare correctly lexicographically.
      if (sourceDate > pageUpdated) {
        const pageTitle = titleOf(content, filepath);
        findings.push({
          severity: "warn",
          check: "stale-source",
          message: `stale-source: "${pageTitle}" (${basename(filepath)}) updated ${pageUpdated} but cited source "${target}" has date ${sourceDate}`,
          file: filepath,
        });
      }
    }
  }

  return findings;
}
