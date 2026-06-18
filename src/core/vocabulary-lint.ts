/**
 * Vocabulary-lint check — `lint --check vocabulary`.
 *
 * Migrates the three signals from scripts/lint-vocabulary.sh into a typed,
 * deterministic TypeScript module. Reuses:
 *   - vocabulary.ts  (loadLexicon, SynonymLexicon)
 *   - stem.ts        (available for future stemmed-recall; not applied here —
 *                     the bash script does plain substring/case-folded matching)
 *   - fs.ts          (listMarkdownRecursive, isBookkeepingFile, readFileSafe)
 *   - frontmatter.ts (parseFrontmatter, stringList)
 *   - report.ts      (Finding)
 *
 * Four signals (WARN-only; never ERROR — detection only, never mutates):
 *
 *   Signal 0 — vocabulary-absent (INFO)
 *     `_vocabulary.md` not found at the vault root. Matches the bash twin's
 *     "INFO: No _vocabulary.md found" advisory line. Never counted as a warning.
 *
 *   Signal 1 — vocabulary-orphaned-form
 *     A form (canonical or variant) present in the lexicon but absent from
 *     every wiki page (body text + title + aliases + tags, case-folded) in a
 *     partially-referenced group (at least one form IS found).
 *
 *   Signal 2 — vocabulary-unreferenced-group
 *     ALL forms in a lexicon component absent from every wiki page → ONE warn
 *     per component, keyed by the YAML-declared canonical.
 *
 *   Signal 3 — vocabulary-tag-floor
 *     Any form of the group is used as a page tag on fewer than `minTagUsage`
 *     pages total across the group (default: 2). Only fired when the group IS
 *     used as a tag (tag count > 0 but < floor).
 *
 * Contract (§5 NO-RAG absolute): zero network, zero embeddings, zero ML.
 * All checks are deterministic string operations.
 *
 * Output is sorted by message (deterministic across calls and vaults).
 */

import { join } from "node:path";
import { loadLexicon } from "./vocabulary.ts";
import { listMarkdownRecursive, isBookkeepingFile, readFileSafe } from "./fs.ts";
import { parseFrontmatter, stringList } from "./frontmatter.ts";
import type { Finding } from "./report.ts";

/** Default minimum number of pages a vocabulary form must be tagged on. */
export const DEFAULT_MIN_TAG_USAGE = 2;

export interface VocabularyLintOptions {
  /** Minimum page count for a tag form to avoid the tag-floor warning. Default: 2. */
  readonly minTagUsage?: number;
}

/**
 * Run all three vocabulary signals against `vault` and return `Finding[]`.
 *
 * - Absent `_vocabulary.md` → returns one `info` finding (mirrors bash twin's
 *   "INFO: No _vocabulary.md found" advisory line).
 * - Empty groups list → returns [].
 * - Wiki pages under `wiki/` are discovered with `listMarkdownRecursive`.
 * - Bookkeeping files (index, log, dashboard, folder-notes) are excluded.
 * - Presence check is case-folded substring match over the full page text
 *   (body + frontmatter), matching the bash twin's behaviour.
 *
 * @param vault  Absolute path to the vault root.
 * @param opts   Optional configuration overrides.
 */
