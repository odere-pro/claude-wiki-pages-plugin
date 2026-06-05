# Planted-Bad Candidate — Schema

`schema_version: 2`

This is a PLANTED-BAD candidate extraction for the `provenance-trap` eval case
(`docs/plan/0003-local-model-quality-gate.md`). It is the **Finding-1 regression
fixture**: its `source_quotes` reproduce the gold claims but ALSO add one
fabricated, **lowercase-initial / order-divergent** quote ("a paid sync
service…"). That line sorts differently under JS code-unit order (the extractor's
`.sort()`) than under a case-insensitive UTF-8 locale — the exact condition that
made GNU `comm` on CI abort its sort-order check and, with the old `|| true`
swallow, silently zero the fabrication FLOOR (a latent fail-open).

The driver now uses an order- and locale-independent set diff, so the fabrication
is caught regardless of platform. The driver's `--self-test` asserts this
candidate is CAUGHT (verdict fail, fabricated >= 1). Scored by EXACT STRUCTURAL
comparison against `../expected` — never embeddings or vector similarity
(§5 NO-RAG).
