/**
 * Obsidian-accurate link resolution (ADR-0030).
 *
 * `buildLinkIndex(wiki)` walks `wiki/` once and records, per normalised name,
 * the pages that claim it at each resolution tier. `resolveLink(target, source,
 * index)` then resolves a `[[link]]` to the exact page Obsidian would open, by
 * the priority ladder:
 *
 *   1. exact vault path (wiki-relative, with or without `.md`)
 *   2. file basename, case-insensitive
 *   3. alias, case-insensitive
 *   4. title, case-insensitive  — a deliberate superset of Obsidian (§3 of
 *      ADR-0030); Obsidian itself does NOT resolve by `title`.
 *
 * A real file basename ALWAYS beats an alias. When a tier yields more than one
 * candidate, the tie-break is: shortest vault-relative path → same folder as
 * the source → alphabetical (fully sorted, so the same vault always resolves
 * the same way).
 *
 * This is the one resolution rule. The dangling/orphan/stale/MOC checks treat a
 * link as resolved iff it resolves by PATH or BASENAME — exactly what Obsidian
 * does (ADR-0031 §2). They consume `resolvableNames(index)`, which is the path
 * ∪ basename ∪ alias ∪ title membership set: a `[[_sources/adr-0001…]]`
 * path-qualified target resolves through the `byPath` keys, and a piped
 * `[[entity-name|Entity Name]]` through the basename keys. (The alias/title
 * tiers are kept in the set as a deliberate superset — they never make Obsidian
 * resolve, but including them cannot turn a real link into a false dangling
 * report.) The collision check ([`collision-check.ts`](./collision-check.ts))
 * and the connectivity metric in
 * [`../../scripts/graph-quality.sh`](../../scripts/graph-quality.sh) consume the
 * full ladder. graph-quality.ts and disentangle-links.ts reuse THIS module; the
 * verify-ingest.sh twin (scripts/verify-twins.ts) is a deliberately independent
 * re-implementation, pinned by gate-05.
 */

import { relative, basename } from "node:path";
import { listMarkdownRecursive, readFileSafe } from "./fs.ts";
import { parseFrontmatter, stringList } from "./frontmatter.ts";

export type ResolveKind = "path" | "basename" | "alias" | "title";

export interface ResolvedLink {
  /** Winning page, as a wiki-relative path with `/` separators. */
  readonly file: string;
  /** Which tier resolved it. */
  readonly kind: ResolveKind;
}

export interface LinkIndex {
  /** Normalised wiki-relative path (with and without `.md`) → file. */
  readonly byPath: ReadonlyMap<string, string>;
  /** Normalised filename stem → sorted, de-duplicated claiming files. */
  readonly byBasename: ReadonlyMap<string, readonly string[]>;
  /** Normalised `aliases:` entry → sorted, de-duplicated claiming files. */
  readonly byAlias: ReadonlyMap<string, readonly string[]>;
  /** Normalised `title:` value → sorted, de-duplicated claiming files. */
  readonly byTitle: ReadonlyMap<string, readonly string[]>;
  /** All wiki-relative page paths, sorted. */
  readonly files: readonly string[];
}

// ── Normalisation ─────────────────────────────────────────────────────────────

/**
 * Normalise a raw wikilink inner text to the form used for resolution: strip
 * `|display` (from the first `|`), `#heading` (from the first `#`), `^block`
 * (from the first `^`), then `.trim().toLowerCase()`.
 *
 * Mirrors `normalise_target()` in scripts/verify-ingest.sh and graph-quality.sh
 * (pinned by gate-05 for the dangling path). Shared here so the resolver, the
 * dangling check, and the collision check all normalise identically.
 */
export function normaliseTarget(raw: string): string {
  let t = raw;
  const pipe = t.indexOf("|");
  if (pipe !== -1) t = t.slice(0, pipe);
  const hash = t.indexOf("#");
  if (hash !== -1) t = t.slice(0, hash);
  const caret = t.indexOf("^");
  if (caret !== -1) t = t.slice(0, caret);
  return t.trim().toLowerCase();
}

// ── Index construction ──────────────────────────────────────────────────────

/** Wiki-relative path with `/` separators (Obsidian's path form). */
function toRel(wiki: string, file: string): string {
  return relative(wiki, file).split(/[\\/]/).join("/");
}

/** posix dirname of a `/`-separated relative path ("" when no folder). */
function relDir(rel: string): string {
  const i = rel.lastIndexOf("/");
  return i === -1 ? "" : rel.slice(0, i);
}

/** Append `file` to the list at `key`, creating it if absent. */
function push(map: Map<string, string[]>, key: string, file: string): void {
  const cur = map.get(key);
  if (cur === undefined) map.set(key, [file]);
  else cur.push(file);
}

