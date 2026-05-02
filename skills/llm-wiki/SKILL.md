---
name: llm-wiki
description: >
  Onboarding entry point. Scaffold a new LLM Wiki vault in the user's project by
  copying from the skill's own template/, stamp the schema version, and orient the user.
  Trigger when the user says "set up a wiki", "initialize the vault",
  "start a new LLM Wiki", "bootstrap the vault", or invokes
  /llm-wiki-stack:llm-wiki directly.
allowed-tools: Bash Read Write Edit Glob Grep
---

# LLM Wiki — Onboarding

Bootstrap a fresh `vault/` in the user's project and hand off to the ingest
pipeline. The skill is **idempotent and self-repairing**: it always persists
the chosen vault path, creates the vault directory if it is missing, and
fills in any missing required files or subdirectories from the plugin's
reference scaffold without overwriting user content. Running it twice on a
healthy vault is a no-op.

This skill owns initialization. It does not ingest, lint, or query — those
roles belong to `/llm-wiki-stack:llm-wiki-ingest`,
`/llm-wiki-stack:llm-wiki-lint`, and `/llm-wiki-stack:llm-wiki-query`.

## When to invoke

- The user has installed the plugin and asks how to start.
- No `vault/` directory exists in the user's project.
- The vault directory exists but is empty or missing required files / folders.
- The user explicitly asks for a new vault or wants to reset to a known-good scaffold.

Safe to invoke even when a populated vault already exists — the skill detects
that case, reports the current state, ensures settings are persisted, and
exits without overwriting anything.

## Reading contract

Sealed inputs this skill may read:

- The plugin's own `${CLAUDE_PLUGIN_ROOT}/skills/llm-wiki/template/` tree — the
  reference scaffold used as the copy source. This is always the plugin cache
  path, never a project-local path (even when the user's chosen vault
  happens to be `docs/vault-example`).
- The plugin's `${CLAUDE_PLUGIN_ROOT}/skills/llm-wiki/template/CLAUDE.md` — the
  authoritative schema.
- The user's project root — to determine the target install path and detect a
  prior install.

This skill MUST NOT read `raw/` or `wiki/` content from any other source.

## Writing contract

Two write targets, both scoped to the user's project:

1. `<project>/<vault>/` — the scaffold tree. Only missing files and
   directories are written; existing user content is never overwritten.
2. `<project>/.claude/llm-wiki-stack/settings.json` — written via
   `scripts/set-vault.sh` so the chosen vault path persists across sessions.

- Copy missing pieces from `${CLAUDE_PLUGIN_ROOT}/skills/llm-wiki/template/` into
  `<project>/<vault>/` verbatim.
- Confirm `<project>/<vault>/CLAUDE.md` declares `schema_version: 1`.
- Do NOT populate `wiki/_sources/`, `wiki/_synthesis/`, or any topic folder
  beyond what the reference scaffold already contains.
- Do NOT write to `<project>/` outside the new `vault/` subtree and the
  `.claude/llm-wiki-stack/` settings path. In particular, do not touch the
  user's existing `README.md`, `.gitignore`, or any other top-level file.

## Vault location

The vault root is resolved in this order (first match wins):

1. **`LLM_WIKI_VAULT` env var** — explicit override; good for local dev and CI.
2. **`.claude/llm-wiki-stack/settings.json` → `current_vault_path`** — the
   persisted per-project vault path. Written by `scripts/set-vault.sh` and
   self-healed by any hook that resolves the vault.
3. **Auto-detect** — scan the project (up to 4 levels deep) for a directory that
   contains both `CLAUDE.md` (declaring `schema_version`) and a `wiki/`
   subdirectory. Use the first match.
4. **Default** — `docs/vault` relative to the project root.

The shell scripts implement this via `scripts/resolve-vault.sh`. Claude should
follow the same logic when deciding where to read or write vault files:

```
IF LLM_WIKI_VAULT is set → use that path
ELSE IF .claude/llm-wiki-stack/settings.json has current_vault_path → use that
ELSE run: find . -maxdepth 4 -name "CLAUDE.md" | xargs grep -l "schema_version"
     pick the first match whose parent also contains a wiki/ directory
ELSE use: docs/vault
```

`LLM_WIKI_VAULT` accepts relative paths (resolved from the project root) or
absolute paths:

```sh
export LLM_WIKI_VAULT=docs/vault   # explicit relative — same as default
export LLM_WIKI_VAULT=my-wiki      # custom vault name
export LLM_WIKI_VAULT=/abs/path    # absolute, e.g. shared / multi-project vault
```

## Workflow

The workflow is designed so a first-time user sees **zero error messages** on
a clean install. Every step tolerates pre-existing state and fills in only
what is missing.

