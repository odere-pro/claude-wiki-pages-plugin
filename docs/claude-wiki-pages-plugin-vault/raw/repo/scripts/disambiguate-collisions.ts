#!/usr/bin/env bun
/**
 * Path-qualify wikilinks whose bare basename is ambiguous across the WHOLE vault.
 *
 * The piped-link migration targeted wiki pages by basename, resolving only within
 * `wiki/`. But Obsidian indexes `raw/` too, and many `wiki/_sources/X.md`
 * summaries share a basename with their `raw/.../X.md` original. A bare
 * `[[X|display]]` then resolves to the raw file, so the source summary is
 * uncited (orphaned) and raw files are pulled into the graph.
 *
 * This rewrites any link whose target basename is NOT globally unique (collides
 * with another file anywhere under the vault, wiki or raw) into the wiki-relative
 * path form `[[<dir>/<stem>|display]]`, which Obsidian resolves unambiguously to
 * the wiki page. Non-colliding basenames are left as-is. wiki/ files only.
 *
 * Usage: bun scripts/disambiguate-collisions.ts --target <vault> [--write]
 */

import { join, basename } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { buildLinkIndex, resolveLink, normaliseTarget } from "../src/core/link-resolver.ts";
import { listMarkdownRecursive } from "../src/core/fs.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const target = arg("--target");
const write = process.argv.includes("--write");
if (!target) {
  console.error("usage: disambiguate-collisions.ts --target <vault> [--write]");
  process.exit(2);
}

const wiki = join(target, "wiki");
const index = buildLinkIndex(wiki);

// Global basename frequency across the WHOLE vault (wiki + raw + anything indexed).
const globalCount = new Map<string, number>();
for (const abs of listMarkdownRecursive(target)) {
  const stem = basename(abs, ".md").trim().toLowerCase();
  globalCount.set(stem, (globalCount.get(stem) ?? 0) + 1);
}
const isAmbiguous = (stemLower: string): boolean => (globalCount.get(stemLower) ?? 0) > 1;

const LINK = /\[\[([^\]]+)\]\]/g;
let filesChanged = 0;
let linksFixed = 0;
const samples: string[] = [];

for (const rel of index.files) {
  const abs = join(wiki, rel);
  const original = readFileSync(abs, "utf8");

  const updated = original.replace(LINK, (whole, inner: string) => {
    const pipe = inner.indexOf("|");
    const namePart = pipe === -1 ? inner : inner.slice(0, pipe);
    const display = pipe === -1 ? undefined : inner.slice(pipe + 1);

    let core = namePart;
    let suffix = "";
    const cut = [namePart.indexOf("#"), namePart.indexOf("^")]
      .filter((n) => n !== -1)
      .sort((a, b) => a - b)[0];
    if (cut !== undefined) {
      core = namePart.slice(0, cut);
      suffix = namePart.slice(cut);
    }

    // Already a path link (contains a slash) → leave it.
    if (core.includes("/")) return whole;
    const nt = normaliseTarget(core);
    if (nt === "" || !isAmbiguous(nt)) return whole;

    // Ambiguous basename → resolve within wiki and emit the wiki-relative path.
    const r = resolveLink(core, rel, index);
    if (r === null) return whole; // dangling in wiki — leave
    const pathTarget = r.file.replace(/\.md$/, "");
    const newDisplay = display !== undefined ? display : core.trim();
    linksFixed++;
    if (samples.length < 10) samples.push(`${rel}: [[${inner}]] -> [[${pathTarget}${suffix}|${newDisplay}]]`);
    return `[[${pathTarget}${suffix}|${newDisplay}]]`;
  });

  if (updated !== original) {
    filesChanged++;
    if (write) writeFileSync(abs, updated);
  }
}

console.log(JSON.stringify({ mode: write ? "write" : "dry-run", filesChanged, linksFixed }, null, 2));
for (const s of samples) console.log("  " + s);
