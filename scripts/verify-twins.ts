#!/usr/bin/env bun
/**
 * verify-twins.ts — the structural checks verify-ingest.sh runs that need a real
 * parser. The Bun port of the five inline python heredocs the script used to
 * embed; verify-ingest.sh now shells here once per check.
 *
 * INDEPENDENCE IS THE POINT. verify-ingest.sh is the bash twin of the engine's
 * `verify` command, and gate-05 pins the two to agree on the reference vault. If
 * this file imported the engine's own primitives (src/core/*), that parity check
 * would become engine-vs-engine — a tautology. So this file is deliberately
 * SELF-CONTAINED: it re-implements frontmatter parsing, code-stripping, and the
 * Obsidian resolution ladder from scratch (only node:fs / node:path), exactly as
 * the python twins did. Keep it that way — do not import from src/core.
 *
 * Subcommands (each reads VERIFY_WIKI from the environment, like the heredocs):
 *   moc-reachability   FILE\nTITLE pairs   — pages unreachable from index.md
 *   index-consistency  WARN\tmsg / ERR\tmsg — folder-note children drift
 *   orphan-sources     TITLE\tBASENAME     — _sources/ pages cited by nobody
 *   dangling           FILE\nTARGET pairs  — links resolving to no page
 *   collision          one line per name   — basename∪alias claimed by >1 page
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, basename } from "node:path";

const WIKI = process.env["VERIFY_WIKI"] ?? "";
const out = (s: string): void => {
  process.stdout.write(s + "\n");
};

// ── python-faithful string + parsing primitives ─────────────────────────────

const norm = (s: string): string => s.trim().toLowerCase();

/** Strip every leading/trailing char in `chars` (python str.strip(chars)). */
function pyStrip(s: string, chars: string): string {
  let a = 0;
  let b = s.length;
  while (a < b && chars.includes(s[a]!)) a++;
  while (b > a && chars.includes(s[b - 1]!)) b--;
  return s.slice(a, b);
}

/** Like python str.splitlines(): split on newline styles, no trailing empty. */
function splitLines(s: string): string[] {
  const parts = s.split(/\r\n|\r|\n/);
  if (parts.length && parts[parts.length - 1] === "") parts.pop();
  return parts;
}

/** python split_frontmatter: returns [fm, body]; ["", text] when none. */
function splitFrontmatter(text: string): [string, string] {
  if (!text.startsWith("---")) return ["", text];
  const end = text.indexOf("\n---", 3);
  if (end === -1) return ["", text];
  return [text.slice(3, end), text.slice(end + 4)];
}

