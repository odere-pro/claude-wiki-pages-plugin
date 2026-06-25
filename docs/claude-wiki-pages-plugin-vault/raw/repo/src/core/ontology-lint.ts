/**
 * ontology-lint — predicate domain→range lint (S1-check).
 *
 * Ports scripts/lint-ontology.sh to a pure TypeScript module reusing
 * src/core/ontology-profile.ts (parseOntologyProfile, PredicateEntry)
 * and the shared Finding / Report model.
 *
 * For each wiki page it:
 *   1. Loads the ontology profile from vault/CLAUDE.md.
 *   2. Reads the page's `type` frontmatter field.
 *   3. For each predicate row in the profile:
 *      a. Checks the domain constraint (does the page's type satisfy domain?).
 *      b. For each wikilink target in that frontmatter field, resolves the
 *         target page's type and checks the range constraint.
 *
 * WARN-tier only — advisory lint, never a write-block. Matches the bash
 * lint-ontology.sh semantics (exit 1 on violations = warn in the engine model).
 *
 * No embeddings, no network, no side effects.
 * Same vault in → same findings out (deterministic).
 *
 * Cell semantics (mirrors bash _type_in_cell):
 *   - Backtick-quoted type names in the cell: match any of them.
 *   - "any non-root page" keyword: matches entity|concept|topic|project|synthesis|index.
 *   - "any" keyword: matches all types.
 *   - "same class as domain" keyword: range must equal domain page type.
 */

import { join, relative, basename } from "node:path";
import { existsSync } from "node:fs";
import type { Finding } from "./report.ts";
import { parseOntologyProfile, type PredicateEntry } from "./ontology-profile.ts";
import { listMarkdownRecursive, isBookkeepingFile, readFileSafe } from "./fs.ts";
import { parseFrontmatter, stripWikilink, stringList } from "./frontmatter.ts";

/** The check name emitted on every finding produced by this module. */
export const ONTOLOGY_CHECK = "ontology" as const;

/**
 * Page types that qualify as "any non-root page" in cell matching.
 * Mirrors the bash _type_in_cell "any non-root page" keyword.
 */
const ANY_NON_ROOT_TYPES = new Set(["entity", "concept", "topic", "project", "synthesis", "index"]);

// ---------------------------------------------------------------------------
// Cell matching
// ---------------------------------------------------------------------------

/**
 * The outcome of a cell-type check.
 * "match" — the type satisfies the cell.
 * "no-match" — the type does not satisfy the cell.
 * "same-class" — the cell says "same class as domain"; caller must handle.
 */
type CellMatchResult = "match" | "no-match" | "same-class";

/**
 * Check whether `pageType` satisfies a domain/range `cell` string.
 *
 * Cell patterns recognised:
 *   - "same class as domain"            → returns "same-class"
 *   - backtick-quoted tokens            → match any of the listed types
 *   - "any non-root page" (+ optional backtick list) → match ANY_NON_ROOT_TYPES
 *   - "any"                             → always match
 *   - anything else                     → no-match
 *
 * Mirrors bash _type_in_cell().
 */
function typeInCell(pageType: string, cell: string): CellMatchResult {
  if (cell.includes("same class as domain")) return "same-class";

  // Extract backtick-wrapped tokens from the cell.
  const backtickTokens: string[] = [];
  const re = /`([^`]+)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cell)) !== null) {
    const val = m[1];
    if (val !== undefined && val.trim() !== "") backtickTokens.push(val.trim());
  }

  if (backtickTokens.length > 0) {
    return backtickTokens.includes(pageType) ? "match" : "no-match";
  }

  // Keyword fallback (no backtick tokens found).
  if (cell.includes("any non-root page")) {
    return ANY_NON_ROOT_TYPES.has(pageType) ? "match" : "no-match";
  }
  if (cell.includes("any")) {
    return "match";
  }

  return "no-match";
}

// ---------------------------------------------------------------------------
// Wikilink extraction from a frontmatter field value
// ---------------------------------------------------------------------------

