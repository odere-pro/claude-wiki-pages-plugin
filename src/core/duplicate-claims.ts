/**
 * Duplicate-claims check — TS port of scripts/check-duplicate-claims.sh
 * (ADR-0014 Part B).
 *
 * Scans `source_quotes[].quote` fields across `wiki/**\/*.md` pages and warns
 * when a quote in the proposed file already appears (in canonical form) in an
 * existing wiki page.
 *
 * Severity: WARN only — this check is advisory and never blocks promotion.
 * check name: "dup-claims"
 *
 * ── Canonical form ───────────────────────────────────────────────────────────
 * Applied in this exact documented order to every source_quotes.quote value:
 *
 *   1. Strip leading/trailing YAML scalar quoting characters: " ' [
 *   2. ASCII lowercase.
 *   3. Collapse whitespace runs (space, tab) to a single space.
 *   4. Trim leading and trailing whitespace.
 *   5. Remove fixed ASCII + Unicode punctuation class:
 *        .  ,  ;  :  !  ?  "  '  `  (  )  [  ]  -  –  —
 *      (period, comma, semicolon, colon, exclamation, question, double-quote,
 *       single-quote, backtick, parens, square brackets, hyphen-minus,
 *       en dash U+2013, em dash U+2014)
 *
 * Two quotes are duplicates iff steps 1–5 produce the byte-identical string.
 *
 * HARD NON-NEGOTIABLE (TEAM-BRIEF §5/§11.1): comparison is EXACT/NORMALIZED
 * string equality ONLY. No fuzzy matching, no edit-distance, no token-overlap,
 * no embeddings, no semantic similarity — ever. A paraphrase must NOT match.
 * This is the absolute NO-RAG boundary.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Reused primitives:
 *   - `src/core/frontmatter.ts` — parseFrontmatter, stringList
 *   - `src/core/fs.ts` — listMarkdownRecursive, readFileSafe, existsSync
 *   - `src/core/report.ts` — Finding (type only)
 *
 * stem.ts is imported for the module dependency declared in the migration plan
 * but is NOT used for canonical comparison — it is intentionally NOT applied
 * here. Canonical equality is character-level after steps 1–5; stemming would
 * blur the NO-RAG boundary. stem.ts remains a valid primitive for the synonym/
 * query-expansion path (Tier-2 recall), which is separate from this check.
 */