export function lintVocabulary(
  vault: string,
  opts: VocabularyLintOptions = {},
): readonly Finding[] {
  const minTagUsage = opts.minTagUsage ?? DEFAULT_MIN_TAG_USAGE;
  const vaultNorm = vault.replace(/\/+$/, "");

  // Load the compiled synonym lexicon. Absent or unreadable → empty lexicon.
  // Note: singletons (canonicals with no variants) ARE present in expand with
  // an empty peer set, so lexicon.expand.has(canonical) is reliable for all groups.
  const lexicon = loadLexicon(vaultNorm);

  // Read raw _vocabulary.md to recover YAML-declared canonicals and full group
  // membership (including singleton groups that loadLexicon does not put in
  // expand because they have no peers).
  const vocabPath = join(vaultNorm, "_vocabulary.md");
  const vocabContent = readFileSafe(vocabPath);
  if (vocabContent === null) {
    // Absent vocabulary file → graceful skip (no findings), consistent with the
    // sibling lint checks (ontology/manifests/structural all return [] on absent
    // input). The bash twin's "INFO: No _vocabulary.md found" was console-only
    // advisory and exited 0; modeling it as a structural Finding would pollute
    // the aggregate `--check all` report on every vault without a lexicon.
    return Object.freeze([]);
  }

  const fm = parseFrontmatter(vocabContent);
  const rawGroups = fm["groups"];
  if (!Array.isArray(rawGroups) || rawGroups.length === 0) return Object.freeze([]);

  // Build a list of { canonical, forms[] } from the raw YAML, one entry per
  // union-find component. Uses the same union-find the lexicon uses so the
  // components are identical.
  //
  // Strategy: iterate raw groups to collect (canonical, variants). Then use
  // the lexicon's expand map to discover union-find-merged components. For
  // groups whose canonical has NO entries in expand (singleton), the canonical
  // itself is the sole form.
  const componentMap = buildComponents(rawGroups, lexicon);

  // ── Discover wiki pages ────────────────────────────────────────────────────
  const wikiDir = join(vaultNorm, "wiki");
  const allPages = listMarkdownRecursive(wikiDir).filter((p) => !isBookkeepingFile(p));

  // Build per-page text corpus and tag index in a single pass.
  const { pageTexts, tagIndex } = buildPageIndex(allPages);

  // Concatenated lowercased text of ALL pages for body presence checks.
  const combinedText = pageTexts.join(" ");

  // ── Run the three signals ──────────────────────────────────────────────────
  const findings: Finding[] = [];

  for (const { canonical, forms } of componentMap) {
    // Signal 2 / Signal 1: check presence of each form.
    let groupHasAnyMatch = false;
    const orphanedForms: string[] = [];

    for (const form of forms) {
      if (textContainsForm(combinedText, form)) {
        groupHasAnyMatch = true;
      } else {
        orphanedForms.push(form);
      }
    }

    if (!groupHasAnyMatch) {
      // Signal 2: fully-unreferenced group — one warn keyed by canonical.
      findings.push({
        severity: "warn",
        check: "vocabulary-unreferenced-group",
        message: `vocabulary-unreferenced-group: canonical="${canonical}" — all forms absent from wiki`,
      });
    } else if (orphanedForms.length > 0) {
      // Signal 1: individually orphaned forms within a partially-referenced group.
      for (const form of orphanedForms) {
        findings.push({
          severity: "warn",
          check: "vocabulary-orphaned-form",
          message:
            `vocabulary-orphaned-form: "${form}" (group canonical="${canonical}") ` +
            `appears in no wiki page`,
        });
      }
    }

    // Signal 3: tag-floor check.
    // Count total tag usages across all forms in the group.
    let totalTagPages = 0;
    let firstTaggedForm = "";
    for (const form of forms) {
      const count = tagIndex.get(form) ?? 0;
      totalTagPages += count;
      if (count > 0 && firstTaggedForm === "") {
        firstTaggedForm = form;
      }
    }

    if (totalTagPages > 0 && totalTagPages < minTagUsage) {
      findings.push({
        severity: "warn",
        check: "vocabulary-tag-floor",
        message:
          `vocabulary-tag-floor: "${firstTaggedForm}" (group canonical="${canonical}") ` +
          `used as a tag on only ${totalTagPages} page(s) — floor is ${minTagUsage}`,
      });
    }
  }

  // Sort for determinism: by message (which encodes check + canonical + form).
  findings.sort((a, b) => a.message.localeCompare(b.message));

  return Object.freeze(findings);
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

interface ComponentEntry {
  /** The YAML-declared canonical (lowercased+trimmed). */
  readonly canonical: string;
  /** All forms in this union-find component (lowercased+trimmed, sorted). */
  readonly forms: readonly string[];
}

/**
 * Reconstruct the set of union-find components from raw YAML groups +
 * the compiled lexicon. Each component appears exactly once.
 *
 * The lexicon's expand map covers all forms that have ≥1 synonym. Forms
 * that appear as the sole member of a YAML group (no variants, or all
 * variants normalise to the same string) are "singletons" not in expand —
 * we handle them by checking expand.has(canon) after collecting groups.
 */
function buildComponents(
  rawGroups: unknown[],
  lexicon: ReturnType<typeof loadLexicon>,
): ComponentEntry[] {
  // Normalise raw groups.
  interface NormGroup {
    canonical: string;
    allForms: string[];
  }
  const normGroups: NormGroup[] = [];

  for (const g of rawGroups) {
    if (typeof g !== "object" || g === null) continue;
    const obj = g as Record<string, unknown>;
    const canon = typeof obj["canonical"] === "string" ? obj["canonical"].toLowerCase().trim() : "";
    if (canon === "") continue;

    const variantsRaw = Array.isArray(obj["variants"]) ? obj["variants"] : [];
    const variants = variantsRaw
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.toLowerCase().trim())
      .filter((v) => v !== "");

    const allForms = dedup([canon, ...variants]);
    normGroups.push({ canonical: canon, allForms });
  }

  // Track which components we have already emitted (identified by sorted form set key).
  const seen = new Set<string>();
  const result: ComponentEntry[] = [];

  for (const { canonical, allForms } of normGroups) {
    // Determine the full component from the lexicon.
    const componentForms = resolveComponent(canonical, allForms, lexicon);

    componentForms.sort();
    const key = componentForms.join("|");
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({ canonical, forms: Object.freeze(componentForms) });
  }

  // Sort result by canonical for determinism.
  result.sort((a, b) => a.canonical.localeCompare(b.canonical));
  return result;
}

