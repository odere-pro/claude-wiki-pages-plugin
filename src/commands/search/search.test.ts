import { test, expect, describe } from "bun:test";
import { search } from "./search.ts";
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
});
