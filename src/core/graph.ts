/**
 * Graph-traversal primitive — the ONE deterministic link-walk in the engine.
 *
 * Implements §6 of the team brief: a bodyless, N≤2 BFS over typed wikilinks
 * drawn from the `ontology-profile-v1` predicate table. Returns scored page
 * REFERENCES, never bodies — `splitFrontmatter().body` is never called here.
 *
 * Determinism contract (resolves the insertion-order nondeterminism present in
 * the Tier-2 expansion at first):
 *   - Frontier pages processed in SORTED vault-relative path order.
 *   - Predicates iterated in fixed `edges` array order.
 *   - Resolved targets processed in SORTED title order.
 *   - Nearest-hop dedup: a page reached at hop-k is never revisited at hop-(k+N).
 *   - Output `refs` sorted by (hop asc, score desc, file asc).
 *   - Same vault + seeds + edges + N → byte-identical output.
 *
 * NO vectors, NO embeddings, NO network. Zero `fetch()` calls. Dangling
 * wikilinks (pointing to non-existent pages) are silently skipped. Only
 * `GraphEdge` members (the closed predicate union) are followed — open fields
 * like `tags` are never traversed.
 *
 * DEFER (Phase 3): `contradicts`/`supersedes` walking, N>2 — do not build.
 */

