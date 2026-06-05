# Golden Reference Vault — Schema

`schema_version: 2`

This is the GOLDEN reference for the `provenance-trap` eval case
(`docs/plan/0003-local-model-quality-gate.md`). It is the structured output a
correct `ingest-extract` of `../input.md` must produce: every claim traces to
the source, and NO unsourced fact (price, license, revenue) is invented.

Sibling directories `candidate-*` are deliberately PLANTED-BAD extractions the
driver's `--self-test` asserts are caught. Scored by EXACT STRUCTURAL
comparison — never embeddings or vector similarity (§5 NO-RAG).
