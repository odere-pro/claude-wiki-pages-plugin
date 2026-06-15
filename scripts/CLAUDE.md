# scripts/ — Layer 4 Orchestration shell

The plugin's hot path. On install, Claude Code loads `scripts/` (alongside
`hooks/hooks.json`) as the Layer 4 Orchestration runtime — these bash scripts
fire on every hook event and gate every wiki write. They are deliberately
shell-first: hooks run synchronously and per-keystroke-class, so the gates stay
in bash and never spawn a runtime per write. When deterministic structure work
is needed (verify, fix, heal), the shell bridges to the Bun engine
(`src/cli/cli.ts` → built `dist/cli.js`) through [`engine.sh`](./engine.sh) —
and degrades gracefully to a no-op when Bun is absent. See
[`../CLAUDE.md`](../CLAUDE.md) for the four-layer model and
[`../docs/operations.md`](../docs/operations.md) for the hook contract.

## Script anatomy

Every executable script follows the same shape:

- `#!/bin/bash` shebang, then `set -euo pipefail` — fail fast on error, unset
  var, or broken pipe. The one exception is [`resolve-vault.sh`](./resolve-vault.sh),
  which is sourced (see below) and must not mutate the caller's shell options.
- `source "$(dirname "$0")/resolve-vault.sh"` then `VAULT=$(resolve_vault)` —
  one resolution path for every script, so the active vault is consistent and
  testable in one place.
- Two run modes:
  - Hook mode — read the tool-call JSON from stdin, optionally emit
    `{"decision":"block","reason":"…"}` on stdout, and ALWAYS exit 0 (a
    non-zero exit from a hook is a harness error, not a policy block). The lone
    hard-block exception is [`enforce-dmi.sh`](./enforce-dmi.sh), which exits 2.
  - CLI mode — accept `--target <vault>` / `--file <path>` flags, print plain
    output, and use real exit codes (0 = clean, 1 = issues). Used by tests, the
    parity gates, and manual runs.

## Hook wiring

The map below is the exact event-to-script wiring from
[`../hooks/hooks.json`](../hooks/hooks.json). Order matters: PreToolUse scripts
run top to bottom and the first block short-circuits the write.

| Event | Matcher | Scripts (in order) |
| --- | --- | --- |
| `SessionStart` | — | [`session-start.sh`](./session-start.sh) |
| `UserPromptSubmit` | — | [`prompt-guard.sh`](./prompt-guard.sh) |
| `PreToolUse` | `Write\|Edit` | [`firewall.sh`](./firewall.sh), [`validate-frontmatter.sh`](./validate-frontmatter.sh), [`check-wikilinks.sh`](./check-wikilinks.sh), [`protect-raw.sh`](./protect-raw.sh), [`validate-attachments.sh`](./validate-attachments.sh) |
| `PreToolUse` | `Write\|Edit\|MultiEdit` | [`enforce-dmi.sh`](./enforce-dmi.sh) (path-filtered) |
| `PreToolUse` | `Write\|Edit\|MultiEdit` | [`enforce-must-rule.sh`](./enforce-must-rule.sh) (path-filtered) |
| `PostToolUse` | `Write\|Edit` | [`post-wiki-write.sh`](./post-wiki-write.sh), [`post-ingest-summary.sh`](./post-ingest-summary.sh) |
| `SubagentStop` | — | [`subagent-lint-gate.sh`](./subagent-lint-gate.sh), [`subagent-ingest-gate.sh`](./subagent-ingest-gate.sh), [`subagent-commit-gate.sh`](./subagent-commit-gate.sh) |
| `Stop` | — | [`session-memory.sh`](./session-memory.sh) |
| `SessionEnd` | — | [`session-memory.sh`](./session-memory.sh) |

## Scripts by role

### Vault resolution

- [`resolve-vault.sh`](./resolve-vault.sh) — SOURCEABLE helper defining
  `resolve_vault()`, `init_vault_settings()`, `set_vault_path()`, and the
  multi-vault registry helpers. Four-tier resolution (first match wins):
  `CLAUDE_WIKI_PAGES_VAULT` env var → `.claude/claude-wiki-pages/settings.json`
  `current_vault_path` → auto-detect (a `CLAUDE.md` with `schema_version` plus a
  `wiki/` sibling, scanned up to 4 levels) → default `docs/vault`.

### Session and lifecycle

