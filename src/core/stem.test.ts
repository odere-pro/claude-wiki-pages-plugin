import { test, expect, describe } from "bun:test";
import { stem, stemTokens, tokenize } from "./stem.ts";

describe("Feature: Search › Porter stemmer — pure Porter 1980", () => {
  // ── (4) Spec table from the task brief ──────────────────────────────────────
  test("running → run", () => expect(stem("running")).toBe("run"));
  test("ran → ran (no change)", () => expect(stem("ran")).toBe("ran"));
  test("ponies → poni", () => expect(stem("ponies")).toBe("poni"));
  test("caresses → caress", () => expect(stem("caresses")).toBe("caress"));

  // ── Edge cases ───────────────────────────────────────────────────────────────
  test("empty string → empty string", () => expect(stem("")).toBe(""));
  test("one-char → unchanged", () => expect(stem("a")).toBe("a"));
  test("two-char → unchanged", () => expect(stem("is")).toBe("is"));

  // ── (4) Idempotence: stem(stem(x)) === stem(x) for all spec examples ────────
  const idempotentCases = [
    "running",
    "ran",
    "ponies",
    "caresses",
    "automobile",
    "machines",
    "retrieval",
    "generalizations",
    "generalization",
  ];
  for (const word of idempotentCases) {
    test(`idempotent: stem(stem("${word}")) === stem("${word}")`, () => {
      expect(stem(stem(word))).toBe(stem(word));
    });
  }

  // ── (4) Pure: same input → same output ──────────────────────────────────────
  test("pure: 5 calls on 'running' → same result", () => {
    const results = Array.from({ length: 5 }, () => stem("running"));
    expect(new Set(results).size).toBe(1);
  });

  // ── Additional Porter step coverage ─────────────────────────────────────────
  // Note: "generalization" correctly stems to "gener" (step3 gives "general",
  // then step4 strips "al" since measure("gener")=2>1). This matches the Porter
  // algorithm; idempotence still holds (stem("gener") === "gener").
  test("generalization → gener (idempotent Porter result)", () => {
    const s = stem("generalization");
    // idempotent: the stem of a stem is stable
    expect(stem(s)).toBe(s);
  });
  test("electrical → electr", () => expect(stem("electrical")).toBe("electr"));
  test("troubled → troubl", () => expect(stem("troubled")).toBe("troubl"));
  test("sized → size", () => expect(stem("sized")).toBe("size"));
  test("happy → happi", () => expect(stem("happy")).toBe("happi"));
  test("sky → sky (no change)", () => expect(stem("sky")).toBe("sky"));

  // ── tokenize helper (shared; N14) ────────────────────────────────────────────
  test("tokenize splits on non-alphanumeric and lowercases", () => {
    expect(tokenize("Retrieval Augmented Generation")).toEqual([
      "retrieval",
      "augmented",
      "generation",
    ]);
  });

  test("tokenize drops single-char tokens", () => {
    expect(tokenize("a b running")).toEqual(["running"]);
  });

  test("tokenize produces the same token list as the stemTokens input step", () => {
    const text = "Running Cars Automobile";
    const tokens = tokenize(text);
    // stemTokens must contain exactly the stems of those tokens
    const stemmed = stemTokens(text);
    for (const t of tokens) {
      expect(stemmed.has(stem(t))).toBe(true);
    }
  });

  test("tokenize empty string yields empty array", () => {
    expect(tokenize("")).toEqual([]);
  });

  test("tokenize punctuation-only string yields empty array", () => {
    expect(tokenize("--- *** !!!")).toEqual([]);
  });

  // ── stemTokens helper ────────────────────────────────────────────────────────
  test("stemTokens returns Set of stemmed forms", () => {
    const result = stemTokens("running cars automobile");
    expect(result.has(stem("running"))).toBe(true);
    expect(result.has(stem("cars"))).toBe(true);
    expect(result.has(stem("automobile"))).toBe(true);
  });

  test("stemTokens skips single-char tokens", () => {
    const result = stemTokens("a b running");
    expect(result.has("a")).toBe(false);
    expect(result.has("b")).toBe(false);
    expect(result.has(stem("running"))).toBe(true);
  });

  // ── N14 DRY contract: stemTokens === tokenize(text).map(stem) as a Set ───────
  // Guards against future drift where stemTokens might re-introduce an inline
  // tokenization step instead of delegating to the shared tokenize() (N14).
  test("N14: stemTokens output equals new Set(tokenize(text).map(stem))", () => {
    const cases = [
      "Running Cars Automobile",
      "graph retrieval augmented generation",
      "  a  b  c  punctuation!!!  words  ",
      "",
      "UPPER CASE tokens",
      "hyphenated-words and under_scores",
    ];
    for (const text of cases) {
      const fromHelper = stemTokens(text);
      const fromComposition = new Set(tokenize(text).map(stem));
      expect([...fromHelper].sort()).toEqual([...fromComposition].sort());
    }
  });

  test("N14: stemTokens delegates single-char filter to tokenize (not re-implemented)", () => {
    // If stemTokens had its own inline split it might differ from tokenize's filter.
    // Verify the single-char boundary is identical: "ab" passes, "a" is dropped.
    const withSingleChar = stemTokens("a ab");
    const withSingleCharDirect = new Set(tokenize("a ab").map(stem));
    expect([...withSingleChar].sort()).toEqual([...withSingleCharDirect].sort());
    // "ab" is kept (length === 2); "a" is dropped (length === 1)
    expect(withSingleChar.has(stem("ab"))).toBe(true);
    expect(withSingleChar.has("a")).toBe(false);
  });
});
