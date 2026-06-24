#!/usr/bin/env bun
/**
 * graph-quality.ts — deterministic dangling-wikilink scanner + topic-cluster
 * metric + connectivity report. The Bun port of the former python heredoc in
 * graph-quality.sh (which now shells here): removes python3 as a dependency and
 * reuses the engine's own Obsidian-accurate resolver instead of re-implementing
 * it in a second language.
 *
 * Reused from src/core (no second implementation):
 *   - stripCode          — the gate-05 code-fence/inline-span stripper (twin of
 *                          verify-ingest.sh strip_code).
 *   - normaliseTarget    — `[[a|b#c^d]]` → resolution key.
 *   - buildLinkIndex / resolveLink / resolvableNames — the ADR-0030/0031 ladder.
 *
 * The dangling scan and cluster metric run against the wiki-relative index from
 * buildLinkIndex(wiki). The connectivity scan keeps the original script's
 * VAULT-relative node universe (so it can mark links INTO output/ and _inbox/ as
 * shadows, not edges) — it builds a small combined index over wiki + scratch and
 * still resolves through the shared resolveLink, so the ladder is not duplicated.
 *
 * Read-only; never writes to the vault. Exit 0 always — callers gate on the
 * JSON/text output.
 *
 * Usage: graph-quality.ts --target <vault> [--json]
 */

import { join, relative, basename } from "node:path";
import { listMarkdownRecursive, readFileSafe } from "../src/core/fs.ts";
import { deriveTopics } from "../src/core/topics.ts";
import { parseFrontmatter, stringList } from "../src/core/frontmatter.ts";
import { stripCode } from "../src/core/wikilink-check.ts";
import { computeTreeMetric } from "../src/core/tree-metric.ts";
import {
  buildLinkIndex,
  resolveLink,
  resolvableNames,
  normaliseTarget,
  type LinkIndex,
} from "../src/core/link-resolver.ts";

const SCRATCH_DIRS = ["output", "_inbox"];
const LINK_RE = /\[\[([^[\]]+?)\]\]/g;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

/** Strip `|display`/`#heading`/`^block` + escaped-pipe `\`, PRESERVE case (report key). */
function linkTarget(raw: string): string {
  const t = raw.split("|")[0]!.split("#")[0]!.split("^")[0]!.trim();
  return t.endsWith("\\") ? t.slice(0, -1) : t;
}

/** All `[[target]]` strings in a page, code-stripped, cleaned, case-preserved. */
function pageLinks(text: string): string[] {
  const stripped = stripCode(text);
  const out: string[] = [];
  let m: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(stripped)) !== null) out.push(linkTarget(m[1] ?? ""));
  return out;
}

function relPosix(from: string, to: string): string {
  return relative(from, to).split(/[\\/]/).join("/");
}

interface Page {
  rel: string; // wiki-relative, posix
  stem: string;
  links: string[];
  cluster: string;
  isHub: boolean;
  isSpecial: boolean;
}

const target = arg("--target");
if (target === undefined) {
  console.error("usage: graph-quality.ts --target <vault> [--json]");
  process.exit(2);
}
const asJson = process.argv.includes("--json");
const vault = target;
const wiki = join(vault, "wiki");

// Topic clusters derived from this vault's own top-level wiki/ folders (the
// one shared derivation, so disentangle-links/heal-orphan-sources never drift).
const CLUSTERS = deriveTopics(wiki);

// ── gather wiki pages + the wiki-relative resolution index ───────────────────
const index = buildLinkIndex(wiki);
const resolvable = resolvableNames(index);

const pages: Page[] = [];
for (const abs of listMarkdownRecursive(wiki)) {
  const rel = relPosix(wiki, abs);
  const parts = rel.split("/");
  const stem = basename(abs, ".md");
  const text = readFileSafe(abs) ?? "";
  const top = parts.length > 1 ? parts[0]! : "";
  const isSpecial =
    top === "_sources" ||
    top === "_synthesis" ||
    (parts.length === 1 && (stem === "index" || stem === "log" || stem === "manifest"));
  pages.push({
    rel,
    stem,
    links: pageLinks(text),
    cluster: CLUSTERS.includes(top) ? top : "other",
    isHub: parts.length === 2 && parts[1] === top + ".md" && CLUSTERS.includes(top),
    isSpecial,
  });
}

// ── dangling scan ────────────────────────────────────────────────────────────
const danglingMap = new Map<string, Set<string>>();
for (const p of pages) {
  for (const raw of p.links) {
    if (raw && !resolvable.has(normaliseTarget(raw))) {
      (danglingMap.get(raw) ?? danglingMap.set(raw, new Set()).get(raw)!).add(p.rel);
    }
  }
}
const danglingList = [...danglingMap.entries()]
  .map(([t, fs]) => ({ target: t, refs: fs.size, files: [...fs].sort() }))
  .sort((a, b) => b.refs - a.refs || a.target.toLowerCase().localeCompare(b.target.toLowerCase()));
const danglingRefs = danglingList.reduce((n, d) => n + d.refs, 0);