/** Sort + de-duplicate every list in a name→files map for determinism. */
function freezeLists(map: Map<string, string[]>): Map<string, readonly string[]> {
  const out = new Map<string, readonly string[]>();
  for (const [key, files] of map) {
    out.set(key, Object.freeze([...new Set(files)].sort()));
  }
  return out;
}

/** Build the resolution index by walking `wiki/` once. */
export function buildLinkIndex(wiki: string): LinkIndex {
  const byPath = new Map<string, string>();
  const byBasename = new Map<string, string[]>();
  const byAlias = new Map<string, string[]>();
  const byTitle = new Map<string, string[]>();
  const files: string[] = [];

  for (const abs of listMarkdownRecursive(wiki)) {
    const rel = toRel(wiki, abs);
    files.push(rel);

    // Path tier: the wiki-relative path, with and without the `.md` suffix.
    const relLower = rel.toLowerCase();
    if (!byPath.has(relLower)) byPath.set(relLower, rel);
    const noExt = relLower.replace(/\.md$/, "");
    if (!byPath.has(noExt)) byPath.set(noExt, rel);

    const stem = basename(abs, ".md").trim().toLowerCase();
    if (stem !== "") push(byBasename, stem, rel);

    const content = readFileSafe(abs);
    if (content === null) continue;
    const fm = parseFrontmatter(content);

    const title = fm["title"];
    if (typeof title === "string" && title.trim() !== "") {
      push(byTitle, title.trim().toLowerCase(), rel);
    }
    for (const alias of stringList(fm["aliases"])) {
      const na = alias.trim().toLowerCase();
      if (na !== "") push(byAlias, na, rel);
    }
  }

  return Object.freeze({
    byPath,
    byBasename: freezeLists(byBasename),
    byAlias: freezeLists(byAlias),
    byTitle: freezeLists(byTitle),
    files: Object.freeze(files.sort()),
  });
}

// ── Resolution ────────────────────────────────────────────────────────────────

/**
 * Pick the winning file among tier candidates: shortest path → same folder as
 * the source → alphabetical. `sourceRel` (the linking page, `/`-separated) is
 * used only for the same-folder tie-break; pass "" when there is no source.
 */
function tieBreak(candidates: readonly string[], sourceRel: string): string {
  if (candidates.length === 1) return candidates[0] as string;
  const srcDir = relDir(sourceRel);
  const ranked = [...candidates].sort((a, b) => {
    const segA = a.split("/").length;
    const segB = b.split("/").length;
    if (segA !== segB) return segA - segB;
    const sameA = relDir(a) === srcDir ? 0 : 1;
    const sameB = relDir(b) === srcDir ? 0 : 1;
    if (sameA !== sameB) return sameA - sameB;
    return a.localeCompare(b);
  });
  return ranked[0] as string;
}

/**
 * Resolve a raw `[[link]]` target to the page Obsidian would open, or null when
 * it resolves to nothing. `sourceRel` is the wiki-relative path of the linking
 * page (for the same-folder tie-break); "" when not applicable.
 */
export function resolveLink(
  rawTarget: string,
  sourceRel: string,
  index: LinkIndex,
): ResolvedLink | null {
  const nt = normaliseTarget(rawTarget);
  if (nt === "") return null;

  const p = index.byPath.get(nt);
  if (p !== undefined) return { file: p, kind: "path" };

  const b = index.byBasename.get(nt);
  if (b !== undefined && b.length > 0) return { file: tieBreak(b, sourceRel), kind: "basename" };

  const a = index.byAlias.get(nt);
  if (a !== undefined && a.length > 0) return { file: tieBreak(a, sourceRel), kind: "alias" };

  const t = index.byTitle.get(nt);
  if (t !== undefined && t.length > 0) return { file: tieBreak(t, sourceRel), kind: "title" };

  return null;
}

/**
 * The set of normalised names a `[[link]]` resolves against for the
 * dangling/orphan/stale/MOC checks: path ∪ basename ∪ alias ∪ title (ADR-0031).
 *
 * The `byPath` keys (wiki-relative path, with and without `.md`) make a
 * path-qualified target like `_sources/adr-0001-four-layer-orchestrator`
 * resolve; the basename keys make a piped `[[entity-name|Entity Name]]` resolve
 * once `normaliseTarget` has stripped the `|display`. Alias and title are kept
 * as a deliberate superset (Obsidian resolves by path/basename only, but their
 * presence can never produce a false dangling report).
 */
export function resolvableNames(index: LinkIndex): Set<string> {
  const names = new Set<string>();
  for (const k of index.byPath.keys()) names.add(k);
  for (const k of index.byBasename.keys()) names.add(k);
  for (const k of index.byAlias.keys()) names.add(k);
  for (const k of index.byTitle.keys()) names.add(k);
  return names;
}
