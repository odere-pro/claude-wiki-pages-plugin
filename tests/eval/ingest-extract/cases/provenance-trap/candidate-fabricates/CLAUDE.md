# Planted-Bad Candidate — Schema

`schema_version: 2`

This is a PLANTED-BAD candidate extraction for the `provenance-trap` eval case
(`docs/plan/0003-local-model-quality-gate.md`). It deliberately fabricates an unsourced sourced claim (price/license the source never stated).

The driver's `--self-test` asserts this candidate is CAUGHT (verdict fail).
It must NEVER pass the bar. Scored by EXACT STRUCTURAL comparison against
`../expected` — never embeddings or vector similarity (§5 NO-RAG).
