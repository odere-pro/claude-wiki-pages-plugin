/**
 * tree-metric.ts — the ONE strict-tree edge classification (ADR-0036).
 *
 * Given a vault's `wiki/`, classify every `[[wikilink]]` edge among visible
 * topic pages against the strict-tree rule: an edge is a SPINE edge (parent↔child)
 * or a NON-SPINE edge (everything else — a sibling "see also", a cross-tree
 * mention, a link to a non-adjacent ancestor). Non-spine edges are further marked
 * cross-tree (endpoints in different top-level topics) and transitive-redundant
 * (the target is already on the source's topic path, so the spine carries it).
 *
 * Edges into scaffolding (`_sources`/`_synthesis`/index/log/manifest) are NOT
 * counted — provenance and the MOC are a different node universe (ADR-0031/0033).
 * The ROOT spine (`index.md` → folder note) therefore falls out automatically:
 * `index.md` is scaffolding, so its edges never enter the topic-edge universe.
 *
 * Reuses `deriveSpine` (the one spine derivation), `resolveLink` (the one
 * resolution ladder), and `stripCode` (the one code-fence stripper). Both
 * scripts/graph-quality.ts and scripts/tree-lint.ts consume this — no second edge
 * classifier can drift. Node built-ins + the `yaml` lib only.
 */

import { relative } from "node:path";
import { listMarkdownRecursive, readFileSafe } from "./fs.ts";
import { stripCode } from "./wikilink-check.ts";
import { resolveLink } from "./link-resolver.ts";
import { deriveSpine, type Spine } from "./spine.ts";

const LINK_RE = /\[\[([^[\]]+?)\]\]/g;

/** A directed `[[wikilink]]` edge between two visible topic pages. */
export interface TreeEdge {
  /** Source page, wiki-relative `/`-separated. */
  readonly from: string;
  /** Resolved target page, wiki-relative `/`-separated. */
  readonly to: string;
  /** True when this is a parent↔child spine edge. */
  readonly spine: boolean;
  /** True when the endpoints are in different top-level topics (non-spine only). */
  readonly crossTree: boolean;
  /** True when `to` is already on `from`'s topic path (non-spine only). */
  readonly transitiveRedundant: boolean;
}

export interface TreeMetric {
  /** Parent↔child edges among visible topic pages. */
  readonly spineEdgeCount: number;
  /** Non-spine edges among visible topic pages. */
  readonly nonSpineEdgeCount: number;
  /** Non-spine edges crossing top-level topics (ROOT spine excluded by construction). */
  readonly crossTreeEdgeCount: number;
  /** Non-spine edges to a page already on the source's topic path. */
  readonly transitiveRedundantEdgeCount: number;
  /** Number of parent-chain cycles. */
  readonly cycleCount: number;
  /** Pages whose `parent:` resolves to more than one page. */
  readonly multiParentCount: number;
  /** Non-root, non-special pages with no resolvable parent. */
  readonly orphanCount: number;
  /** Highest out-degree (edges to visible topic pages) of any single page. */
  readonly maxSaturation: number;
  /** Fraction of visible-page edges that are spine edges; 1 when there are none. */
  readonly treeConformance: number;
  /** The spine this metric was computed against (callers reuse it for diagnostics). */
  readonly spine: Spine;
  /** Every non-spine edge, sorted — the lint's and reducer's work-list. */
  readonly nonSpineEdges: readonly TreeEdge[];
  /** Per-page out-degree to visible topic pages (the saturation source). */
  readonly saturation: ReadonlyMap<string, number>;
}

/** All `[[target]]` raw inner strings in a page, code-stripped (frontmatter + body). */
function pageLinks(text: string): string[] {
  const stripped = stripCode(text);
  const out: string[] = [];
  let m: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(stripped)) !== null) out.push(m[1] ?? "");
  return out;
}

/** Wiki-relative path with `/` separators. */
function toRel(wiki: string, file: string): string {
  return relative(wiki, file).split(/[\\/]/).join("/");
}

/**
 * Classify the strict-tree edges of a vault's `wiki/` directory and roll up the
 * conformance counts. Deterministic and read-only.
 *
 * @param wiki Absolute path to the vault's `wiki/` directory.
 */
export function computeTreeMetric(wiki: string): TreeMetric {
  const spine = deriveSpine(wiki);
  const { nodes, index } = spine;

  let spineEdgeCount = 0;
  let nonSpineEdgeCount = 0;
  let crossTreeEdgeCount = 0;
  let transitiveRedundantEdgeCount = 0;
  const saturation = new Map<string, number>();
  const nonSpineEdges: TreeEdge[] = [];

  for (const abs of listMarkdownRecursive(wiki)) {
    const from = toRel(wiki, abs);
    const fromNode = nodes.get(from);
    if (fromNode === undefined || fromNode.special) continue; // only visible topic pages link out

    const text = readFileSafe(abs) ?? "";
    for (const raw of pageLinks(text)) {
      const to = resolveLink(raw, from, index)?.file ?? null;
      if (to === null || to === from) continue;
      const toNode = nodes.get(to);
      if (toNode === undefined || toNode.special) continue; // edge into scaffolding — not a topic edge

      saturation.set(from, (saturation.get(from) ?? 0) + 1);

      const isSpine = fromNode.parent === to || toNode.parent === from;
      if (isSpine) {
        spineEdgeCount += 1;
        continue;
      }
      const crossTree = fromNode.tree !== "" && toNode.tree !== "" && fromNode.tree !== toNode.tree;
      const transitiveRedundant =
        fromNode.pathToRoot.includes(to) || toNode.pathToRoot.includes(from);
      nonSpineEdgeCount += 1;
      if (crossTree) crossTreeEdgeCount += 1;
      if (transitiveRedundant) transitiveRedundantEdgeCount += 1;
      nonSpineEdges.push({ from, to, spine: false, crossTree, transitiveRedundant });
    }
  }

  const totalVisible = spineEdgeCount + nonSpineEdgeCount;
  const maxSaturation = saturation.size > 0 ? Math.max(...saturation.values()) : 0;

  return Object.freeze({
    spineEdgeCount,
    nonSpineEdgeCount,
    crossTreeEdgeCount,
    transitiveRedundantEdgeCount,
    cycleCount: spine.cycles.length,
    multiParentCount: spine.multiParent.length,
    orphanCount: spine.orphans.length,
    maxSaturation,
    treeConformance: totalVisible === 0 ? 1 : spineEdgeCount / totalVisible,
    spine,
    nonSpineEdges: Object.freeze(
      nonSpineEdges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)),
    ),
    saturation,
  });
}
