---
title: "Provenance-Tracked Wiki"
type: concept
aliases: ["Provenance-Tracked Wiki", "provenance-tracked wiki", "provenance tracking"]
parent: "[[Patterns]]"
path: "patterns"
sources:
  - "[[Update an Existing Vault]]"
  - "[[Review, Validate, Fix]]"
  - "[[Export Data, Create Output]]"
  - "[[Check the Dashboard]]"
  - "[[Query the Wiki]]"
related:
  - "[[LLM Wiki Pattern]]"
  - "[[Entity Distribution Model]]"
  - "[[Hook-Enforced Guarantees]]"
  - "[[Querying the Wiki]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 5
status: active
confidence: 1.0
---

# Provenance-Tracked Wiki

A provenance-tracked wiki is a wiki in which every claim on every page traces back to an identified source in `vault/raw/` via the `sources:` frontmatter field. No claim exists without a traceable origin.

## Provenance chain

```
vault/raw/<source-file>
  → wiki/_sources/<source-slug>.md   (source summary, type: source)
    → wiki/<topic>/<page>.md          (entity/concept, sources: ["[[Source Title]]"])
      → query answer                  (cites [[Page Title]])
```

## Frontmatter fields that carry provenance

- `sources:` — every entity/concept/topic/project/synthesis page must list at least one source note in `wiki/_sources/`.
- `confidence:` — a float 0.0–1.0 reflecting how many sources corroborate the claim (1.0 = direct quote from authoritative source; 0.8 = two independent sources; 0.6 = single-source internal claim; below 0.5 = inference).
- `source_quotes:` _(optional)_ — claim-level provenance pinning a specific sentence from a source to a specific claim on the page.
- `derived:` _(optional)_ — `true` when the page is LLM inference synthesized across sources rather than stated in any single source; confidence must stay below 0.8.

## Enforcement

The `validate-frontmatter.sh` hook blocks writes that omit `sources:` from pages that require it. The `verify-ingest.sh` script checks for orphan source summaries (source pages not cited by any wiki page) and empty sources arrays.