- [`session-start.sh`](./session-start.sh) — reify settings, print the schema
  REMINDER, the MOC INDEX pointer, and a deterministic NEXT step; warn when Bun
  is missing.
- [`prompt-guard.sh`](./prompt-guard.sh) — non-blocking warnings about common
  prompt mistakes.
- [`session-memory.sh`](./session-memory.sh) — Stop / SessionEnd: persist the
  session-scratch handoff as a durable `agent-session` source. Lazy and
  idempotent; never ingests to the wiki itself.
- [`heartbeat.sh`](./heartbeat.sh) — surface a one-line maintenance catch-up
  recommendation when the vault has a backlog. Off by default; never mutates
  the vault.

### PreToolUse gates

- [`firewall.sh`](./firewall.sh) — confine Write/Edit to the resolved vault
  (plus `firewall.allowPaths`, minus `firewall.denyPaths`), with cross-vault
  isolation from the registry.
- [`validate-frontmatter.sh`](./validate-frontmatter.sh) — block wiki writes
  missing required frontmatter (rules single-sourced from the schema table).
- [`check-wikilinks.sh`](./check-wikilinks.sh) — block `[text](file.md)` where
  a `[[wikilink]]` is required.
- [`protect-raw.sh`](./protect-raw.sh) — block edits to existing `raw/` files
  (sources are immutable); allow new ones.
- [`validate-attachments.sh`](./validate-attachments.sh) — block non-text
  source notes whose `attachment_path` is missing or dangling.
- [`enforce-dmi.sh`](./enforce-dmi.sh) — block `SKILL.md` writes that add
  side-effecting verbs without `disable-model-invocation: true` (exit 2).
- [`enforce-must-rule.sh`](./enforce-must-rule.sh) — warn when a
  must/never/always rule lands in `CLAUDE.md` with no backing hook.

### PostToolUse reminders

- [`post-wiki-write.sh`](./post-wiki-write.sh) — after a wiki write, remind to
  refresh `index.md` / the folder's index note (folder note
  `<folder>/<folder>.md`; legacy `_index.md` still accepted).
- [`post-ingest-summary.sh`](./post-ingest-summary.sh) — after a `_sources/`
  note, remind to log the ingest and report source progress.

### SubagentStop gates

- [`subagent-lint-gate.sh`](./subagent-lint-gate.sh) — warn when the curator
  agent reports unresolved errors.
- [`subagent-ingest-gate.sh`](./subagent-ingest-gate.sh) — run verification and
  warn on a half-written wiki after the ingest agent stops.
- [`subagent-commit-gate.sh`](./subagent-commit-gate.sh) — commit backstop:
  after a write-path agent returns, commit any vault changes left uncommitted
  (pathspec-scoped; honors `gitCheckpoint.mode=off`; creates the repo when
  coverage is missing; always exits 0). Runs last so the verify/lint gates
  report first.

### Verification and validation

- [`verify-ingest.sh`](./verify-ingest.sh) — post-ingest checks (duplicate
  index entries, sources-field format, index consistency).
- [`verify-output.sh`](./verify-output.sh) — enforce the portable-markdown
  contract for files under `output/`.
- [`validate-docs.sh`](./validate-docs.sh) — the glossary gate (banned strings,
  Layer capitalization, slash-command resolution); run in CI Tier 0.
- [`validate-manifests.sh`](./validate-manifests.sh) — validate
  `.claude-plugin/plugin.json` and `marketplace.json` shape with jq.

### Opt-in linters

- [`lint-ontology.sh`](./lint-ontology.sh) — predicate domain/range lint
  against the ontology table in the schema.
- [`lint-structural.sh`](./lint-structural.sh) — template-skeleton conformance
  and no-raw-HTML.
- [`lint-vocabulary.sh`](./lint-vocabulary.sh) — controlled-vocabulary
  freshness (orphans, unreferenced groups, tags below floor).
- [`graph-quality.sh`](./graph-quality.sh) — dangling-wikilink scanner (the
  detector `verify` lacks) plus the topic-cluster node/edge concentration
  metric. Read-only; pure bash + python3. Used by the `fill-gaps` skill.
- [`disentangle-links.sh`](./disentangle-links.sh) — topic-local linking
  remediation (ADR-0033): demotes cross-topic `[[wikilinks]]` to plain text and
  prunes cross-topic association frontmatter so the graph forms topic islands
  instead of a hairball. Dry-run by default; `--apply` rewrites in place
  (git-checkpointed). Pure bash + python3; mirrors `graph-quality.sh`'s
  resolver. Never touches `parent`/`sources`/`children` or creates dangling
  links.
