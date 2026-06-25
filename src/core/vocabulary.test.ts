import { test, expect, describe } from "bun:test";
import { loadLexicon, synonymsOf, VOCABULARY_FILE } from "./vocabulary.ts";
import { makeVault } from "../test-helpers/sandbox/vault.ts";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeVocabVault(vocabContent: string): ReturnType<typeof makeVault> {
  return makeVault({
    "CLAUDE.md": "---\nschema_version: 2\n---\n",
    "wiki/index.md": "---\ntitle: index\n---\n",
    [VOCABULARY_FILE]: vocabContent,
  });
}

const VOCAB_AUTOS = `---
title: "Vault Vocabulary"
groups:
  - canonical: "automobile"
    variants: ["car", "auto", "motorcar"]
  - canonical: "machine learning"
    variants: ["ml", "machine-learning"]
---
# Vault Vocabulary

Curated synonym groups.
`;

// ── (7) synonymsOf pure ────────────────────────────────────────────────────────

describe("Feature: Search › synonym expansion — pure lookup", () => {
  test("returns sorted synonyms for a known term", () => {
    const sb = makeVocabVault(VOCAB_AUTOS);
    const lex = loadLexicon(sb.vault);
    const syns = synonymsOf(lex, "automobile");
    expect(syns).toEqual(["auto", "car", "motorcar"]); // sorted
    sb.cleanup();
  });

  test("returns synonyms for a variant (bidirectional)", () => {
    const sb = makeVocabVault(VOCAB_AUTOS);
    const lex = loadLexicon(sb.vault);
    const syns = synonymsOf(lex, "car");
    // car → all other members: auto, automobile, motorcar
    expect(syns).toEqual(["auto", "automobile", "motorcar"]);
    sb.cleanup();
  });

  test("returns empty for unknown term", () => {
    const sb = makeVocabVault(VOCAB_AUTOS);
    const lex = loadLexicon(sb.vault);
    expect(synonymsOf(lex, "bicycle")).toEqual([]);
    sb.cleanup();
  });

  test("synonymsOf is case-insensitive (normalises input)", () => {
    const sb = makeVocabVault(VOCAB_AUTOS);
    const lex = loadLexicon(sb.vault);
    expect(synonymsOf(lex, "Automobile")).toEqual(synonymsOf(lex, "automobile"));
    sb.cleanup();
  });

  test("synonymsOf is pure: identical results across 5 calls", () => {
    const sb = makeVocabVault(VOCAB_AUTOS);
    const lex = loadLexicon(sb.vault);
    const results = Array.from({ length: 5 }, () => synonymsOf(lex, "automobile"));
    const first = results[0] ?? [];
    for (const r of results) {
      expect(r).toEqual(first);
    }
    sb.cleanup();
  });
});

// ── (2) Lexicon loads correctly ────────────────────────────────────────────────

