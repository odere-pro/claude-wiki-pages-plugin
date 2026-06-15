#!/usr/bin/env bun
/**
 * Declutter the graph by removing the cross-cutting OUT-links from source
 * summaries, so sources become leaf provenance nodes that cluster with the topic
 * pages that cite them (forming topic islands) instead of fanning out across the
 * whole graph.
 *
 * Provenance is canonically directed page → source (the `sources:` field). The
 * "## Entities Mentioned" / "## Concepts Covered" / "## Grounded Pages" sections
 * on `wiki/_sources/*` pages add the reverse source → page edges, which bridge
 * every topic a source touches. They are redundant with the inbound `sources:`
 * citations.
 *
 * Safety: a source's out-link sections are stripped ONLY when that source already
 * has ≥1 inbound citation, so no source is orphaned. Uncited sources keep their
 * sections untouched. Operates on wiki/_sources/ only.
 *
 * Usage:
 *   bun scripts/declutter-source-outlinks.ts --target <vault>           # dry-run
 *   bun scripts/declutter-source-outlinks.ts --target <vault> --write   # apply
 */

import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { buildLinkIndex, resolveLink } from "../src/core/link-resolver.ts";
import { extractWikilinks } from "../src/core/wikilinks.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const target = arg("--target");
const write = process.argv.includes("--write");
if (!target) {
  console.error("usage: declutter-source-outlinks.ts --target <vault> [--write]");
  process.exit(2);
}

const wiki = join(target, "wiki");
const index = buildLinkIndex(wiki);

// Inbound citation count per source page, counting ONLY links that originate
// from non-source pages. Links from other _sources pages (their out-link
// sections) are excluded because those are exactly what this script strips —
// counting them would falsely protect a source that is otherwise uncited.
const inbound = new Map<string, number>();
for (const rel of index.files) {
  if (rel.startsWith("_sources/")) continue;
  const content = readFileSync(join(wiki, rel), "utf8");
  for (const raw of extractWikilinks(content)) {
    const r = resolveLink(raw, rel, index);
    // Obsidian-accurate: only path/basename links form real graph edges
    // (alias/title links do NOT resolve in Obsidian — see ADR / piped-link fix).
    if (r && (r.kind === "path" || r.kind === "basename") && r.file.startsWith("_sources/")) {
      inbound.set(r.file, (inbound.get(r.file) ?? 0) + 1);
    }
  }
}

const STRIP_HEADINGS = ["Entities Mentioned", "Concepts Covered", "Grounded Pages"];

/**
 * Drop every `## Section` whose heading is in STRIP_HEADINGS. Splits the body on
 * H2 boundaries (a section runs from its `## ` line up to the next `## ` line,
 * including any `###` children), keeps the preamble, and rejoins.
 */
function stripSections(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];
  let dropping = false;
  for (const line of lines) {
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      dropping = STRIP_HEADINGS.includes((h2[1] ?? "").trim());
    }
    if (!dropping) out.push(line);
  }
  return out.join("\n");
}

let changed = 0;
let skippedUncited = 0;
const samples: string[] = [];

for (const rel of index.files) {
  if (!rel.startsWith("_sources/")) continue;
  if ((inbound.get(rel) ?? 0) < 1) {
    skippedUncited++;
    continue; // keep uncited sources connected via their out-links
  }
  const abs = join(wiki, rel);
  const original = readFileSync(abs, "utf8");
  // collapse 3+ blank lines left behind
  const updated = stripSections(original).replace(/\n{3,}/g, "\n\n");
  if (updated !== original) {
    changed++;
    if (samples.length < 5) samples.push(rel);
    if (write) writeFileSync(abs, updated);
  }
}

console.log(JSON.stringify({ mode: write ? "write" : "dry-run", changed, skippedUncited }, null, 2));
for (const s of samples) console.log("  stripped: " + s);
