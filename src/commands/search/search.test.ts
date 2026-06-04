import { test, expect, describe } from "bun:test";
import { search, type MatchComponent } from "./search.ts";
import { makeVault } from "../../test-helpers/sandbox/vault.ts";

const VAULT = {
  "CLAUDE.md": "---\nschema_version: 2\n---\n",
  "wiki/index.md": "---\ntitle: index\n---\n",
  "wiki/log.md": "---\ntitle: log\n---\n",
  "wiki/ai/retrieval.md":
    '---\ntitle: "Retrieval Augmented Generation"\ntype: concept\naliases: ["Retrieval Augmented Generation", "RAG"]\ntags: ["retrieval"]\n---\n# Retrieval Augmented Generation\n\nRetrieval grounds the model in fetched context. Retrieval matters.\n',
  "wiki/ai/graph-rag.md":
    '---\ntitle: "Graph RAG"\ntype: concept\naliases: ["Graph RAG"]\ntags: []\n---\n# Graph RAG\n\nGraph RAG walks the knowledge graph for retrieval.\n',
  "wiki/ai/unrelated.md":
    '---\ntitle: "Quilting"\ntype: concept\naliases: ["Quilting"]\n---\n# Quilting\n\nAbout fabric.\n',
};

/**
 * R1 filter vault — pages across types, folders, and tags.
 *
 * wiki/ai/retrieval.md   type:concept   folder:wiki/ai   tags:[retrieval]
 * wiki/ai/graph-rag.md   type:concept   folder:wiki/ai   tags:[]
 * wiki/systems/cache.md  type:entity    folder:wiki/systems  tags:[retrieval,cache]
 * wiki/systems/index.md  type:index     folder:wiki/systems  tags:[]
 */
const FILTER_VAULT = {
  "CLAUDE.md": "---\nschema_version: 2\n---\n",
  "wiki/index.md": "---\ntitle: index\n---\n",
  "wiki/log.md": "---\ntitle: log\n---\n",
  "wiki/ai/retrieval.md":
    '---\ntitle: "Retrieval Augmented Generation"\ntype: concept\ntags: ["retrieval"]\n---\n# Retrieval Augmented Generation\n\nRetrieval is important.\n',
  "wiki/ai/graph-rag.md":
    '---\ntitle: "Graph RAG"\ntype: concept\ntags: []\n---\n# Graph RAG\n\nGraph RAG uses retrieval.\n',
  "wiki/systems/cache.md":
    '---\ntitle: "Cache"\ntype: entity\ntags: ["retrieval","cache"]\n---\n# Cache\n\nA cache improves retrieval speed.\n',
  "wiki/systems/_index.md":
    '---\ntitle: "systems index"\ntype: index\ntags: []\n---\n# Systems\n\nSystems retrieval overview.\n',
};

/**
 * Worked example vault for R4.
 * Title "Graph RAG", tags [], body "graph"×3 + "retrieval"×1
 * query "graph retrieval" →
 *   score 9 === [{title-term,graph,1,5},{body-term,graph,3,3},{body-term,retrieval,1,1}]
 */
const WORKED_VAULT = {
  "CLAUDE.md": "---\nschema_version: 2\n---\n",
  "wiki/index.md": "---\ntitle: index\n---\n",
  "wiki/log.md": "---\ntitle: log\n---\n",
  "wiki/graph-rag.md":
    '---\ntitle: "Graph RAG"\ntype: concept\naliases: []\ntags: []\n---\n# Graph RAG\n\ngraph in body once. graph second time. retrieval is here.\n',
};

