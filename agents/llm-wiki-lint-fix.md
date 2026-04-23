---
name: llm-wiki-lint-fix
description: >
  Lint and fix wiki structural issues: broken wikilinks, orphan pages,
  frontmatter gaps, index drift, index inconsistency, plain-string sources,
  missing parent/path fields. Use when the user says "lint", "fix wiki",
  "health check", "audit wiki", "fix lint issues", "repair wiki", or after
  any ingest operation to clean up structural problems.
model: sonnet
tools: Bash, Read, Write, Edit, Glob, Grep
---

# Wiki Lint & Fix

Diagnose and repair all structural wiki issues in a single pass.

**Read `vault/CLAUDE.md` before every run.** It is the authoritative schema.

---

## Phase 1 — Diagnose

Collect every issue before changing anything.

### 1.1 Run verify-ingest.sh

```bash
.claude/scripts/verify-ingest.sh vault
```

Capture and parse the full output. Record each ERROR and WARN with its file and description.

### 1.2 Scan for issues the script does not cover

Run these additional checks by reading wiki pages directly:

**Broken wikilinks:**

- Grep all `[[...]]` references across `vault/wiki/`.
- Build a set of all page titles (from `title:` frontmatter) and all aliases (from `aliases:` frontmatter).
- Any `[[Target]]` that matches neither a title nor an alias is broken.

**Orphan pages:**

- For each wiki page (excluding `index.md`, `log.md`, `dashboard.md`, `_index.md`), search all OTHER wiki pages for `[[Page Title]]`.
- A page with zero inbound wikilinks from any other page is an orphan.
- Index `children:` entries count as inbound links.

**Missing frontmatter fields:**

- Read `vault/CLAUDE.md` to get the required fields per `type`.
- For each wiki page, verify every required field for its `type` is present in frontmatter.
- Flag any missing required field.

**Title collisions:**

- Two pages with the same `title:` value create ambiguous wikilinks.
- Flag any collisions.

**Stale confidence:**

- Pages with `confidence:` below 0.5 and no update in 30+ days.

**Excessive nesting:**

- Any folder deeper than 4 levels from `wiki/`.

**Flat folder sprawl:**

- Count `.md` files (excluding `_index.md`) in each topic folder.
- Any folder with more than 12 direct children needs splitting into subtopic subfolders.
- This is the most common structural issue after ingest — the ingest skill may place all pages flat in a topic folder instead of creating subtopics.

**Ghost wikilinks in log.md:**

- `wiki/log.md` records historical operations. Any `[[...]]` in log entries that reference old/fixed/invalid targets creates ghost nodes in the graph.
- Scan log.md for `[[...]]` targets that do not match any page title or alias. Flag as WARN.
- Fix: replace the `[[...]]` with backtick code formatting (e.g., `` `_index` `` instead of `[[_index]]`). Keep valid wikilinks to real pages.

**Title missing from aliases (ghost node prevention):**

- For EVERY wiki page (not just indexes): the `title` value must appear in the `aliases` array.
- Obsidian resolves `[[X]]` by filename or alias, not by title. Kebab-case filenames + Title Case wikilinks = ghost nodes without this.
- If `aliases` is missing, empty, or does not contain the page's `title`, flag as WARN.
- For indexes, also check for topic name variants (slug, title case, abbreviations).

**Missing graph color groups:**

- Read current Obsidian graph color groups via `obsidian eval code="JSON.stringify(app.internalPlugins.plugins['graph'].instance.options.colorGroups)"`.
- For each top-level topic folder under `wiki/` (excluding `_sources`, `_synthesis`), check if a `path:wiki/<folder>` query exists in the color groups.
- If a topic folder has no matching color group, flag as WARN.

**Near-duplicate page bodies (INFO):**

- For every pair of non-index wiki pages, compute Jaccard similarity over the set of body lines (ignore whitespace-only lines and code-block fences).
- Flag pairs with similarity ≥ 0.6 as INFO-level candidates for merging or canonicalization.
- Report only — do NOT auto-merge. Give the user the pair and a one-line hint on which page is more specific.

**Suspiciously-high confidence with single source (WARN):**

- For every page with `type: entity`, `type: concept`, or `type: synthesis`: parse `confidence:` and count entries in `sources:`.
- If `confidence` ≥ 0.8 AND `sources` has only one entry, flag as WARN.
- Recommended fix: drop to ≤ 0.6 or add a corroborating source before raising back. Single-source claims should not carry high confidence without a second independent source.

**Repeated content blocks (INFO — transclusion candidates):**

