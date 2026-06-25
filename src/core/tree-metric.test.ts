/**
 * Tests for the one strict-tree edge classification (ADR-0036).
 *
 * Pins the exact metric against the committed tangled-vault fixture (a
 * spine-valid, link-tangled two-island vault) and against a clean tree.
 */

import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { makeVault } from "../test-helpers/sandbox/vault.ts";
import { computeTreeMetric } from "./tree-metric.ts";

const TANGLED = join(import.meta.dir, "../../tests/fixtures/tangled-vault/wiki");

const page = (parent: string, title: string): string =>
  `---\ntitle: "${title}"\nparent: "${parent}"\ntags: []\n---\n# ${title}\n`;

describe("Feature: Lint › tree metric — tangled fixture", () => {
  const m = computeTreeMetric(TANGLED);

  test("counts spine and non-spine edges among visible topic pages", () => {
    expect(m.spineEdgeCount).toBe(14);
    expect(m.nonSpineEdgeCount).toBe(6);
  });

  test("classifies cross-tree and transitive-redundant non-spine edges", () => {
    // a1→b1 (related + body), b1→a1 (body) = 3 cross-tree edges.
    expect(m.crossTreeEdgeCount).toBe(3);
    // a3→alpha (an ancestor on a3's topic path) = 1 transitive-redundant edge.
    expect(m.transitiveRedundantEdgeCount).toBe(1);
  });

  test("reports a clean spine: no cycles, multi-parents, or orphans", () => {
    expect(m.cycleCount).toBe(0);
    expect(m.multiParentCount).toBe(0);
    expect(m.orphanCount).toBe(0);
  });

  test("maxSaturation is the busiest page's out-degree; conformance is 0.7", () => {
    expect(m.maxSaturation).toBe(5); // a1 links out 5 times
    expect(m.treeConformance).toBeCloseTo(0.7, 5); // 14 / (14+6)
  });

  test("never counts an edge into scaffolding (the ROOT spine falls out)", () => {
    // index.md is scaffolding: no folder-note → index edge appears as cross-tree.
    for (const e of m.nonSpineEdges) {
      expect(e.from).not.toBe("index.md");
      expect(e.to).not.toBe("index.md");
    }
  });
});

describe("Feature: Lint › tree metric — clean tree", () => {
  test("a spine-only vault has treeConformance 1 and zero non-spine edges", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 3\n---\n# Vault\n",
      "wiki/index.md": '---\ntitle: "Wiki Index"\ntype: index\nparent: ""\ntags: []\n---\n',
      "wiki/topic-a/topic-a.md":
        '---\ntitle: "Topic A"\ntype: index\nparent: "[[index|Wiki Index]]"\nchildren: ["[[a1|A1]]"]\ntags: []\n---\n# Topic A\nChild: [[a1|A1]]\n',
      "wiki/topic-a/a1.md": page("[[topic-a|Topic A]]", "A1"),
    });
    const m = computeTreeMetric(join(sb.vault, "wiki"));
    expect(m.nonSpineEdgeCount).toBe(0);
    expect(m.crossTreeEdgeCount).toBe(0);
    expect(m.treeConformance).toBe(1);
    expect(m.spineEdgeCount).toBeGreaterThan(0);
    sb.cleanup();
  });
});