/**
 * Extract all `[[Target]]` wikilink targets from a raw YAML field value.
 *
 * Handles three YAML shapes that the `yaml` lib produces:
 *   - scalar string: `"[[Target]]"` or `[[Target]]` → one target
 *   - string array: `["[[A]]", "[[B]]"]` → two targets
 *
 * Aliases are stripped (`[[Page|alias]]` → `Page`).
 * Returns an empty array when the field is absent or has no wikilink values.
 */
function extractWikilinksFromField(fieldValue: unknown): string[] {
  const targets: string[] = [];

  const processString = (s: string): void => {
    // Extract all [[...]] patterns from the string.
    const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    let mo: RegExpExecArray | null;
    while ((mo = re.exec(s)) !== null) {
      const raw = mo[1];
      if (raw !== undefined && raw.trim() !== "") {
        targets.push(raw.trim());
      }
    }
  };

  if (typeof fieldValue === "string") {
    processString(fieldValue);
  } else if (Array.isArray(fieldValue)) {
    for (const item of fieldValue) {
      if (typeof item === "string") processString(item);
    }
  }

  return targets;
}

// ---------------------------------------------------------------------------
// Target type resolver
// ---------------------------------------------------------------------------

/**
 * Build an index mapping page title/filename-stem → type string.
 *
 * For each wiki page:
 *   - The `title` frontmatter field is the primary key.
 *   - The filename stem is the secondary key.
 *   - Aliases listed in `aliases` frontmatter are additional keys.
 *
 * When two pages share a key, the first one encountered (sorted order) wins.
 * Returns an immutable Map<string, string> (target name → type).
 *
 * Mirrors bash _resolve_type() but builds the index once per vault scan
 * rather than on every lookup.
 */
