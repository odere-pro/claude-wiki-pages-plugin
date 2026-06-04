---
name: engine-api
description: >
  The LLM-facing contract for the deterministic claude-wiki-pages Bun engine —
  how ANY agent should call it. Documents each subcommand (verify, fix, heal,
  doctor, config, migrate, search; plus planned index/link-suggest), its `--json` output shape, exit
  codes, and when to call it on a write-path. Trigger when an agent or user
  asks "how do I call the engine", "what does the engine return", "how do I
  verify/heal programmatically", or invokes /claude-wiki-pages:engine-api. This
  is reference material, not an action — it teaches the tool surface.
allowed-tools: Read Bash
---

# Engine API — the deterministic tool surface

The engine is a Bun CLI invoked through `scripts/engine.sh <command> [--target <vault>] [--json]`.
It is the source of truth for anything that must be exact (the wikilink graph,
frontmatter, MOC integrity). Agents call it and reason over its structured
output instead of eyeballing the vault. **Always pass `--json` for machine use.**

## Invocation

```sh
bash "${CLAUDE_PLUGIN_ROOT}/scripts/engine.sh" <command> --target <vault> --json
```

If Bun is missing, the bridge prints a warning and exits 0 — degrade to the bash
verifiers (`verify-ingest.sh`) rather than failing.

## Commands

### `verify` — read-only integrity check

Ports `verify-ingest.sh` CHECK 0–3. Returns a report; **exit 1 when any error**, else 0.

```json
{ "command": "verify", "vault": "docs/vault",
  "findings": [ { "severity": "error|warn|info", "check": "schema|index-duplicates|sources-format|moc|orphan-sources|topic-folder", "message": "…", "file": "…" } ],
  "errors": 0, "warnings": 0, "clean": true }
```

Call it: before trusting the vault, and after every write-path as the closing gate.

### `fix` — deterministic safe repairs (idempotent)

Repairs only what has one correct value: index duplicates, missing `_index.md`,
`_index.md` children drift. Never touches body prose, schema_version, or sources
semantics. Running twice changes nothing. Exit 0.

```json
{ "command": "fix", "vault": "…", "changes": [ { "file": "…", "action": "dedupe-index|create-index|sync-children" } ], "changed": 2 }
```

### `heal` — git-checkpointed self-heal (the write-path closer)

Checkpoints the vault in git, then loops `verify → fix → re-verify` until clean
or no progress, and commits the result. **Exit 0 when clean, 1 when errors
remain.** Rollback is `git revert <healCommit>`.

```json
{ "command": "heal", "vault": "…", "errorsBefore": 2, "errorsAfter": 0,
  "iterations": 1, "clean": true, "checkpoint": "<sha>", "healCommit": "<sha>",
  "changes": [ … ], "unresolved": [] }
```

### `doctor` — environment + vault health (D01–D10)

Returns `{ results: [{ id, title, status, message, hint }], worst }` with status
`pass|warn|fail|fixed|skip`. `--fix` repairs D04/D05/D08; `--strict` exits 3 on
any warn/fail. See `/claude-wiki-pages:doctor`.

### `config` — effective configuration

`config` (show), `config validate` (exit 1 on schema violations), `config path`.
Merges defaults ← user (`~/.config/claude-wiki-pages/config.json`) ← project
(`.claude/claude-wiki-pages.json`) ← `CLAUDE_WIKI_PAGES_*` env overrides.

### `migrate` — upgrade schema_version in place (v1 → v2)

Dry-run by default; `--write` applies under a git checkpoint. Additive and
idempotent (bumps `schema_version`, writes new templates, generates the source
manifest). Rollback is `git revert <commit>` (printed on completion).

```json
{ "command": "migrate", "vault": "…", "from": 1, "to": 2, "applied": true,
  "changes": [ { "file": "…", "action": "bump-schema|add-template|generate-manifest" } ],
  "checkpoint": "<sha>", "message": "Migrated schema_version 1 → 2 …" }
```

### `search` — deterministic keyword retrieval

`search "<query>"` ranks `wiki/` pages (title/alias > tag > body, ties by title)
and returns `[[wikilink]]`-ready hits. Reproducible — same query, same ranking.
A candidate set, not a cited answer (use `query` for that).

```json
{ "command": "search", "vault": "…", "query": "graph rag",
  "hits": [ { "title": "Graph RAG", "wikilink": "[[Graph RAG]]", "file": "…",
              "type": "concept", "score": 18, "snippet": "…" } ] }
```

### `backlog` — outstanding-maintenance probe

`backlog` reports pending raw sources (no `_sources/` summary, or manifest
`pending`) and overdue lint. The deterministic input to the heartbeat and the
maintenance agent.

```json
{ "command": "backlog", "vault": "…", "pendingRaw": ["raw/x.md"],
  "lastIngest": "2026-05-20", "lastLint": "2026-05-21", "daysSinceLint": 9,
  "needsCatchup": true }
```

### `propose` — human-in-the-loop draft review

Drafts live under `_proposed/` (outside `wiki/`, so unvalidated until promoted).
`propose review` lists them with a readiness check; `propose approve --file <p>`
promotes a draft into `wiki/` (status→active, drops `proposed_by`, git
checkpoint); `propose reject --file <p>` deletes it under a checkpoint.

```json
{ "command": "propose", "sub": "approve", "vault": "…",
  "promoted": ["wiki/topics/x.md"], "checkpoint": "<sha>",
  "message": "promoted … Next: curator heal + polish. Rollback: git revert <sha>" }
```

### Planned (return `{status:"not-implemented"}` until shipped)

`index` (deterministic page/entity index), `link-suggest <page>` (exact auto-link
candidates), `checkpoint`.

## The rule for callers

Ground, then judge, then verify: let the engine compute facts (candidates,
findings) — never hallucinate them — make only the judgment calls yourself, and
end every write-path with `verify` (or `heal`). See `/claude-wiki-pages:maintain-contract`.

## Specification anchor

Contracts: [`docs/architecture.md`](../../docs/architecture.md) (engine layer & command contracts).
