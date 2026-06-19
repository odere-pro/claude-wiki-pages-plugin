/**
 * structural-check — template-skeleton conformance + no-raw-HTML.
 *
 * Ports scripts/lint-structural.sh (S2-structural check) to a pure TypeScript
 * module, composing existing primitives:
 *   - frontmatter.ts  parseFrontmatter / splitFrontmatter
 *   - fs.ts           listMarkdownRecursive / isBookkeepingFile / isFolderNote / readFileSafe
 *
 * Two checks per eligible wiki page:
 *   1. Template-skeleton conformance — for each typed page, every required H2
 *      heading defined in _templates/<type>.md must be present in the page body.
 *      Headings with placeholder syntax `## {{something}}` are excluded from the
 *      required list (mirrors the bash `awk` filter).
 *   2. No-raw-HTML — the page body (outside frontmatter, outside fenced code
 *      blocks) must not contain block-level HTML elements like <div>, <span>,
 *      <table>, etc. (presentation independence, TEAM-BRIEF §5).
 *
 * Both checks emit WARN-severity findings — this is an advisory lint, not an
 * error-tier verify check (mirrors the bash exit-code semantics).
 *
 * Exemptions (mirrors scripts/lint-structural.sh):
 *   - Bookkeeping files: index.md, log.md, dashboard.md, manifest.md, _index.md, .gitkeep
 *   - Folder notes: <dir>/<dir>.md where frontmatter has `type: index`
 *   - _proposed/ drafts
 *   - Pages with no `type` frontmatter field
 *   - Types exempt from skeleton check: source, index, manifest, log
 *   - Pages whose type has no matching template (no template → no skeleton check)
 *
 * No embeddings, no network, no side effects. Same vault in → same findings out.
 */

import { join, relative, basename } from "node:path";
import { existsSync } from "node:fs";
import type { Finding } from "./report.ts";
import { listMarkdownRecursive, isBookkeepingFile, readFileSafe } from "./fs.ts";
import { parseFrontmatter, splitFrontmatter } from "./frontmatter.ts";

/**
 * The check name emitted on every finding produced by this module.
 * Used as the `check` field in `Finding` and as the `--check` selector in lint.
 */
export const STRUCTURAL_CHECK = "structural" as const;

/**
 * Block-level HTML tags whose presence in wiki body prose violates the
 * presentation-independence rule (TEAM-BRIEF §5, mirrors lint-structural.sh).
 * Self-closing and closing variants are both matched.
 */
const RAW_HTML_TAGS = [
  "div",
  "span",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "iframe",
  "script",
  "style",
  "form",
  "input",
  "button",
  "select",
  "textarea",
] as const;

/**
 * Page types that are exempt from the template-skeleton check.
 * Mirrors the bash `case "$PAGE_TYPE" in source | index | manifest | log) continue ;; esac`.
 */
const SKELETON_EXEMPT_TYPES = new Set(["source", "index", "manifest", "log"]);

/**
 * Pre-compiled regex that matches any opening/closing raw-HTML block tag.
 * Mirrors the awk pattern in lint-structural.sh:
 *   /<(tag|...)[[:space:]>\/]/ || /<\/(tag|...)>/
 */
const RAW_HTML_PATTERN = new RegExp(
  `<(${RAW_HTML_TAGS.join("|")})[\\s>/]|</(${RAW_HTML_TAGS.join("|")})>`,
);

/** Matches an H2 heading in the page/template body. */
const H2_PATTERN = /^## (.+)$/m;

