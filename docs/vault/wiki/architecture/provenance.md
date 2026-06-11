---
title: "Provenance"
type: concept
aliases: ["Provenance", "provenance", "structural provenance"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture (source)]]", "[[Glossary]]", "[[Features]]"]
related: ["[[Layer 1 — Data]]", "[[Hook-Enforced Safety]]", "[[Four-Layer Stack]]", "[[Ingest Data Flow]]"]
contradicts: []
supersedes: []
depends_on: ["[[Layer 1 — Data]]"]
tags: [provenance, core-concept, architecture]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Provenance

The traceable chain from a wiki page's `sources` frontmatter field through `wiki/_sources/` to raw content in `raw/`. Provenance is **structural** in this plugin — it is enforced by the schema and validated by `verify-ingest.sh`, not by convention alone. This is a foundational principle of the [[Four-Layer Stack]].

## How It Works

Every wiki page (entities, concepts, topics, projects, synthesis notes) carries a required `sources` field listing `[[wikilinks]]` to source summary pages in `wiki/_sources/`. Each source summary page links back to the raw file under `raw/`. The chain is:

```
wiki page → sources: ["[[SourceTitle]]"] → wiki/_sources/source-title.md → raw/source.md
```

Plain strings in the `sources` field (instead of `[[wikilinks]]`) are a lint error.

## Enforcement

- `validate-frontmatter.sh`: blocks writes with missing `sources` fields.
- `check-wikilinks.sh`: verifies wikilinks resolve to real pages.
- `verify-ingest.sh`: post-ingest verification that checks the full provenance chain.
- `protect-raw.sh`: blocks any modification to `raw/` — sources remain immutable.

## Claim-Level Provenance (Schema v2)

For high-stakes or contested claims, the optional `source_quotes` field pins individual claims to the exact verbatim sentence in the source: `{ source: "[[source-note]]", quote: "verbatim sentence" }`. The `derived` field (default `false`) marks pages where the claim is LLM inference synthesised across sources rather than stated in one.
