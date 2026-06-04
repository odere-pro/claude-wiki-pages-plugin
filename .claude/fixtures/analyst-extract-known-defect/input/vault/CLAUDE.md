# LLM Wiki — Schema (pointer)

`schema_version: 1`

This vault follows Karpathy's LLM Wiki pattern. `raw/` is immutable source
material; `wiki/` is LLM-maintained. The human curates sources; the LLM
maintains the wiki.

Rules:
- `sources:` values are always `[[wikilinks]]` to a page in `wiki/_sources/`.
- Every wiki page needs `type`, `parent`, `path`, `sources` (top index excepted).
- Each topic folder has an `_index.md` with `children` / `child_indexes` / `aliases`.
- `title` MUST be the first entry in `aliases`.
- Dates use `YYYY-MM-DD`. Filenames kebab-case; titles Title Case.