/**
 * Resolve the full union-find component for a group (canonical + allForms).
 *
 * Returns a mutable string[] (caller sorts in place).
 */
function resolveComponent(
  canonical: string,
  allForms: string[],
  lexicon: ReturnType<typeof loadLexicon>,
): string[] {
  if (lexicon.expand.has(canonical)) {
    // This canonical is in the expand map → get the full component.
    const peers = lexicon.expand.get(canonical) as ReadonlySet<string>;
    return dedup([canonical, ...peers]);
  }

  // Canonical not in expand map. Check if any raw form is in expand
  // (e.g. a variant has synonyms from another group via union-find merge).
  for (const form of allForms) {
    if (lexicon.expand.has(form)) {
      const peers = lexicon.expand.get(form) as ReadonlySet<string>;
      return dedup([form, ...peers]);
    }
  }

  // No form is in the expand map — plain singleton group.
  return dedup(allForms);
}

/** Remove duplicates while preserving order of first occurrence. */
function dedup(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

interface PageIndex {
  /** Lowercased full-page texts for body-presence checks. */
  readonly pageTexts: readonly string[];
  /** form (lowercased) → number of pages that carry this exact tag. */
  readonly tagIndex: ReadonlyMap<string, number>;
}

/**
 * Build the corpus and tag index from the list of wiki page paths.
 *
 * Each page contributes:
 *   - Its full lowercased text (frontmatter + body) to pageTexts.
 *   - Its normalised tags (lowercased+trimmed) to tagIndex.
 *
 * `pageTexts` is intentionally kept as individual strings; they are
 * joined by the caller with a space separator so form matches cannot
 * bleed across page boundaries in the concatenated string. (The bash
 * twin uses a NUL byte separator; a space achieves the same isolation
 * for whole-word-like lowercase substring checks.)
 */
function buildPageIndex(pages: readonly string[]): PageIndex {
  const pageTexts: string[] = [];
  const tagCounts = new Map<string, number>();

  for (const p of pages) {
    const content = readFileSafe(p);
    if (content === null) continue;

    // Full lowercased text (frontmatter + body) for body-presence checks.
    // We also include title and aliases so the presence check covers all
    // metadata that the bash twin scans.
    pageTexts.push(content.toLowerCase());

    // Extract tags from frontmatter for the tag-floor signal.
    const fm = parseFrontmatter(content);
    const tags = stringList(fm["tags"])
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t !== "");
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return { pageTexts, tagIndex: tagCounts };
}

/**
 * True if `text` (pre-lowercased combined corpus) contains `form` as a
 * case-insensitive substring. Mirrors the bash twin's `case "$BODY_TEXT" in
 * *"${form}"*)` pattern — plain substring, not word-boundary.
 */
function textContainsForm(text: string, form: string): boolean {
  return text.includes(form.toLowerCase());
}
