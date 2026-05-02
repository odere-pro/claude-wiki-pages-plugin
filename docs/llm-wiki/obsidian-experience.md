# Obsidian-side experience

When you switch to Obsidian after running `/llm-wiki-stack:wiki`, the vault should already look right — graph view colored by topic, `wiki/index.md` reflecting current page counts, every per-folder `_index.md` matching its actual children. You should never have to type a second command to make Obsidian "catch up."

This page describes how that happens, what the polish-agent does for you, and what to check if something looks off.

## How it works

`/llm-wiki-stack:wiki` invokes the orchestrator (`llm-wiki-stack-orchestrator-agent`). The orchestrator probes vault state and dispatches one specialist per turn — usually `llm-wiki-stack-ingest-agent` (when `raw/` has new files) or `llm-wiki-stack-curator-agent` (when lint drift is pending).

After either of those returns successfully, the orchestrator fans out to **`llm-wiki-stack-polish-agent`** as the tail of the same turn. You never invoke polish directly; that is intentional. The agent only makes sense as a tail-of-write step, and pulling it into a separate slash command would split a single logical operation into two.

The polish agent is **idempotent**: running it twice in a row against the same vault produces no diffs. That property is what makes it safe to run unconditionally after every successful ingest or curator pass.

## What polish does

Three steps, in order, all append-only:

### 1. Graph colors

Every top-level topic folder under `wiki/` gets a distinct color group in `.obsidian/graph.json`. When you ingest a paper that creates a new top-level topic, the graph view shows the new topic in a fresh color the moment you switch tabs to Obsidian. No "regenerate the graph" step on your side.

The agent reads the current group list, finds top-level folders with no group yet, appends a group per folder using the next unused palette color, and persists via `obsidian eval`. Folders that already have a color are left untouched.

If `obsidian-cli` is not installed (the agent depends on it for the `obsidian eval` call), the step prints `[skip] graph-colors: obsidian-cli unavailable` and continues. The rest of polish still runs; the graph just stays as it was.

### 2. Index refresh

`wiki/index.md` is regenerated from the per-folder `_index.md` files. Each top-level topic gets a line listing its current page count and last-updated date, in stable alphabetical order:

```
- [[Patterns — Index]] — 12 pages, last updated 2026-05-02
- [[Tools — Index]] — 7 pages, last updated 2026-04-28
```

If you've added prose between section headers in `wiki/index.md`, polish preserves it verbatim. The agent owns the heading list and the page-count line; you own the prose.

The agent only advances `updated:` in the frontmatter when the body actually changed, so a no-op run produces zero git diff.

### 3. Per-folder MOC consistency

For every folder containing an `_index.md`:

- The `children:` field is reconciled against actual `.md` siblings. Any sibling not yet in `children:` is appended.
- The `child_indexes:` field is reconciled against actual subfolder `_index.md` files. Any subfolder not yet in `child_indexes:` is appended.

**Polish never deletes**. A page that no longer exists may be a temporary state during a manual refactor. The curator agent — not polish — owns explicit removal flows. If you delete a page outside of the curator's workflow, polish preserves the orphaned `children:` entry; running curator picks up the cleanup.

## What you'll see in the report

After every successful ingest or curator run, the orchestrator's final report has a `## Polish` section with this shape:

```
POLISH:
  graph-colors: added=2
  index-refresh: regenerated
  moc-consistency: added=3 children, 1 child_indexes
```

`added=0` and `unchanged` are both healthy outcomes — they tell you the upstream specialist's work was already in sync.

`[skip] <step>: <reason>` indicates a polish step that could not run (typically `obsidian-cli unavailable`). The skip is non-blocking; the upstream specialist's success is reported normally.

## Troubleshooting

### Graph colors aren't applying after ingest

- Check that `obsidian-cli` is installed and on `PATH` (`which obsidian` should resolve). The bundled `obsidian-cli` reference skill provides the command; if it's missing, polish skips graph colors with the `[skip]` marker described above.
- Open `.obsidian/graph.json` and confirm the new topic appears in `colorGroups`. If it does, restart Obsidian — the graph view caches the previous group list until reload.
- Run `/llm-wiki-stack:wiki-doctor`. Exit code 4 (hooks not executable) suggests a deeper environment issue that polish itself cannot fix.

### `wiki/index.md` page count looks wrong

- Polish counts `*.md` files in each topic folder excluding `_index.md`. If a count looks low, verify the missing files actually exist in that folder (a `git status` may show untracked candidates).
- Polish does not count files under `_synthesis/` or `_sources/` — those are special folders. If you expected them in the count, you have hit polish's design intent: synthesis and source pages are accounted for in the `## Synthesis` and `## Sources` sections of `wiki/index.md`, not under their topic folder lines.

### `_index.md` `children:` field has entries for pages that no longer exist

- This is by design — polish is append-only. Run `/llm-wiki-stack:wiki <topic>` (or `/llm-wiki-stack:llm-wiki-fix` directly) to dispatch the curator agent, which owns explicit removal flows and will prune the stale entry with your approval.

## Specification anchor

[`/SPEC.md §11`](../../SPEC.md) — `llm-wiki-stack-polish-agent` contract.

[`docs/adr/ADR-0003-polish-agent-and-obsidian-side.md`](../adr/ADR-0003-polish-agent-and-obsidian-side.md) — the rationale for centralising graph colors, index refresh, and MOC consistency in a single specialist.
