#!/usr/bin/env bun
/**
 * disentangle-links.ts — topic-local linking remediation (ADR-0033). The Bun
 * port of the former python heredoc in disentangle-links.sh (which now shells
 * here): removes python3 as a dependency and reuses the engine's own resolver.
 *
 * Policy (unchanged): KEEP a [[link]] iff both endpoints are in the same
 * top-level topic folder, OR it touches a hidden node (index/log/_sources/
 * _synthesis/manifest), OR it is the root-entity → folder-note spine. DEMOTE a
 * cross-topic body link to its display text; PRUNE cross-topic entries from
 * `related:`-style frontmatter arrays. Dry-run by default; `--apply` rewrites in
 * place (run inside git). Exit 0 always.
 *
 * Reused from src/core: normaliseTarget + resolveLink (the ADR-0030/0031 ladder)
 * over a vault-relative index built here. The demote/prune rewriting — which is
 * specific to this remediation — is ported faithfully below.
 *
 * Usage: disentangle-links.ts --target <vault> [--apply] [--json]
 */

import { join, relative, basename } from "node:path";
import { writeFileSync } from "node:fs";
import { listMarkdownRecursive, readFileSafe } from "../src/core/fs.ts";
import { parseFrontmatter, stringList } from "../src/core/frontmatter.ts";
import { resolveLink, normaliseTarget, type LinkIndex } from "../src/core/link-resolver.ts";

const CLUSTERS = [
  "plugin",
  "wiki-pages",
  "llm",
  "obsidian",
  "engine",
  "knowledge-graph",
  "how-it-works",
];
const LINK_RE = /\[\[([^[\]]+?)\]\]/g;
// Association frontmatter fields whose cross-topic entries fuse the graph. Spine
// fields (parent/children/child_indexes) and provenance (sources) are NOT pruned.
const PRUNE_FIELDS = new Set([
  "related",
  "depends_on",
  "key_pages",
  "members",
  "scope",
  "contradicts",
  "supersedes",
]);
// The visible ROOT entity — its links to per-topic folder notes are an allowed
// cross-topic spine (ADR-0033). Override with DL_ROOT_ENTITY; "" disables.
const ROOT_ENTITY = process.env.DL_ROOT_ENTITY ?? "wiki/plugin/claude-wiki-pages-plugin.md";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

/** Text Obsidian shows: the piped alias, else the bare target minus anchor. */
function linkDisplay(raw: string): string {
  if (raw.includes("|")) return raw.split("|").slice(1).join("|").trim();
  return raw.split("#")[0]!.split("^")[0]!.trim();
}

interface FrontmatterSplit {
  fm: string | null;
  body: string;
  block: string;
}

function splitFrontmatter(text: string): FrontmatterSplit {
  if (!text.startsWith("---")) return { fm: null, body: text, block: "" };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { fm: null, body: text, block: "" };
  return { fm: text.slice(3, end), body: text.slice(end + 4), block: text.slice(0, end + 4) };
}

function topFolder(vrel: string): string {
  const parts = vrel.split("/"); // wiki/<top>/...
  return parts.length > 2 ? parts[1]! : "";
}

function isFolderNote(vrel: string): boolean {
  const parts = vrel.split("/"); // wiki/<cluster>/<cluster>.md
  return parts.length === 3 && CLUSTERS.includes(parts[1]!) && parts[2] === parts[1] + ".md";
}

function isHidden(vrel: string): boolean {
  if (vrel.startsWith("wiki/_sources/") || vrel.startsWith("wiki/_synthesis/")) return true;
  return (
    vrel === "wiki/index.md" ||
    vrel === "wiki/log.md" ||
    vrel === "wiki/manifest.md" ||
    vrel === "wiki/_sources/manifest.md"
  );
}

