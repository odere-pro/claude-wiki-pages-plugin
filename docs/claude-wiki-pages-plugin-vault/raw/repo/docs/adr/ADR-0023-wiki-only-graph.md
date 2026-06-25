# ADR-0023: Wiki-only graph — exclusions over layer colors, graph config as regenerable cache

- **Status:** Accepted
- **Date:** 2026-06-13
- **Builds on:** [ADR-0003](./ADR-0003-polish-agent-and-obsidian-side.md) (Obsidian-side experience and graph-color ownership), [ADR-0022](./ADR-0022-folder-notes-and-graph-quality.md) (folder notes, canonical group order, headless fallback)
- **Amends:** [ADR-0022](./ADR-0022-folder-notes-and-graph-quality.md) §4 — the layer pass is dropped; the canonical group order becomes topics → specials
- **Supersedes (delivery mechanism):** [ADR-0022](./ADR-0022-folder-notes-and-graph-quality.md) — tracked `.obsidian/graph.json` (PR #23) replaced by regenerable cache; entire `.obsidian/` gitignored
- **Anchor:** §4 (Layer 1 — Data), §9 (Obsidian-side experience)

## Context

ADR-0022 §4 codified a three-tier color order — topics → specials → **layers**
— where the layer pass colored `path:raw` green, `path:wiki` blue, and
`path:_templates` orange. In practice the layer pass put the *plumbing* on the
map: the graph view and the `path:` group autocomplete surfaced `raw/`,
`raw/adr`, `raw/assets`, `raw/design`, and `_templates` alongside the
knowledge pages. Raw sources are immutable provenance payload and `_templates/`
is scaffolding; neither is a knowledge node, and a graph that renders them
drowns the topic structure it exists to show. Dogfooding confirmed it: the
user's first reaction to the live vault's graph was that the plugin had
"added artifacts and raw files" to the wiki view.

A second friction compounded the first: the plugin treated `.obsidian/`
filters and color groups as state to maintain incrementally, when every value
in them is derivable from the `wiki/` topic tree. Hand-repair of a clobbered
`graph.json` is wasted effort.

## Decision

### 1. The graph shows only generated wiki pages

`raw/`, `_templates/`, and `_proposed/` are excluded from Obsidian's index via
the **Excluded files** setting:

```json
// vault/.obsidian/app.json
{ "userIgnoreFilters": ["raw/", "_templates/", "_proposed/"] }
```

Excluded paths disappear from the graph view, search, and link autocomplete —
the Obsidian experience is generated wiki pages only. `output/` stays visible:
it is user-owned deliverable space, not plugin plumbing. `.obsidian/app.json`
is **not** tracked — the whole `.obsidian/` directory is gitignored regenerable
cache (see below). The `obsidian-graph-colors` skill writes these
`userIgnoreFilters` when scaffolding a vault's `.obsidian/`, and the polish
agent asserts them idempotently after every ingest (merge-only: append missing
entries, never remove user entries, preserve every other key).

### 2. The layer pass is dropped

ADR-0022's third tier (`path:raw` green, `path:wiki` blue, `path:_templates`
orange) is removed everywhere — skill, polish agent Step 1, curator fix 3.9,
schema CLAUDE.md. With raw and templates excluded from the index, groups
matching them are dead weight; and a blanket `path:wiki` fallback color adds
no information once every top-level topic has its own group. The canonical
order becomes **topics → specials** (`_sources` gray, `_synthesis` yellow).
Color groups query `path:wiki/...` exclusively.

### 3. Graph config is regenerable cache — `.obsidian/` is gitignored

`.obsidian/graph.json` and the plugin-owned `app.json` keys are declared
**cache, not state**: every value derives deterministically from the `wiki/`
topic tree plus the skill's palette table. Because it is cache, the **entire
`.obsidian/` directory is gitignored — nothing under it is tracked or shipped
pre-built.** This supersedes the earlier delivery mechanism (PR #23 / ADR-0022,
which shipped `.obsidian/graph.json` tracked in `skills/init/template/` and
`docs/vault-example/`): the config is now generated per vault, not version
controlled. The `obsidian-graph-colors` skill documents the build/restore flow
— a fresh or emptied `.obsidian/` is rebuilt (minimum-scaffold filters, topic
groups, specials, and exclusions) on the next skill run or polish pass, on
either apply tier (`obsidian eval` or the headless file write). Dropping the
config is always safe; nothing in `.obsidian/` is precious.

## Alternatives considered

- **Graph-side filter only (`search: "-path:raw -path:_templates"`).** Cleans
  the graph but leaves raw files in search, quick switcher, link autocomplete,
  and the `path:` group dropdown — the surfaces the user actually noticed.
  Excluded files fixes all of them with one setting.
- **Keep the layer pass, ordered after exclusions.** Incoherent: a color
  group for a path the index no longer contains can never match.
- **Move `raw/` outside the Obsidian vault root.** Strongest separation, but
  it breaks the single-vault data-layer contract (§4), every relative
  `attachment_path`, and the resolver — a structural migration to solve a
  display problem.

## Consequences

- The graph, search, and autocomplete show knowledge pages only; provenance
  stays on disk and in git, reachable through `_sources/` summaries.
- `attachment_path` targets under `raw/assets/` are excluded from Obsidian's
  index; embeds of excluded attachments still render, but provenance payload
  is reviewed in the editor/filesystem, not the graph — consistent with §7's
  "raw is payload, not knowledge nodes".
- One fewer color tier to maintain; the palette stretches further across
  topics.
- A user who *wants* raw nodes visible can remove the `userIgnoreFilters`
  entries in their own vault — the polish agent re-adds them; opting out for
  good means editing the vault's own CLAUDE.md to record the deviation, per
  the schema-authority rule.

## Revisit when

- Obsidian changes Excluded-files semantics (e.g. stops hiding excluded paths
  from the graph), or
- a future "provenance view" feature wants raw nodes rendered deliberately —
  that should arrive as its own toggle, not by resurrecting the layer pass.
