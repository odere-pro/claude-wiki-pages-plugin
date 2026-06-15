#!/usr/bin/env bun
/**
 * Migrate alias/title-targeted wikilinks to Obsidian-resolvable piped form
 * (ADR: piped-link convention).
 *
 * Obsidian resolves a bare `[[Target]]` only by exact path or filename basename
 * — never by a note's `aliases:` or `title:` (an alias pick in autocomplete is
 * rewritten to `[[filename|alias]]`; a hand/script-written `[[Alias]]` does not
 * resolve). The wiki authored links as `[[Title Case]]` relying on aliases, so
 * those edges never form in the graph.
 *
 * This rewrites every link whose target currently resolves ONLY by alias or
 * title into `[[<basename>|<Title Case display>]]`, preserving the readable
 * display text. Links that already resolve by path/basename are left untouched;
 * genuinely dangling links are left untouched (never fabricated). Operates on
 * `wiki/` only — `raw/` is immutable.
 *
 * Usage:
 *   bun scripts/migrate-piped-links.ts --target <vault>            # dry-run
 *   bun scripts/migrate-piped-links.ts --target <vault> --write    # apply
 */

import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { buildLinkIndex, resolveLink, normaliseTarget } from "../src/core/link-resolver.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const target = arg("--target");
const write = process.argv.includes("--write");
if (!target) {
  console.error("usage: migrate-piped-links.ts --target <vault> [--write]");
  process.exit(2);
}

const wiki = join(target, "wiki");
const index = buildLinkIndex(wiki);

/** Stem (lower) → wiki-relative path, only when that stem is unambiguous. */
const uniqueStem = new Map<string, string>();
for (const [stem, files] of index.byBasename) {
  if (files.length === 1) uniqueStem.set(stem, files[0] as string);
}

/** The target token Obsidian should use to reach `fileRel`. */
function targetToken(fileRel: string): string {
  const base = fileRel.replace(/\.md$/, "").split("/").pop() as string;
  const stemLower = base.toLowerCase();
  // Basename is safe only if it uniquely identifies this exact file.
  if (uniqueStem.get(stemLower) === fileRel) return base;
  // Ambiguous stem → use the wiki-relative path (no extension).
  return fileRel.replace(/\.md$/, "");
}

const LINK = /\[\[([^\]]+)\]\]/g;
let filesChanged = 0;
let linksRewritten = 0;
let leftDangling = 0;
const samples: string[] = [];

for (const rel of index.files) {
  const abs = join(wiki, rel);
  const original = readFileSync(abs, "utf8");

  const updated = original.replace(LINK, (whole, inner: string) => {
    // inner = core[#heading|^block][|display]
    const pipe = inner.indexOf("|");
    const namePart = pipe === -1 ? inner : inner.slice(0, pipe);
    const display = pipe === -1 ? undefined : inner.slice(pipe + 1);

    // Split heading/block suffix off the page-name core.
    let core = namePart;
    let suffix = "";
    const hash = namePart.indexOf("#");
    const caret = namePart.indexOf("^");
    const cut = [hash, caret].filter((n) => n !== -1).sort((a, b) => a - b)[0];
    if (cut !== undefined) {
      core = namePart.slice(0, cut);
      suffix = namePart.slice(cut);
    }

    if (normaliseTarget(core) === "") return whole;

    const resolved = resolveLink(core, rel, index);
    if (resolved === null) {
      leftDangling++;
      return whole; // genuinely dangling — never fabricate
    }
    // Already Obsidian-resolvable (path or basename) — leave as-is.
    if (resolved.kind === "path" || resolved.kind === "basename") return whole;

    // alias/title only → rewrite to piped, basename-targeted form.
    const token = targetToken(resolved.file);
    const newDisplay = display !== undefined ? display : core.trim();
    const newInner = `${token}${suffix}|${newDisplay}`;
    linksRewritten++;
    if (samples.length < 12) samples.push(`${rel}: [[${inner}]] -> [[${newInner}]]`);
    return `[[${newInner}]]`;
  });

  if (updated !== original) {
    filesChanged++;
    if (write) writeFileSync(abs, updated);
  }
}

console.log(
  JSON.stringify(
    { mode: write ? "write" : "dry-run", filesChanged, linksRewritten, leftDangling },
    null,
    2,
  ),
);
console.log("--- sample rewrites ---");
for (const s of samples) console.log("  " + s);