import { join, relative } from "node:path";
import { listMarkdownRecursive, readFileSafe, BOOKKEEPING } from "./fs.ts";
import { parseFrontmatter, titleOf, stringList, stripWikilink } from "./frontmatter.ts";
import { basename } from "node:path";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * The closed set of typed wikilink predicates from `ontology-profile-v1`.
 * Domain/range is NOT enforced here (that is S1-check's job). Only these
 * predicates are ever traversed — open fields like `tags` are ignored.
 *
 * Phase 3 additions (`contradicts`, `supersedes`) are intentionally absent.
 */
export type GraphEdge =
  | "sources"
  | "related"
  | "depends_on"
  | "parent"
  | "key_pages"
  | "members"
  | "scope"
  | "child_indexes"
  | "contradicts"
  | "supersedes";

/** Default edges for R2 `--graph`: the provenance/association core. */
export const R2_EDGES: readonly GraphEdge[] = ["sources", "related", "depends_on"];

/**
 * A single page reference produced by a graph walk. No body — only metadata.
 * `score` is hop-decayed (hop-1 → W_GRAPH_HOP1, hop-2 → W_GRAPH_HOP2).
 */
export interface GraphRef {
  /** `[[Title]]` form of the target page. */
  readonly wikilink: string;
  /** Vault-relative path to the target page file. */
  readonly file: string;
  /** The `type` frontmatter value of the target page (empty string when absent). */
  readonly type: string;
  /** BFS hop distance from the nearest seed. */
  readonly hop: number;
  /** The predicate that created this edge (the field name on the SOURCE page). */
  readonly via: GraphEdge;
  /** Hop-decayed score: W_GRAPH_HOP1 for hop-1, W_GRAPH_HOP2 for hop-2. */
  readonly score: number;
}

export interface GraphWalkOptions {
  /** Absolute path to the vault root. */
  readonly vault: string;
  /**
   * Seed files — vault-relative or absolute paths.
   * The walk starts from these pages (they are never included in the output).
   */
  readonly seeds: readonly string[];
  /** Predicates to traverse. Defaults to R2_EDGES. */
  readonly edges?: readonly GraphEdge[];
  /**
   * Maximum hop depth. Clamped: `Math.max(1, Math.min(2, maxHops ?? 2))`.
   * The hard ceiling is 2; passing 99 is identical to passing 2.
   */
  readonly maxHops?: number;
}

export interface GraphWalkResult {
  readonly refs: readonly GraphRef[];
}

// ── Weights ───────────────────────────────────────────────────────────────────

/**
 * Hop-decayed graph scores (the WEAKEST signal, strictly below synonym/exact).
 *
 * Ladder:
 *   direct title match  5
 *   synonym-term        2
 *   W_GRAPH_HOP1        2  ← same as synonym (graph-hop1 ≤ synonym)
 *   W_GRAPH_HOP2        1
 *
 * The spec requires: graph-hop2 ≤ graph-hop1 ≤ synonym < direct.
 * synonym = 2, direct = 5, so graph-hop1 = 2 satisfies ≤ synonym.
 */
const W_GRAPH_HOP1 = 2;
const W_GRAPH_HOP2 = 1;

function hopScore(hop: number): number {
  return hop === 1 ? W_GRAPH_HOP1 : W_GRAPH_HOP2;
}

// ── Title index ───────────────────────────────────────────────────────────────

/**
 * Build a one-time `Map<normalizedTitle, absoluteFilePath>` index over the
 * vault's `wiki/` directory. Normalised title = `titleOf(content, file)`
 * lowercased+trimmed, plus all aliases.
 *
 * This is the ONLY scan of wiki files for building the index. The walk itself
 * uses this map for O(1) resolution; it never re-scans the filesystem.
 */
function buildTitleIndex(vault: string): Map<string, string> {
  const index = new Map<string, string>();
  const wiki = join(vault, "wiki");
  for (const file of listMarkdownRecursive(wiki)) {
    if (BOOKKEEPING.has(basename(file, ".md"))) continue;
    const content = readFileSafe(file);
    if (content === null) continue;
    const fm = parseFrontmatter(content);
    const title = titleOf(content, file);
    // Register the title
    const normTitle = title.toLowerCase().trim();
    if (normTitle !== "" && !index.has(normTitle)) {
      index.set(normTitle, file);
    }
    // Register each alias
    for (const alias of stringList(fm["aliases"])) {
      const normAlias = alias.toLowerCase().trim();
      if (normAlias !== "" && !index.has(normAlias)) {
        index.set(normAlias, file);
      }
    }
    // Also register by vault-relative path for seed resolution
    const rel = relative(vault, file);
    if (!index.has(rel)) {
      index.set(rel, file);
    }
    // And by filename stem (kebab-case filename → title fallback)
    const stem = basename(file, ".md").toLowerCase().trim();
    if (stem !== "" && !index.has(stem)) {
      index.set(stem, file);
    }
  }
  return index;
}

/**
 * Resolve a vault-relative seed path to an absolute file path. Returns null if
 * the file cannot be resolved.
 *
 * Seeds are always vault-relative: `search` derives them from `SearchHit.file`
 * (itself `relative(vault, file)`), and every future caller (C1/R3) follows the
 * same `GraphRef.file` convention. An absolute-path branch would be dead code,
 * so it is intentionally omitted (YAGNI).
 */
function resolveSeedPath(vault: string, seed: string): string | null {
  const abs = join(vault, seed);
  const content = readFileSafe(abs);
  if (content !== null) return abs;
  return null;
}

/**
 * Given a wikilink target string (the inner text of `[[...]]`), resolve it to
 * an absolute file path using the title index. Returns null for dangling links.
 */
function resolveWikilink(target: string, titleIndex: Map<string, string>): string | null {
  // Strip alias portion after `|`
  const bare = target.split("|")[0]?.trim() ?? target.trim();
  const norm = bare.toLowerCase().trim();
  return titleIndex.get(norm) ?? null;
}

// ── Main walk ─────────────────────────────────────────────────────────────────

/**
 * BFS graph walk over typed wikilinks.
 *
 * Algorithm:
 * 1. Build a title+alias index over wiki/*.
 * 2. Seed the `visited` set with all resolved seed files (normalise duplicates).
 * 3. BFS up to `clampedHops` levels:
 *    a. For each hop level, sort the current frontier by vault-relative path.
 *    b. For each page in the frontier, iterate `edges` in declaration order.
 *    c. For each edge, sort its resolved targets by title (the wikilink target text).
 *    d. For each resolved target not in `visited`:
 *       - record a GraphRef (hop, via, score).
 *       - add to `visited` and to the next frontier.
 * 4. Sort the final refs by (hop asc, score desc, file asc).
 */
export function walk(opts: GraphWalkOptions): GraphWalkResult {
  const vault = opts.vault.replace(/\/+$/, "");
  const edges: readonly GraphEdge[] = opts.edges ?? R2_EDGES;
  const maxHops = Math.max(1, Math.min(2, opts.maxHops ?? 2));

  // Build the title/alias/path index once.
  const titleIndex = buildTitleIndex(vault);

  // Resolve seed paths → absolute file paths; deduplicate.
  const seedFiles = new Set<string>();
  for (const seed of opts.seeds) {
    const abs = resolveSeedPath(vault, seed);
    if (abs !== null) seedFiles.add(abs);
  }

  // `visited` is seeded with seed files so they are never emitted as refs.
  const visited = new Set<string>(seedFiles);

  // `frontier` is the current BFS layer (absolute file paths).
  let frontier: string[] = [...seedFiles];

  const refs: GraphRef[] = [];

  for (let hop = 1; hop <= maxHops; hop++) {
    // Sort frontier by vault-relative path for determinism.
    const sortedFrontier = [...frontier].sort((a, b) =>
      relative(vault, a).localeCompare(relative(vault, b)),
    );
    const nextFrontier: string[] = [];

    for (const pageFile of sortedFrontier) {
      const content = readFileSafe(pageFile);
      if (content === null) continue;
      const fm = parseFrontmatter(content);

      for (const edge of edges) {
        // Get the raw wikilink list for this predicate.
        const rawList = stringList(fm[edge]);

        // Sort targets by their resolved title text (the inner text after stripWikilink).
        // Collect (rawEntry, targetTitle, resolvedFile) triples so we can sort by title.
        const candidates: Array<{
          title: string;
          file: string;
          type: string;
          wikilink: string;
        }> = [];
        for (const raw of rawList) {
          const inner = stripWikilink(raw);
          if (inner === "") continue;
          const resolvedFile = resolveWikilink(inner, titleIndex);
          if (resolvedFile === null) continue; // dangling — skip
          if (visited.has(resolvedFile)) continue; // already recorded at earlier hop
          const targetContent = readFileSafe(resolvedFile);
          if (targetContent === null) continue;
          const targetFm = parseFrontmatter(targetContent);
          const targetTitle = titleOf(targetContent, resolvedFile);
          const targetType =
            typeof targetFm["type"] === "string" ? (targetFm["type"] as string) : "";
          const wikilinkStr = `[[${targetTitle}]]`;
          candidates.push({
            title: targetTitle,
            file: resolvedFile,
            type: targetType,
            wikilink: wikilinkStr,
          });
        }

        // Sort candidates by title (= wikilink target title) for determinism.
        candidates.sort((a, b) => a.title.localeCompare(b.title));

        for (const cand of candidates) {
          if (visited.has(cand.file)) continue; // dedup within same hop level
          visited.add(cand.file);
          nextFrontier.push(cand.file);
          refs.push({
            wikilink: cand.wikilink,
            file: relative(vault, cand.file),
            type: cand.type,
            hop,
            via: edge,
            score: hopScore(hop),
          });
        }
      }
    }

    frontier = nextFrontier;
    if (frontier.length === 0) break; // no more reachable pages
  }

  // Sort output: (hop asc, score desc, file asc)
  refs.sort((a, b) => {
    if (a.hop !== b.hop) return a.hop - b.hop;
    if (b.score !== a.score) return b.score - a.score;
    return a.file.localeCompare(b.file);
  });

  return { refs };
}
