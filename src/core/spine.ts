/**
 * spine.ts — the ONE strict-tree spine derivation (ADR-0036).
 *
 * A vault's strict tree is its `parent:` spine: every page hangs beneath exactly
 * one parent, up an unlimited-depth chain that terminates at the ROOT MOC
 * (`wiki/index.md`). `deriveSpine(wiki)` walks the vault once, resolves each
 * page's `parent:` wikilink with the engine's own resolver, and returns the
 * per-page spine shape (`parent`, `depth`, `pathToRoot`, `children`, `tree`)
 * plus the three conformance violations the strict tree forbids: `orphans`
 * (pages with no parent), `multiParent` (pages whose `parent:` resolves to more
 * than one page), and `cycles` (parent chains that loop instead of reaching
 * ROOT).
 *
 * This single module backs the graph-quality tree metric (scripts/graph-quality),
 * the read-only tree lint (scripts/tree-lint), and the strict-tree reducer
 * (scripts/strict-tree-reduce) — no second spine derivation can drift, the same
 * way `deriveTopics` is the one topic derivation.
 *
 * Reuses src/core only (core dependency rule): `buildLinkIndex`/`resolveLink`
 * (the ADR-0030/0031 resolution ladder), `deriveTopics`/`SPECIAL_DIRS`, and the
 * frontmatter parser. Node built-ins + the `yaml` lib (via frontmatter) only —
 * no network, no engine-command imports.
 */

import { relative, basename } from "node:path";
import { listMarkdownRecursive, readFileSafe } from "./fs.ts";
import { parseFrontmatter, stringList } from "./frontmatter.ts";
import { buildLinkIndex, resolveLink, type LinkIndex } from "./link-resolver.ts";
import { deriveTopics, SPECIAL_DIRS } from "./topics.ts";

/** The vault MOC, drawn as the graph ROOT — terminus of every parent chain. */
export const ROOT_REL = "index.md";

const LINK_RE = /\[\[([^[\]]+?)\]\]/g;

/** Per-page position in the strict tree. `rel` is wiki-relative, `/`-separated. */
export interface SpineNode {
  /** Wiki-relative path with `/` separators, e.g. `"concepts/provenance.md"`. */
  readonly rel: string;
  /** Top-level topic folder (the page's tree), or `""` for root-level pages. */
  readonly tree: string;
  /** Resolved parent page, or `null` when absent / unresolvable. */
  readonly parent: string | null;
  /** Distance from ROOT along the parent chain; ROOT is 0; `-1` if not attached. */
  readonly depth: number;
  /** Ancestors from immediate parent up to (and including) ROOT, when reached. */
  readonly pathToRoot: readonly string[];
  /** Pages whose `parent:` resolves to this page (sorted). */
  readonly children: readonly string[];
  /** Scaffolding page (`_sources`/`_synthesis`/index/log/manifest) — not a tree node. */
  readonly special: boolean;
}

export interface Spine {
  /** The ROOT page rel (`index.md`). */
  readonly root: string;
  /** Every wiki page, keyed by wiki-relative path. */
  readonly nodes: ReadonlyMap<string, SpineNode>;
  /** Non-root, non-special pages with no resolvable parent (sorted). */
  readonly orphans: readonly string[];
  /** Pages whose `parent:` resolves to more than one distinct page (sorted). */
  readonly multiParent: readonly string[];
  /** Detected parent-chain loops; each loop's member rels, sorted, deduped. */
  readonly cycles: readonly (readonly string[])[];
  /** The resolution index, reused by callers (the reducer, the lint). */
  readonly index: LinkIndex;
}

/** Wiki-relative path with `/` separators (Obsidian's path form). */
function toRel(wiki: string, file: string): string {
  return relative(wiki, file).split(/[\\/]/).join("/");
}

/** A page is scaffolding (not a tree node) when it is a special folder or root file. */
function isSpecial(rel: string): boolean {
  const parts = rel.split("/");
  if (parts.length > 1 && SPECIAL_DIRS.has(parts[0]!)) return true;
  if (parts.length === 1) {
    const stem = basename(rel, ".md");
    return stem === "index" || stem === "log" || stem === "manifest";
  }
  return false;
}

/** Every `[[target]]` inner string in a frontmatter value (handles list or scalar). */
function parentTargets(value: unknown): string[] {
  const out: string[] = [];
  for (const entry of stringList(value)) {
    let m: RegExpExecArray | null;
    LINK_RE.lastIndex = 0;
    while ((m = LINK_RE.exec(entry)) !== null) out.push(m[1] ?? "");
  }
  return out;
}