1. **Resolve `<vault>`.** In priority order:
   1. Path named in the user's prompt (e.g. "my vault is docs/vault-example").
   2. `LLM_WIKI_VAULT` env var.
   3. `.claude/llm-wiki-stack/settings.json` → `current_vault_path`.
   4. Auto-detected directory (CLAUDE.md with `schema_version` + `wiki/` sibling).
   5. Default: `docs/vault`.
2. **Persist path (always).** Run
   `bash ${CLAUDE_PLUGIN_ROOT}/scripts/set-vault.sh <vault>`.
   This creates `<project>/.claude/llm-wiki-stack/settings.json` with defaults
   if it does not exist, then writes `current_vault_path: <vault>`. Do this
   before touching the vault directory so the configuration is correct even
   if a later step fails.
3. **Scaffold vault (create + populate).** Run
   `bash ${CLAUDE_PLUGIN_ROOT}/scripts/scaffold-vault.sh <vault>`.
   The script is idempotent: it creates `<vault>` if missing and copies any
   top-level entries from `${CLAUDE_PLUGIN_ROOT}/skills/llm-wiki/template/` that
   are not already present in `<vault>`. Existing files are never
   overwritten (no-clobber). Its stdout contract (`CREATED: …` /
   `EXISTS: …` / `READY: vault at …; N created, M preserved`) feeds the
   orientation summary in step 6.
4. **Schema check.** Confirm `<project>/<vault>/CLAUDE.md` starts with
   `schema_version: 1`. Step 3 already copies it when absent; if it exists
   but is missing the version header, stamp the correct frontmatter; do not
   rewrite unrelated content.
5. **Verify.** Invoke
   `bash ${CLAUDE_PLUGIN_ROOT}/scripts/verify-ingest.sh --target <vault>`.
   Expect exit 0. If non-zero, surface the output verbatim, but only after
   steps 2–4 have completed — persistence and scaffolding must not be gated
   on verification passing on the very first run.
6. **Orient.** Print a "you are here" summary:
   - The path to the vault.
   - The schema version present in `<vault>/CLAUDE.md`.
   - Whether settings were created fresh, updated, or already correct.
   - Three suggested next steps, in order of increasing commitment:
     1. Drop a source into `<vault>/raw/` and run
        `/llm-wiki-stack:wiki` — the orchestrator detects the new source and
        chains the ingest pipeline automatically.
     2. Run `/llm-wiki-stack:llm-wiki-status` to confirm every hook fires.
     3. Read `docs/llm-wiki/01-getting-started.md` for the long-form guide.

## Hook enforcement

- `SessionStart` prints the schema-reminder preamble the first time a vault is
  opened — this is owned by Layer 4, not this skill.
- `PreToolUse` frontmatter validation blocks any Write to a scaffolded file
  whose frontmatter does not match the schema. Surface those failures to the
  user; do not try to bypass them.

## Completion signal

Print exactly one of these shapes:

- `READY: vault scaffolded at <vault-path>; schema version 1; settings persisted; verify-ingest clean.`
- `READY: vault repaired at <vault-path> (<N> files added); schema version 1; settings persisted; verify-ingest clean.`
- `READY: existing vault at <vault-path>; <N> pages, last log <date>; settings persisted.`
- `WARN: vault at <vault-path> ready but verify-ingest reported: <message>. Settings persisted; no scaffold changes overwritten.`

`FAILED:` is reserved for cases where `set-vault.sh` itself cannot write
settings (filesystem permission error) — every other condition must resolve
to a `READY:` or `WARN:` outcome.

The pipeline agent (`llm-wiki-stack-ingest-agent`) looks for the `READY:` prefix when
chaining onboarding with an immediate first ingest.

After the `READY:` or `WARN:` line, **always print exactly one trailing
`NEXT_STEP:` line** with this shape:

```
NEXT_STEP: ingest_pending=<true|false> raw_count=<N> recommended=<llm-wiki-stack-ingest-agent|none>
```

- `ingest_pending=true` when one or more files in `<vault>/raw/` are not yet
  referenced in `<vault>/wiki/log.md` ingest entries; otherwise `false`.
- `raw_count` is the count of unreferenced raw files (0 when pending is false).
- `recommended` is `llm-wiki-stack-ingest-agent` when pending is true, otherwise `none`.

The `llm-wiki-stack-orchestrator-agent` (Layer 4 dispatch for
`/llm-wiki-stack:wiki`) parses this line to decide whether the user's session
should chain into an immediate ingest or end here. A missing or malformed
`NEXT_STEP:` line breaks the orchestrator's chaining contract and is a Tier 1
test failure.
