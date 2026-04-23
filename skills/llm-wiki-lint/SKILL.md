---
name: llm-wiki-lint
description: >
  Read-only audit of vault/wiki/ for structural and provenance drift. Reports
  Errors, Warnings, and Info per the rules in docs/SPECIFICATION.md section 12
  and vault/CLAUDE.md. Trigger when the user says "lint the vault", "audit the
  wiki", "check for broken links", "run a health check on the wiki", or
  invokes /llm-wiki-stack:llm-wiki-lint directly. Does not repair anything —
  that is /llm-wiki-stack:llm-wiki-fix.
allowed-tools: Read Glob Grep Bash Edit
---

# LLM Wiki — Lint

Audit the wiki. Do not repair.

Every rule enumerated here is also listed in `docs/SPECIFICATION.md` §12 and
`vault/CLAUDE.md`. This skill is the executor for those rules; when the
specification changes, update this skill.

## When to invoke

- The user asks for a health check on the wiki.
- Periodic audit (recommended every 10 ingests, or monthly).
- As the first half of a lint-fix cycle — the `llm-wiki-lint-fix` agent invokes
  this skill, consumes the report, invokes `/llm-wiki-stack:llm-wiki-fix`, and
  reinvokes this skill to verify.

## Reading contract

- `vault/CLAUDE.md` — the schema.
- `vault/wiki/**/*.md` — every wiki page.
- File modification times — for staleness checks against `raw/`.

## Writing contract

Exactly one write: a single append to `vault/wiki/log.md`:

```
## [YYYY-MM-DD] lint | errors: <n> warnings: <n> info: <n>
```

No other writes. Not even a scratch file. If a rule would require a write to
verify, the rule is out of scope for lint and belongs in fix.

## Rules (severity enumerated)

### Errors (block the wiki from being usable)

- **Missing required frontmatter.** Every field required for the page's
  `type:` per `vault/CLAUDE.md` must be present.
- **Dangling wikilinks.** `[[Target]]` with no matching file or alias.
- **Plain-string sources.** `sources:` entries not in `[[wikilink]]` form.
- **Missing `parent` / `path`.** Required on every page except the vault MOC.
- **MOC missing members.** A page exists under a folder but does not appear
  in the folder's `_index.md` `children:`. A subfolder exists but does not
  appear in `child_indexes:`.
- **Banned legacy values.** `type: moc`, references to `_MOC.md`, field name
  `child_mocs:` — all retired in schema version 1.

### Warnings (structural drift; wiki still usable)

- **Contradictions.** Two pages on the same entity or concept make
  incompatible claims. Flag both.
- **Orphan pages.** No inbound wikilinks from any other page.
- **Single-source high confidence.** `confidence ≥ 0.8` with only one entry
  in `sources:`. Allowed only for direct quotes or settled facts.
- **Vault MOC drift.** `wiki/index.md` lists pages that no longer exist, or
  omits pages that do.
- **MOC missing aliases.** Per-folder `_index.md` lacks `aliases:` covering
  the folder topic's common display variants.
- **Excessive nesting.** A folder more than four levels deep under `wiki/`.

### Info (candidate for review, not drift)

- **Stale pages.** No `updated:` advance in 30+ days despite newer sources
  citing the same topic in `raw/`.
- **Missing pages.** A concept or entity name appears in prose on three or
  more pages but has no dedicated page of its own.
- **Low confidence.** `confidence < 0.5` on any page.

## Workflow

1. Read the schema.
2. Walk `vault/wiki/` with `git ls-files` or `find`.
3. For each page: parse frontmatter; bucket by `type:`; queue against the
   rules above.
4. Resolve wikilinks by scanning filenames and `aliases:` across the wiki.
5. Build the report.
6. Append the single log line.
7. Print the report to the terminal.

## Report format

```
LINT REPORT — <YYYY-MM-DD>

Errors (<N>):
  <path>:<lineno> — <rule>: <specific>
  ...

Warnings (<N>):
  <path> — <rule>: <specific>
  ...

Info (<N>):
  <path> — <rule>: <specific>
  ...

Summary: <N> errors, <N> warnings, <N> info items across <P> pages.
```

Exit codes:

- `0` — zero errors and zero warnings (info allowed).
- `1` — warnings present, no errors.
- `2` — errors present.

The `llm-wiki-lint-fix` agent uses the exit code to decide whether to invoke
`/llm-wiki-stack:llm-wiki-fix`.
