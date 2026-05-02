# 3. Update an existing vault

> Reference. For the day-1 path, see [index.md](./index.md).

You have a populated vault and want to add or extend content. The orchestrator entry (`/llm-wiki-stack:wiki`) is the default verb — it probes vault state and dispatches to the ingest pipeline when it sees new sources. Reach for the underlying agent or an individual skill only when you want to limit scope.

## Add a single text source

```bash
cp ~/Downloads/new-article.md vault/raw/
```

```
/llm-wiki-stack:wiki
```

The orchestrator notices the new file in `raw/` (newer than the last `wiki/log.md` ingest entry) and dispatches to `llm-wiki-stack-ingest-agent`. No argument needed.

## Add an image source

```bash
cp ~/Desktop/diagram.png vault/raw/assets/
```

```
/llm-wiki-stack:wiki
```

Claude's vision reads the image natively and extracts on-image text, entities shown in diagrams, and visible concepts. The source summary gets `source_format: image` and `attachment_path: raw/assets/diagram.png`.

The `validate-attachments.sh` hook blocks the write if the attachment path is missing or the file is not there. Fix by moving the image into `vault/raw/assets/` and re-running.

## Add a batch (text + images together)

```bash
cp notes/*.md         vault/raw/
cp screenshots/*.png  vault/raw/assets/
```

```
/llm-wiki-stack:wiki
```

The dispatched ingest agent handles ingest → verify → lint-fix → synthesize in one pass. After the agent stops, the `subagent-ingest-gate.sh` hook automatically runs `verify-ingest.sh` and aborts the completion if the wiki is left in a half-written state. You see the failure immediately rather than discovering it days later.

## Power-user bypass: call the ingest agent directly

If you want to skip the orchestrator's state probe and dispatch step (you already know you want a batch ingest), call the agent directly:

```
/llm-wiki-stack:llm-wiki-stack-ingest-agent
```

Same downstream behaviour. Useful in scripted workflows where the routing decision is redundant.

## Ingest only, without lint-fix or synthesis

If you want strict ingest-only (to line up several batches before running a single lint pass), use the individual skill:

```
/llm-wiki-stack:llm-wiki-ingest
```

Same preconditions as the pipeline. No follow-on lint-fix, no synthesis. Run `/llm-wiki-stack:llm-wiki-stack-curator-agent` separately when you are ready.

## Why you should NOT just write pages by hand

The ingest workflow enforces:

- **Entity distribution model** — one source rewrites many existing pages (DRY). Ingesting a new source that mentions `[[Obsidian]]` appends that source to the existing `obsidian.md` page's `sources:` rather than creating a duplicate.
- **Topic-tree placement** with max depth 4 and correct `parent:` / `path:` frontmatter.
- **Wikilink-only `sources:`** — plain strings are a lint error.
- **Matching aliases** — the page's `title` always appears as the first entry in `aliases:`, or the page becomes a ghost node in the graph.

Hand-written pages almost always drift from the schema. The `validate-frontmatter.sh` and `check-wikilinks.sh` hooks will catch many mistakes, but topic-tree structure is easy to break.

## Updating an existing page directly

Sometimes you know exactly what to change (fix a fact, add a related link):

1. Edit the page normally.
2. Increment `update_count` in its frontmatter.
3. Update `updated:` to today's date (`YYYY-MM-DD`).
4. If new sources back the change, append them to `sources:` as `[[wikilinks]]`.

The `post-wiki-write.sh` hook will remind you to touch the per-folder MOC (`_index.md`) and the vault MOC (`wiki/index.md`) if either needs updating.

## DRY rules for new pages

Before creating a new entity or concept page, the ingest workflow greps the wiki for an existing page whose `title` or `aliases` match. If it finds one, it **appends** rather than creating a duplicate. This is deliberate — near-duplicate pages drift.

If you are editing by hand, do the same grep:

```
(in Claude Code)
Look for an existing wiki page with title or alias matching "<candidate name>"
```

For example: before adding a new page for "Claude Code plugin", search for existing titles or aliases matching `[[Claude Code]]`. If one exists, append to it rather than creating a sibling.

## When to run lint

Every 10 ingests, or anytime:

- A batch ingest finishes with warnings.
- Pages are showing up as orphans in the Obsidian graph.
- `/llm-wiki-stack:llm-wiki-status` reports index drift.

The pipeline already lint-fixes on every run — reach for the standalone skill when you want a read-only audit between ingests. See [guide 4](./04-review-validate-fix.md).

## Next step

- Repair mode → [guide 4](./04-review-validate-fix.md).
- Ask something → [guide 7](./07-query-the-wiki.md).