// ── cluster metric ───────────────────────────────────────────────────────────
const topicPages = pages.filter((p) => !p.isSpecial);
const inClusters = topicPages.filter((p) => CLUSTERS.includes(p.cluster));
const Cn = topicPages.length ? inClusters.length / topicPages.length : 0;

const clusterCounts: Record<string, number> = {};
for (const c of [...CLUSTERS, "other"]) clusterCounts[c] = 0;
for (const p of topicPages) clusterCounts[p.cluster] = (clusterCounts[p.cluster] ?? 0) + 1;

// Hub names + every resolvable name → owning cluster (for the edge metrics).
const hubNames = new Set<string>();
const name2cluster = new Map<string, string>();
for (const p of pages) {
  const owner = p.isSpecial ? "special" : p.cluster;
  const text = readFileSafe(join(wiki, p.rel)) ?? "";
  const fm = parseFrontmatter(text);
  const title = typeof fm["title"] === "string" ? fm["title"].trim() : "";
  const names = [p.stem.toLowerCase()];
  if (title) names.push(title.toLowerCase());
  for (const a of stringList(fm["aliases"])) names.push(a.trim().toLowerCase());
  for (const nm of names) {
    if (p.isHub) hubNames.add(nm);
    if (!name2cluster.has(nm)) name2cluster.set(nm, owner);
  }
}

let edgesTotal = 0;
let edgesHub = 0;
let ceTotal = 0;
let ceIn = 0;
for (const p of pages) {
  const srcInCluster = !p.isSpecial && CLUSTERS.includes(p.cluster);
  for (const raw of p.links) {
    if (!raw) continue;
    const n = normaliseTarget(raw);
    if (!resolvable.has(n)) continue; // dangling links are not edges
    edgesTotal++;
    if (p.isHub || hubNames.has(n)) edgesHub++;
    const tgtCluster = name2cluster.get(n);
    if (!p.isSpecial && tgtCluster !== undefined && tgtCluster !== "special") {
      ceTotal++;
      if (srcInCluster && CLUSTERS.includes(tgtCluster)) ceIn++;
    }
  }
}
const Ch = edgesTotal ? edgesHub / edgesTotal : 0;
const Ce = ceTotal ? ceIn / ceTotal : 0;

// ── connectivity / orphans / shadows (vault-relative universe) ───────────────
// Build a combined index over wiki nodes + scratch pages, keyed VAULT-relative
// (wiki/…, output/…, _inbox/…). resolveLink drives the same ladder; a link that
// lands in a scratch page is a shadow (counted, not a connecting edge).
const byPath = new Map<string, string>();
const byBasename = new Map<string, string[]>();
const byAlias = new Map<string, string[]>();
const byTitle = new Map<string, string[]>();
const pushName = (m: Map<string, string[]>, k: string, v: string): void => {
  const cur = m.get(k);
  if (cur === undefined) m.set(k, [v]);
  else cur.push(v);
};
function addTarget(vrel: string, stem: string, title: string, aliases: string[]): void {
  const pk = vrel.toLowerCase();
  if (!byPath.has(pk)) byPath.set(pk, vrel);
  const noExt = pk.endsWith(".md") ? pk.slice(0, -3) : pk;
  if (!byPath.has(noExt)) byPath.set(noExt, vrel);
  if (stem.trim()) pushName(byBasename, stem.trim().toLowerCase(), vrel);
  if (title) pushName(byTitle, title.toLowerCase(), vrel);
  for (const a of aliases) if (a.trim()) pushName(byAlias, a.trim().toLowerCase(), vrel);
}

const nodeIds: string[] = [];
for (const p of pages) {
  const vrel = "wiki/" + p.rel;
  nodeIds.push(vrel);
  const text = readFileSafe(join(wiki, p.rel)) ?? "";
  const fm = parseFrontmatter(text);
  const title = typeof fm["title"] === "string" ? fm["title"].trim() : "";
  addTarget(vrel, p.stem, title, stringList(fm["aliases"]));
}

const scratchIds = new Set<string>();
for (const sd of SCRATCH_DIRS) {
  const root = join(vault, sd);
  for (const abs of listMarkdownRecursive(root)) {
    const vrel = relPosix(vault, abs);
    scratchIds.add(vrel);
    const text = readFileSafe(abs) ?? "";
    const fm = parseFrontmatter(text);
    const title = typeof fm["title"] === "string" ? fm["title"].trim() : "";
    addTarget(vrel, basename(abs, ".md"), title, stringList(fm["aliases"]));
  }
}

const freeze = (m: Map<string, string[]>): Map<string, readonly string[]> => {
  const out = new Map<string, readonly string[]>();
  for (const [k, v] of m) out.set(k, [...new Set(v)].sort());
  return out;
};
const combined: LinkIndex = {
  byPath,
  byBasename: freeze(byBasename),
  byAlias: freeze(byAlias),
  byTitle: freeze(byTitle),
  files: [...nodeIds].sort(),
};