function clusterOf(rel: string): string {
  const parts = rel.split("/");
  const stem = parts[parts.length - 1]!.slice(0, -3);
  const top = parts.length > 1 ? parts[0]! : "";
  if (
    top === "_sources" ||
    top === "_synthesis" ||
    (parts.length === 1 && (stem === "index" || stem === "log" || stem === "manifest"))
  ) {
    return "special";
  }
  return CLUSTERS.includes(top) ? top : "other";
}

// ── build the vault-relative resolution index (reuses resolveLink) ───────────
const target = arg("--target");
if (target === undefined) {
  console.error("usage: disentangle-links.ts --target <vault> [--apply] [--json]");
  process.exit(2);
}
const apply = process.argv.includes("--apply");
const asJson = process.argv.includes("--json");
const vault = target;
const wiki = join(vault, "wiki");

interface Page {
  full: string;
  rel: string;
  vrel: string;
  text: string;
  cluster: string;
}

const byPath = new Map<string, string>();
const byBase = new Map<string, string[]>();
const byAlias = new Map<string, string[]>();
const byTitle = new Map<string, string[]>();
const pushName = (m: Map<string, string[]>, k: string, v: string): void => {
  const cur = m.get(k);
  if (cur === undefined) m.set(k, [v]);
  else cur.push(v);
};

const pages: Page[] = [];
for (const full of listMarkdownRecursive(wiki)) {
  const rel = relative(wiki, full).split(/[\\/]/).join("/");
  const stem = basename(full, ".md");
  const text = readFileSafe(full) ?? "";
  const fm = parseFrontmatter(text);
  const vrel = "wiki/" + rel;
  const pk = vrel.toLowerCase();
  if (!byPath.has(pk)) byPath.set(pk, vrel);
  const noExt = pk.endsWith(".md") ? pk.slice(0, -3) : pk;
  if (!byPath.has(noExt)) byPath.set(noExt, vrel);
  pushName(byBase, stem.trim().toLowerCase(), vrel);
  const title = typeof fm["title"] === "string" ? fm["title"].trim() : "";
  if (title) pushName(byTitle, title.toLowerCase(), vrel);
  for (const a of stringList(fm["aliases"])) {
    const na = a.trim().toLowerCase();
    if (na) pushName(byAlias, na, vrel);
  }
  pages.push({ full, rel, vrel, text, cluster: clusterOf(rel) });
}
const freeze = (m: Map<string, string[]>): Map<string, readonly string[]> => {
  const out = new Map<string, readonly string[]>();
  for (const [k, v] of m) out.set(k, [...new Set(v)].sort());
  return out;
};
const index: LinkIndex = {
  byPath,
  byBasename: freeze(byBase),
  byAlias: freeze(byAlias),
  byTitle: freeze(byTitle),
  files: pages.map((p) => p.vrel).sort(),
};

function resolve(raw: string, src: string): string | null {
  if (normaliseTarget(raw) === "") return null;
  return resolveLink(raw, src, index)?.file ?? null;
}

/** True = keep the [[wikilink]]; False = demote/prune. */
function keepLink(srcVrel: string, raw: string): boolean {
  const tgt = resolve(raw, srcVrel);
  if (tgt === null) return true; // dangling: leave untouched
  if (isHidden(srcVrel) || isHidden(tgt)) return true; // touches a filtered node
  if (topFolder(srcVrel) === topFolder(tgt)) return true; // intra-topic
  if (srcVrel === ROOT_ENTITY && isFolderNote(tgt)) return true; // root spine
  return false; // cross-topic between two visible topic pages → cut
}

// ── body demotion (fence- and inline-span-aware) ─────────────────────────────
function* splitCodeSpans(text: string): Generator<[string, boolean]> {
  for (const p of text.split(/(`+[^`]*`+)/)) {
    if (!p) continue;
    yield [p, /^`+/.test(p)];
  }
}

