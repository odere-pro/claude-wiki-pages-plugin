---
title: "Wiki Index"
type: index
parent: ""
path: ""
children: []
child_indexes: [] # quoted filename links to top-level folder notes, e.g. "[[agents]]"
aliases: ["Wiki Index"]
tags: []
created: 2026-06-13
updated: 2026-06-13
---

# Wiki Index

Master catalog of every page in the wiki.

This vault is empty. Drop a source into `raw/` and run `/claude-wiki-pages:wiki` to start populating it. The orchestrator detects the new source and runs the ingest pipeline, creating topic folders (each with its folder note, `wiki/<topic>/<topic>.md`), source summaries, entity / concept pages, and updating this index automatically — `child_indexes:` above fills with filename links to those folder notes.