- [`check-duplicate-claims.sh`](./check-duplicate-claims.sh) — advisory
  duplicate-claim warning across `source_quotes`.

### Ingest and export

- [`scaffold-vault.sh`](./scaffold-vault.sh) — idempotent, no-clobber vault
  scaffolding.
- [`distribute-wiki.sh`](./distribute-wiki.sh) — export wiki pages as plain
  markdown (frontmatter stripped, wikilinks flattened).

### Engine bridge

- [`engine.sh`](./engine.sh) — the bash-to-Bun bridge for `verify` / `fix` /
  `heal` and friends. Prefers built `dist/cli.js`, falls back to running
  `src/cli/cli.ts` directly; warns and exits 0 when Bun is absent.

### Concurrency

- [`vault-lock.sh`](./vault-lock.sh) — SOURCEABLE advisory vault mutex defining
  `vault_lock_acquire <vault>` / `vault_lock_release <vault>`. An `flock` on fd
  200 over `<vault>/.git/claude-wiki-pages.lock` (timeout `VAULT_LOCK_TIMEOUT_SEC`,
  default 30 s; on timeout it WARNs and returns 1 so the caller never blocks the
  write phase). Wrap the `isClean → append/stash → commit` sequences in
  `snapshot.sh` and friends to serialize this plugin's own writes (correlation #1
  / H06–H11). It is the cross-process companion to the in-process mutex in
  [`../src/core/vault-lock.ts`](../src/core/vault-lock.ts) — same invariant,
  different mechanism, so it is NOT a byte-pinned parity twin.

### Eval

- [`eval-ingest-extract.sh`](./eval-ingest-extract.sh) — local-model
  quality-gate measurement driver for the `ingest-extract` tier. Measurement
  apparatus only — model-neutral, no network call, flips no default.
- [`eval-produce-ollama.sh`](./eval-produce-ollama.sh) — the model-specific
  PRODUCE step the apparatus deliberately omits: asks a local Ollama model to
  extract a golden-set input into a candidate vault under `tmp/eval-candidates/`
  for the scorer to measure. Fail-closed parser; never scores, never reads the
  gold `expected/` content into the prompt.
- [`eval-compare-ollama.sh`](./eval-compare-ollama.sh) — matrix runner: loops
  models × cases through produce + score and prints a summary table. A report,
  not a gate — the scorer stays the only verdict authority.

### Health and dependencies

- [`doctor.sh`](./doctor.sh) — health check behind
  `/claude-wiki-pages:doctor`.
- [`check-deps.sh`](./check-deps.sh) — runtime dependency check (SessionStart
  and status).
- [`set-vault.sh`](./set-vault.sh) — manage the active vault path and the
  multi-vault registry (`add` / `switch` / `remove` / `list`).

## Sourceable vs. executable

Two files are sourceable rather than executable: [`resolve-vault.sh`](./resolve-vault.sh)
(sourced by every other script for vault resolution) and
[`vault-lock.sh`](./vault-lock.sh) (sourced by the snapshot/commit paths for the
advisory lock). Both omit `set -euo pipefail` — doing otherwise would mutate the
caller's shell options and could abort unrelated callers — and instead fail
closed per-function (guarded writes, `2>/dev/null`, explicit returns). Every
other script in this directory is executable and sets strict mode.

## Shell↔TS parity contract

Two shell gates are byte-aligned twins of the Bun engine and must stay in
lock-step:

- [`firewall.sh`](./firewall.sh) ↔ [`../src/core/firewall.ts`](../src/core/firewall.ts)
  — pinned by `gate-11-firewall-parity`.
- [`verify-ingest.sh`](./verify-ingest.sh) ↔ the engine's `verify` command —
  pinned by `gate-05`.

To keep the two implementations in agreement, the bash side uses simple globs
only (`*` → `[^/]*`, `**` → `.*`); anything fancier would drift from the
TypeScript matcher.

## Coupling

[`../hooks/hooks.json`](../hooks/hooks.json) and these scripts are coupled by
design — the wiring and the implementations are one unit. Changing a hook means
changing the matching script AND the matching `tests/scripts/*.bats`. Update all
three together, or the parity and hook tests fail.