import { basename, join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { parseFrontmatter } from "./frontmatter.ts";
import { listMarkdownRecursive, readFileSafe } from "./fs.ts";
import type { Finding } from "./report.ts";

// ── Canonical form ────────────────────────────────────────────────────────────

/**
 * The fixed punctuation characters removed in step 5.
 * Expressed as a single character-class regex, applied globally.
 * En dash (U+2013) and em dash (U+2014) are included as literal Unicode chars.
 */
const PUNCT_PATTERN = /[.,;:!?"'`()[\]–—-]/gu;

/**
 * Characters that may surround a YAML scalar as "quoting" delimiters.
 * Step 1 strips them from both ends of the raw string value.
 * Note: YAML parsing already removes standard quotation marks for plain and
 * double-quoted scalars; this step handles residual cases (e.g. single-quoted
 * YAML producing a string that still starts with a bracket, or values that
 * arrive as raw text rather than through the YAML parser).
 */
const YAML_SCALAR_LEADING = /^["'[]+/u;
const YAML_SCALAR_TRAILING = /["'[\]]+$/u;

/**
 * Apply the five-step canonical normalization to a quote string.
 *
 * @param raw - Raw quote value (already a JS string, may still carry YAML
 *              scalar quoting characters at the edges).
 * @returns The canonical form, or an empty string if the result is empty.
 */
export function canonicalForm(raw: string): string {
  // Step 1: strip surrounding YAML scalar quoting characters.
  let s = raw.replace(YAML_SCALAR_LEADING, "").replace(YAML_SCALAR_TRAILING, "");
  // Step 2: ASCII lowercase.
  s = s.toLowerCase();
  // Step 3: collapse whitespace runs (space, tab, newline) to a single space.
  s = s.replace(/\s+/gu, " ");
  // Step 4: trim leading and trailing whitespace.
  s = s.trim();
  // Step 5: remove fixed punctuation class (ASCII + en/em dash).
  s = s.replace(PUNCT_PATTERN, "");
  // Re-trim after punctuation removal (punctuation at edges leaves spaces).
  s = s.trim();
  return s;
}

// ── source_quotes extraction ──────────────────────────────────────────────────

/**
 * Shape of one entry in a `source_quotes` list (schema v2).
 * Both fields are optional because the YAML may have only one.
 */
interface SourceQuoteEntry {
  readonly source?: unknown;
  readonly quote?: unknown;
}

/**
 * Extract the raw quote strings from a page's `source_quotes` frontmatter field.
 * Returns an empty array when the field is absent, empty, or malformed.
 *
 * Supported shapes:
 *   source_quotes: []
 *   source_quotes:
 *     - source: "[[some-source]]"
 *       quote: "verbatim text"
 */
function extractQuotes(content: string): readonly string[] {
  const fm = parseFrontmatter(content);
  const raw = fm["source_quotes"];

  if (!Array.isArray(raw) || raw.length === 0) return [];

  const quotes: string[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== "object") continue;
    const e = entry as SourceQuoteEntry;
    if (typeof e.quote === "string" && e.quote.trim() !== "") {
      quotes.push(e.quote);
    }
  }
  return quotes;
}

// ── Wiki canonical-quote index ────────────────────────────────────────────────

/**
 * A single entry in the wiki quote index: a canonical form mapped to the
 * basename (without .md) of the page it came from.
 */
interface WikiQuoteEntry {
  readonly canonical: string;
  readonly pageStem: string;
}

/**
 * Build the wiki quote index by walking all `*.md` files under `wiki/`.
 *
 * Returns an array of `{canonical, pageStem}` entries — one per non-empty
 * canonical form found across all pages. The proposed file (if it is inside
 * wiki/) is excluded by absolute-path comparison to prevent self-matches.
 *
 * @param wiki           - Absolute path to the vault's `wiki/` directory.
 * @param excludePath    - Absolute path to the proposed file to exclude (or "").
 */
function buildWikiIndex(wiki: string, excludePath: string): readonly WikiQuoteEntry[] {
  const entries: WikiQuoteEntry[] = [];
  const normalizedExclude = excludePath ? resolve(excludePath) : "";

  for (const filePath of listMarkdownRecursive(wiki)) {
    if (normalizedExclude !== "" && resolve(filePath) === normalizedExclude) continue;

    const content = readFileSafe(filePath);
    if (content === null) continue;

    const pageStem = basename(filePath, ".md");

    for (const raw of extractQuotes(content)) {
      const canonical = canonicalForm(raw);
      if (canonical === "") continue;
      entries.push({ canonical, pageStem });
    }
  }

  return entries;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check a proposed file for source_quotes that already appear (in canonical
 * form) in the wiki.
 *
 * @param vaultPath    - Absolute path to the vault root.
 * @param proposedFile - Absolute path to the file under review. When absent,
 *                       empty, or pointing to a non-existent file, returns [].
 * @returns An array of warn-severity findings — one per (proposed-quote ×
 *          matching-wiki-page) pair. Never errors; never throws.
 */
export function checkDuplicateClaims(vaultPath: string, proposedFile?: string): Finding[] {
  // No proposed file → nothing to check.
  if (!proposedFile || proposedFile.trim() === "") return [];
  if (!existsSync(proposedFile)) return [];

  const proposedContent = readFileSafe(proposedFile);
  if (proposedContent === null) return [];

  const proposedStem = basename(proposedFile, ".md");
  const wiki = join(vaultPath, "wiki");

  // Build the wiki index (excludes the proposed file itself to avoid self-match).
  const wikiIndex = buildWikiIndex(wiki, proposedFile);

  // For each quote in the proposed file, look up the canonical form in the index.
  const findings: Finding[] = [];

  for (const raw of extractQuotes(proposedContent)) {
    const proposedCanon = canonicalForm(raw);
    if (proposedCanon === "") continue;

    for (const { canonical, pageStem } of wikiIndex) {
      if (proposedCanon === canonical) {
        findings.push({
          severity: "warn",
          check: "dup-claims",
          message:
            `Duplicate claim in "${proposedStem}": ` +
            `quote (normalized) "${proposedCanon}" already in wiki page "${pageStem}". ` +
            `Suggestion: link to [[${pageStem}]] instead of restating the claim.`,
          file: proposedFile,
        });
      }
    }
  }

  return findings;
}