/**
 * Derive the strict-tree spine of a vault's `wiki/` directory.
 *
 * @param wiki Absolute path to the vault's `wiki/` directory.
 */
export function deriveSpine(wiki: string): Spine {
  const index = buildLinkIndex(wiki);
  const topics = new Set(deriveTopics(wiki));

  // First pass: resolve each page's parent and record multi-parent violations.
  const parentOf = new Map<string, string | null>();
  const special = new Map<string, boolean>();
  const treeOf = new Map<string, string>();
  const multiParent: string[] = [];
  const childrenOf = new Map<string, string[]>();

  for (const abs of listMarkdownRecursive(wiki)) {
    const rel = toRel(wiki, abs);
    const sp = isSpecial(rel);
    special.set(rel, sp);
    const first = rel.includes("/") ? rel.split("/")[0]! : "";
    treeOf.set(rel, topics.has(first) ? first : "");

    const fm = parseFrontmatter(readFileSafe(abs) ?? "");
    const resolved = new Set<string>();
    for (const raw of parentTargets(fm["parent"])) {
      const tgt = resolveLink(raw, rel, index)?.file ?? null;
      if (tgt !== null && tgt !== rel) resolved.add(tgt);
    }
    const parents = [...resolved].sort();
    if (parents.length > 1) multiParent.push(rel);
    // Use the first resolved parent for the (functional) chain walk.
    parentOf.set(rel, parents[0] ?? null);
  }

  // Inverse map: children.
  for (const [rel, parent] of parentOf) {
    if (parent === null) continue;
    (childrenOf.get(parent) ?? childrenOf.set(parent, []).get(parent)!).push(rel);
  }

  const cycles = detectCycles([...parentOf.keys()], parentOf);

  // Second pass: depth + pathToRoot via memoised upward walk.
  const pathCache = new Map<string, string[]>();
  const climb = (rel: string): string[] => {
    const cached = pathCache.get(rel);
    if (cached !== undefined) return cached;
    const path: string[] = [];
    const seen = new Set<string>([rel]);
    let cur = parentOf.get(rel) ?? null;
    while (cur !== null) {
      path.push(cur);
      if (cur === ROOT_REL || seen.has(cur)) break; // reached root or looped
      seen.add(cur);
      cur = parentOf.get(cur) ?? null;
    }
    pathCache.set(rel, path);
    return path;
  };

  const nodes = new Map<string, SpineNode>();
  const orphans: string[] = [];
  for (const rel of parentOf.keys()) {
    const parent = parentOf.get(rel) ?? null;
    const sp = special.get(rel) ?? false;
    const path = rel === ROOT_REL ? [] : climb(rel);
    const reachedRoot = rel === ROOT_REL || path[path.length - 1] === ROOT_REL;
    if (!sp && rel !== ROOT_REL && parent === null) orphans.push(rel);
    nodes.set(rel, {
      rel,
      tree: treeOf.get(rel) ?? "",
      parent,
      depth: reachedRoot ? path.length : -1,
      pathToRoot: Object.freeze(path),
      children: Object.freeze((childrenOf.get(rel) ?? []).slice().sort()),
      special: sp,
    });
  }

  return Object.freeze({
    root: ROOT_REL,
    nodes,
    orphans: Object.freeze(orphans.sort()),
    multiParent: Object.freeze(multiParent.sort()),
    cycles: Object.freeze(cycles.map((c) => Object.freeze([...c].sort()))),
    index,
  }) as Spine;
}

/**
 * Find every parent-chain cycle in a functional graph (each node has ≤1 parent).
 * Iterative DFS with on-stack tracking; each weakly-connected component has at
 * most one cycle, so each distinct loop is reported once.
 */
function detectCycles(
  rels: readonly string[],
  parentOf: ReadonlyMap<string, string | null>,
): string[][] {
  const color = new Map<string, 0 | 1 | 2>(); // 0 unvisited, 1 on-stack, 2 done
  const found: string[][] = [];
  const seenKeys = new Set<string>();

  for (const start of rels) {
    if ((color.get(start) ?? 0) !== 0) continue;
    const stack: string[] = [];
    const onStack = new Map<string, number>();
    let cur: string | null = start;
    while (cur !== null) {
      const c = color.get(cur) ?? 0;
      if (c === 2) break; // leads into already-finished, acyclic territory
      if (c === 1) {
        const loop = stack.slice(onStack.get(cur)!);
        const key = [...loop].sort().join("|");
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          found.push(loop);
        }
        break;
      }
      color.set(cur, 1);
      onStack.set(cur, stack.length);
      stack.push(cur);
      cur = parentOf.get(cur) ?? null;
    }
    for (const n of stack) color.set(n, 2);
  }
  return found;
}