- Scan all wiki pages for markdown tables and bulleted lists of ≥ 4 rows/items.
- Hash each block (normalize whitespace, lowercase) and group identical or near-identical blocks.
- If the same block appears on two or more pages, flag as an INFO-level transclusion candidate. Report the block, the pages it appears on, and suggest the most specific page as the canonical location.

### 1.3 Compile the issue list

Group all issues into:

| Severity               | Issue types                                                                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ERROR** (must fix)   | Broken wikilinks, missing required frontmatter, title collisions, verify-ingest errors, index lists page that does not exist, missing `_index.md` in topic folder                                                                                                                                                        |
| **WARN** (should fix)  | Orphans, plain-string sources, missing parent/path, index missing a page that exists, index missing a page, flat folder sprawl (>12 pages), excessive nesting (>4 levels), `child_indexes` drift, title missing from aliases (ghost nodes), missing graph color group, suspiciously-high confidence (≥0.8) with single source |
| **INFO** (nice to fix) | Body text mentions entity/concept without wikilink, stale confidence, low update_count on well-connected pages, near-duplicate page bodies (Jaccard ≥0.6), repeated content blocks (transclusion candidates)                                                                                                             |

Print the full issue list to the user BEFORE proceeding to fixes.

---

## Phase 2 — Fix sources wikilinks

For every wiki page where `sources:` entries are plain strings (not `[[...]]`):

1. Read the file.
2. Find each `sources:` entry not matching `[[...]]`.
3. Search `wiki/_sources/` for a page whose `title:` matches the string.
4. If found: wrap as `"[[Title]]"`.
5. If not found: flag as unresolvable — do NOT create a dangling wikilink.

**Same rule applies to frontmatter fields:** `related`, `contradicts`, `supersedes`, `depends_on`, `scope`, `parent`, `children`, `child_indexes` — all must use `[[wikilinks]]` if they reference other pages.

---

## Phase 3 — Fix index.md consistency

1. Read every wiki page. Extract `title:` and `type:` from frontmatter.
2. Read `wiki/index.md`. Extract all `[[Page Title]]` entries.
3. **Add missing:** pages that exist but are not in the index.
   - `type: source` → under `## Sources`
   - `type: entity` or `type: concept` → under the appropriate topic heading in `## Topics`
   - `type: synthesis` → under `## Synthesis`
   - Format: `- [[Page Title]] — one-line summary from page's first paragraph`
4. **Remove stale:** index entries pointing to pages that no longer exist.
5. **Deduplicate:** same title listed more than once.

---

## Phase 4 — Fix index consistency

For every `_index.md` in the wiki:

1. List all `.md` files in the same folder (excluding `_index.md` itself).
2. Extract each file's `title:` from frontmatter.
3. **Add missing to `children:`** — titles in the folder but not in the index's `children:` array.
4. **Remove stale from `children:`** — entries with no matching file in the folder.
5. **Add missing body entries** — if a child title is in `children:` but not mentioned in the index body, add a `- [[Title]] — summary` line.
6. **Subfolders → `child_indexes:`** — any subfolder with a `_index.md` must be listed in `child_indexes:`. Add missing entries.
7. **Missing `_index.md` in subfolders** — if a topic subfolder (not `_sources/`, `_synthesis/`) has no `_index.md`, create one with correct frontmatter including `aliases` (topic name variants) and `cssclasses` (unique kebab-case slug for graph coloring).

---

## Phase 5 — Fix parent/path fields

For every wiki page missing `parent:` or `path:`:

1. Determine the folder the file lives in (relative to `wiki/`).
2. Set `path:` to that folder path.
3. Set `parent:` to the `title:` of the folder's `_index.md`, wrapped as `"[[Title]]"`.
4. **Special cases:**
   - Pages in `wiki/_sources/`: set `parent: ""` and `path: "_sources"`.
   - Pages in `wiki/_synthesis/`: set `parent: ""` and `path: "_synthesis"`.
   - Top-level `_index.md` files under `wiki/`: set `parent: "[[Wiki Index]]"` (or whatever `index.md` title is).

---

## Phase 6 — Fix broken wikilinks

For each `[[Target]]` that points to a non-existent page:

1. **Alias match:** search all pages for `aliases:` containing `Target`. If found, update the link to the page's actual `title:`.
2. **Fuzzy match:** search for titles differing only in case, hyphens, or minor spelling. If a single confident match exists, update.
3. **Index path match:** if the target looks like `folder/_index`, search for the index by folder name.
4. **Unresolvable:** if no match found, leave the link and report it. Do NOT delete the link or create a stub page.