describe("search", () => {
  test("ranks title/alias matches above body-only matches", () => {
    const sb = makeVault(VAULT);
    const r = search({ target: sb.vault, query: "retrieval" });

    const titles = r.hits.map((h) => h.title);
    expect(titles).toContain("Retrieval Augmented Generation");
    expect(titles).toContain("Graph RAG"); // body mention of "retrieval"
    expect(titles).not.toContain("Quilting");
    // title+alias+tag match outranks the body-only mention
    expect(r.hits[0]?.title).toBe("Retrieval Augmented Generation");
    expect(r.hits[0]?.wikilink).toBe("[[Retrieval Augmented Generation]]");
    sb.cleanup();
  });

  test("skips bookkeeping pages and returns wikilink-ready hits", () => {
    const sb = makeVault(VAULT);
    const r = search({ target: sb.vault, query: "graph rag" });
    expect(r.hits.every((h) => h.file !== "wiki/index.md" && h.file !== "wiki/log.md")).toBe(true);
    expect(r.hits[0]?.title).toBe("Graph RAG");
    sb.cleanup();
  });

  test("empty / whitespace query yields no hits", () => {
    const sb = makeVault(VAULT);
    expect(search({ target: sb.vault, query: "   " }).hits).toHaveLength(0);
    sb.cleanup();
  });

  test("ranking is deterministic across runs", () => {
    const sb = makeVault(VAULT);
    const a = search({ target: sb.vault, query: "retrieval" }).hits.map((h) => h.title);
    const b = search({ target: sb.vault, query: "retrieval" }).hits.map((h) => h.title);
    expect(a).toEqual(b);
    sb.cleanup();
  });

  // ── R4: matched[] hard-invariant: score === sum(matched.map(m => m.points)) ──

  test("score equals sum of matched component points across all hits", () => {
    const sb = makeVault(VAULT);
    const r = search({ target: sb.vault, query: "retrieval" });
    for (const hit of r.hits) {
      const sum = hit.matched.reduce((acc, m) => acc + m.points, 0);
      expect(hit.score).toBe(sum);
    }
    sb.cleanup();
  });

  test("matched[] is present on every hit with score > 0", () => {
    const sb = makeVault(VAULT);
    const r = search({ target: sb.vault, query: "graph rag" });
    expect(r.hits.length).toBeGreaterThan(0);
    for (const hit of r.hits) {
      expect(Array.isArray(hit.matched)).toBe(true);
      expect(hit.matched.length).toBeGreaterThan(0);
    }
    sb.cleanup();
  });

  test("matched[] is deterministic (same query → identical matched arrays)", () => {
    const sb = makeVault(VAULT);
    const r1 = search({ target: sb.vault, query: "retrieval" });
    const r2 = search({ target: sb.vault, query: "retrieval" });
    expect(r1.hits.map((h) => h.matched)).toEqual(r2.hits.map((h) => h.matched));
    sb.cleanup();
  });

  test("matched[] is sorted: points desc, then channel order, then term lexicographic", () => {
    const sb = makeVault(VAULT);
    const r = search({ target: sb.vault, query: "retrieval" });
    for (const hit of r.hits) {
      const sorted = [...hit.matched].sort(matchComponentComparator);
      expect(hit.matched).toEqual(sorted);
    }
    sb.cleanup();
  });

  // ── R4 worked example ──
  // Title "Graph RAG", tags [], body: "graph"×3 + "retrieval"×1
  // query "graph retrieval" → score 9, matched exact order below
  test("worked example: Graph RAG query 'graph retrieval' score===9 matched===spec", () => {
    const sb = makeVault(WORKED_VAULT);
    const r = search({ target: sb.vault, query: "graph retrieval" });
    const hit = r.hits.find((h) => h.title === "Graph RAG");
    expect(hit).toBeDefined();
    expect(hit!.score).toBe(9);

    const expected: readonly MatchComponent[] = [
      { channel: "title-term", term: "graph", hits: 1, points: 5 },
      { channel: "body-term", term: "graph", hits: 3, points: 3 },
      { channel: "body-term", term: "retrieval", hits: 1, points: 1 },
    ];
    expect(hit!.matched).toEqual(expected);

    // Hard invariant: score === sum of points
    const sum = hit!.matched.reduce((acc, m) => acc + m.points, 0);
    expect(hit!.score).toBe(sum);
    sb.cleanup();
  });

  // ── R4: title-phrase component ──
  test("title-phrase component is emitted when phrase appears in titleHay", () => {
    const sb = makeVault(VAULT);
    const r = search({ target: sb.vault, query: "graph rag" });
    const hit = r.hits.find((h) => h.title === "Graph RAG");
    expect(hit).toBeDefined();
    const phraseComp = hit!.matched.find((m) => m.channel === "title-phrase");
    expect(phraseComp).toBeDefined();
    expect(phraseComp!.points).toBe(10);
    expect(phraseComp!.hits).toBe(1);
    sb.cleanup();
  });

  // ── R4: alias-term channel reserved but not emitted ──
  test("alias-term channel is NOT emitted (reserved for future use)", () => {
    const sb = makeVault(VAULT);
    const r = search({ target: sb.vault, query: "rag" });
    // "RAG" is an alias for "Retrieval Augmented Generation"
    for (const hit of r.hits) {
      const aliasCh = hit.matched.find((m) => m.channel === "alias-term");
      expect(aliasCh).toBeUndefined();
    }
    sb.cleanup();
  });

  // ── R4: score===sum invariant holds for multi-term multi-field hits ──
  test("score===sum invariant holds for 'graph rag' (phrase + per-term hits)", () => {
    const sb = makeVault(VAULT);
    const r = search({ target: sb.vault, query: "graph rag" });
    for (const hit of r.hits) {
      const sum = hit.matched.reduce((acc, m) => acc + m.points, 0);
      expect(hit.score).toBe(sum);
    }
    sb.cleanup();
  });

  // ── R1: candidate filters ──

  test("--type concept returns only concept pages", () => {
    const sb = makeVault(FILTER_VAULT);
    const r = search({ target: sb.vault, query: "retrieval", type: "concept" });
    expect(r.hits.length).toBeGreaterThan(0);
    for (const hit of r.hits) {
      expect(hit.type).toBe("concept");
    }
    // entity and index pages are excluded
    const titles = r.hits.map((h) => h.title);
    expect(titles).not.toContain("Cache");
    expect(titles).not.toContain("systems index");
    sb.cleanup();
  });

  test("--type entity returns only entity pages", () => {
    const sb = makeVault(FILTER_VAULT);
    const r = search({ target: sb.vault, query: "retrieval", type: "entity" });
    expect(r.hits.length).toBeGreaterThan(0);
    for (const hit of r.hits) {
      expect(hit.type).toBe("entity");
    }
    sb.cleanup();
  });

  test("--folder wiki/ai returns only pages under wiki/ai/", () => {
    const sb = makeVault(FILTER_VAULT);
    const r = search({ target: sb.vault, query: "retrieval", folder: "wiki/ai" });
    expect(r.hits.length).toBeGreaterThan(0);
    for (const hit of r.hits) {
      expect(hit.file.startsWith("wiki/ai/")).toBe(true);
    }
    // systems pages are excluded
    const titles = r.hits.map((h) => h.title);
    expect(titles).not.toContain("Cache");
    expect(titles).not.toContain("systems index");
    sb.cleanup();
  });

  test("--folder with trailing slash normalised correctly", () => {
    const sb = makeVault(FILTER_VAULT);
    const r = search({ target: sb.vault, query: "retrieval", folder: "wiki/ai/" });
    expect(r.hits.length).toBeGreaterThan(0);
    for (const hit of r.hits) {
      expect(hit.file.startsWith("wiki/ai/")).toBe(true);
    }
    sb.cleanup();
  });

  test("--tag retrieval returns only pages with that tag", () => {
    const sb = makeVault(FILTER_VAULT);
    const r = search({ target: sb.vault, query: "retrieval", tag: "retrieval" });
    expect(r.hits.length).toBeGreaterThan(0);
    for (const hit of r.hits) {
      // all returned hits must score > 0 (already guaranteed) and come from tagged pages
      // we verify by checking the titles known to carry the tag
      expect(["Retrieval Augmented Generation", "Cache"]).toContain(hit.title);
    }
    // Graph RAG (no retrieval tag) is excluded
    const titles = r.hits.map((h) => h.title);
    expect(titles).not.toContain("Graph RAG");
    sb.cleanup();
  });

  test("combined --type and --folder filter with AND semantics", () => {
    const sb = makeVault(FILTER_VAULT);
    // concept pages in wiki/ai only → Graph RAG and Retrieval Augmented Generation qualify
    const r = search({ target: sb.vault, query: "retrieval", type: "concept", folder: "wiki/ai" });
    expect(r.hits.length).toBeGreaterThan(0);
    for (const hit of r.hits) {
      expect(hit.type).toBe("concept");
      expect(hit.file.startsWith("wiki/ai/")).toBe(true);
    }
    // cache (entity in systems) is excluded even though it matches the query
    const titles = r.hits.map((h) => h.title);
    expect(titles).not.toContain("Cache");
    sb.cleanup();
  });

  test("combined --type, --folder, and --tag all AND correctly", () => {
    const sb = makeVault(FILTER_VAULT);
    // concept + wiki/ai + tag:retrieval → only Retrieval Augmented Generation qualifies
    const r = search({
      target: sb.vault,
      query: "retrieval",
      type: "concept",
      folder: "wiki/ai",
      tag: "retrieval",
    });
    expect(r.hits.length).toBe(1);
    expect(r.hits[0]?.title).toBe("Retrieval Augmented Generation");
    sb.cleanup();
  });

  test("out-of-enum --type returns empty hits (filter-only, no validation)", () => {
    const sb = makeVault(FILTER_VAULT);
    // "bogustype" is not in the page-type enum; no page will have it → empty
    const r = search({ target: sb.vault, query: "retrieval", type: "bogustype" });
    expect(r.hits).toHaveLength(0);
    sb.cleanup();
  });

  test("filters do not alter score or matched[] invariants on surviving hits", () => {
    const sb = makeVault(FILTER_VAULT);
    const r = search({ target: sb.vault, query: "retrieval", type: "concept" });
    for (const hit of r.hits) {
      const sum = hit.matched.reduce((acc, m) => acc + m.points, 0);
      expect(hit.score).toBe(sum);
    }
    sb.cleanup();
  });

  test("no filters applied → same result as unfiltered search", () => {
    const sb = makeVault(FILTER_VAULT);
    const unfiltered = search({ target: sb.vault, query: "retrieval" });
    const filtered = search({
      target: sb.vault,
      query: "retrieval",
      type: undefined,
      folder: undefined,
      tag: undefined,
    });
    expect(filtered.hits).toEqual(unfiltered.hits);
    sb.cleanup();
  });
});

/**
 * Comparator that mirrors the sort order required by the spec:
 * 1. points desc
 * 2. channel (union literal order)
 * 3. term lexicographic
 */
const CHANNEL_ORDER: readonly MatchComponent["channel"][] = [
  "title-phrase",
  "title-term",
  "alias-term",
  "tag-term",
  "body-term",
];

function matchComponentComparator(a: MatchComponent, b: MatchComponent): number {
  if (b.points !== a.points) return b.points - a.points;
  const ai = CHANNEL_ORDER.indexOf(a.channel);
  const bi = CHANNEL_ORDER.indexOf(b.channel);
  if (ai !== bi) return ai - bi;
  return a.term.localeCompare(b.term);
}
