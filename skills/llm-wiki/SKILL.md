---
name: llm-wiki
description: >
  Onboarding entry point. Scaffold a new LLM Wiki vault in the user's project by
  copying from example-vault/, stamp the schema version, and orient the user.
  Trigger when the user says "set up a wiki", "initialize the vault",
  "start a new LLM Wiki", "bootstrap the vault", or invokes
  /llm-wiki-stack:llm-wiki directly.
allowed-tools: Bash Read Write Edit Glob Grep
---

# LLM Wiki — Onboarding

Bootstrap a fresh `vault/` in the user's project and hand off to the ingest
pipeline. This skill runs **once per project**; repeat invocations are a no-op
that reports the existing state.

This skill owns initialization. It does not ingest, lint, or query — those
roles belong to `/llm-wiki-stack:llm-wiki-ingest`,
`/llm-wiki-stack:llm-wiki-lint`, and `/llm-wiki-stack:llm-wiki-query`.

## When to invoke

- The user has installed the plugin and asks how to start.
- No `vault/` directory exists in the user's project.
- The user explicitly asks for a new vault or wants to reset to a known-good scaffold.

Do NOT invoke when a populated `vault/` already exists. Instead, report the
current state (schema version, page count, last log entry) and recommend
`/llm-wiki-stack:llm-wiki-status` or `/llm-wiki-stack:llm-wiki-ingest`.

## Reading contract

Sealed inputs this skill may read:

- The plugin's own `example-vault/` tree — the reference scaffold.
- The plugin's `example-vault/CLAUDE.md` — the authoritative schema.
- The user's project root — to determine the target install path and detect a
  prior install.

This skill MUST NOT read `raw/` or `wiki/` content from any other source.

## Writing contract

Single write target: the user's project root. Everything this skill produces
is contained to a new or empty `vault/` subdirectory.

- Copy `example-vault/` verbatim into `<project>/vault/`.
- Confirm `<project>/vault/CLAUDE.md` declares `schema_version: 1`.
- Do NOT populate `wiki/_sources/`, `wiki/_synthesis/`, or any topic folder
  beyond what `example-vault/` already contains.
- Do NOT write to `<project>/` outside the new `vault/` subtree. In particular,
  do not touch the user's existing `README.md`, `.gitignore`, or any other
  top-level file.

## Workflow

1. **Preflight.** Confirm `<project>/vault/` either does not exist or is empty.
   If it exists and is non-empty, print the current state and exit without
   writing.
2. **Copy.** Copy the full `example-vault/` tree into `<project>/vault/`. Use
   `cp -R` or equivalent — preserve file modes.
3. **Schema check.** Confirm `<project>/vault/CLAUDE.md` starts with
   `schema_version: 1`. If the example vault drifts, correct the new file to
   match the specification.
4. **Verify.** Invoke the plugin's `scripts/verify-ingest.sh` against the new
   vault. Expect exit 0. Surface any non-zero result verbatim; do not attempt
   to auto-repair the scaffold.
5. **Orient.** Print a "you are here" summary:
   - The path to the new vault.
   - The schema version that was stamped.
   - Three suggested next steps, in order of increasing commitment:
     1. Drop a source into `vault/raw/` and run
        `/llm-wiki-stack:llm-wiki-ingest-pipeline`.
     2. Run `/llm-wiki-stack:llm-wiki-status` to confirm every hook fires.
     3. Read `docs/llm-wiki/01-getting-started.md` for the long-form guide.

## Hook enforcement

- `SessionStart` prints the schema-reminder preamble the first time a vault is
  opened — this is owned by Layer 4, not this skill.
- `PreToolUse` frontmatter validation blocks any Write to a scaffolded file
  whose frontmatter does not match the schema. Surface those failures to the
  user; do not try to bypass them.

## Completion signal

Print exactly one of these three shapes:

- `READY: vault scaffolded at <path>; schema version 1; verify-ingest clean.`
- `SKIPPED: existing vault at <path>; <N> pages, last log <date>.`
- `FAILED: <verify-ingest message>; no changes written.`

The pipeline agent (`llm-wiki-ingest-pipeline`) looks for the `READY:` prefix when
chaining onboarding with an immediate first ingest.