const parent = new Map<string, string>();
for (const n of nodeIds) parent.set(n, n);
const find = (x: string): string => {
  let r = x;
  while (parent.get(r) !== r) {
    parent.set(r, parent.get(parent.get(r)!)!);
    r = parent.get(r)!;
  }
  return r;
};
const union = (a: string, b: string): void => {
  const ra = find(a);
  const rb = find(b);
  if (ra !== rb) parent.set(ra, rb);
};

const nodeSet = new Set(nodeIds);
const degree = new Map<string, number>();
for (const n of nodeIds) degree.set(n, 0);
const shadows: { from: string; to: string }[] = [];
for (const p of pages) {
  const src = "wiki/" + p.rel;
  for (const raw of p.links) {
    if (!raw) continue;
    const r = resolveLink(raw, src, combined);
    const tgt = r?.file ?? null;
    if (tgt === null) continue; // dangling — no edge
    if (scratchIds.has(tgt)) {
      shadows.push({ from: src, to: tgt });
      continue; // shadow — not a connecting edge
    }
    if (tgt === src || !nodeSet.has(tgt)) continue;
    degree.set(src, degree.get(src)! + 1);
    degree.set(tgt, degree.get(tgt)! + 1);
    union(src, tgt);
  }
}

const compSizes = new Map<string, number>();
for (const n of nodeIds) {
  const r = find(n);
  compSizes.set(r, (compSizes.get(r) ?? 0) + 1);
}
const orphans = nodeIds.filter((n) => degree.get(n) === 0).sort();
const shadowsSorted = shadows.sort(
  (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to),
);
const connectivity = {
  nodes: nodeIds.length,
  components: compSizes.size,
  largestComponentSize: compSizes.size ? Math.max(...compSizes.values()) : 0,
  orphanCount: orphans.length,
  orphans,
  shadowCount: shadowsSorted.length,
  shadows: shadowsSorted,
};

// ── strict-tree metric (ADR-0036) — the one classifier in src/core ───────────
const tree = computeTreeMetric(wiki);

const round4 = (x: number): number => Math.round(x * 10000) / 10000;
const result = {
  vault,
  danglingCount: danglingList.length,
  danglingRefs,
  dangling: danglingList,
  nodes: topicPages.length,
  nodesInClusters: inClusters.length,
  Cn: round4(Cn),
  edgesTotal,
  edgesTouchingHub: edgesHub,
  Ch: round4(Ch),
  edgesBetweenTopics: ceTotal,
  edgesWithinClusters: ceIn,
  Ce: round4(Ce),
  clusters: clusterCounts,
  // ADR-0036 strict-tree conformance: spine-only edges among visible topic pages.
  spineEdgeCount: tree.spineEdgeCount,
  nonSpineEdgeCount: tree.nonSpineEdgeCount,
  crossTreeEdgeCount: tree.crossTreeEdgeCount,
  transitiveRedundantEdgeCount: tree.transitiveRedundantEdgeCount,
  cycleCount: tree.cycleCount,
  multiParentCount: tree.multiParentCount,
  maxSaturation: tree.maxSaturation,
  treeConformance: round4(tree.treeConformance),
  connectivity,
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const plural = (n: number): string => (n !== 1 ? "s" : "");
  console.log(`vault: ${vault}`);
  console.log(`dangling targets: ${result.danglingCount}  (refs: ${result.danglingRefs})`);
  for (const d of danglingList.slice(0, 25)) {
    console.log(`  - ${d.target}  (${d.refs} ref${plural(d.refs)})`);
  }
  if (danglingList.length > 25) console.log(`  … and ${danglingList.length - 25} more`);
  console.log(`nodes: ${result.nodes}  in-clusters: ${result.nodesInClusters}  Cn=${result.Cn}`);
  console.log(
    `edges: ${result.edgesTotal}  within-clusters: ${result.edgesWithinClusters}/${result.edgesBetweenTopics}  Ce=${result.Ce}  touching-hub: ${result.edgesTouchingHub}  Ch=${result.Ch}`,
  );
  console.log(
    "cluster sizes: " +
      [...CLUSTERS, "other"].map((c) => `${c}=${clusterCounts[c] ?? 0}`).join(", "),
  );
  console.log(
    `strict-tree: conformance=${result.treeConformance}  spine=${result.spineEdgeCount}  non-spine=${result.nonSpineEdgeCount}  cross-tree=${result.crossTreeEdgeCount}  transitive-redundant=${result.transitiveRedundantEdgeCount}  cycles=${result.cycleCount}  multi-parent=${result.multiParentCount}  max-saturation=${result.maxSaturation}`,
  );
  const cc = result.connectivity;
  console.log(
    `connectivity: nodes=${cc.nodes}  components=${cc.components}  orphans=${cc.orphanCount}  shadows=${cc.shadowCount}  largest=${cc.largestComponentSize}`,
  );
  if (cc.orphanCount) {
    for (const o of cc.orphans.slice(0, 25)) console.log(`  orphan: ${o}`);
    if (cc.orphanCount > 25) console.log(`  … and ${cc.orphanCount - 25} more orphans`);
  }
  if (cc.shadowCount) {
    for (const s of cc.shadows.slice(0, 25)) console.log(`  shadow: ${s.from} -> ${s.to}`);
  }
}