function demoteInBody(body: string, srcVrel: string): [string, number] {
  const out: string[] = [];
  let inFence = false;
  let marker = "";
  let demoted = 0;
  for (const line of body.split("\n")) {
    const s = line.replace(/^\s+/, "");
    if (!inFence && (s.startsWith("```") || s.startsWith("~~~"))) {
      inFence = true;
      marker = s.slice(0, 3);
      out.push(line);
      continue;
    }
    if (inFence) {
      if (s.startsWith(marker)) {
        inFence = false;
        marker = "";
      }
      out.push(line);
      continue;
    }
    const res: string[] = [];
    for (const [seg, isCode] of splitCodeSpans(line)) {
      if (isCode) {
        res.push(seg);
        continue;
      }
      res.push(
        seg.replace(LINK_RE, (full: string, raw: string) => {
          if (keepLink(srcVrel, raw)) return full;
          demoted += 1;
          return linkDisplay(raw);
        }),
      );
    }
    out.push(res.join(""));
  }
  return [out.join("\n"), demoted];
}

// ── frontmatter array pruning ────────────────────────────────────────────────
function pruneFields(fmRaw: string, srcVrel: string): [string, number] {
  let pruned = 0;
  const lines = fmRaw.split("\n");
  for (let idx = 0; idx < lines.length; idx++) {
    const m = /^(\s*([a-z_]+):\s*)(\[.*\])\s*$/.exec(lines[idx]!);
    if (!m) continue;
    if (!PRUNE_FIELDS.has(m[2]!)) continue;
    const prefix = m[1]!;
    const arr = m[3]!;
    const items = [...arr.matchAll(/"([^"]*)"/g)].map((x) => x[1]!);
    const kept: string[] = [];
    for (const it of items) {
      const lm = new RegExp(LINK_RE.source).exec(it);
      if (lm && !keepLink(srcVrel, lm[1]!)) {
        pruned += 1;
        continue;
      }
      kept.push(it);
    }
    lines[idx] = prefix + "[" + kept.map((k) => `"${k}"`).join(", ") + "]";
  }
  return [lines.join("\n"), pruned];
}

// ── rewrite pass ─────────────────────────────────────────────────────────────
interface ReportRow {
  file: string;
  cluster: string;
  demoted: number;
  relatedPruned: number;
}
const report: ReportRow[] = [];
let totalDemoted = 0;
let totalPruned = 0;
for (const p of pages) {
  if (isHidden(p.vrel)) continue; // hidden nodes keep every link — skip
  const { fm, body, block } = splitFrontmatter(p.text);
  let newBlock = block;
  let pruned = 0;
  if (fm !== null) {
    const [newInner, n] = pruneFields(fm, p.vrel);
    pruned = n;
    if (pruned) newBlock = "---" + newInner + "\n---";
  }
  const [newBody, demoted] = demoteInBody(body, p.vrel);
  if (pruned || demoted) {
    const newText = fm !== null ? newBlock + newBody : newBody;
    report.push({ file: p.rel, cluster: p.cluster, demoted, relatedPruned: pruned });
    totalDemoted += demoted;
    totalPruned += pruned;
    if (apply && newText !== p.text) writeFileSync(p.full, newText);
  }
}

const result = {
  vault,
  applied: apply,
  filesChanged: report.length,
  bodyLinksDemoted: totalDemoted,
  relatedEntriesPruned: totalPruned,
  files: [...report].sort((a, b) => b.demoted + b.relatedPruned - (a.demoted + a.relatedPruned)),
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const mode = apply ? "APPLIED" : "DRY RUN (no files written; pass --apply)";
  console.log(`disentangle-links [${mode}]  vault: ${vault}`);
  console.log(
    `files changed: ${result.filesChanged}  body links demoted: ${totalDemoted}  related entries pruned: ${totalPruned}`,
  );
  for (const r of result.files.slice(0, 30)) {
    const d = String(r.demoted).padStart(3, " ");
    const pr = String(r.relatedPruned).padStart(2, " ");
    console.log(`  ${d}d ${pr}p  [${r.cluster}]  ${r.file}`);
  }
  if (result.files.length > 30) console.log(`  … and ${result.files.length - 30} more`);
}