/** Drop fenced blocks (``` / ~~~) and inline `code` spans before link scanning. */
function stripCode(text: string): string {
  const res: string[] = [];
  let inFence = false;
  let marker = "";
  for (const line of splitLines(text)) {
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
    res.push(line.replace(/`[^`]*`/g, ""));
  }
  return res.join("\n");
}

/**
 * Strip `[[`/`]]` then `|display`/`#heading`/`^block`; return normalised. A
 * table-cell wikilink escapes its pipe as `\|`; drop the trailing `\` left after
 * the pipe cut so `[[entity-name\|Entity Name]]` resolves to `entity-name`, not
 * the ghost `entity-name\`. Mirrors normaliseTarget in src/core/link-resolver.ts.
 */
function linkTarget(raw: string): string {
  let t = raw.replace(/^\[\[/, "").replace(/\]\]$/, "");
  for (const sep of ["|", "#", "^"]) {
    const idx = t.indexOf(sep);
    if (idx !== -1) t = t.slice(0, idx);
  }
  if (t.endsWith("\\")) t = t.slice(0, -1);
  return norm(t);
}

/** normalise_target (dangling block): strip |/#/^ + escaped-pipe `\`, trim+lower. */
function normaliseTarget(raw: string): string {
  let t = raw;
  for (const sep of ["|", "#", "^"]) {
    const idx = t.indexOf(sep);
    if (idx !== -1) t = t.slice(0, idx);
  }
  if (t.endsWith("\\")) t = t.slice(0, -1);
  return t.trim().toLowerCase();
}

/** python parse_list(rest, lines, j): inline-flow or block (dash) YAML list. */
function parseList(rest: string, lines: string[], j: number): [string[], number] {
  const vals: string[] = [];
  rest = rest.trim();
  if (rest.startsWith("[")) {
    const items = [...rest.matchAll(/"([^"]*)"|'([^']*)'/g)];
    if (items.length) {
      for (const it of items) {
        const v = it[1] ?? it[2] ?? "";
        if (v) vals.push(v);
      }
    } else {
      for (const raw of pyStrip(rest, "[]").split(",")) {
        const piece = pyStrip(pyStrip(raw.trim(), '"'), "'");
        if (piece) vals.push(piece);
      }
    }
    return [vals, j];
  }
  let k = j + 1;
  while (k < lines.length) {
    const bm = /^\s*-\s*(.+?)\s*$/.exec(lines[k]!);
    if (bm) {
      vals.push(pyStrip(pyStrip(bm[1]!.trim(), '"'), "'"));
      k++;
    } else break;
  }
  return [vals, k - 1];
}

const titleStrip = (v: string): string => pyStrip(pyStrip(v.trim(), '"'), "'");

interface FmFields {
  title: string | null;
  aliases: string[];
  children: string[];
  childIndexes: string[];
  isIndex: boolean;
}

/** Unified frontmatter list parser covering every twin's needs. */
function parseFm(fm: string): FmFields {
  const f: FmFields = { title: null, aliases: [], children: [], childIndexes: [], isIndex: false };
  if (fm) f.isIndex = /^type:\s*["']?index["']?\s*$/m.test(fm);
  const lines = splitLines(fm);
  let i = 0;
  const buckets: [string, string[]][] = [
    ["aliases", f.aliases],
    ["children", f.children],
    ["child_indexes", f.childIndexes],
  ];
  while (i < lines.length) {
    const line = lines[i]!;
    const tm = /^title:\s*(.+?)\s*$/.exec(line);
    if (tm) f.title = titleStrip(tm[1]!);
    for (const [field, bucket] of buckets) {
      const m = new RegExp("^" + field + ":\\s*(.*)$").exec(line);
      if (m) {
        const [vals, ni] = parseList(m[1]!, lines, i);
        i = ni;
        bucket.push(...vals);
      }
    }
    i++;
  }
  return f;
}

// ── file walk + resolution index ─────────────────────────────────────────────

interface MdFile {
  full: string;
  rel: string;
  stem: string;
}

const relPosix = (from: string, to: string): string => relative(from, to).split(/[\\/]/).join("/");

/** os.walk-equivalent: every *.md under wiki, files sorted within each dir. */
function collect(wiki: string): MdFile[] {
  const acc: MdFile[] = [];
  const walk = (d: string): void => {
    let names: string[];
    try {
      names = readdirSync(d).sort();
    } catch {
      return;
    }
    const dirs: string[] = [];
    const files: string[] = [];
    for (const name of names) {
      const full = join(d, name);
      try {
        const st = statSync(full);
        if (st.isDirectory()) dirs.push(name);
        else if (st.isFile() && name.endsWith(".md")) files.push(name);
      } catch {
        continue;
      }
    }
    for (const fn of files) {
      const full = join(d, fn);
      acc.push({ full, rel: relPosix(wiki, full), stem: fn.slice(0, -3) });
    }
    for (const sub of dirs) walk(join(d, sub));
  };
  walk(wiki);
  return acc;
}

const readText = (p: string): string => {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
};

interface ResolveIndex {
  byPath: Map<string, string>;
  byBasename: Map<string, string[]>;
  byAlias: Map<string, string[]>;
  byTitle: Map<string, string[]>;
}

function freezeSort(idx: ResolveIndex): void {
  for (const m of [idx.byBasename, idx.byAlias, idx.byTitle]) {
    for (const k of [...m.keys()]) m.set(k, [...new Set(m.get(k)!)].sort());
  }
}

function addPath(idx: ResolveIndex, rel: string): void {
  const pk = norm(rel);
  if (!idx.byPath.has(pk)) idx.byPath.set(pk, rel);
  const noExt = pk.endsWith(".md") ? pk.slice(0, -3) : pk;
  if (!idx.byPath.has(noExt)) idx.byPath.set(noExt, rel);
}

const pushList = (m: Map<string, string[]>, k: string, v: string): void => {
  const cur = m.get(k);
  if (cur === undefined) m.set(k, [v]);
  else cur.push(v);
};

function tiebreak(cands: readonly string[], src: string): string {
  const srcdir = src.includes("/") ? src.slice(0, src.lastIndexOf("/")) : "";
  return [...cands].sort((a, b) => {
    const segA = (a.match(/\//g) ?? []).length;
    const segB = (b.match(/\//g) ?? []).length;
    if (segA !== segB) return segA - segB;
    const da = a.includes("/") ? a.slice(0, a.lastIndexOf("/")) : "";
    const db = b.includes("/") ? b.slice(0, b.lastIndexOf("/")) : "";
    const sa = da === srcdir ? 0 : 1;
    const sb = db === srcdir ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return a < b ? -1 : a > b ? 1 : 0;
  })[0]!;
}

function resolve(idx: ResolveIndex, raw: string, src: string): string | null {
  const nt = linkTarget(raw);
  if (!nt) return null;
  if (idx.byPath.has(nt)) return idx.byPath.get(nt)!;
  for (const m of [idx.byBasename, idx.byAlias, idx.byTitle]) {
    const c = m.get(nt);
    if (c && c.length) return tiebreak(c, src);
  }
  return null;
}

const LINK_RE = /\[\[([^[\]]+?)\]\]/g;
const findLinks = (text: string): string[] => [...text.matchAll(LINK_RE)].map((m) => m[1]!);

// ── CHECK: moc-reachability (twin of index-check.ts reachableFromMoc) ────────
function mocReachability(): void {
  const BOOKKEEPING = new Set(["index", "log", "dashboard", "manifest", "_index", ".gitkeep"]);
  const idx: ResolveIndex = {
    byPath: new Map(),
    byBasename: new Map(),
    byAlias: new Map(),
    byTitle: new Map(),
  };
  const fmByRel = new Map<
    string,
    { title: string | null; children: string[]; childIndexes: string[] }
  >();
  const allPages: string[] = [];
  const files = collect(WIKI);
  for (const { full, rel, stem } of files) {
    allPages.push(rel);
    addPath(idx, rel);
    pushList(idx.byBasename, norm(stem), rel);
    const [fm] = splitFrontmatter(readText(full));
    const f = parseFm(fm);
    fmByRel.set(rel, { title: f.title, children: f.children, childIndexes: f.childIndexes });
    if (f.title) pushList(idx.byTitle, norm(f.title), rel);
    for (const a of f.aliases) if (norm(a)) pushList(idx.byAlias, norm(a), rel);
  }
  freezeSort(idx);

  const covered = new Set<string>();
  const visited = new Set<string>();
  const visit = (rel: string): void => {
    if (visited.has(rel)) return;
    visited.add(rel);
    covered.add(rel);
    const meta = fmByRel.get(rel) ?? { title: null, children: [], childIndexes: [] };
    for (const c of meta.children) {
      const r = resolve(idx, c, rel);
      if (r !== null) covered.add(r);
    }
    for (const ci of meta.childIndexes) {
      const r = resolve(idx, ci, rel);
      if (r !== null) visit(r);
    }
  };
  if (fmByRel.has("index.md")) visit("index.md");

  const isFolderNote = (rel: string): boolean => {
    const parts = rel.split("/");
    const stem = parts[parts.length - 1]!.slice(0, -3);
    const parent = parts.length >= 2 ? parts[parts.length - 2]! : "";
    if (stem !== parent) return false;
    return /^type:\s*["']?index["']?\s*$/m.test(readText(join(WIKI, rel)));
  };

  for (const rel of [...allPages].sort()) {
    const stem = rel.split("/").pop()!.slice(0, -3);
    if (BOOKKEEPING.has(stem)) continue;
    if (isFolderNote(rel)) continue;
    if (rel.startsWith("_sources/") || rel.startsWith("_synthesis/")) continue;
    if (!covered.has(rel)) {
      const title = fmByRel.get(rel)?.title || stem;
      out(join(WIKI, rel));
      out(title);
    }
  }
}

// ── CHECK: index-consistency (twin of moc.ts checkIndexConsistency) ──────────
function indexConsistency(): void {
  const idx: ResolveIndex = {
    byPath: new Map(),
    byBasename: new Map(),
    byAlias: new Map(),
    byTitle: new Map(),
  };
  const pages = new Map<string, FmFields>();
  for (const { full, rel, stem } of collect(WIKI)) {
    addPath(idx, rel);
    pushList(idx.byBasename, norm(stem), rel);
    const [fm] = splitFrontmatter(readText(full));
    const f = parseFm(fm);
    pages.set(rel, f);
    if (f.title) pushList(idx.byTitle, norm(f.title), rel);
    for (const a of f.aliases) if (norm(a)) pushList(idx.byAlias, norm(a), rel);
  }
  freezeSort(idx);

  const isFolderNote = (rel: string): boolean => {
    const parts = rel.split("/");
    const stem = parts[parts.length - 1]!.slice(0, -3);
    const parent = parts.length >= 2 ? parts[parts.length - 2]! : "";
    return stem === parent && (pages.get(rel)?.isIndex ?? false);
  };
  const titleOf = (rel: string): string => {
    const t = pages.get(rel)?.title;
    return t ? t : rel.split("/").pop()!.slice(0, -3);
  };

  const sortedRels = [...pages.keys()].sort();
  const indexFiles = sortedRels.filter(
    (rel) => rel.split("/").pop() === "_index.md" || isFolderNote(rel),
  );

  const wikiBase = basename(WIKI.replace(/\/+$/, ""));
  for (const indexRel of indexFiles) {
    const folder = indexRel.includes("/") ? indexRel.slice(0, indexRel.lastIndexOf("/")) : "";
    const folderName = folder ? folder.split("/").pop()! : wikiBase;
    const indexName = indexRel.split("/").pop()!;
    const children = pages.get(indexRel)!.children;

    const actual: string[] = [];
    for (const rel of sortedRels) {
      const d = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
      if (d !== folder) continue;
      if (rel.split("/").pop() === "_index.md" || isFolderNote(rel)) continue;
      actual.push(rel);
    }

    const childResolved = new Map<string, string | null>();
    for (const c of children) childResolved.set(c, resolve(idx, c, indexRel));
    const resolvedFiles = new Set(
      [...childResolved.values()].filter((r): r is string => r !== null),
    );

    for (const rel of actual) {
      if (children.length) {
        if (!resolvedFiles.has(rel)) {
          out(
            `WARN\tPage "${titleOf(rel)}" in ${folderName}/ but not in ${folderName}/${indexName} children`,
          );
        }
      } else {
        out(
          `WARN\tPage "${titleOf(rel)}" in ${folderName}/ but ${indexName} has empty children list`,
        );
      }
    }
    for (const c of children) {
      if (childResolved.get(c) === null) {
        if (actual.length)
          out(`ERR\tIndex lists "${c}" but no matching page found in ${folderName}/`);
        else out(`ERR\tIndex lists "${c}" but folder ${folderName}/ has no pages`);
      }
    }
  }
}

// ── CHECK: orphan-sources (twin of moc.ts checkOrphanSources) ────────────────
function orphanSources(): void {
  const idx: ResolveIndex = {
    byPath: new Map(),
    byBasename: new Map(),
    byAlias: new Map(),
    byTitle: new Map(),
  };
  const allPages: string[] = [];
  const titles = new Map<string, string>();
  for (const { full, rel, stem } of collect(WIKI)) {
    allPages.push(rel);
    addPath(idx, rel);
    pushList(idx.byBasename, norm(stem), rel);
    const [fm] = splitFrontmatter(readText(full));
    const f = parseFm(fm);
    titles.set(rel, f.title ? f.title : stem);
    if (f.title) pushList(idx.byTitle, norm(f.title), rel);
    for (const a of f.aliases) if (norm(a)) pushList(idx.byAlias, norm(a), rel);
  }
  freezeSort(idx);

  const referenced = new Set<string>();
  for (const rel of allPages) {
    if (rel.startsWith("_sources/") || rel === "index.md" || rel === "log.md") continue;
    const text = readText(join(WIKI, rel));
    for (const raw of findLinks(stripCode(text))) {
      const r = resolve(idx, raw, rel);
      if (r !== null) referenced.add(r);
    }
  }

  for (const rel of [...allPages].sort()) {
    const parts = rel.split("/");
    if (parts[0] !== "_sources" || parts[parts.length - 1] === ".gitkeep") continue;
    const [fm] = splitFrontmatter(readText(join(WIKI, rel)));
    if (/^type:\s*manifest\s*$/m.test(fm)) continue;
    if (!referenced.has(rel)) out(`${titles.get(rel)}\t${parts[parts.length - 1]}`);
  }
}

// ── CHECK: dangling (twin of wikilink-check.ts checkDanglingWikilinks) ───────
function dangling(): void {
  const BOOKKEEPING = new Set(["index", "log", "dashboard", "manifest", "_index", ".gitkeep"]);
  const files = collect(WIKI);

  const resolvable = new Set<string>();
  for (const { full, rel, stem } of files) {
    resolvable.add(norm(rel));
    resolvable.add(norm(rel.endsWith(".md") ? rel.slice(0, -3) : rel));
    resolvable.add(norm(stem));
    const [fm] = splitFrontmatter(readText(full));
    const f = parseFm(fm);
    if (f.title) resolvable.add(norm(f.title));
    for (const a of f.aliases) resolvable.add(norm(a));
  }

  const isFolderNote = (full: string, stem: string, parent: string): boolean => {
    if (stem !== parent) return false;
    return /^type:\s*["']?index["']?\s*$/m.test(readText(full));
  };

  for (const { full, rel, stem } of files) {
    if (BOOKKEEPING.has(stem)) continue;
    const parent = basename(join(full, ".."));
    if (isFolderNote(full, stem, parent)) continue;
    const text = readText(full);
    const seen = new Set<string>();
    for (const raw of findLinks(stripCode(text))) {
      const nt = normaliseTarget(raw);
      if (!nt || seen.has(nt)) continue;
      seen.add(nt);
      if (!resolvable.has(nt)) {
        let display = raw;
        for (const sep of ["|", "#", "^"]) {
          const i = display.indexOf(sep);
          if (i !== -1) display = display.slice(0, i);
        }
        out(rel);
        out(display.trim());
      }
    }
  }
}

// ── CHECK: collision (twin of collision-check.ts) ────────────────────────────
function collision(): void {
  const basenameFiles = new Map<string, Set<string>>();
  const aliasFiles = new Map<string, Set<string>>();
  const claims = new Map<string, Set<string>>();
  const add = (m: Map<string, Set<string>>, k: string, v: string): void => {
    const s = m.get(k);
    if (s === undefined) m.set(k, new Set([v]));
    else s.add(v);
  };

  for (const { full, rel, stem } of collect(WIKI)) {
    const nb = norm(stem);
    add(basenameFiles, nb, rel);
    add(claims, nb, rel);
    const [fm] = splitFrontmatter(readText(full));
    for (const a of parseFm(fm).aliases) {
      const na = norm(a);
      if (na) {
        add(aliasFiles, na, rel);
        add(claims, na, rel);
      }
    }
  }

  const tb = (cands: Iterable<string>): string =>
    [...cands].sort((a, b) => {
      const sa = (a.match(/\//g) ?? []).length;
      const sb = (b.match(/\//g) ?? []).length;
      if (sa !== sb) return sa - sb;
      return a < b ? -1 : a > b ? 1 : 0;
    })[0]!;

  for (const name of [...claims.keys()].sort()) {
    const fileset = claims.get(name)!;
    if (fileset.size < 2) continue;
    let winner: string;
    let kind: string;
    if (basenameFiles.get(name)?.size) {
      winner = tb(basenameFiles.get(name)!);
      kind = "basename";
    } else if (aliasFiles.get(name)?.size) {
      winner = tb(aliasFiles.get(name)!);
      kind = "alias";
    } else {
      winner = [...fileset].sort()[0]!;
      kind = "basename";
    }
    const losers = [...fileset]
      .filter((f) => f !== winner)
      .sort()
      .join(", ");
    out(
      `wikilink-collision: [[${name}]] resolves to ${fileset.size} pages — ` +
        `Obsidian opens ${winner} (${kind}), shadowing ${losers}; rename or disambiguate`,
    );
  }
}

// ── dispatch ──────────────────────────────────────────────────────────────────
const check = process.argv[2];
switch (check) {
  case "moc-reachability":
    mocReachability();
    break;
  case "index-consistency":
    indexConsistency();
    break;
  case "orphan-sources":
    orphanSources();
    break;
  case "dangling":
    dangling();
    break;
  case "collision":
    collision();
    break;
  default:
    process.stderr.write(`verify-twins: unknown check '${check ?? ""}'\n`);
    process.exit(2);
}