function buildTypeIndex(wikiDir: string): ReadonlyMap<string, string> {
  const index = new Map<string, string>();

  for (const absPath of listMarkdownRecursive(wikiDir)) {
    const content = readFileSafe(absPath);
    if (content === null) continue;

    const fm = parseFrontmatter(content);
    const pageType = fm["type"];
    if (typeof pageType !== "string" || pageType.trim() === "") continue;
    const type = pageType.trim();

    // filename stem → type
    const stem = basename(absPath, ".md");
    if (!index.has(stem)) index.set(stem, type);

    // title → type
    const title = fm["title"];
    if (typeof title === "string" && title.trim() !== "") {
      const t = title.trim();
      if (!index.has(t)) index.set(t, type);
    }

    // aliases → type (each alias is an additional lookup key)
    const aliasValues = stringList(fm["aliases"]);
    for (const alias of aliasValues) {
      const a = alias.trim();
      if (a !== "" && !index.has(a)) index.set(a, type);
    }
  }

  return index;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Scan `vault/wiki/` for predicate domain→range violations.
 *
 * For each eligible wiki page:
 *   - Loads the ontology profile from `vault/CLAUDE.md`.
 *   - Checks domain (page type vs. predicate domain cell).
 *   - For each wikilink target in the predicate field, checks range.
 *
 * Returns warn-severity `Finding[]`. Never throws — unreadable files are
 * silently skipped (readFileSafe tolerance contract, migration-plan.md).
 *
 * Graceful-skip conditions (matches bash INFO → exit 0):
 *   - `vault/CLAUDE.md` is absent.
 *   - Profile parse fails (no predicate table in CLAUDE.md).
 *   - `vault/wiki/` is absent.
 *
 * @param vault - absolute path to the vault root (directory containing `wiki/`).
 */
export function checkOntology(vault: string): Finding[] {
  const vaultClaudeMd = join(vault, "CLAUDE.md");
  const wiki = join(vault, "wiki");

  // ── Graceful skip: no CLAUDE.md ──────────────────────────────────────────
  if (!existsSync(vaultClaudeMd)) return [];

  // ── Parse the ontology profile ───────────────────────────────────────────
  // Use the vault's own CLAUDE.md as both schemaPath and vaultClaudeMd so that
  // entity_type_extensions in a vault's CLAUDE.md are respected.
  const parseResult = parseOntologyProfile(vaultClaudeMd, vaultClaudeMd);
  if (!parseResult.ok) {
    // Profile parse error (missing predicate table or enum table) — graceful skip.
    // Mirrors bash INFO exit 0 when no rows are found.
    return [];
  }

  const { predicates } = parseResult.manifest;
  if (predicates.length === 0) return [];

  // ── Graceful skip: no wiki/ directory ────────────────────────────────────
  if (!existsSync(wiki)) return [];

  // ── Build the type index once (title/stem/alias → type) ─────────────────
  const typeIndex = buildTypeIndex(wiki);

  const findings: Finding[] = [];

  // ── Walk wiki pages ───────────────────────────────────────────────────────
  for (const absPath of listMarkdownRecursive(wiki)) {
    // ── Exemption: bookkeeping files ───────────────────────────────────────
    if (isBookkeepingFile(absPath)) continue;

    // ── Read page ─────────────────────────────────────────────────────────
    const content = readFileSafe(absPath);
    if (content === null) continue;

    const fm = parseFrontmatter(content);

    // ── Exemption: no type field ──────────────────────────────────────────
    const rawType = fm["type"];
    if (typeof rawType !== "string" || rawType.trim() === "") continue;
    const pageType = rawType.trim();

    const relPath = relative(vault, absPath).split(/[\\/]/).join("/");
    const fileName = basename(absPath);

    // ── Check each predicate ──────────────────────────────────────────────
    for (const pred of predicates) {
      checkPredicateForPage(pred, pageType, fm, fileName, relPath, typeIndex, findings);
    }
  }

  return findings;
}

/**
 * Check one predicate row against one page. Mutates `findings` in place.
 * Extracted to keep the main loop body under 50 lines.
 */
function checkPredicateForPage(
  pred: PredicateEntry,
  pageType: string,
  fm: Record<string, unknown>,
  fileName: string,
  relPath: string,
  typeIndex: ReadonlyMap<string, string>,
  findings: Finding[],
): void {
  const { predicate: field, domain: domainCell, range: rangeCell } = pred;

  // ── Domain check ────────────────────────────────────────────────────────
  const domainResult = typeInCell(pageType, domainCell);

  if (domainResult === "no-match") {
    // Domain not satisfied — emit a violation only when the field is populated.
    const fieldValue = fm[field];
    const targets = extractWikilinksFromField(fieldValue);
    if (targets.length > 0 || (typeof fieldValue === "string" && fieldValue.trim() !== "")) {
      findings.push({
        severity: "warn",
        check: ONTOLOGY_CHECK,
        message: `domain-violation: ${fileName}: type="${pageType}" uses predicate "${field}" but domain allows only: ${domainCell}`,
        file: relPath,
      });
    }
    return;
  }

  // domain matched (or same-class → domain not restricted) — proceed to range.

  // ── Range check ─────────────────────────────────────────────────────────
  const fieldValue = fm[field];
  const targets = extractWikilinksFromField(fieldValue);
  if (targets.length === 0) return;

  for (const target of targets) {
    // Strip alias suffix if present (e.g. "Page|alias" → "Page")
    const targetName = stripWikilink(`[[${target}]]`);
    const targetType = typeIndex.get(targetName);

    // Unknown target → skip range check (mirrors bash _resolve_type → "unknown" → continue).
    if (targetType === undefined) continue;

    // Handle "same class as domain" range.
    if (rangeCell.includes("same class as domain")) {
      if (targetType !== pageType) {
        findings.push({
          severity: "warn",
          check: ONTOLOGY_CHECK,
          message: `range-violation: ${fileName}: predicate "${field}" (same-class) points at "${targetName}" (type=${targetType}) but source is "${pageType}"`,
          file: relPath,
        });
      }
      continue;
    }

    // Normal range check.
    const rangeResult = typeInCell(targetType, rangeCell);
    if (rangeResult === "no-match") {
      findings.push({
        severity: "warn",
        check: ONTOLOGY_CHECK,
        message: `range-violation: ${fileName}: predicate "${field}" points at "${targetName}" (type=${targetType}) but range allows only: ${rangeCell}`,
        file: relPath,
      });
    }
  }
}
