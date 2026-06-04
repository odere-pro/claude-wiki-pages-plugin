# LLM Wiki — Schema (fixture)

`schema_version: 1`

- `raw/` is immutable source material. Never modify it.
- `wiki/` is LLM-maintained. All knowledge pages live here.
- `sources:` values must be `[[wikilinks]]` to a page in `wiki/_sources/`.
- Every wiki page (except `wiki/index.md`) needs `type`, `parent`, `path`, `sources`.
- Each topic folder has an `_index.md` with `children`, `child_indexes`, `aliases`.
- `title` must be the first entry in `aliases`. Dates are `YYYY-MM-DD`.
