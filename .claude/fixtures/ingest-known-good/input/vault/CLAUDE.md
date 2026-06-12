# LLM Wiki — Schema (fixture pointer)

`schema_version: 2`

This file is the authoritative schema for any wiki operation in this vault.

- `raw/` is immutable source material. Never modify files here.
- `wiki/` is LLM-maintained. All knowledge pages live here.
- `sources:` values are always `[[wikilinks]]` to a page in `wiki/_sources/`.
- Every wiki page needs `type`, `parent`, `path`, and `sources` (except the top `wiki/index.md`, which uses empty `parent`/`path`).
- Each topic folder has an `_index.md` with `children`, `child_indexes`, and `aliases`.
- Filenames are kebab-case; titles are Title Case; wikilinks reference titles.

See `docs/vault-example/CLAUDE.md` for the full schema.
