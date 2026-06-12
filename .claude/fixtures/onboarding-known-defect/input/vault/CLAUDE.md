# LLM Wiki — Schema (fixture)

`schema_version: 3`

- `raw/` is immutable source material. Never modify it.
- `wiki/` is LLM-maintained. All knowledge pages live here.
- `sources:` values must be `[[wikilinks]]` to a page in `wiki/_sources/`.
- Every wiki page (except `wiki/index.md`) needs `type`, `parent`, `path`, `sources`.
- Each topic folder has a folder note `<topic>/<topic>.md` (filename stem matches the folder, `type: index`) with `children`, `child_indexes`, `aliases`. Legacy `_index.md` is still accepted; at `schema_version: 3` it triggers the verify WARN `legacy-index-filename`.
- `title` must be the first entry in `aliases`. Dates are `YYYY-MM-DD`.