/** Matches a placeholder H2 heading like `## {{something}}`. */
const PLACEHOLDER_PATTERN = /^\{\{/;

// ---------------------------------------------------------------------------
// Template skeleton loading
// ---------------------------------------------------------------------------

/**
 * Extract required H2 headings from a template file.
 *
 * Strips frontmatter, then collects every `## <heading>` line whose content
 * does NOT start with `{{` (placeholder). An empty list is returned when the
 * template has no body H2 headings, or when the file cannot be read.
 *
 * Mirrors the awk skeleton-extraction block in lint-structural.sh.
 */
function extractTemplateHeadings(templatePath: string): string[] {
  const content = readFileSafe(templatePath);
  if (content === null) return [];

  const { body } = splitFrontmatter(content);
  const headings: string[] = [];

  for (const line of body.split("\n")) {
    const m = H2_PATTERN.exec(line);
    if (m !== null) {
      const heading = m[1]?.trim() ?? "";
      if (heading !== "" && !PLACEHOLDER_PATTERN.test(heading)) {
        headings.push(heading);
      }
    }
  }

  return headings;
}

/**
 * Build a map from page type → required H2 headings by reading every
 * `_templates/<type>.md` file in the vault.
 *
 * Returns an empty map when the `_templates/` directory is absent.
 */
function buildSkeletonMap(vault: string): Map<string, string[]> {
  const templatesDir = join(vault, "_templates");
  if (!existsSync(templatesDir)) return new Map();

  const map = new Map<string, string[]>();
  for (const absPath of listMarkdownRecursive(templatesDir)) {
    const type = basename(absPath, ".md");
    const headings = extractTemplateHeadings(absPath);
    // Only store entries with at least one required heading (no-op template
    // files are not useful for the skeleton check).
    if (headings.length > 0) {
      map.set(type, headings);
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Body scanning helpers
// ---------------------------------------------------------------------------

/**
 * Extract actual H2 headings from a page body (frontmatter already stripped).
 * Returns the heading text only (without the `## ` prefix).
 */
function extractBodyHeadings(body: string): Set<string> {
  const headings = new Set<string>();
  for (const line of body.split("\n")) {
    const m = H2_PATTERN.exec(line);
    if (m !== null) {
      const heading = m[1]?.trim();
      if (heading !== undefined && heading !== "") {
        headings.add(heading);
      }
    }
  }
  return headings;
}

/**
 * Strip fenced code blocks (triple-backtick delimited) from a string.
 * Mirrors `sed '/^```/,/^```/d'` in lint-structural.sh.
 */
function stripFencedCodeBlocks(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let inFence = false;
  for (const line of lines) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) out.push(line);
  }
  return out.join("\n");
}

/**
 * Scan a page body for raw-HTML violations.
 * Returns an array of (lineNumber, lineText) pairs where violations were found.
 * An empty array means clean.
 *
 * Strips fenced code blocks before scanning (mirrors lint-structural.sh awk).
 */
function findRawHtmlLines(body: string): Array<{ lineNumber: number; line: string }> {
  const strippedLines = stripFencedCodeBlocks(body).split("\n");
  const violations: Array<{ lineNumber: number; line: string }> = [];

  for (let i = 0; i < strippedLines.length; i++) {
    const line = strippedLines[i];
    if (line !== undefined && RAW_HTML_PATTERN.test(line)) {
      violations.push({ lineNumber: i + 1, line });
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Scan `vault/wiki/` for structural violations:
 *   1. Missing required H2 headings (template-skeleton conformance).
 *   2. Raw HTML block elements in page body (no-raw-HTML rule).
 *
 * Returns warn-severity `Finding[]`. Never throws — unreadable files are
 * silently skipped (mirrors `readFileSafe`'s tolerance contract, migration-plan.md).
 *
 * @param vault - absolute path to the vault root (the directory containing `wiki/`).
 */
export function checkStructural(vault: string): Finding[] {
  const wiki = join(vault, "wiki");
  const findings: Finding[] = [];

  // Build skeleton map once: type → required H2 headings.
  const skeletonMap = buildSkeletonMap(vault);
  const hasTemplates = skeletonMap.size > 0;

  for (const absPath of listMarkdownRecursive(wiki)) {
    // ── Exemption 1: bookkeeping files and folder notes ──────────────────────
    if (isBookkeepingFile(absPath)) continue;

    // ── Exemption 2: _proposed/ drafts ───────────────────────────────────────
    // Mirror bash: `case "$filepath" in */_proposed/*) continue ;; esac`
    const normalised = absPath.split(/[\\/]/).join("/");
    if (normalised.includes("/_proposed/")) continue;

    // ── Read page content ─────────────────────────────────────────────────────
    const content = readFileSafe(absPath);
    if (content === null) continue;

    const { body } = splitFrontmatter(content);
    const fm = parseFrontmatter(content);

    // ── Exemption 3: no type field → skip ─────────────────────────────────────
    const pageType = fm["type"];
    if (typeof pageType !== "string" || pageType.trim() === "") continue;
    const type = pageType.trim();

    // Vault-relative path for the `file` field on findings.
    const relPath = relative(vault, absPath).split(/[\\/]/).join("/");

    // ── Check 1: template-skeleton conformance ────────────────────────────────
    // Exempt types: source, index, manifest, log.
    // Also skip when there are no templates or no template for this type.
    if (!SKELETON_EXEMPT_TYPES.has(type) && hasTemplates) {
      const requiredHeadings = skeletonMap.get(type);
      if (requiredHeadings !== undefined && requiredHeadings.length > 0) {
        const actualHeadings = extractBodyHeadings(body);
        for (const required of requiredHeadings) {
          if (!actualHeadings.has(required)) {
            findings.push({
              severity: "warn",
              check: STRUCTURAL_CHECK,
              message: `missing-section: ${basename(absPath)} (type=${type}): required heading "## ${required}" not found`,
              file: relPath,
            });
          }
        }
      }
    }

    // ── Check 2: no-raw-HTML ──────────────────────────────────────────────────
    // Applies to ALL typed pages regardless of type or template presence.
    const htmlViolations = findRawHtmlLines(body);
    for (const { lineNumber, line } of htmlViolations) {
      findings.push({
        severity: "warn",
        check: STRUCTURAL_CHECK,
        message: `raw-html: ${basename(absPath)} (type=${type}): raw HTML found — ${lineNumber}: ${line.trim()}`,
        file: relPath,
      });
    }
  }

  return findings;
}
