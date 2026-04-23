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
graph plugin API via `obsidian eval`.

## How it works

Obsidian's graph view supports **color groups** — search queries paired with
colors. Notes matching a query render in that color. Groups are matched
top-down (first match wins), so more specific paths must come before less
specific ones.

The API path:

```
app.internalPlugins.plugins['graph'].instance.options.colorGroups
```

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

### 3. Build the color palette

Assign a unique color to each topic branch. Use this default palette for
consistency — extend it when more topics are added:

| Index | Hex     | RGB int  | Use for                           |
| ----- | ------- | -------- | --------------------------------- |
| 0     | #3498DB | 3447003  | 1st subtopic (blue)               |
| 1     | #FFA500 | 16750848 | 2nd subtopic (orange)             |
| 2     | #A020F0 | 10494192 | 3rd subtopic (purple)             |
| 3     | #57E567 | 5763719  | parent topic (green)              |
| 4     | #E74C3C | 15158332 | 2nd top-level topic (red)         |
| 5     | #979F9F | 9936031  | sources (gray)                    |
| 6     | #FFFF00 | 16776960 | synthesis (yellow)                |
| 7     | #FFFFFF | 16777215 | index nodes (white)               |
| 8     | #1ABC9C | 1751452  | 3rd top-level topic (teal)        |
| 9     | #E91E63 | 15277667 | 4th top-level topic (pink)        |
| 10    | #FF5722 | 16734498 | 5th top-level topic (deep orange) |
| 11    | #00BCD4 | 48340    | 6th top-level topic (cyan)        |

### 4. Build the color groups array

Rules for ordering:

- **Subtopic paths before parent paths** (e.g., `path:wiki/topic/subtopic` before `path:wiki/topic`)
- **`_sources` and `_synthesis`** near the end (they are cross-cutting)
- **`file:_index`** last (catches all index nodes regardless of path)

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

### 7. Report

Tell the user which color groups were applied and the color assignments.

## Adding a single topic color

When a new top-level topic folder is created during ingest:

1. Read current color groups via `obsidian eval`
2. Pick the next unused color from the palette
3. Insert the new group BEFORE the `_sources`/`_synthesis`/`_index` catch-all rules
4. Apply and save

## Removing a topic color

When a topic folder is deleted or merged:

1. Read current color groups
2. Filter out entries matching the removed path
3. Apply and save

## Converting hex to RGB integer

The `rgb` field is a decimal integer, not hex. To convert:

```
#RRGGBB → parseInt("RRGGBB", 16)
Example: #3498DB → parseInt("3498DB", 16) → 3447003
```

## Rules

- Always read current groups before writing — preserve user-added custom groups
- Order matters: specific paths before general paths
- One color per top-level topic; subtopics get their own color only when the
  parent has 3+ subtopic folders
- `_sources`, `_synthesis`, and `file:_index` groups are always present
- After applying, verify with a read-back
