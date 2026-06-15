/**
 * Vault index + sources-field checks — ports scripts/verify-ingest.sh
 * CHECK 1 (index duplicates / pages missing from index) and CHECK 2
 * (sources frontmatter must use [[wikilinks]]).
 */

import { basename, join, relative } from "node:path";
import { listMarkdownRecursive, readFileSafe, existsSync, isBookkeepingFile } from "./fs.ts";
import { splitFrontmatter, parseFrontmatter, stringList, titleOf } from "./frontmatter.ts";
import { extractWikilinks, duplicates } from "./wikilinks.ts";
import { buildLinkIndex, resolveLink, type LinkIndex } from "./link-resolver.ts";
import type { Finding } from "./report.ts";

const WIKILINK_SOURCE = /^\[\[.+\]\]$/;

/** Wiki-relative path with `/` separators (Obsidian's path form). */
function toRel(wiki: string, file: string): string {
  return relative(wiki, file).split(/[\\/]/).join("/");
}

/**
 * Walk the hierarchical MOC from `wiki/index.md` and return the set of
 * wiki-relative pages reachable through it (schema v3 folder-note design).
 *
 * Starting at the root index, each index page's `child_indexes:` links resolve
 * to folder notes (descend into them) and its `children:` links resolve to the
 * pages it catalogs (mark covered). Recursion is guarded by a visited set. A
 * page is "in the MOC" if it is reached as a `children` entry OR is itself an
 * index page reached via `child_indexes` — it need NOT appear in `index.md`
 * directly (ADR-0031). All link fields are resolved by path ∪ basename.
 */
function reachableFromMoc(wiki: string, index: LinkIndex): Set<string> {
  const covered = new Set<string>();
  const visited = new Set<string>();

  const visit = (rel: string): void => {
    if (visited.has(rel)) return;
    visited.add(rel);
    covered.add(rel);

    const abs = join(wiki, rel);
    const fm = parseFrontmatter(readFileSafe(abs) ?? "");

    // `children` → catalogued pages (covered, not descended into).
    for (const raw of stringList(fm["children"])) {
      const r = resolveLink(raw.replace(/^\[\[/, "").replace(/\]\]$/, ""), rel, index);
      if (r !== null) covered.add(r.file);
    }
    // `child_indexes` → sub-index folder notes (covered AND descended into).
    for (const raw of stringList(fm["child_indexes"])) {
      const r = resolveLink(raw.replace(/^\[\[/, "").replace(/\]\]$/, ""), rel, index);
      if (r !== null) visit(r.file);
    }
  };

  visit("index.md");
  return covered;
}

/**
 * CHECK 1: `index.md` exists, has no duplicate entries, and every page is
 * reachable through the hierarchical folder-note MOC rooted at it.
 */
export function checkIndex(wiki: string): Finding[] {
  const indexPath = join(wiki, "index.md");
  if (!existsSync(indexPath)) {
    return [
      {
        severity: "error",
        check: "index-duplicates",
        message: `index.md not found at ${indexPath}`,
        file: indexPath,
      },
    ];
  }

  const findings: Finding[] = [];
  const content = readFileSafe(indexPath) ?? "";
  const { body } = splitFrontmatter(content);
  const links = extractWikilinks(body);

  for (const [dup, count] of [...duplicates(links).entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    findings.push({
      severity: "error",
      check: "index-duplicates",
      message: `Duplicate in index.md: "${dup}" appears ${count} times`,
      file: indexPath,
    });
  }

  // Hierarchical reachability: a page is "in the MOC" when the folder-note tree
  // rooted at index.md reaches it via child_indexes → children, not when it is
  // listed in index.md directly (schema v3, ADR-0031).
  const linkIndex = buildLinkIndex(wiki);
  const covered = reachableFromMoc(wiki, linkIndex);

  const sourcesPrefix = `${join(wiki, "_sources")}/`;
  const synthesisPrefix = `${join(wiki, "_synthesis")}/`;
  for (const filepath of listMarkdownRecursive(wiki)) {
    if (isBookkeepingFile(filepath)) continue;
    // `_sources/` and `_synthesis/` pages are reached from the pages that cite
    // them (their `sources:` field), not from the topic MOC — orphan-sources
    // (CHECK 3b) is their membership check. Excluding them keeps the graph
    // clustered by topic rather than collapsing provenance into the index hub.
    if (filepath.includes(sourcesPrefix) || filepath.includes(synthesisPrefix)) continue;
    const rel = toRel(wiki, filepath);
    if (!covered.has(rel)) {
      const title = titleOf(readFileSafe(filepath) ?? "", filepath);
      findings.push({
        severity: "warn",
        check: "index-duplicates",
        message: `Page not in MOC: "${title}" (${filepath}) — not reachable from index.md via folder notes`,
        file: filepath,
      });
    }
  }
  return findings;
}

/** CHECK 2: every `sources:` entry across the wiki must be a `[[wikilink]]`. */
export function checkSourcesFormat(wiki: string): Finding[] {
  const findings: Finding[] = [];
  for (const filepath of listMarkdownRecursive(wiki)) {
    if (isBookkeepingFile(filepath)) continue;
    const fm = parseFrontmatter(readFileSafe(filepath) ?? "");
    for (const entry of stringList(fm["sources"])) {
      if (!WIKILINK_SOURCE.test(entry)) {
        findings.push({
          severity: "error",
          check: "sources-format",
          message: `Plain string in sources: "${entry}" in ${basename(filepath)}`,
          file: filepath,
        });
      }
    }
  }
  return findings;
}
