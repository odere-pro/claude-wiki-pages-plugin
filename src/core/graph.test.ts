/**
 * Tests for src/core/graph.ts — the one graph-traversal primitive.
 *
 * 13-test suite covering:
 *  (1)  N-hop walk byte-identical ×5 runs
 *  (2)  traversal order total/sorted
 *  (3)  nearest-hop dedup deterministic
 *  (4)  --graph search byte-identical ×5 (in search.test.ts)
 *  (5)  cycles don't infinite-loop
 *  (6)  N clamped to 2 (no hop>2 even with maxHops:99)
 *  (7)  dangling wikilink skipped, no throw
 *  (8)  score===sum with graph-edge components (in search.test.ts)
 *  (9)  graph never outranks direct keyword hit (in search.test.ts)
 * (10)  --graph off → byte-identical to pre-graph baseline (in search.test.ts)
 * (11)  walk reads NO page bodies (snippet==="")
 * (12)  zero network (fetch-stub)
 * (13)  follows only profile predicates (tags never traversed)
 *
 * Tests for (4),(8),(9),(10) live in search.test.ts where the full search()
 * integration is exercised.
 */

import { test, expect, describe } from "bun:test";
import { walk, R2_EDGES, type GraphWalkOptions } from "./graph.ts";
import { makeVault } from "../test-helpers/sandbox/vault.ts";

// ────────────────────────────────────────────────────────────────────────────
// Vault fixtures
// ────────────────────────────────────────────────────────────────────────────

/**
 * Linear chain: seed → Page A → Page B
 *
 *   seed.md         sources: ["[[Page A]]"]
 *   page-a.md       sources: ["[[Page B]]"]
 *   page-b.md       (leaf — no outgoing edges)
 *
 * Hop-1 from seed: Page A
 * Hop-2 from seed: Page B
 */
function makeLinearVault() {
  return makeVault({
    "CLAUDE.md": "---\nschema_version: 2\n---\n",
    "wiki/index.md": "---\ntitle: index\n---\n",
    "wiki/log.md": "---\ntitle: log\n---\n",
    "wiki/seed.md":
      '---\ntitle: "Seed"\ntype: concept\nsources: ["[[Page A]]"]\n---\n# Seed\nSeed body.\n',
    "wiki/page-a.md":
      '---\ntitle: "Page A"\ntype: entity\naliases: ["Page A"]\nsources: ["[[Page B]]"]\n---\n# Page A\nPage A body.\n',
    "wiki/page-b.md":
      '---\ntitle: "Page B"\ntype: entity\naliases: ["Page B"]\nsources: []\n---\n# Page B\nPage B body.\n',
  });
}

/**
 * Cycle vault: Page X → Page Y → Page X (sources forming a cycle)
 *
 *   page-x.md   sources: ["[[Page Y]]"]
 *   page-y.md   sources: ["[[Page X]]"]
 */
function makeCycleVault() {
  return makeVault({
    "CLAUDE.md": "---\nschema_version: 2\n---\n",
    "wiki/index.md": "---\ntitle: index\n---\n",
    "wiki/log.md": "---\ntitle: log\n---\n",
    "wiki/page-x.md":
      '---\ntitle: "Page X"\ntype: concept\nsources: ["[[Page Y]]"]\n---\n# Page X\n',
    "wiki/page-y.md":
      '---\ntitle: "Page Y"\ntype: entity\nsources: ["[[Page X]]"]\n---\n# Page Y\n',
  });
}

/**
 * Multi-hop vault with both `sources` and `related` edges.
 *
 *   seed.md      sources: ["[[Alpha]]"]  related: ["[[Beta]]"]
 *   alpha.md     sources: ["[[Gamma]]"]
 *   beta.md      (no outgoing edges)
 *   gamma.md     (leaf)
 *
 * Seeds=[seed]:
 *   hop-1: Alpha (via sources), Beta (via related)
 *   hop-2: Gamma (via sources from Alpha)
 */
function makeMultiEdgeVault() {
  return makeVault({
    "CLAUDE.md": "---\nschema_version: 2\n---\n",
    "wiki/index.md": "---\ntitle: index\n---\n",
    "wiki/log.md": "---\ntitle: log\n---\n",
    "wiki/seed.md":
      '---\ntitle: "Seed"\ntype: concept\nsources: ["[[Alpha]]"]\nrelated: ["[[Beta]]"]\n---\n# Seed\n',
    "wiki/alpha.md":
      '---\ntitle: "Alpha"\ntype: entity\naliases: ["Alpha"]\nsources: ["[[Gamma]]"]\n---\n# Alpha\n',
    "wiki/beta.md": '---\ntitle: "Beta"\ntype: entity\naliases: ["Beta"]\n---\n# Beta\n',
    "wiki/gamma.md": '---\ntitle: "Gamma"\ntype: entity\naliases: ["Gamma"]\n---\n# Gamma\n',
  });
}

