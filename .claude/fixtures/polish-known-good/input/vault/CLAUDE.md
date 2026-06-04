# LLM Wiki — Schema (fixture pointer)

`schema_version: 1`

This is a minimal fixture vault following Karpathy's LLM Wiki pattern.

- `raw/` is immutable source material — never modify.
- `wiki/` is LLM-maintained. All knowledge pages live here.
- `sources:` values must be `[[wikilinks]]` to a page in `wiki/_sources/`.
- Every wiki page needs `type`, `parent`, `path`, `sources` (except `wiki/index.md`).
- Each topic folder has an `_index.md` with `children`, `child_indexes`, `aliases`.
- Dates are `YYYY-MM-DD`. Filenames kebab-case; titles Title Case.
