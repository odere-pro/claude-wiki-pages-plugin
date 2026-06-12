# LLM Wiki — Schema (pointer)

`schema_version: 3`

This vault follows Karpathy's LLM Wiki pattern. `raw/` is immutable source
material; `wiki/` is LLM-maintained. The human curates sources; the LLM
maintains the wiki.

Rules:
- `sources:` values are always `[[wikilinks]]` to a page in `wiki/_sources/`.
- Every wiki page needs `type`, `parent`, `path`, `sources` (top index excepted).
- Each topic folder has a folder note `<topic>/<topic>.md` (filename stem matches the folder, `type: index`) with `children`, `child_indexes`, `aliases`. Legacy `_index.md` is still accepted; at `schema_version: 3` it triggers the verify WARN `legacy-index-filename`.
- `title` MUST be the first entry in `aliases`.
- Dates use `YYYY-MM-DD`. Filenames kebab-case; titles Title Case.
