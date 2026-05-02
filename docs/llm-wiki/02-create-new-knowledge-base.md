# 2. Create a new vault

> Reference. For the day-1 path, see [index.md](./index.md).

You want to start a fresh vault — either because you are onboarding for the first time, re-initializing the existing `vault/`, or standing up a second vault in a different project.

## Option A — first-time scaffold, or re-initialize

From your project directory, open Claude Code and run the onboarding wizard:

```
/llm-wiki-stack:llm-wiki
```

The wizard asks for the vault name, domain, and a few paths, then writes `vault/CLAUDE.md`, `_templates/`, and the bookkeeping files (`wiki/index.md`, `wiki/log.md`, `wiki/dashboard.md`). It does not overwrite existing content without asking.

`vault/CLAUDE.md` is the authoritative schema for your vault. Every skill and agent reads it before touching anything else. If you want to customize the schema (add a `type`, change confidence thresholds, rename a field), edit that file — not the skills.

## Option B — a second vault in a different project

Run the plugin install once (the install is global to your Claude Code setup):

```
/plugin marketplace add odere-pro/llm-wiki-stack
/plugin install llm-wiki-stack@llm-wiki-stack
```

Then, from the second project directory, open Claude Code and run:

```
/llm-wiki-stack:llm-wiki
```

The wizard scaffolds a fresh vault in that project. The two vaults are independent — different `vault/CLAUDE.md` files, different `vault/raw/` contents, different `wiki/` trees. Both are maintained by the same plugin install.

## What gets created

```
vault/
├── CLAUDE.md               # authoritative schema
├── _templates/             # source, entity, concept, synthesis, index
├── raw/
│   └── assets/             # images and attachments
├── wiki/
│   ├── index.md            # vault MOC — catalog of every wiki page
│   ├── log.md              # chronological operations record
│   ├── dashboard.md        # Dataview dashboard (needs the plugin)
│   ├── _sources/           # one summary per ingested source
│   └── _synthesis/         # cross-topic analyses
└── output/                 # optional git-ignored scratch space
```

Topic folders (like `patterns/` or `tools/`) are created on demand by the ingest workflow; they do not exist until a source introduces that topic.

## First source, end-to-end

Drop a text source:

```bash
cp ~/Downloads/some-article.md vault/raw/
```

Or an image:

```bash
cp ~/Desktop/screenshot.png vault/raw/assets/
```

Then, from Claude Code, run the orchestrator entry:

```
/llm-wiki-stack:wiki
```

It probes the vault, sees the new file in `raw/`, and dispatches to the ingest pipeline. The pipeline:

1. Reads `vault/CLAUDE.md` (the schema) before reading the source.
2. Dispatches by file extension (text vs image; PDFs are deferred — export to markdown first).
3. Writes a source summary in `wiki/_sources/`.
4. Extracts entities and concepts into the correct topic folder (creates the folder + `_index.md` if missing — e.g., a source about Obsidian lands under `tools/`, a source about the LLM Wiki pattern lands under `patterns/`).
5. Updates `wiki/index.md` and appends to `wiki/log.md`.
6. On completion, the `SubagentStop` gate runs `verify-ingest.sh` and a lint pass.

For images, the source summary gets `source_format: image` and `attachment_path: raw/assets/<file>`. The `validate-attachments.sh` hook blocks the write if the attachment is missing.

## Verify

```
/llm-wiki-stack:llm-wiki-status
```

Green across the board means the ingest is clean: frontmatter valid, wikilinks resolve, indexes in sync, `raw/` still immutable. If red on any path, see [guide 4](./04-review-validate-fix.md).

## Common first-ingest problems

| Symptom                                                   | Fix                                                                                           |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Hook blocks the write with `Missing required field: type` | The source template was modified; reset from `vault/_templates/source.md`.                    |
| `attachment_path ... does not exist`                      | The image file is not in `vault/raw/assets/`. Move it there before re-running the pipeline.   |
| PDF not ingested                                          | Expected — PDF is deferred. Export the PDF to markdown or plain text first, drop that into `vault/raw/`. |
| Graph view in Obsidian is monochrome                      | Run `/llm-wiki-stack:obsidian-graph-colors` once.                                             |

## Next step

- Keep adding material → [guide 3](./03-update-existing.md).
- Ask a question against what you just ingested → [guide 7](./07-query-the-wiki.md).