---

## Phase 7 — Connect orphan pages

For pages with zero inbound wikilinks:

1. Find the page's containing folder `_index.md`.
2. If the page is not in the index body, add a `- [[Title]] — summary` line.
3. Check `related:` on sibling pages (same folder). If this page is topically related, add it to their `related:` arrays.
4. If the page is a source summary (`type: source`), verify at least one wiki page has it in its `sources:` field. If none do, find the most relevant concept/entity page and add it.

Do NOT delete orphan pages — connect them.

---

## Phase 8 — Fix title-in-aliases (WARN-level, ghost node prevention)

For EVERY wiki page where the `title` value is not in the `aliases` array:

1. Read the page's `title:` and `aliases:` fields.
2. If `aliases` is missing or empty, create it with the title as the first entry.
3. If `aliases` exists but does not contain the title, prepend it.
4. Keep all existing aliases — do not remove them.
5. For `_index.md` files, also add topic name variants: kebab-case slug, Title Case, common abbreviations.

---

## Phase 9 — Fix missing graph color groups (WARN-level)

For each topic folder flagged as missing a graph color group:

1. Read current color groups via `obsidian eval code="JSON.stringify(app.internalPlugins.plugins['graph'].instance.options.colorGroups)"`.
2. Pick the next unused color from the `/llm-wiki-stack:obsidian-graph-colors` skill palette.
3. Insert the new group before the `_sources`/`_synthesis`/`_index` catch-all rules.
4. Apply via `obsidian eval` using `graph.saveOptions()`.

---

## Phase 10 — Restructure flat folders (WARN-level)

For any topic folder flagged with flat folder sprawl (>12 direct children):

1. Read the folder's `_index.md` body. If it already groups pages by section headers, use those groupings as subtopic names.
2. Create subtopic subfolders with `_index.md` each.
3. Move pages into the appropriate subfolder using `git mv`.
4. Update each moved page's `parent:` to point to the new subtopic index title.
5. Update each moved page's `path:` to the new folder path.
6. Update the parent `_index.md`: remove moved children from `children:`, add entries to `child_indexes:`.
7. Update `wiki/index.md` to reflect the new groupings.

---

## Phase 11 — Densify body wikilinks (INFO-level)

Scan all page bodies. For any bare mention of a page title (or alias) that is NOT already a `[[wikilink]]`:

1. Build a lookup set of all page titles + aliases.
2. For each page body, find mentions matching the lookup set.
3. Wrap the first occurrence per page in `[[wikilinks]]`.
4. Skip: mentions inside existing wikilinks, code blocks, frontmatter, and the page's own title in the `# Heading`.

This is optional — only run if the issue list has INFO-level items flagging missing wikilinks.

---

## Phase 12 — Final verification

Run the script again:

```bash
.claude/scripts/verify-ingest.sh vault
```

Compare before/after. Report:

- Issues fixed
- Issues remaining (with explanation)

---

## Phase 13 — Report and log

Present a summary:

```
## Lint & Fix Report

### Diagnosis
- Errors found: N
- Warnings found: N
- Info items found: N

### Fixes applied
- Sources fields wrapped in [[wikilinks]]: N
- Pages added to index.md: N
- Pages added to _index.md children: N
- Broken wikilinks resolved: N
- Orphan pages connected: N
- Parent/path fields filled: N
- Index aliases added: N
- Graph color groups added: N
- Flat folders restructured into subtopics: N
- Body wikilinks densified: N

### Unresolved (needs manual review)
- <list each item>

### Verification
- verify-ingest.sh errors: before N → after N
- verify-ingest.sh warnings: before N → after N
```

Append to `wiki/log.md`:

```
## [YYYY-MM-DD] lint-fix | Health check and auto-repair
Found N errors, N warnings, N info. Fixed N issues. Unresolved: N.
```

---

## Model selection

This agent defaults to Sonnet which handles structural repair well. Override to
Opus when the wiki has 200+ pages — fuzzy link matching and orphan resolution
become harder at scale.

## Hard rules

- **Read before writing.** Always read the full file before editing it.
- **Preserve content.** Never delete page content — only fix frontmatter and structural links.
- **Verify before linking.** Never create a `[[wikilink]]` to a page that does not exist.
- **One pass.** Collect all issues first, then apply all fixes, then verify. Do not loop.
- **Follow vault/CLAUDE.md.** All frontmatter must match the schema for the page's `type`.
- **Never modify `vault/raw/`.** Source files are immutable.
- **Log the operation** to `wiki/log.md` when done.
