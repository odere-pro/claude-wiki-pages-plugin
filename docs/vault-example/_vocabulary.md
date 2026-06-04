---
title: "Vault Vocabulary"
groups:
  - canonical: "machine learning"
    variants: ["ml", "machine-learning"]
  - canonical: "artificial intelligence"
    variants: ["ai", "artificial-intelligence"]
  - canonical: "natural language processing"
    variants: ["nlp", "natural-language-processing"]
  - canonical: "retrieval augmented generation"
    variants: ["rag", "retrieval-augmented-generation"]
  - canonical: "large language model"
    variants: ["llm", "large-language-model"]
  - canonical: "knowledge graph"
    variants: ["kg", "knowledge-graph"]
  - canonical: "ontology"
    variants: ["ontologies", "taxonomy"]
---

# Vault Vocabulary

Curated synonym groups for this vault. The search engine uses this file to
expand query terms before scoring — a search for "llm" will also match pages
that mention "large language model", and vice versa.

## Usage

The engine reads this file automatically at query time. Human editors curate
it; the engine never writes here.

- Each `canonical` form is the preferred display term.
- `variants` lists alternate spellings, abbreviations, and plural forms.
- All forms are treated as equivalent for retrieval; exact matches still
  score higher than synonym matches.

## Updating

Add a new group for any pair of terms that should be interchangeable in
search. Keep the list DRY: one group per concept. Overlapping groups are
union-merged automatically.
