/**
 * Vault index + sources-field checks — ports scripts/verify-ingest.sh
 * CHECK 1 (index duplicates / pages missing from index) and CHECK 2
 * (sources frontmatter must use [[wikilinks]]).
 */

import { basename, join } from "node:path";
import { listMarkdownRecursive, readFileSafe, existsSync, BOOKKEEPING } from "./fs.ts";
import { splitFrontmatter, parseFrontmatter, stringList, titleOf } from "./frontmatter.ts";
import { extractWikilinks, duplicates } from "./wikilinks.ts";
import type { Finding } from "./report.ts";

const WIKILINK_SOURCE = /^\[\[.+\]\]$/;

/** CHECK 1: index.md exists, has no duplicate entries, and lists every page. */
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
  const linkSet = new Set(links);

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

  for (const filepath of listMarkdownRecursive(wiki)) {
    const stem = basename(filepath, ".md");
    if (BOOKKEEPING.has(stem)) continue;
    const title = titleOf(readFileSafe(filepath) ?? "", filepath);
    if (!linkSet.has(title)) {
      findings.push({
        severity: "warn",
        check: "index-duplicates",
        message: `Page not in index.md: "${title}" (${filepath})`,
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
    const stem = basename(filepath, ".md");
    if (BOOKKEEPING.has(stem)) continue;
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
