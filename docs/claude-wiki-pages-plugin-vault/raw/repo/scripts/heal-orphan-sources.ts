#!/usr/bin/env bun
/**
 * Reconnect orphaned source summaries to their primary topic island.
 *
 * After stripping the cross-cutting out-link sections from `_sources/*`, sources
 * that no page cites become orphans. This re-anchors each such source to ONE
 * topic hub with a single piped link, so it hangs off that topic's island (the
 * Image-#4 shape) instead of floating.
 *
 * The topic is inferred from the source's pre-strip out-links (read from git
 * HEAD): each target is resolved to a wiki page, mapped to its top-level topic
 * folder, and the modal topic wins. Falls back to nothing (left for manual) if
 * no out-link resolves.
 *
 * Usage: bun scripts/heal-orphan-sources.ts --target <vault> [--write]
 */

import { join, relative } from "node:path";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { buildLinkIndex, resolveLink } from "../src/core/link-resolver.ts";
import { extractWikilinks } from "../src/core/wikilinks.ts";
import { readFileSafe } from "../src/core/fs.ts";
import { parseFrontmatter } from "../src/core/frontmatter.ts";
import { SPECIAL_DIRS } from "../src/core/topics.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const target = arg("--target");
const write = process.argv.includes("--write");
if (!target) {
  console.error("usage: heal-orphan-sources.ts --target <vault> [--write]");
  process.exit(2);
}

const wiki = join(target, "wiki");
const index = buildLinkIndex(wiki);

/**
 * Topic folder → display title, DERIVED from the vault's own folder notes
 * (`<topic>/<topic>.md` `title:`, falling back to the folder name). Vault-
 * agnostic: works on any vault's folder set, not a hardcoded dogfood list.
 */
function deriveTopicTitles(): Record<string, string> {
  const out: Record<string, string> = {};
  let entries: string[] = [];
  try {
    entries = readdirSync(wiki);
  } catch {
    return out;
  }
  for (const name of entries.sort()) {
    if (SPECIAL_DIRS.has(name) || name.startsWith(".")) continue;
    try {
      if (!statSync(join(wiki, name)).isDirectory()) continue;
    } catch {
      continue;
    }
    let title = name;
    const fm = parseFrontmatter(readFileSafe(join(wiki, name, `${name}.md`)) ?? "");
    if (typeof fm["title"] === "string" && fm["title"].trim() !== "") title = fm["title"].trim();
    out[name] = title;
  }
  return out;
}
const TOPIC_TITLE = deriveTopicTitles();

// Git toplevel for the vault, so `git show HEAD:<repo-relative path>` works on
// any repo — not the hardcoded dogfood `docs/claude-wiki-pages-plugin-vault/…`.
let gitRoot: string | null = null;
try {
  gitRoot = execFileSync("git", ["-C", target, "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
} catch {
  /* vault is not in a git repo — pre-strip history is simply unavailable */
}

/** Top-level topic folder of a wiki-relative path, or null for specials/root. */
function topicOf(rel: string): string | null {
  const m = /^([^/]+)\//.exec(rel);
  const t = m?.[1];
  return t && t in TOPIC_TITLE ? t : null;
}

// Orphaned sources = _sources pages with no resolving inbound from a non-source page.
const inbound = new Map<string, number>();
for (const rel of index.files) {
  if (rel.startsWith("_sources/")) continue;
  for (const raw of extractWikilinks(readFileSync(join(wiki, rel), "utf8"))) {
    const r = resolveLink(raw, rel, index);
    if (r && (r.kind === "path" || r.kind === "basename") && r.file.startsWith("_sources/")) {
      inbound.set(r.file, (inbound.get(r.file) ?? 0) + 1);
    }
  }
}
const orphans = index.files.filter(
  (rel) => rel.startsWith("_sources/") && (inbound.get(rel) ?? 0) === 0,
);

let healed = 0;
const unresolved: string[] = [];
for (const rel of orphans) {
  // Pre-strip content from git HEAD (vault-relative path under the git root).
  let head = "";
  if (gitRoot !== null) {
    const gitRel = relative(gitRoot, join(wiki, rel)).split(/[\\/]/).join("/");
    try {
      head = execFileSync("git", ["-C", gitRoot, "show", `HEAD:${gitRel}`], {
        encoding: "utf8",
      });
    } catch {
      /* file may be new since HEAD */
    }
  }
  const counts = new Map<string, number>();
  for (const raw of extractWikilinks(head)) {
    const r = resolveLink(raw, rel, index);
    if (!r) continue;
    const t = topicOf(r.file);
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const modal = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!modal) {
    unresolved.push(rel);
    continue;
  }
  const abs = join(wiki, rel);
  const body = readFileSync(abs, "utf8").replace(/\s+$/, "");
  const link = `[[${modal}|${TOPIC_TITLE[modal]}]]`;
  const updated = `${body}\n\n## Topic\n\nThis source informs the ${link} topic.\n`;
  healed++;
  if (write) writeFileSync(abs, updated);
}

console.log(
  JSON.stringify(
    { mode: write ? "write" : "dry-run", orphans: orphans.length, healed, unresolved },
    null,
    2,
  ),
);
