# Planted-Bad Candidate — Schema

`schema_version: 3`

This is a PLANTED-BAD candidate extraction for the `provenance-trap` eval case
(`docs/adr/ADR-0011-local-model-quality-gate.md`). It deliberately drops a sourced claim, pushing claim<->source fidelity below 0.97.

The driver's `--self-test` asserts this candidate is CAUGHT (verdict fail).
It must NEVER pass the bar. Scored by EXACT STRUCTURAL comparison against
`../expected` — never embeddings or vector similarity (§5 NO-RAG).
