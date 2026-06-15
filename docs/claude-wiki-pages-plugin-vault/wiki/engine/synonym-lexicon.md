---
title: "Synonym Lexicon"
type: concept
aliases: ["Synonym Lexicon", "_vocabulary.md", "synonym lexicon", "loadLexicon", "synonymsOf"]
parent: "[[engine-index|Engine — Index]]"
path: "engine"
sources: ["[[vocabulary-ts-source|vocabulary.ts Source]]", "[[search-ts-source|search.ts Source]]", "[[engine-api-skill|Engine API Skill (SKILL.md)]]"]
related: ["[[tier-2-deterministic-recall|Tier-2 Deterministic Recall]]", "[[search-scoring-algorithm|Search Scoring Algorithm]]", "[[porter-stemmer|Porter Stemmer]]", "[[wiki-native-recall|Wiki-Native Recall]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["engine", "vocabulary", "synonyms", "nlp"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Synonym Lexicon

## Definition

The Synonym Lexicon is the curated synonym expansion file (`_vocabulary.md`) at vault root, loaded by `src/core/vocabulary.ts` and used by the `synonym-term` channel in search. `loadLexicon()` parses the frontmatter `groups:` array and compiles it into a bidirectional `SynonymLexicon` using union-find for connected-component closure. `synonymsOf(lexicon, term)` returns the sorted list of synonyms for a query term.

## Key Principles

- **Filename-addressed, not type-enum-addressed**: the file is `_vocabulary.md` with no `type:` field. Adding a type for it was rejected (NO-RAG, closed enum); the engine reads it by filename.
- **Union-find for transitive closure**: if group A and group B share a synonym, they are merged into one connected component. Declaration order does not affect the result.
- **Bidirectional expand map**: `expand.get(form)` returns the OTHER forms in the component (not the form itself). All keys and values are lowercased+trimmed.
- **Deterministic root selection**: during union-find merging, the lexicographically smaller root becomes canonical — order-independent.
- **Absent file degrades gracefully**: `loadLexicon()` returns `EMPTY_LEXICON = { expand: new Map() }` when the file is absent or unreadable; the synonym channel simply emits nothing.
- **Humans curate, engine reads**: the engine NEVER writes `_vocabulary.md`; it is human-maintained.
- **Loaded per call**: the lexicon is loaded fresh on each `search()` call; it is not cached across calls.

## Examples

`_vocabulary.md` frontmatter:

```yaml
groups:
  - canonical: heal
    variants: [fix, repair]
  - canonical: fix
    variants: [patch]
```

After union-find: `{heal, fix, repair, patch}` are one connected component.
`synonymsOf(lexicon, "heal")` → `["fix", "patch", "repair"]` (sorted).
`synonymsOf(lexicon, "patch")` → `["fix", "heal", "repair"]` (sorted).

## Related Concepts

- [[tier-2-deterministic-recall|Tier-2 Deterministic Recall]] — the search layer that calls loadLexicon() and synonymsOf()
- [[search-scoring-algorithm|Search Scoring Algorithm]] — the synonym-term channel scores lower than exact matches
- [[porter-stemmer|Porter Stemmer]] — the complementary algorithmic expansion (vs human-curated synonyms)