describe("Feature: Search › synonym expansion — lexicon parsing", () => {
  test("loads and expands automobile group correctly", () => {
    const sb = makeVocabVault(VOCAB_AUTOS);
    const lex = loadLexicon(sb.vault);
    // automobile ↔ car ↔ auto ↔ motorcar all expand to each other
    expect(synonymsOf(lex, "automobile")).toEqual(["auto", "car", "motorcar"]);
    expect(synonymsOf(lex, "ml")).toEqual(["machine learning", "machine-learning"]);
    sb.cleanup();
  });

  // ── (8) absent file → exact pre-Tier-2 behavior ─────────────────────────────
  test("absent _vocabulary.md → empty lexicon, never throws", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
    });
    let lex!: ReturnType<typeof loadLexicon>;
    expect(() => {
      lex = loadLexicon(sb.vault);
    }).not.toThrow();
    expect(lex.expand.size).toBe(0);
    expect(synonymsOf(lex, "automobile")).toEqual([]);
    sb.cleanup();
  });

  test("malformed YAML in vocabulary → empty lexicon, never throws", () => {
    const sb = makeVocabVault("---\ngroups: not_a_list\n---\n");
    expect(() => loadLexicon(sb.vault)).not.toThrow();
    const lex = loadLexicon(sb.vault);
    expect(lex.expand.size).toBe(0);
    sb.cleanup();
  });

  // ── (5) Parse order-independent (two files, groups reordered → same output) ──
  test("parse order-independent: groups in different order yield same expansion", () => {
    const vocabA = `---
title: "Vocab A"
groups:
  - canonical: "automobile"
    variants: ["car", "auto"]
  - canonical: "machine learning"
    variants: ["ml"]
---
`;
    const vocabB = `---
title: "Vocab B"
groups:
  - canonical: "machine learning"
    variants: ["ml"]
  - canonical: "automobile"
    variants: ["car", "auto"]
---
`;
    const sbA = makeVocabVault(vocabA);
    const sbB = makeVocabVault(vocabB);
    const lexA = loadLexicon(sbA.vault);
    const lexB = loadLexicon(sbB.vault);

    // Expansion for "automobile" must be the same regardless of group order
    expect(synonymsOf(lexA, "automobile")).toEqual(synonymsOf(lexB, "automobile"));
    expect(synonymsOf(lexA, "ml")).toEqual(synonymsOf(lexB, "ml"));
    sbA.cleanup();
    sbB.cleanup();
  });

  // ── Overlapping groups merge (union) ─────────────────────────────────────────
  test("overlapping groups union-merge: shared form gets all peers", () => {
    // "car" is in two groups; it should expand to ALL other members of both.
    const vocab = `---
title: "Overlapping"
groups:
  - canonical: "automobile"
    variants: ["car"]
  - canonical: "vehicle"
    variants: ["car", "transport"]
---
`;
    const sb = makeVocabVault(vocab);
    const lex = loadLexicon(sb.vault);
    const carSyns = synonymsOf(lex, "car");
    // car is in group1 (→ automobile) and group2 (→ vehicle, transport)
    expect(carSyns).toContain("automobile");
    expect(carSyns).toContain("vehicle");
    expect(carSyns).toContain("transport");
    sb.cleanup();
  });

  // ── Transitive-chain closure is order-independent (BLOCK 2 regression) ────────
  // A 4-group chain alpha–bravo–charlie–delta where each group shares one form
  // with the next. The full connected-component closure means EVERY form expands
  // to the entire component — and this must NOT depend on group file order.
  // A single forward-pass merge computed only a partial, order-sensitive closure.
  const CHAIN_FORWARD = `---
title: "Chain Forward"
groups:
  - canonical: "alpha"
    variants: ["bravo"]
  - canonical: "bravo"
    variants: ["charlie"]
  - canonical: "charlie"
    variants: ["delta"]
---
`;
  const CHAIN_REVERSE = `---
title: "Chain Reverse"
groups:
  - canonical: "charlie"
    variants: ["delta"]
  - canonical: "bravo"
    variants: ["charlie"]
  - canonical: "alpha"
    variants: ["bravo"]
---
`;

  test("transitive chain: alpha expands to the full component (closure, not partial)", () => {
    const sb = makeVocabVault(CHAIN_FORWARD);
    const lex = loadLexicon(sb.vault);
    // alpha must reach bravo, charlie AND delta — the entire connected component.
    expect(synonymsOf(lex, "alpha")).toEqual(["bravo", "charlie", "delta"]);
    sb.cleanup();
  });

  test("transitive chain: forward and reverse group order yield identical expansion at every node", () => {
    const sbF = makeVocabVault(CHAIN_FORWARD);
    const sbR = makeVocabVault(CHAIN_REVERSE);
    const lexF = loadLexicon(sbF.vault);
    const lexR = loadLexicon(sbR.vault);

    // Every form in the chain must expand identically regardless of file order.
    for (const form of ["alpha", "bravo", "charlie", "delta"]) {
      expect(synonymsOf(lexF, form)).toEqual(synonymsOf(lexR, form));
    }
    // And the closure is complete: each form sees the OTHER three.
    expect(synonymsOf(lexF, "alpha")).toEqual(["bravo", "charlie", "delta"]);
    expect(synonymsOf(lexR, "delta")).toEqual(["alpha", "bravo", "charlie"]);
    sbF.cleanup();
    sbR.cleanup();
  });

  // ── VOCABULARY_FILE constant is "_vocabulary.md" ─────────────────────────────
  test("VOCABULARY_FILE is the expected filename", () => {
    expect(VOCABULARY_FILE).toBe("_vocabulary.md");
  });
});

// ── (6) Zero network ──────────────────────────────────────────────────────────

describe("Feature: Search › synonym expansion — lexicon zero network", () => {
  test("no network call is made when loading lexicon", () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = async () => {
      fetchCalled = true;
      throw new Error("network is forbidden in NO-RAG path");
    };
    try {
      const sb = makeVocabVault(VOCAB_AUTOS);
      loadLexicon(sb.vault);
      synonymsOf(loadLexicon(sb.vault), "automobile");
      sb.cleanup();
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(fetchCalled).toBe(false);
  });
});
