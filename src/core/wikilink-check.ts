/**
 * Dangling-wikilink check — FU1 (ADR-0028).
 *
 * `checkDanglingWikilinks(wiki)` scans every non-BOOKKEEPING page under
 * `wiki/` for `[[links]]` whose normalised target resolves to no page,
 * and returns one `Finding` per (file, distinct-normalised-target).
 *
 * Resolution model (identical to scripts/graph-quality.sh `parse_title_aliases`
 * and the `norm()`/`link_target()` helpers — kept as one specification, pinned
 * by gate-05):
 *
 *   A link [[T]] resolves iff, case-insensitively, the normalised target
 *   (stripped of "|alias" after the first `|`, "#heading" after the first `#`,
 *   and "^block" after the first `^`, then `.strip().lower()`) equals:
 *     - the filename stem of some page, OR
 *     - the `title:` value of some page, OR
 *     - any `aliases:` entry of some page.
 *
 * No space↔hyphen fuzzing: that mismatch is exactly what produces empty Obsidian
 * nodes, so the resolver is strict. (ADR-0028 §2)
 *
 * BOOKKEEPING pages (index, log, dashboard, manifest, _index, .gitkeep, and
 * folder notes with `type: index`) are skipped as SUBJECTS (their outgoing
 * links are not scanned) — matching the bookkeeping exemption applied
 * everywhere else in verify.
 *
 * Frontmatter wikilinks are included in the scan: the full file content
 * (frontmatter + body) is searched.
 */

import { relative, basename } from "node:path";
import { listMarkdownRecursive, readFileSafe, isBookkeepingFile } from "./fs.ts";
import { parseFrontmatter, stringList } from "./frontmatter.ts";
import type { Finding } from "./report.ts";

// ── Normalisation ─────────────────────────────────────────────────────────────

/**
 * Normalise a raw wikilink inner text to the form used for resolution.
 * Mirrors `link_target()` + `norm()` in scripts/graph-quality.sh.
 *
 * Steps:
 *   1. Strip "|display" alias (everything from the first `|`).
 *   2. Strip "#heading" anchor (everything from the first `#`).
 *   3. Strip "^block" anchor (everything from the first `^`).
 *   4. `.trim().toLowerCase()`.
 */
function normaliseTarget(raw: string): string {
  let t = raw;
  const pipe = t.indexOf("|");
  if (pipe !== -1) t = t.slice(0, pipe);
  const hash = t.indexOf("#");
  if (hash !== -1) t = t.slice(0, hash);
  const caret = t.indexOf("^");
  if (caret !== -1) t = t.slice(0, caret);
  return t.trim().toLowerCase();
}

// ── Resolvable-name set ───────────────────────────────────────────────────────

/**
 * Build the set of all normalised names that satisfy a [[link]] — the union of
 * every page's filename stem, `title:` value, and `aliases:` entries.
 *
 * Mirrors `resolvable` construction in scripts/graph-quality.sh (ALL pages are
 * targets, including bookkeeping; only the subject scan is filtered).
 */
function buildResolvableSet(wiki: string): Set<string> {
  const resolvable = new Set<string>();
  for (const file of listMarkdownRecursive(wiki)) {
    const stem = basename(file, ".md").trim().toLowerCase();
    if (stem !== "") resolvable.add(stem);

    const content = readFileSafe(file);
    if (content === null) continue;

    const fm = parseFrontmatter(content);

    // title:
    const title = fm["title"];
    if (typeof title === "string" && title.trim() !== "") {
      resolvable.add(title.trim().toLowerCase());
    }

    // aliases: (inline array or block list via stringList)
    for (const alias of stringList(fm["aliases"])) {
      const normAlias = alias.trim().toLowerCase();
      if (normAlias !== "") resolvable.add(normAlias);
    }
  }
  return resolvable;
}

// ── Wikilink extraction ───────────────────────────────────────────────────────

/**
 * Extract all raw inner texts of `[[…]]` links from `content`, including
 * those inside the frontmatter block (the full file is searched).
 *
 * The regex matches `[[` then captures everything up to the first `]]` or `|`,
 * mirroring `LINK_RE = re.compile(r"\[\[([^\[\]]+?)\]\]")` in graph-quality.sh.
 * Note: extractWikilinks in wikilinks.ts already strips the alias, but here we
 * need the raw inner text (including any alias/anchor) so normaliseTarget() can
 * strip it in the same way the bash scanner does.
 */
function extractRawWikilinkTargets(content: string): string[] {
  const out: string[] = [];
  // Match the full [[inner text]] (including any alias/anchor) up to the closing `]]`.
  const re = /\[\[([^[\]]+?)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m[1] !== undefined && m[1].trim() !== "") out.push(m[1]);
  }
  return out;
}

// ── Main check ────────────────────────────────────────────────────────────────

/**
 * Scan every non-BOOKKEEPING page under `wiki/` and return one `Finding` of
 * `{ severity: "warn", check: "wikilink-dangling" }` per (file, distinct
 * normalised target) that resolves to no page.
 *
 * @param wiki Absolute path to the `wiki/` directory.
 * @returns Immutable array of findings, sorted by (file asc, target asc) for
 *          determinism (same vault → same ranking).
 */
export function checkDanglingWikilinks(wiki: string): readonly Finding[] {
  const resolvable = buildResolvableSet(wiki);
  const findings: Finding[] = [];

  for (const file of listMarkdownRecursive(wiki)) {
    // Skip BOOKKEEPING pages as subjects.
    if (isBookkeepingFile(file)) continue;

    const content = readFileSafe(file);
    if (content === null) continue;

    const rawTargets = extractRawWikilinkTargets(content);

    // Deduplicate by normalised target for this file.
    const seen = new Set<string>();
    for (const raw of rawTargets) {
      const norm = normaliseTarget(raw);
      if (norm === "") continue;
      if (seen.has(norm)) continue;
      seen.add(norm);

      if (!resolvable.has(norm)) {
        // Produce the original (non-normalised) target for the message so the
        // human can see what they wrote, matching graph-quality.sh output.
        // Strip alias/anchor from the raw text for a readable display form.
        let display = raw;
        const pipeIdx = display.indexOf("|");
        if (pipeIdx !== -1) display = display.slice(0, pipeIdx);
        const hashIdx = display.indexOf("#");
        if (hashIdx !== -1) display = display.slice(0, hashIdx);
        const caretIdx = display.indexOf("^");
        if (caretIdx !== -1) display = display.slice(0, caretIdx);
        display = display.trim();

        const rel = relative(wiki, file);
        findings.push({
          severity: "warn",
          check: "wikilink-dangling",
          message: `dangling-wikilink: [[${display}]] in ${rel} has no matching page (stem, title, or alias)`,
          file: rel,
        });
      }
    }
  }

  // Sort for determinism: file asc, then message asc (which encodes the target).
  findings.sort((a, b) => {
    const fa = a.file ?? "";
    const fb = b.file ?? "";
    if (fa !== fb) return fa.localeCompare(fb);
    return a.message.localeCompare(b.message);
  });

  return Object.freeze(findings);
}
