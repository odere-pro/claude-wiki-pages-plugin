# Golden Reference Vault — Schema

`schema_version: 2`

This is the GOLDEN reference for the `extract-basic` eval case
(`docs/adr/ADR-0011-local-model-quality-gate.md`). It is the structured output a
correct `ingest-extract` of `../input.md` must produce, authored to the
authoritative schema in `docs/vault-example/CLAUDE.md`.

It is scored by EXACT STRUCTURAL comparison — never embeddings or vector
similarity (§5 NO-RAG). Do not treat this as reference documentation; the
authoritative schema lives in `docs/vault-example/CLAUDE.md`.
