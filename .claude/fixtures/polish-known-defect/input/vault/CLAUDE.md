# LLM Wiki — Schema (fixture pointer)

`schema_version: 3`

This is a minimal fixture vault following Karpathy's LLM Wiki pattern.

- `raw/` is immutable source material — never modify.
- `wiki/` is LLM-maintained. All knowledge pages live here.
- `sources:` values must be `[[wikilinks]]` to a page in `wiki/_sources/`.
- Every wiki page needs `type`, `parent`, `path`, `sources` (except `wiki/index.md`).
- Each topic folder has a folder note `<topic>/<topic>.md` (filename stem matches the folder, `type: index`) with `children`, `child_indexes`, `aliases`. Legacy `_index.md` is still accepted; at `schema_version: 3` it triggers the verify WARN `legacy-index-filename`.
- Dates are `YYYY-MM-DD`. Filenames kebab-case; titles Title Case.
