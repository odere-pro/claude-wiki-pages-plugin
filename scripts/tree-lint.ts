#!/usr/bin/env bun
/**
 * tree-lint.ts — read-only strict-tree conformance report (ADR-0036).
 *
 * Reports, against the `parent:` spine, every shape the strict tree forbids:
 * orphans (no parent), multi-parent pages, parent-chain cycles, oversaturated
 * nodes (out-degree over a configurable threshold), and every non-spine edge
 * among visible topic pages — each tagged cross-tree, transitive-redundant, or
 * intra-tree. The detector half of the strict-tree machinery; the reducer
 * (scripts/strict-tree-reduce.ts) is what actually rewrites.
 *
 * Reuses src/core/tree-metric.ts (the one edge classifier) + src/core/spine.ts
 * (the one spine derivation) — no second classification here. Read-only; never
 * writes the vault. Exit 0 always — callers gate on the JSON/text output.
 *
 * Usage: tree-lint.ts --target <vault> [--json] [--max-saturation <n>]
 */

import { join } from "node:path";
import { computeTreeMetric } from "../src/core/tree-metric.ts";

const DEFAULT_MAX_SATURATION = 20;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const target = arg("--target");
if (target === undefined) {
  console.error("usage: tree-lint.ts --target <vault> [--json] [--max-saturation <n>]");
  process.exit(2);
}
const asJson = process.argv.includes("--json");
const maxSatRaw = arg("--max-saturation");
const maxSaturationThreshold =
  maxSatRaw !== undefined && Number.isFinite(Number(maxSatRaw))
    ? Number(maxSatRaw)
    : DEFAULT_MAX_SATURATION;

const wiki = join(target, "wiki");
const m = computeTreeMetric(wiki);

const kindOf = (e: { crossTree: boolean; transitiveRedundant: boolean }): string =>
  e.crossTree ? "cross-tree" : e.transitiveRedundant ? "transitive-redundant" : "intra-tree";

const oversaturated = [...m.saturation.entries()]
  .filter(([, deg]) => deg > maxSaturationThreshold)
  .map(([page, outDegree]) => ({ page, outDegree }))
  .sort((a, b) => b.outDegree - a.outDegree || a.page.localeCompare(b.page));

const result = {
  vault: target,
  maxSaturationThreshold,
  metric: {
    treeConformance: Math.round(m.treeConformance * 10000) / 10000,
    spineEdgeCount: m.spineEdgeCount,
    nonSpineEdgeCount: m.nonSpineEdgeCount,
    crossTreeEdgeCount: m.crossTreeEdgeCount,
    transitiveRedundantEdgeCount: m.transitiveRedundantEdgeCount,
    cycleCount: m.cycleCount,
    multiParentCount: m.multiParentCount,
    orphanCount: m.orphanCount,
    maxSaturation: m.maxSaturation,
  },
  orphans: [...m.spine.orphans],
  multiParent: [...m.spine.multiParent],
  cycles: m.spine.cycles.map((c) => [...c]),
  oversaturated,
  nonSpineEdges: m.nonSpineEdges.map((e) => ({
    from: e.from,
    to: e.to,
    kind: kindOf(e),
  })),
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const mt = result.metric;
  console.log(`tree-lint  vault: ${target}`);
  console.log(
    `conformance=${mt.treeConformance}  spine=${mt.spineEdgeCount}  non-spine=${mt.nonSpineEdgeCount}  cross-tree=${mt.crossTreeEdgeCount}  transitive-redundant=${mt.transitiveRedundantEdgeCount}`,
  );
  console.log(
    `cycles=${mt.cycleCount}  multi-parent=${mt.multiParentCount}  orphans=${mt.orphanCount}  max-saturation=${mt.maxSaturation} (threshold ${maxSaturationThreshold})`,
  );
  if (result.orphans.length) {
    console.log(`orphans (no parent — attach to a folder note):`);
    for (const o of result.orphans.slice(0, 30)) console.log(`  - ${o}`);
    if (result.orphans.length > 30) console.log(`  … and ${result.orphans.length - 30} more`);
  }
  if (result.multiParent.length) {
    console.log(`multi-parent (parent: resolves to >1 page — keep one):`);
    for (const p of result.multiParent) console.log(`  - ${p}`);
  }
  if (result.cycles.length) {
    console.log(`parent-chain cycles (break the loop):`);
    for (const c of result.cycles) console.log(`  - ${c.join(" → ")}`);
  }
  if (oversaturated.length) {
    console.log(`oversaturated nodes (out-degree > ${maxSaturationThreshold} — consider an intermediate hub):`);
    for (const s of oversaturated.slice(0, 30)) console.log(`  ${String(s.outDegree).padStart(4)}  ${s.page}`);
  }
  if (result.nonSpineEdges.length) {
    console.log(`non-spine edges (demote to prose/tag — only the spine should draw edges):`);
    for (const e of result.nonSpineEdges.slice(0, 50)) {
      console.log(`  [${e.kind}]  ${e.from}  →  ${e.to}`);
    }
    if (result.nonSpineEdges.length > 50) {
      console.log(`  … and ${result.nonSpineEdges.length - 50} more`);
    }
  }
  if (mt.nonSpineEdgeCount === 0 && mt.cycleCount === 0 && mt.multiParentCount === 0 && mt.orphanCount === 0) {
    console.log("OK: vault is a strict tree (spine-only edges, no orphans/cycles/multi-parents).");
  }
}
