---
title: "stem.ts Source"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["engine", "typescript", "stemmer", "nlp"]
aliases: ["stem.ts Source"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# stem.ts Source

## Summary

`src/core/stem.ts` implements the Porter 1980 stemmer in pure, zero-dependency TypeScript. Steps 1a through 5b follow the original paper exactly. The public API is `stem(token: string): string` (requires lowercase input) and `stemTokens(text: string): ReadonlySet<string>` (tokenizes then stems). Three formal guarantees: pure (same input → same output), total (never throws; `""` → `""`), idempotent (`stem(stem(x)) === stem(x)`).

## Key Claims

- `cons(s, i)` handles the `y` rule: `y` is a consonant at position 0, else has the opposite value of the previous character.
- `measure(s)` counts VC transitions in the stem (Porter's `m` function).
- Steps: 1a (plurals), 1b (-eed/-ed/-ing), 1c (y→i), 2 (derivational suffixes), 3 (further removal), 4 (m>1 removal), 5a (final -e), 5b (-ll→-l).
- Callers must pass ASCII-lowercase input; `stemTokens` handles lowercase conversion.
- `stemTokens()` tokenizes on `[^a-z0-9]+`, filters tokens ≤ 1 char, returns a `ReadonlySet<string>`.
- Used by search.ts stem channel for tokenized set equality checks (NOT substring includes).

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[Porter Stemmer]]
- [[Tier-2 Deterministic Recall]]
- [[Search Scoring Algorithm]]
