# ingest-known-defect — intentionally legacy (schema_version: 2)

This fixture is PINNED at `schema_version: 2` with the legacy per-folder
`wiki/tools/_index.md` filename on purpose. Together with its sibling
`ingest-known-good`, it exercises the legacy v2 index path: at
`schema_version: 3` the folder-note convention (`wiki/<topic>/<topic>.md`)
applies and a leftover `_index.md` triggers the verify WARN
`legacy-index-filename`. Do not migrate this pair to folder notes.
