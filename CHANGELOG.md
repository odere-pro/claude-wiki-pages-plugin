# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`snapshot` engine verb + wrapper — every LLM write phase is git-bounded.** The planned `checkpoint` verb shipped as `snapshot`: `snapshot pre` checkpoints the vault under `gitCheckpoint.mode`, `snapshot post` commits whatever a write phase wrote (clean vault → skip; never an empty commit; always exit 0 — reports, never gates). New `scripts/snapshot.sh` is the single agent-facing entry with an inline-git fallback when Bun is absent. The ingest, curator, and polish agents now call it around their write phases.
- **SubagentStop commit backstop.** New `scripts/subagent-commit-gate.sh` (last in the `SubagentStop` chain): after a write-path agent returns, any vault changes left uncommitted are committed as one labelled backstop commit — no LLM write escapes git coverage, even on degraded paths (it creates the repo when coverage is missing). Pathspec-scoped; honors `gitCheckpoint.mode=off`; never blocks.
- **`gitCheckpoint.mode` is finally consumed.** `heal`, `migrate`, `propose`, and `snapshot` route through the new `applyCheckpointMode` helper: `off` skips all git ops, `branch`/`both` pin a `cwp/checkpoint/<opId>` rollback branch.
- **Wired sources — ingest the host project's docs.** New `scripts/wire-source.sh add` registers a git work tree (typically the project root) as a **docs-only** ingest source (README, `*.md`, `docs/`, ADRs, RFCs — never source code; the vault itself auto-excluded). The init wizard offers wiring as Step 3c. Records live in `.claude/claude-wiki-pages/settings.json` (`wired_sources`, with new `wired_read`/`wired_add`/`wired_set_synced` helpers in `resolve-vault.sh`).
- **Commit-hash paper trace in `wiki/log.md`.** Every git-bounded operation now records its rollback anchor in the operations log: `heal`/`migrate`/`propose` log their checkpoint SHA, `snapshot post` and the SubagentStop backstop log the pre-state SHA — the entry lands inside the operation's own commit (a commit cannot contain its own SHA; `git log -- wiki/log.md` recovers it).
- **Initial Obsidian graph filters.** New vaults ship `.obsidian/graph.json` with the curated filter set — Tags off, Attachments off, Existing files only on, Orphans on — via `skills/init/template/` and `docs/vault-example/`; the `obsidian-graph-colors` skill now defines this as the minimum scaffold the polish agent creates when `graph.json` is absent.
- **Local dev marketplace `claude-wiki-pages-local`.** `.claude-plugin/marketplace.json` is back (it was removed in favor of the registry listing), under a deliberately different marketplace name so adding both the published registry and a local clone never collides. Fixes the documented local-clone install flow.
- **`/claude-wiki-pages:sync` skill + `scripts/sync-source.sh`.** Manual sync pulls upstream docs changes (git diff vs `lastSyncedCommit`, glob-filtered) into `raw/wired/<name>/` as immutable versioned snapshots (`<stem>--<date>-<sha8>`, sha256-12 content dedup, never overwrites), marks superseded `_sources/` notes with additive `superseded_by` frontmatter, and hands off to the normal ingest pipeline. `backlog` gains an informational `wiredChanges` field and the heartbeat prints a `SYNC:` notice — recommendation only, no auto-writes.
- **Enforced local-model allow-list + full 6-model evaluation.** The engine now gates which local models it will run: `APPROVED_LOCAL_MODELS` in `src/data/config/config.ts` is the single source of truth, and `config` (every subcommand) computes `localModelErrors` + exits 1 fail-closed when `localModel.enabled` names an unproven model — a teaching message points at the eval path to add one. All six pulled Ollama models were measured on 0.30.7 (qwen3-coder:30b, qwen3-vl:30b, qwen3.5:27b, gemma4:31b, gemma4:26b, gpt-oss:20b); **only `qwen3-coder:30b` passed**, so it is the sole allow-listed model. New [`docs/local-models.md`](docs/local-models.md) documents the tested-and-rejected models and why each failed (mostly dedup/page-set and schema discipline; only gpt-oss:20b fabricated). The `draft` skill now refuses to draft with an unapproved model.
- **`--retries` exponential backoff** on `eval-produce-ollama.sh` / `eval-compare-ollama.sh`: each retry doubles the chat timeout (`stream:false` makes a slow model indistinguishable from a hung one), absorbing the 27–31B models' long generations.
- **Ollama produce step + first measured quality-gate pass (ADR-0017).** New `scripts/eval-produce-ollama.sh` (model-specific produce step for the ADR-0011 apparatus: schema-table-sourced prompt, deterministic `/api/chat` options, fail-closed `===FILE:` block parser) and `scripts/eval-compare-ollama.sh` (models × cases matrix report). The first measured run (qwen3.5:27b, qwen3-coder:30b, gpt-oss:20b, gemma4:26b on an M1 Pro) exposed that the strict set-diff fabrication floor conflated *invented claims* with *over-citation* (extra verbatim input sentences beyond gold's selection); **ADR-0017** amends the scorer: with `--input <raw-input.md>`, extra claim pairs partition into `over_citation` (verbatim in input, reported) vs `fabricated` (the unchanged zero floor). Under the amended definition **`ollama:qwen3-coder:30b` passes both golden-set cases** (schema 1.0, fidelity 1.0, fields 0.93, dedup 1.0, fabricated 0) — the `ingest-extract` tier is unlocked for that model with committed, `--verify-artifact`-reproducible evidence at `tests/eval/runs/ingest-extract/qwen3-coder-30b/`. The other models failed (gpt-oss:20b broadly, gemma4:26b off-task, qwen3.5:27b timeout); every other tier stays Claude-first.
- **Tier 4 prompt-injection corpus replay (deterministic).** New checked-in corpus `tests/fixtures/adversarial/*.json` (8 cases: out-of-vault `.ssh`/`.env` writes, edits to existing `raw/` sources, frontmatter spoofing, markdown-link smuggling — plus two `allow-*` cases pinning the structural/semantic boundary) and driver `tests/adversarial/replay-corpus.sh`, which replays each payload against the real PreToolUse hook chain in `hooks.json` order. No LLM or API key required; the `adversarial.yml` corpus-replay job now runs it live instead of printing `[SKIP]`. Self-tested by `tests/scripts/replay-corpus.bats`.
- **jq pre-flight check.** `session-start.sh` now prints a NOTICE when `jq` is missing (the JSON-parsing hooks fail open without it — writes pass through unchecked), mirroring the existing Bun notice; `doctor.sh` treats a missing `jq` as a hard FAIL (exit 1, same class as a missing `git`).
- **Doctor D11 — Obsidian link parity (advisory).** The engine doctor gains an eleventh check: ask a running Obsidian for `app.metadataCache.unresolvedLinks` and warn (with a `/claude-wiki-pages:lint` hint) when dangling links exist — a second, metadata-cache-backed opinion on link health. Strictly advisory: CLI absent, vault not open, or unparseable output all `skip`, never `fail`; the check shells out through a new injectable `DoctorOptions.runner` (default `spawnSync`, 5 s timeout) so it stays pure in tests. The bash twin `scripts/doctor.sh` prints the same finding as a yellow NOTE with the exit-code contract (0–5) untouched.
- **Scaffolding ablation — what the plugin buys, measured (ADR-0020).** New `scripts/eval-produce-baseline.sh` (the control arm: generic "extract the knowledge into notes" / "answer from these notes" prompts; sources the plugin arm's parser and network plumbing so the two arms differ only in prompts) and `scripts/eval-ablation-report.sh` (arms × tiers × cases matrix; a report, never a gate — baseline FAIL is the measurement; scorer-unscorable cells render labeled, never as numbers). Method: ablate the contract (schema, provenance, citation rules), keep the transport (delimiter protocols). Measured on `qwen3-coder:30b`: the plugin arm passes both tiers; the baseline arm collapses on schema/fidelity (ingest) and drifts off the citation protocol entirely on one query case — committed evidence under `tests/eval/runs/*/qwen3-coder-30b-baseline/`, plus a supplementary non-reproducible Claude-arm run under `tests/eval/runs/*/claude-arm/`. New planted fixture `candidate-baseline-shape` pins that a frontmatter-less candidate scores rc 1 (measured FAIL), never rc 2 (unscorable).
- **Ablation smoke + the measured comparison matrix.** New `tests/smoke/ablation-smoke.sh` (opt-in, wired into the `eval` target): one golden case through both ablation arms with the configured local model, asserting the plugin arm >= the baseline arm on `schema_validity` and `claim_source_fidelity` — self-skips without `CLAUDE_WIKI_PAGES_EVAL_MODEL` + a live Ollama endpoint, so CI never runs it. `docs/features.md` gains "Measured: with and without the plugin": the arms × metrics numbers tables (qwen3-coder:30b canonical + the supplementary Claude arm, every cell linked to its committed run artifact) and the "What the scaffolding buys" capability × mechanism × number map.
- **Maintenance-trigger regression pin.** New `session-start.bats` cases pin the `session-start.sh` → `heartbeat.sh` wiring (CATCHUP surfaces when `maintenance.enabled` and a backlog exists; silent by default), so the autonomous-maintenance trigger cannot be dropped silently.
- **Backlink-safe renames via the Obsidian CLI.** New `scripts/obsidian-rename.sh` wraps `app.fileManager.renameFile()` — Obsidian updates every `[[wikilink]]` backlink from its metadata cache, eliminating the LLM-error-prone manual rewrite on title-collision renames. Strict degradation contract: exit 0 only after an on-disk post-condition check (new path exists, old path gone); exit 3 + `[skip] cli-rename: …` when the CLI is absent or the rename didn't take effect (caller falls back to `git mv` + manual rewrite); exit 2 on usage errors (path traversal, non-`wiki/` targets, `--to` collisions). The curator (Phase 4) and ingest restructure (Step 3.3) now try this path first; frontmatter (`parent:`/`path:`) and index updates stay manual in both branches. CLI writes bypass the PreToolUse hooks, so the existing post-phase re-verify is documented as mandatory.

- **Schema version 2 (additive).** New page types `topic` (narrative topic landing page), `project` (goal/initiative with a `project_status` lifecycle), and `manifest` (source-processed tracker at `wiki/_sources/manifest.md`); new templates `topic.md` and `project.md`; optional claim-level provenance fields `source_quotes` and `derived` on any typed page. Version 2 is a strict superset of v1 — existing v1 vaults stay valid. `validate-frontmatter.sh`, `verify-ingest.sh`, and the engine `verify` accept both versions; `plugin.json` now declares `supported_schema_versions: [1, 2]`.
- **`migrate` engine command.** `claude-wiki-pages migrate [--write]` upgrades a vault v1 → v2 in place: bumps `schema_version`, writes the new templates when absent, and generates the source manifest — additive, idempotent, and git-checkpointed (`git revert <checkpoint>` rolls it back). Dry-run by default.
- **`search` engine command + skill.** Deterministic keyword retrieval over `wiki/` (title/alias > tag > body, ties by title) returning `[[wikilink]]`-ready hits with `--json`. New `/claude-wiki-pages:search` skill; wired into the analyst agent's search strategy. GraphRAG (`search --graph`) documented as the next phase.
- **Vault firewall.** New PreToolUse hook `scripts/firewall.sh` (first in the Write/Edit chain) + engine `firewall check` command confine agent writes to the resolved vault plus `firewall.allowPaths`, minus `firewall.denyPaths` (default-deny `**/.ssh/**`, `**/.aws/**`, `**/.env`, `**/.git/config`). Modes `enforce`/`warn`/`off` via the new `firewall` config block. New `obsidian-vault` guard skill teaches agents to scope the Obsidian CLI; `gate-11-firewall-parity.sh` pins the bash hook to the engine.
- **Engine log entries.** `heal` and `migrate` now record their operation in `wiki/log.md` via the new `src/core/log.ts` helper.
- **Autonomous maintenance (opt-in).** New `backlog` engine command (pending raw sources + overdue lint, manifest-backed), `scripts/heartbeat.sh` (a SessionStart catch-up recommendation — recommends only, never mutates), and `claude-wiki-pages-maintenance-agent` (runs ingest → curator → polish → lint in one git-checkpointed, budgeted pass). The orchestrator routes to it when `maintenance.enabled` and a backlog exists. New `maintenance` config block (all off/bounded by default). Guide: [`docs/automation.md`](docs/automation.md).
- **Local-model drafting + human review (opt-in).** New `vault/_proposed/` staging area (sibling of `wiki/`, so drafts are outside every wiki-scoped check until promoted); `propose` engine command (`review`/`approve`/`reject`, git-checkpointed); `/claude-wiki-pages:review` (the promote/reject gate) and `/claude-wiki-pages:draft` (Ollama/LM Studio drafting into `_proposed/`) skills; `localModel` config block (off by default — Claude Code stays primary); optional `proposed_by` schema field. The orchestrator routes to review when drafts are pending.
- **Opt-in git push.** New `gitCheckpoint.push` (`off` default / `auto`) pushes to the configured upstream after each git-checkpointed engine op (`heal`, `migrate`, `propose`). Best-effort — a push failure never blocks the op.
- **Layer graph coloring.** The `obsidian-graph-colors` skill + polish agent now apply an optional layer pass (raw→green, wiki→blue, schema→orange), ordered after per-topic colors so topic colors still win first-match.
- **Calibration-flow fixtures.** A golden fixture set under `.claude/fixtures/` covering all five wiki flows (onboarding, ingest, curate, polish, analyst) with known-good and known-defect cases — `input/` vault, `expected.md` oracle, and recorded `actual*.tsv` traces — for behavioural regression scoring of the orchestrator and specialists.

### Changed

- **Calibration audit remediation.** Slimmed the analyst, curator, and ingest agent bodies under 200 lines by extracting their per-mode / per-phase procedures into three new agent-teaching skills — `analyst-modes`, `curator-fixes`, `ingest-pipeline` (skill count 16 → 19; agent-teaching skills 2 → 5). Marked the side-effecting `ingest`/`fix`/`index` skills `disable-model-invocation: true` (slash-command-only). Reworded the `CLAUDE.md` glossary / `validate-docs` rules to reference their CI Tier 0 enforcement. `.gitignore` now ignores `CLAUDE.local.md` and `.claude/calibration/`.
- **Calibrate skill-invocation guards + enforcement hooks.** Tightened the skill-invocation guards and wired the matching enforcement hooks so side-effecting flows stay slash-command-gated.
- **Repository renamed to `claude-wiki-pages-plugin`.** The GitHub repo (and Pages site) moved to `odere-pro/claude-wiki-pages-plugin`; the **plugin id stays `claude-wiki-pages`** (the `-plugin` suffix marks the repo, not the plugin). All `github.com/odere-pro/…` and `odere-pro.github.io/…` URLs, schema `$id`s, and the `/plugin marketplace add` target now carry the `-plugin` suffix; the slash namespace `/claude-wiki-pages:`, `/plugin install claude-wiki-pages`, and the npm package `@odere-pro/claude-wiki-pages` are unchanged.
- **Naming alignment + gate.** Replaced the retired skill name `llm-wiki` with `init` in the README and playbooks (the onboarding/scaffold skill was renamed in `1.0.0`), and hardened `scripts/validate-docs.sh` with a targeted check that flags `` `llm-wiki` `` used as a skill while still allowing the kept `llm-wiki-pattern` and `docs/llm-wiki/`.

### Fixed

- **Vault git ops are pathspec-scoped.** `git add -A` / commits in `src/core/git.ts` (and the bash twins) now carry `-- .`, so a vault inheriting the parent project repo never stages or swallows the user's unrelated dirty/staged files; `isClean` likewise ignores dirt outside the vault. Doctor D05 now names the covering parent repo when the vault is nested.
- **README hook count.** The "What's inside" table now reports the real wiring — 15 hook scripts across 7 events, including the previously undocumented `Stop` and `SessionEnd` (session-memory persistence) — and links the multi-vault registry guide.
- **Dangling `marketplace.json` in release-please config.** Removed the reference to the deleted `.claude-plugin/marketplace.json` from `extra-files`, which would have broken the first release PR.
- **CD workflow failures.** Repaired three red workflows on `main` so continuous delivery is green again.
- **Firewall test isolation.** `firewall.test.ts` now uses neutral absolute paths (gate-06), so the suite no longer depends on a machine-specific home directory.
- **Doc/style gate scope.** `.claude/fixtures/` is excluded from the markdownlint, lychee, and glossary gates — fixture vaults intentionally contain defect cases that must not fail the doc gates.

### Removed

- **`SPEC.md`.** The consolidated specification has been retired; its contracts now live in the documents that own them — `docs/architecture.md` (four-layer model, command and agent contracts), `docs/vault-example/CLAUDE.md` (schema), `docs/GLOSSARY.md` (canonical terms), `docs/security.md` (threat model), and `tests/README.md` (test tiers). All references across the README, `CLAUDE.md`, agent/command/skill footers, and docs were repointed; the `docs/SPECIFICATION.md` stub now redirects to those living docs. Historical mentions in `CHANGELOG.md`, `docs/adr/*`, and the migration docs are preserved.

### Glossary changes

- Added (minor): **snapshot**, **commit backstop**, **backlink-safe rename**, **link parity** (Architecture terms); **sync** (User-facing verbs); **wired source** (Vault management terms); **superseded** (Ingest and memory terms); **scaffolding ablation**, **plugin arm**, **baseline arm** (Capability and model terms).

## [1.0.0] — 2026-06-01

Rebrand to **`claude-wiki-pages`** and the first cut of the deterministic **Bun engine**. Breaking: the plugin id, slash namespace, agent names, skill names, settings path, and env vars all change.

### Added

- **Deterministic engine (`@odere-pro/claude-wiki-pages`).** A Bun/TypeScript CLI under `src/` (bins `claude-wiki-pages` / `wiki-pages`) that the plugin calls for anything that must be exact. First command: `verify`, a faithful port of `scripts/verify-ingest.sh` CHECK 0–3 emitting structured `--json`. A parity test pins it to the bash verifier (equal error/warn sets on clean and dirty vaults). Tooling mirrors `claude-agentline`: `package.json`, `tsconfig.json`, `bunfig.toml`, prettier, plus staged `.eslintrc.cjs`/`knip.json`. 24 `bun test` cases.
- **Git-checkpointed self-heal.** `engine fix`/`heal`: after ingest the engine writes a checkpoint commit, then loops verify → fix → re-verify and commits the result. Fully automatic — no approval prompts; rollback is `git revert`. The curator and ingest agents are rewired to this model (approval gates removed).
- **Onboarding + agent-teaching skills.** New `onboarding` skill + `claude-wiki-pages-onboarding-agent` + `/claude-wiki-pages:onboarding` (guided first run: health → scaffold → ingest → first cited answer). Two Software-3.0 teaching skills — `engine-api` (the engine's `--json` tool contract) and `maintain-contract` (the safe ingest/retrieve/maintain ordering) — so any agent can drive the wiki correctly.
- **`/claude-wiki-pages:doctor`** (renamed from `wiki-doctor`) backed by the engine `doctor` — ten checks D01–D10 with `--fix` (hook perms, git init, settings migration), `--json`, and `--strict` (exit 3 on warn/fail).
- **Config system.** `engine config` (show / validate / path): defaults ← user (`~/.config/claude-wiki-pages/config.json`) ← project (`.claude/claude-wiki-pages.json`) ← `CLAUDE_WIKI_PAGES_*` env overrides, validated against `schemas/config.schema.json`.
- **Quality gates + CI.** `tests/gates/gate-NN-*.sh` + `run-all.sh` (engine tests, typecheck, shellcheck, glossary, verify↔bash parity, no-absolute-paths, config-schema, prettier, npm-pack); a CI `gates` job runs them on every PR.
- **GitHub Pages landing.** `site/` (framework-free, accessible, with the mermaid "how it works" diagram) deployed by `.github/workflows/pages.yml`; excluded from the npm tarball.
- **`docs/migration-1.0.md`** — search-and-replace map from the old identifiers, plus what does NOT change (vault schema/content).

### Changed (breaking)

- **Plugin renamed `llm-wiki-stack` → `claude-wiki-pages`** across the manifest, marketplace, slash namespace (`/claude-wiki-pages:`), settings path (`.claude/claude-wiki-pages/settings.json`, auto-migrated on `SessionStart`), and hook log prefixes.
- **Agents** `llm-wiki-stack-{orchestrator,ingest,curator,analyst,polish}-agent` → `claude-wiki-pages-…-agent`.
- **Skills** to bare short verbs (the namespace already scopes them): `llm-wiki`→`init`, `llm-wiki-ingest`→`ingest`, `-query`→`query`, `-lint`→`lint`, `-fix`→`fix`, `-status`→`status`, `-synthesize`→`synthesize`, `-index`→`index`, `-markdown`→`markdown`. The `obsidian-*` skills are unchanged.
- **Env vars** `LLM_WIKI_*` → `CLAUDE_WIKI_PAGES_*`. `LLM_WIKI_VAULT` is still read as a deprecated fallback for one minor.
- **`docs/VOCABULARY.md` → `docs/GLOSSARY.md`** (matches the `claude-agentline` convention); `validate-docs.sh` is now the "glossary gate" and bans the retired `1.0.0` identifiers outside `CHANGELOG.md`, `docs/adr/*`, and the migration docs.

## [0.2.0] — 2026-05-02

Top-level orchestrator and four-layer DX retrofit. Single `/llm-wiki-stack:wiki` command replaces the per-skill chain users had to remember; vault state now drives dispatch automatically. ADRs in `docs/adr/` capture the rationale; the migration map is in `docs/llm-wiki/migration-0.2.md`.

### Added

- **`commands/wiki.md`** (`/llm-wiki-stack:wiki`) — top-level entry point. Probes vault state and dispatches to the right specialist (init wizard, ingest, curator, or analyst). One verb instead of a remembered chain.
- **`commands/wiki-doctor.md`** (`/llm-wiki-stack:wiki-doctor`) — environment health check. Wraps the new `scripts/doctor.sh` with exit codes 0–5 (vault path, schema, raw/wiki layout, hook executability, vocab drift). Tier 1 Bats coverage in `tests/scripts/doctor.bats`.
- **`agents/llm-wiki-stack-orchestrator-agent.md`** — Layer 4 dispatcher. `user-invocable: true`. Owns vault state probing; specialists trust its payload and never re-probe.
- **`agents/llm-wiki-stack-polish-agent.md`** — tail-of-write specialist. Centralises graph colors, vault-MOC refresh, and per-folder `_index.md` consistency. Idempotent; runs after every successful ingest or curator pass. Removes the "I have to switch to Obsidian and refresh the graph" step. See [`docs/llm-wiki/obsidian-experience.md`](docs/llm-wiki/obsidian-experience.md).
- **Repository governance parity.** Root `SPEC.md` (moved from `docs/SPECIFICATION.md`), root `SECURITY.md`, root `SUPPORT.md`, `docs/adr/` with three seed ADRs, `docs/plan/` with the retrofit plan.
- **`NEXT_STEP:` hand-off line** in the `llm-wiki` wizard skill — the orchestrator parses it to chain directly into ingest when `raw/` has pending files.

### Changed

- **Vocabulary changes — agent rename.** Three Layer 3 agents renamed to the `{plugin-name}-{role}-agent` convention. Hard rename, no shims; pre-1.0 plugin, low back-compat cost. See `docs/adr/ADR-0002-agent-naming-convention.md` for the rationale.
  - `llm-wiki-ingest-pipeline` → `llm-wiki-stack-ingest-agent`
  - `llm-wiki-lint-fix` → `llm-wiki-stack-curator-agent` (verb upgrade — the agent already gates judgment fixes behind plans, which is curation, not just linting)
  - `llm-wiki-analyst` → `llm-wiki-stack-analyst-agent`
- **`/SPEC.md` location.** Specification moved from `docs/SPECIFICATION.md` to root `/SPEC.md` for parity with standard plugin layout. A one-line stub remains at the old path through `0.2.x`; removed in `0.3.0`.
- **Default verb.** `/llm-wiki-stack:wiki` replaces the old per-skill chain (the pipeline agent, formerly named `llm-wiki-ingest-pipeline`, now `llm-wiki-stack-ingest-agent`) as the default user verb. The pipeline agent remains user-invocable for power users and scripting.
- **`scripts/validate-docs.sh`** — extends the namespace resolver to recognize `commands/<name>.md` (in addition to `skills/<name>/` and `agents/<name>.md`); adds the three retired agent names to the banned-string list (allowlisted in CHANGELOG, ADRs, plan, and migration doc).
- **Documentation surface.** README quick-start, `docs/architecture.md`, `docs/getting-started.md`, `docs/security.md`, `SECURITY.md` updated to use the new agent names and the `/llm-wiki-stack:wiki` entry point.

### Documentation

- **AWS-Skill-Builder-style playbooks.** New learning path under `docs/playbooks/`: `index.md`, `200-foundational.md` (install → first wiki entry, ~30 min), `300-associate.md` (orchestrator decision tree, hooks, schema, multi-vault, ~2 hours), `500-expert.md` (skill authoring, hook authoring, test harness, fork, CI, ~half day). Orthogonal to the existing `docs/llm-wiki/01-07*.md` task references.
- **Spec alignment.** `SPEC.md` §5/§6/§11 corrected — agent count and orchestrator dispatch wording now match the five-agent retrofit. `docs/VOCABULARY.md` Layer 3 row corrected from "Three" to "Five".
- **DX cleanup.** README version badge bumped to 0.2.0; skill count corrected (12 → 13); `llm-wiki-markdown` added to the Layer 2 list. Stale `/llm-wiki-stack:llm-wiki-stack-ingest-agent` references in `docs/llm-wiki/index.md`, `docs/llm-wiki/02-create-new-knowledge-base.md`, `docs/llm-wiki/03-update-existing.md`, and `docs/vault-example/wiki/tools/llm-wiki-stack.md` reframed — `/llm-wiki-stack:wiki` is the primary entry; the agent-direct form is now documented as a power-user bypass.
- **Risk and gap report.** New `docs/risk-report-0.2.0.md` tracking deferred work (orchestrator/polish test coverage, Tier 4 corpus replay, edge cases in `resolve-vault.sh` / `session-start.sh` / `prompt-guard.sh`) so the audit findings have a single follow-up surface.

### Migration

Users with scripts pinned to the old agent names: see `docs/llm-wiki/migration-0.2.md` for the rename table and search-and-replace guidance. Vaults themselves are unchanged — `schema_version: 1` continues to be supported; only plugin-side identifiers moved.

## [Earlier — pre-0.2.0]

### Changed

- **Skill rename (clean-room rewrite).** The eight adapted skills have been
  retired and replaced with fresh, independently-authored implementations
  under new names:
  - `second-brain` → `llm-wiki` (onboarding entry point)
  - `second-brain-ingest` → `llm-wiki-ingest`
  - `second-brain-query` → `llm-wiki-query`
  - `second-brain-lint` → `llm-wiki-lint`
  - `second-brain-fix` → `llm-wiki-fix`
  - `second-brain-status` → `llm-wiki-status`
  - `vault-synthesize` → `llm-wiki-synthesize`
  - `vault-index` → `llm-wiki-index`

  Each new `SKILL.md` was authored from `docs/SPECIFICATION.md`,
  `docs/architecture.md`, `docs/vault-example/CLAUDE.md`, and the Karpathy LLM
  Wiki gist — the previously-adapted content was not consulted during the
  rewrite. Mechanical 5-gram Jaccard similarity between each new file and
  its predecessor is below 0.02.

- **Vocabulary.** `second-brain`, `second brain`, `vault-synthesize`, and
  `vault-index` are retired from the vocabulary and flagged by
  `scripts/validate-docs.sh` as banned strings outside `CHANGELOG.md`,
  `docs/VOCABULARY.md`, and the test surface.
- **Attribution.** `NOTICE` rewritten to credit only the Karpathy pattern
  (public design) and `kepano/obsidian-skills` (MIT, bundled unmodified).
  Prior third-party attribution for skills that have since been replaced
  by clean-room originals has been removed.
- **New file.** `THIRD_PARTY_LICENSES.md` — full license text of every
  bundled third-party component.

### Removed

- `skills/second-brain/`, `skills/second-brain-ingest/`,
  `skills/second-brain-query/`, `skills/second-brain-lint/`,
  `skills/second-brain-fix/`, `skills/second-brain-status/`,
  `skills/vault-synthesize/`, `skills/vault-index/` — replaced by the
  renamed, rewritten skills listed above.

## [0.1.0] — 2026-04-18

Initial release as a Claude Code plugin.

- **Plugin distribution.** `.claude-plugin/plugin.json` and same-repo marketplace.
- **Layer 1 — Data.** `docs/vault-example/` with authoritative schema (`docs/vault-example/CLAUDE.md`, `schema_version: 1`), five frontmatter templates, a small sticky reference vault demonstrating sources, indexes, and two topic folders.
- **Layer 2 — Skills.** 11 skills: `second-brain`, `second-brain-ingest`, `second-brain-query`, `second-brain-lint`, `second-brain-fix`, `vault-synthesize`, `vault-index`, `graph-colors`, `obsidian-markdown`, `obsidian-bases`, `obsidian-cli`.
- **Layer 3 — Agents.** 3 agents: `wiki-ingest-pipeline`, `wiki-lint-fix`, `wiki-analyst`.
- **Layer 4 — Orchestration.** 10 hook scripts wired through `hooks/hooks.json`; 4 path-scoped rules in `rules/`.
- **Docs.** `SPECIFICATION.md`, `VOCABULARY.md`, `SEO.md`, `architecture.md`, `security.md`, `comparison.md`, and the user guide set in `docs/llm-wiki/`.
- **Governance.** `LICENSE` (Apache 2.0), `NOTICE`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.

### Schema

`schema_version: 1`. Authoritative rules live in `docs/vault-example/CLAUDE.md`; contract summary in `docs/SPECIFICATION.md`.

### Known limitations

See `docs/security.md` — no cryptographic provenance, no hook-script sandboxing, no secret scanning on ingest, confidence scores are the LLM's opinion, topic-tree placement relies on LLM judgement.
