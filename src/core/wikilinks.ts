/**
 * Wikilink extraction and the markdown-link guard.
 *
 * Ports scripts/check-wikilinks.sh `check_content()` and the link-scraping
 * in scripts/verify-ingest.sh CHECK 1.
 */

import { splitFrontmatter } from "./frontmatter.ts";

/**
 * All `[[Target]]` targets in `body`, in document order, untrimmed of inner
 * whitespace — matching `grep -oE '\[\[[^]|]+'` followed by stripping `[[`.
 * The alias portion after `|` is dropped.
 */
export function extractWikilinks(body: string): string[] {
  const out: string[] = [];
  const re = /\[\[([^\]|]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) out.push(m[1] ?? "");
  return out;
}

/** Targets that appear more than once, with their counts (for index dedup). */
export function duplicates(targets: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of targets) counts.set(t, (counts.get(t) ?? 0) + 1);
  const dupes = new Map<string, number>();
  for (const [t, n] of counts) if (n > 1) dupes.set(t, n);
  return dupes;
}

/**
 * Detect `[text](file.md)` markdown links in a page body, ignoring frontmatter
 * and fenced code blocks. Returns the guard message, or null when clean.
 * Mirrors `check_content()`.
 */
export function markdownLinkViolation(content: string): string | null {
  const { body } = splitFrontmatter(content);
  // Strip fenced code blocks to avoid false positives on examples.
  const stripped = stripFencedBlocks(body);
  // The 's' (dotAll) flag makes '.' match '\r' (CR, 0x0D) and other control
  // characters, so a link text containing a carriage-return byte is detected.
  // Without 's', a CR-containing link like '[the\rsample](page.md)' would not
  // match because '.' skips '\r' by default. The old bash grep -oE had no such
  // restriction. See json-envelope.bats test 311 for the regression anchor.
  if (/\[.+\]\([^)]+\.md\)/s.test(stripped)) {
    return "Wiki file uses [text](file.md) links. Convert to [[Page Title]] wikilinks for Obsidian compatibility.";
  }
  return null;
}

/** Remove ```-fenced blocks (matches the bash `sed '/^```/,/^```/d'`). */
function stripFencedBlocks(body: string): string {
  const lines = body.split("\n");
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