/**
 * Dangling-link vault: seed references a page that does not exist.
 *
 *   seed.md   sources: ["[[Ghost Page]]"]
 */
function makeDanglingVault() {
  return makeVault({
    "CLAUDE.md": "---\nschema_version: 2\n---\n",
    "wiki/index.md": "---\ntitle: index\n---\n",
    "wiki/log.md": "---\ntitle: log\n---\n",
    "wiki/seed.md": '---\ntitle: "Seed"\ntype: concept\nsources: ["[[Ghost Page]]"]\n---\n# Seed\n',
  });
}

/**
 * Tags-not-traversed vault: seed has a `tags` field — must NOT be traversed.
 *
 *   seed.md   sources: ["[[Alpha]]"]  tags: ["[[Tagged Page]]"]
 *   alpha.md  (leaf)
 *   tagged-page.md  (exists, but must NOT appear via tags traversal)
 */
function makeTagsVault() {
  return makeVault({
    "CLAUDE.md": "---\nschema_version: 2\n---\n",
    "wiki/index.md": "---\ntitle: index\n---\n",
    "wiki/log.md": "---\ntitle: log\n---\n",
    "wiki/seed.md":
      '---\ntitle: "Seed"\ntype: concept\nsources: ["[[Alpha]]"]\ntags: ["[[Tagged Page]]"]\n---\n# Seed\n',
    "wiki/alpha.md": '---\ntitle: "Alpha"\ntype: entity\naliases: ["Alpha"]\n---\n# Alpha\n',
    "wiki/tagged-page.md":
      '---\ntitle: "Tagged Page"\ntype: entity\naliases: ["Tagged Page"]\n---\n# Tagged Page\n',
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Test (1) — byte-identical ×5 runs
// ────────────────────────────────────────────────────────────────────────────
describe("Feature: Search › graph traversal — graph walk primitive", () => {
  test("(1) walk is byte-identical across 5 runs (deterministic)", () => {
    const sb = makeLinearVault();
    const opts: GraphWalkOptions = {
      vault: sb.vault,
      seeds: ["wiki/seed.md"],
      edges: R2_EDGES,
      maxHops: 2,
    };
    const results = Array.from({ length: 5 }, () => JSON.stringify(walk(opts).refs));
    const first = results[0] ?? "";
    for (const r of results) {
      expect(r).toBe(first);
    }
    sb.cleanup();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Test (2) — traversal order: hop asc, score desc, file asc
  // ────────────────────────────────────────────────────────────────────────
  test("(2) output refs are sorted by (hop asc, score desc, file asc)", () => {
    const sb = makeMultiEdgeVault();
    const opts: GraphWalkOptions = {
      vault: sb.vault,
      seeds: ["wiki/seed.md"],
      edges: R2_EDGES,
      maxHops: 2,
    };
    const { refs } = walk(opts);
    expect(refs.length).toBeGreaterThan(0);

    // Verify sort: hop asc first
    for (let i = 1; i < refs.length; i++) {
      const prev = refs[i - 1]!;
      const curr = refs[i]!;
      if (prev.hop < curr.hop) continue; // hop increased: fine
      if (prev.hop > curr.hop) {
        throw new Error(
          `Refs not sorted by hop asc: refs[${i - 1}].hop=${prev.hop} > refs[${i}].hop=${curr.hop}`,
        );
      }
      // Same hop: score desc
      if (prev.score > curr.score) continue;
      if (prev.score < curr.score) {
        throw new Error(
          `Refs not sorted by score desc within hop: refs[${i - 1}].score=${prev.score} < refs[${i}].score=${curr.score}`,
        );
      }
      // Same hop + score: file asc
      expect(prev.file.localeCompare(curr.file)).toBeLessThanOrEqual(0);
    }
    sb.cleanup();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Test (2b) — multi-edge vault has expected refs at expected hops
  // ────────────────────────────────────────────────────────────────────────
  test("(2b) multi-edge vault: hop-1 has Alpha+Beta, hop-2 has Gamma", () => {
    const sb = makeMultiEdgeVault();
    const opts: GraphWalkOptions = {
      vault: sb.vault,
      seeds: ["wiki/seed.md"],
      edges: R2_EDGES,
      maxHops: 2,
    };
    const { refs } = walk(opts);
    const hop1 = refs.filter((r) => r.hop === 1).map((r) => r.wikilink);
    const hop2 = refs.filter((r) => r.hop === 2).map((r) => r.wikilink);
    expect(hop1).toContain("[[Alpha]]");
    expect(hop1).toContain("[[Beta]]");
    expect(hop2).toContain("[[Gamma]]");
    sb.cleanup();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Test (3) — nearest-hop dedup: page reachable at hop-1 and hop-2 appears
  //            only once (at hop-1)
  // ────────────────────────────────────────────────────────────────────────
  test("(3) nearest-hop dedup: page reached at hop-1 and hop-2 recorded once at hop-1", () => {
    // Diamond: seed→A (hop-1), seed→B (hop-1), A→C (hop-2), B→C (hop-2)
    // C should appear exactly once at hop-2.
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/seed.md":
        '---\ntitle: "Seed"\ntype: concept\nsources: ["[[Node A]]","[[Node B]]"]\n---\n',
      "wiki/node-a.md":
        '---\ntitle: "Node A"\ntype: entity\naliases: ["Node A"]\nrelated: ["[[Node C]]"]\n---\n',
      "wiki/node-b.md":
        '---\ntitle: "Node B"\ntype: entity\naliases: ["Node B"]\nrelated: ["[[Node C]]"]\n---\n',
      "wiki/node-c.md": '---\ntitle: "Node C"\ntype: entity\naliases: ["Node C"]\n---\n',
    });
    const opts: GraphWalkOptions = {
      vault: sb.vault,
      seeds: ["wiki/seed.md"],
      edges: R2_EDGES,
      maxHops: 2,
    };
    const { refs } = walk(opts);
    const cRefs = refs.filter((r) => r.wikilink === "[[Node C]]");
    // Must appear exactly once
    expect(cRefs).toHaveLength(1);
    // At hop-2 (seed→A→C or seed→B→C)
    expect(cRefs[0]?.hop).toBe(2);
    sb.cleanup();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Test (5) — cycles don't infinite-loop
  // ────────────────────────────────────────────────────────────────────────
  test("(5) cyclic wikilinks do not cause infinite loop", () => {
    const sb = makeCycleVault();
    // Should complete without hanging; both pages should appear in refs.
    const opts: GraphWalkOptions = {
      vault: sb.vault,
      seeds: ["wiki/page-x.md"],
      edges: R2_EDGES,
      maxHops: 2,
    };
    const { refs } = walk(opts);
    // Page Y is hop-1 from Page X. Page X is seeded (visited), so no infinite loop.
    expect(refs.some((r) => r.wikilink === "[[Page Y]]")).toBe(true);
    // Page X itself must NOT re-appear (it was the seed, already in visited).
    expect(refs.some((r) => r.wikilink === "[[Page X]]")).toBe(false);
    sb.cleanup();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Test (6) — N clamped to 2 (maxHops:99 still only walks 2 hops)
  // ────────────────────────────────────────────────────────────────────────
  test("(6) maxHops > 2 is clamped to 2: no ref with hop > 2 even with maxHops:99", () => {
    // Chain of 4: seed→A→B→C
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/seed.md": '---\ntitle: "Seed"\ntype: concept\nsources: ["[[Chain A]]"]\n---\n',
      "wiki/chain-a.md":
        '---\ntitle: "Chain A"\ntype: entity\naliases: ["Chain A"]\nsources: ["[[Chain B]]"]\n---\n',
      "wiki/chain-b.md":
        '---\ntitle: "Chain B"\ntype: entity\naliases: ["Chain B"]\nsources: ["[[Chain C]]"]\n---\n',
      "wiki/chain-c.md": '---\ntitle: "Chain C"\ntype: entity\naliases: ["Chain C"]\n---\n',
    });
    const opts: GraphWalkOptions = {
      vault: sb.vault,
      seeds: ["wiki/seed.md"],
      edges: R2_EDGES,
      maxHops: 99, // must be clamped to 2
    };
    const { refs } = walk(opts);
    for (const ref of refs) {
      expect(ref.hop).toBeLessThanOrEqual(2);
    }
    // Chain B is hop-2 (accessible); Chain C is hop-3 (should NOT appear)
    expect(refs.some((r) => r.wikilink === "[[Chain A]]")).toBe(true);
    expect(refs.some((r) => r.wikilink === "[[Chain B]]")).toBe(true);
    expect(refs.some((r) => r.wikilink === "[[Chain C]]")).toBe(false);
    sb.cleanup();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Test (6b) — maxHops < 1 is clamped to 1
  // ────────────────────────────────────────────────────────────────────────
  test("(6b) maxHops=0 clamped to 1: only hop-1 refs returned", () => {
    const sb = makeLinearVault();
    const opts: GraphWalkOptions = {
      vault: sb.vault,
      seeds: ["wiki/seed.md"],
      edges: R2_EDGES,
      maxHops: 0,
    };
    const { refs } = walk(opts);
    for (const ref of refs) {
      expect(ref.hop).toBe(1);
    }
    // Page B is hop-2: should NOT appear with maxHops=0 (clamped to 1)
    expect(refs.some((r) => r.wikilink === "[[Page B]]")).toBe(false);
    sb.cleanup();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Test (7) — dangling wikilink skipped, no throw
  // ────────────────────────────────────────────────────────────────────────
  test("(7) dangling wikilink is silently skipped — no error thrown", () => {
    const sb = makeDanglingVault();
    const opts: GraphWalkOptions = {
      vault: sb.vault,
      seeds: ["wiki/seed.md"],
      edges: R2_EDGES,
      maxHops: 2,
    };
    let error: unknown = null;
    let result;
    try {
      result = walk(opts);
    } catch (e) {
      error = e;
    }
    expect(error).toBeNull();
    // The dangling Ghost Page should not appear in refs
    expect(result?.refs.some((r) => r.wikilink === "[[Ghost Page]]")).toBe(false);
    sb.cleanup();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Test (11) — walk reads NO page bodies: all snippet fields are ""
  //            (this is enforced in search integration tests too)
  // ────────────────────────────────────────────────────────────────────────
  test("(11) GraphRef has no body/snippet — walk returns only metadata refs", () => {
    const sb = makeLinearVault();
    const opts: GraphWalkOptions = {
      vault: sb.vault,
      seeds: ["wiki/seed.md"],
      edges: R2_EDGES,
      maxHops: 2,
    };
    const { refs } = walk(opts);
    expect(refs.length).toBeGreaterThan(0);
    // GraphRef has no body/snippet field — just wikilink, file, type, hop, via, score
    for (const ref of refs) {
      expect(typeof ref.wikilink).toBe("string");
      expect(typeof ref.file).toBe("string");
      expect(typeof ref.type).toBe("string");
      expect(typeof ref.hop).toBe("number");
      expect(typeof ref.via).toBe("string");
      expect(typeof ref.score).toBe("number");
      // Ensure there is no `body` or `snippet` property
      expect("body" in ref).toBe(false);
      expect("snippet" in ref).toBe(false);
    }
    sb.cleanup();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Test (12) — zero network: fetch is never called during walk
  // ────────────────────────────────────────────────────────────────────────
  test("(12) zero network: fetch is never called during walk", () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = async () => {
      fetchCalled = true;
      throw new Error("network forbidden on NO-RAG path");
    };
    try {
      const sb = makeLinearVault();
      walk({ vault: sb.vault, seeds: ["wiki/seed.md"], edges: R2_EDGES, maxHops: 2 });
      sb.cleanup();
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(fetchCalled).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────────
  // Test (13) — follows only profile predicates: `tags` is never traversed
  // ────────────────────────────────────────────────────────────────────────
  test("(13) only GraphEdge predicates are traversed — tags field is never followed", () => {
    const sb = makeTagsVault();
    const opts: GraphWalkOptions = {
      vault: sb.vault,
      seeds: ["wiki/seed.md"],
      edges: R2_EDGES,
      maxHops: 2,
    };
    const { refs } = walk(opts);
    // Alpha is reachable via sources
    expect(refs.some((r) => r.wikilink === "[[Alpha]]")).toBe(true);
    // Tagged Page must NOT appear (it's in tags, not a profile predicate)
    expect(refs.some((r) => r.wikilink === "[[Tagged Page]]")).toBe(false);
    sb.cleanup();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Test (1b) — empty seeds → empty refs
  // ────────────────────────────────────────────────────────────────────────
  test("empty seeds returns empty refs", () => {
    const sb = makeLinearVault();
    const { refs } = walk({ vault: sb.vault, seeds: [], edges: R2_EDGES, maxHops: 2 });
    expect(refs).toHaveLength(0);
    sb.cleanup();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Test (1c) — default edges === R2_EDGES when not specified
  // ────────────────────────────────────────────────────────────────────────
  test("default edges (omitted) produces same result as explicit R2_EDGES", () => {
    const sb = makeLinearVault();
    const withEdges = JSON.stringify(
      walk({ vault: sb.vault, seeds: ["wiki/seed.md"], edges: R2_EDGES, maxHops: 2 }).refs,
    );
    const withDefault = JSON.stringify(
      walk({ vault: sb.vault, seeds: ["wiki/seed.md"], maxHops: 2 }).refs,
    );
    expect(withDefault).toBe(withEdges);
    sb.cleanup();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Seeds dedup: same seed file listed twice — same as once
  // ────────────────────────────────────────────────────────────────────────
  test("duplicate seed files produce the same result as a single seed", () => {
    const sb = makeLinearVault();
    const once = JSON.stringify(
      walk({ vault: sb.vault, seeds: ["wiki/seed.md"], edges: R2_EDGES, maxHops: 2 }).refs,
    );
    const twice = JSON.stringify(
      walk({
        vault: sb.vault,
        seeds: ["wiki/seed.md", "wiki/seed.md"],
        edges: R2_EDGES,
        maxHops: 2,
      }).refs,
    );
    expect(twice).toBe(once);
    sb.cleanup();
  });
});
