---
name: obsidian-graph-colors
description: >
  Apply color groups to Obsidian's graph view so each topic branch has a
  distinct color. Use when the user says "color the graph", "graph colors",
  "update graph colors", "add topic color", or after creating new topic
  folders that need a color assignment.
allowed-tools: Bash Read Glob Grep
---

# Graph Colors

Apply per-topic color groups to the Obsidian graph view using the internal
graph plugin API via `obsidian eval`, with a documented headless fallback
when the Obsidian CLI is unavailable.

## Initial graph configuration (minimum scaffold)

When `vault/.obsidian/graph.json` is absent (a fresh vault, or the polish
agent's Step 1.3 "create the minimum scaffold" path), create it with these
**initial filters** — the defaults the plugin ships in
`skills/init/template/.obsidian/graph.json` and `docs/vault-example/.obsidian/graph.json`:

| Filter               | Setting | `graph.json` field        | Why                                                                                  |
| -------------------- | ------- | ------------------------- | ------------------------------------------------------------------------------------ |
| Search               | empty   | `"search": ""`            | No pre-filter; the whole wiki is visible.                                            |
| Tags                 | off     | `"showTags": false`       | Tag nodes double every page and drown the topic structure.                           |
| Attachments          | off     | `"showAttachments": false`| `raw/assets/` binaries are provenance payload, not knowledge nodes.                  |
| Existing files only  | **on**  | `"hideUnresolved": true`  | Dangling wikilinks are lint errors, not graph nodes — the graph shows real pages.    |
| Orphans              | **on**  | `"showOrphans": true`     | Orphan pages are a curator signal; hiding them would mask exactly what needs fixing. |

`colorGroups` starts empty — per-topic colors and the layer pass are applied
by the polish agent (Steps below) through the apply contract. Preserve these
filter values when editing color groups; the color workflow must not flip
filters.

## Apply contract — two tiers

Color groups are applied through exactly one of two paths, tried in order:

1. **Preferred — `obsidian eval` + `graph.saveOptions()`.** When the Obsidian
   CLI is available, mutate the live graph plugin options and persist them
   with `graph.saveOptions(graph.options)` (Workflow step 5 below). Obsidian
   writes `graph.json` itself, and open graph views can be refreshed in place.
2. **Headless fallback — write `vault/.obsidian/graph.json` directly.** When
   the Obsidian CLI is unavailable (not installed, or no running instance),
   edit `vault/.obsidian/graph.json` as a file. Modify **only** the
   `colorGroups` array and the `collapse-color-groups` key; preserve every
   other key in the file unchanged (filters, forces, display settings). If
   the file is absent, create it from the minimum scaffold above first. Then
   print exactly:

   ```
   [fallback] graph-colors: wrote .obsidian/graph.json directly (restart Obsidian to load)
   ```

The fallback is a first-class path, not a skip: a headless environment (CI,
SSH session, machine without Obsidian) still gets correct colors, and
Obsidian loads them on next start. Never report `[skip]` for CLI
unavailability.

## How it works

Obsidian's graph view supports **color groups** — search queries paired with
colors. Notes matching a query render in that color. Groups are matched
top-down (first match wins), so more specific paths must come before less
specific ones.

The API path:

```
app.internalPlugins.plugins['graph'].instance.options.colorGroups
```

Folder notes (`wiki/<topic>/<topic>.md`, `type: index`) need no group of
their own: they live inside their topic folder, so the topic's `path:` group
colors them along with the pages they index. (Legacy `_index.md` files, where
still present, are covered the same way.)

## Workflow

### 1. Discover topic folders

```bash
find vault/wiki -mindepth 1 -maxdepth 1 -type d | sort
```

Also find subtopic folders (depth 2) that warrant their own color:

```bash
find vault/wiki -mindepth 2 -maxdepth 2 -type d -not -path '*/_sources' -not -path '*/_synthesis' | sort
```

### 2. Read current color groups

```bash
obsidian eval code="JSON.stringify(app.internalPlugins.plugins['graph'].instance.options.colorGroups, null, 2)"
```

If the CLI is unavailable, read `vault/.obsidian/graph.json` directly and
take `colorGroups` from there (the fallback tier of the apply contract).

### 3. Build the color palette

Assign a unique color to each topic branch. Use this default palette for
consistency — extend it when more topics are added:

| Index | Hex     | RGB int  | Use for                            |
| ----- | ------- | -------- | ---------------------------------- |
| 0     | #3498DB | 3447003  | 1st subtopic (blue)                |
| 1     | #FFA500 | 16750848 | 2nd subtopic (orange)              |
| 2     | #A020F0 | 10494192 | 3rd subtopic (purple)              |
| 3     | #57E567 | 5763719  | parent topic (green)               |
| 4     | #E74C3C | 15158332 | 2nd top-level topic (red)          |
| 5     | #979F9F | 9936031  | sources (gray)                     |
| 6     | #FFFF00 | 16776960 | synthesis (yellow)                 |
| 7     | #1ABC9C | 1751452  | 3rd top-level topic (teal)         |
| 8     | #E91E63 | 15277667 | 4th top-level topic (pink)         |
| 9     | #FF5722 | 16734498 | 5th top-level topic (deep orange)  |
| 10    | #00BCD4 | 48340    | 6th top-level topic (cyan)         |
| 11    | #8BC34A | 9159498  | 7th top-level topic (light green)  |
| 12    | #FF9800 | 16750592 | 8th top-level topic (amber)        |
| 13    | #9C27B0 | 10233776 | 9th top-level topic (deep purple)  |
| 14    | #607D8B | 6323595  | 10th top-level topic (blue gray)   |

### 4. Build the color groups array

Rules for ordering — **topics → specials → layers**:

- **Subtopic paths before parent paths** (e.g., `path:wiki/topic/subtopic` before `path:wiki/topic`)
- **`_sources` and `_synthesis`** after the topic groups (they are cross-cutting specials)
- **Layer groups last** (see "Layer coloring" below) — broad fallbacks that
  must not shadow any topic group

There is no index catch-all group: folder notes are topic-named files inside
their topic folder and take the topic's color via its `path:` group.

Each group is an object:

```json
{"query": "path:wiki/topic-folder", "color": {"a": 1, "rgb": <decimal>}}
```

### 5. Apply via obsidian eval

```bash
obsidian eval code="
const graph = app.internalPlugins.plugins['graph'].instance;
graph.options.colorGroups = <JSON_ARRAY>;
graph.options['collapse-color-groups'] = false;
graph.saveOptions(graph.options);
'Applied ' + graph.options.colorGroups.length + ' color groups'
"
```

If this command is unavailable, fall back to the direct `graph.json` write
per the apply contract above (only `colorGroups` and
`collapse-color-groups`; print the exact `[fallback]` line).

### 6. Refresh open graph views

```bash
obsidian eval code="
const leaves = app.workspace.getLeavesOfType('graph');
leaves.forEach(l => {
  if (l.view && l.view.dataEngine) {
    l.view.dataEngine.updateSearch();
  }
});
'Refreshed ' + leaves.length + ' graph views'
"
```

Skip this step on the fallback tier — there is no running Obsidian to
refresh; the `[fallback]` line already tells the user to restart Obsidian.

### 7. Report

Tell the user which color groups were applied and the color assignments
(and, on the fallback tier, that `graph.json` was written directly).

## Adding a single topic color

When a new top-level topic folder is created during ingest:

1. Read current color groups via `obsidian eval` (or from `graph.json` on the fallback tier)
2. Pick the next unused color from the palette
3. Insert the new group BEFORE the `_sources`/`_synthesis` special groups and the layer groups
4. Apply and save per the apply contract

## Removing a topic color

When a topic folder is deleted or merged:

1. Read current color groups
2. Filter out entries matching the removed path
3. Apply and save

## Layer coloring (optional pass)

Beyond per-topic colors, you can color the graph by **layer** — the at-a-glance
view from the LLM Wiki pattern: raw sources, wiki pages, and schema files each
get one color, so the three-layer structure is visible at a glance.

| Layer  | Query           | Color            |
| ------ | --------------- | ---------------- |
| raw    | `path:raw`      | green (#57E567)  |
| wiki   | `path:wiki`     | blue (#3498DB)   |
| schema | `path:_templates` (and the vault `CLAUDE.md`) | orange (#FFA500) |

**Ordering is critical.** Color groups are first-match-wins, and `path:wiki` is
broad — it matches every wiki page. So the layer groups must come **after** all
per-topic groups, not before. With this ordering:

- a wiki page in a colored topic keeps its topic color (matched first);
- any uncolored wiki page falls through to the blue `path:wiki` layer color;
- `path:raw` colors raw sources green; `path:_templates` colors schema orange.

If you want a **pure layer view** (no per-topic colors), use only the three
layer groups. If you want both, append the layer groups after the topic groups
as the final fallback tier — topics → specials → layers. The
`claude-wiki-pages-polish-agent` applies the layer pass after the per-topic
pass when it refreshes colors.

## Converting hex to RGB integer

The `rgb` field is a decimal integer, not hex. To convert:

```
#RRGGBB → parseInt("RRGGBB", 16)
Example: #3498DB → parseInt("3498DB", 16) → 3447003
```

## Rules

- Always read current groups before writing — preserve user-added custom groups
- Order matters: topics → specials (`_sources`, `_synthesis`) → layers
- One color per top-level topic; subtopics get their own color only when the
  parent has 3+ subtopic folders
- `_sources` and `_synthesis` groups are always present; there is no index
  catch-all — folder notes take their topic's color
- Apply through the two-tier contract: `obsidian eval` preferred, direct
  `graph.json` write as the documented headless fallback
- After applying, verify with a read-back (eval read, or re-read `graph.json`
  on the fallback tier)
