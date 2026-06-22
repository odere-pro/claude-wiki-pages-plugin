/**
 * Dangling-wikilink check — FU1 (ADR-0028).
 *
 * `checkDanglingWikilinks(wiki)` scans every non-BOOKKEEPING page under
 * `wiki/` for `[[links]]` whose normalised target resolves to no page, and
 * returns one `Finding` per (file, distinct-normalised-target).
 *
 * Resolution model: a link `[[T]]` resolves iff its normalised target (see
 * `normaliseTarget` in [`link-resolver.ts`](./link-resolver.ts)) is in the
 * resolvable-name set — the union of every page's wiki-relative PATH, filename
 * stem, `title:`, and `aliases:`, case-insensitively. This set comes from
 * `resolvableNames(index)` (ADR-0031): the `byPath` keys make a path-qualified
 * target like `_sources/adr-0001-…` resolve, and the basename keys make a piped
 * `[[entity-name|Entity Name]]` resolve once the `|display` is stripped — the
 * two forms Obsidian itself resolves. The verify-ingest.sh twin's dangling
 * block mirrors this and stays pinned by gate-05.
 *
 * No space↔hyphen fuzzing: that mismatch is exactly what produces empty Obsidian
 * nodes, so the resolver is strict. (ADR-0028 §2)
 *
 * BOOKKEEPING pages (index, log, dashboard, manifest, _index, .gitkeep, and
 * folder notes with `type: index`) are skipped as SUBJECTS (their outgoing
 * links are not scanned). Frontmatter wikilinks ARE included in the scan.
 */

import { relative } from "node:path";
import { listMarkdownRecursive, readFileSafe, isBookkeepingFile } from "./fs.ts";
import { buildLinkIndex, resolvableNames, normaliseTarget } from "./link-resolver.ts";
import type { Finding } from "./report.ts";

// ── Wikilink extraction ───────────────────────────────────────────────────────

/**
 * Extract all raw inner texts of `[[…]]` links from `content` (frontmatter and
 * body), code stripped. Mirrors `LINK_RE = re.compile(r"\[\[([^\[\]]+?)\]\]")`
 * in graph-quality.sh / verify-ingest.sh.
 */
export function extractRawWikilinkTargets(content: string): string[] {
  const out: string[] = [];
  const re = /\[\[([^[\]]+?)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripCode(content))) !== null) {
    if (m[1] !== undefined && m[1].trim() !== "") out.push(m[1]);
  }
  return out;
}

/**
 * Drop fenced code blocks (``` / ~~~) and inline code spans (`…`) before
 * scanning for `[[wikilinks]]`. Obsidian does not render a link inside code, so
 * a `[[Target]]` written as a documentation example is not a dangling link.
 *
 * Twin of `strip_code` in scripts/verify-ingest.sh and scripts/graph-quality.sh
 * (pinned by gate-05) — line-based so all three implementations agree.
 */
export function stripCode(text: string): string {
  const out: string[] = [];
  let inFence = false;
  let marker = "";
  for (const line of text.split("\n")) {
    const s = line.replace(/^\s+/, "");
    if (!inFence && (s.startsWith("```") || s.startsWith("~~~"))) {
      inFence = true;
      marker = s.slice(0, 3);
      continue;
    }
    if (inFence) {
      if (s.startsWith(marker)) {
        inFence = false;
        marker = "";
      }
      continue;
    }
    out.push(line.replace(/`[^`]*`/g, ""));
  }
  return out.join("\n");
}

// ── Main check ────────────────────────────────────────────────────────────────

/**
 * Scan every non-BOOKKEEPING page under `wiki/` and return one `Finding` of
 * `{ severity: "warn", check: "wikilink-dangling" }` per (file, distinct
 * normalised target) that resolves to no page.
 *
 * @param wiki Absolute path to the `wiki/` directory.
 * @returns Immutable array of findings, sorted by (file asc, target asc).
 */
export function checkDanglingWikilinks(wiki: string): readonly Finding[] {
  const resolvable = resolvableNames(buildLinkIndex(wiki));
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
        let display = raw;
        const pipeIdx = display.indexOf("|");
        if (pipeIdx !== -1) display = display.slice(0, pipeIdx);
        if (display.endsWith("\\")) display = display.slice(0, -1);
        const hashIdx = display.indexOf("#");
        if (hashIdx !== -1) display = display.slice(0, hashIdx);
        const caretIdx = display.indexOf("^");
        if (caretIdx !== -1) display = display.slice(0, caretIdx);
        display = display.trim();

        const rel = relative(wiki, file);
        findings.push({
          severity: "warn",
          check: "wikilink-dangling",
          message: `dangling-wikilink: [[${display}]] in ${rel} has no matching page (path, stem, title, or alias)`,
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
