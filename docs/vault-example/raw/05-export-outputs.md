# 5. Export data, create output

> Reference. For the day-1 path, see [index.md](./index.md).

The wiki is the source of truth. Deliverables compiled from it — reports, ADRs, proposals, memos, briefs — go in `vault/output/`.

`vault/output/` is **git-ignored scratch space**. Files there are plain markdown: no frontmatter, no schema, no validation, not tracked by any skill. Use it however you like.

## Produce an output

The `llm-wiki-stack-analyst-agent` agent is the right tool:

```
/llm-wiki-stack:llm-wiki-stack-analyst-agent compile a report on <topic> for <audience>
```

Typical phrasing:

- "Produce a 1-page brief on the [[LLM Wiki Pattern]] for a new teammate."
- "Write an ADR for adopting [[Claude Code]] as the agent stack on a new project."
- "Build a compact reference on [[Hook-Enforced Guarantees]] covering which hook catches which failure, and what is deliberately outside the model."

The agent:

1. Reads the vault MOC (`wiki/index.md`) and relevant per-folder MOCs (`_index.md`).
2. Pulls the named entities, concepts, and synthesis notes.
3. Writes plain markdown to `vault/output/<slug>.md`.
4. Cites every claim with a `[[wikilink]]` back to its wiki page so Obsidian can resolve it.

## Navigation-index vs narrative output

Two healthy patterns in `vault/output/`:

- **Narrative output** — the document someone reads front-to-back. Has its own voice.
- **Navigation index** — a short pointer document whose only job is to route the reader to canonical wiki pages.

Two narrative outputs on the same topic drift. If you find yourself writing a second narrative on a topic where one already exists, merge them or convert the lower-quality one into a navigation index.

## Versioning

`vault/output/` is not version-managed by the wiki schema. Because the directory is git-ignored, the outputs live only on your local disk. If you need version history:

- Commit a specific output file via `git add -f vault/output/<file>.md` (overrides the ignore).
- Or keep the canonical version in `wiki/_synthesis/` as a proper synthesis note and regenerate the deliverable from it when needed.

The second option is the preferred one for anything you will reuse — the synthesis note lives inside the schema, gets cited by queries, and shows up in the dashboard.

## Exporting to other formats

Convert markdown outputs to PDF / DOCX / HTML with external tools:

```bash
# PDF via pandoc
pandoc vault/output/my-report.md -o my-report.pdf

# Word doc
pandoc vault/output/my-report.md -o my-report.docx
```

Claude's skill marketplace has `pdf`, `docx`, `pptx`, and `xlsx` skills if you want a conversation-driven export — invoke them as `/pdf`, `/docx`, etc. Inside them, reference the output file by path.

## DO NOT

- Put analysis into `vault/output/` that belongs in `vault/wiki/_synthesis/`. Outputs are deliverables; synthesis is reasoning. A deliverable can cite a synthesis — the synthesis stays in the wiki.
- Let an output live in `vault/raw/`. `raw/` is immutable source material; the `protect-raw.sh` hook will block the write anyway.

## Next step

- Live status view → [guide 6](./06-check-the-dashboard.md).
- Answer a specific question from the wiki → [guide 7](./07-query-the-wiki.md).
