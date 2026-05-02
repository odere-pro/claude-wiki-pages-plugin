# llm-wiki-stack: 4-layer DX retrofit (mirror claude-aws-architect)

## Context

Today the plugin exposes 13 skills + 3 agents flat under `/llm-wiki-stack:<name>`. Onboarding a vault requires the user to remember a chain of follow-ups (init → ingest → lint → fix → status). There is no top-level "do the right thing" verb, no env health check, and the agent names (`llm-wiki-ingest-pipeline`, `llm-wiki-lint-fix`, `llm-wiki-analyst`) don't match the `{plugin}-{role}-agent` convention used by `claude-aws-architect`.

Goal: a single command `/llm-wiki-stack:wiki <prompt>` that probes vault state and routes to the right specialist; a `/llm-wiki-stack:wiki-doctor` for env health; specialist agents renamed to the AWS-architect convention; and a new `polish-agent` that auto-refreshes the Obsidian view (graph colors, MOC, index) after every ingest so users don't touch Obsidian manually. Outcome: drop a paper into `raw/`, type `/llm-wiki-stack:wiki`, and the vault — including its Obsidian presentation — is updated end-to-end.

User confirmed: all three phases now, top command `/llm-wiki-stack:wiki`, hard rename with `0.2.0` bump.

## Reference architecture

Mirror `claude-aws-architect`:
- L4 entry = `commands/aws.md` slash command → `Task` to orchestrator agent.
- L3 specialists = `claude-aws-architect-{discovery,solution-architect,implementation}-agent.md`, all `user-invocable: false`.
- Single-message parallel fan-out via multiple `Task` tool calls in one assistant turn.
- Health: `commands/aws-doctor.md` wraps `scripts/doctor.sh` with exit codes 0–5.

---

## Phase 0 — Repository governance parity (additive, ship first)

`claude-aws-architect` exposes a fuller set of governance artifacts at the repo root (`SPEC.md`, `SUPPORT.md`, `SECURITY.md`, `docs/adr/`, `docs/plan/`) that GitHub and contributors auto-discover. `llm-wiki-stack` has functional equivalents but in non-standard locations or absent. This phase aligns the surface so contributors and security researchers find the same files in the same places.

### Gap analysis (today vs. claude-aws-architect)

| Artifact | claude-aws-architect | llm-wiki-stack today | Action |
|---|---|---|---|
| `CHANGELOG.md` | root | root | Keep. Phase 2 adds the `0.2.0` entry. |
| `LICENSE` | root | root + `THIRD_PARTY_LICENSES.md` + `NOTICE` | Keep llm-wiki-stack's richer set as-is. |
| `SPEC.md` | root | `docs/SPECIFICATION.md` | Move to root as `SPEC.md`; leave a one-line stub at `docs/SPECIFICATION.md` linking to root for one minor version, then drop. |
| `SECURITY.md` | root | `docs/security.md` (threat model) | Create root `SECURITY.md` with vuln-reporting policy + supported versions (GitHub auto-discovers this). Keep `docs/security.md` as the long-form threat model and link to it from `SECURITY.md`. |
| `SUPPORT.md` | root | absent | Create. Cover: where to file issues, where to ask questions (Discussions or similar), expected response window, what info to include. Mirror tone of `claude-aws-architect/SUPPORT.md`. |
| `docs/adr/` | present | absent | Create directory with `README.md` (ADR index + template) and seed with three ADRs (one per redesign phase, see below). |
| `docs/plan/` | present | absent | Create directory; copy this plan in as `docs/plan/0001-four-layer-dx-retrofit.md` so the rationale lives in the repo, not just my home dir. |
| `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md` | absent | root | Keep llm-wiki-stack's. |

### ADRs to seed (`docs/adr/`)

Use the standard ADR template (Title / Status / Context / Decision / Consequences). One ADR per major decision in this redesign, authored alongside its phase:

- `docs/adr/0001-four-layer-orchestrator.md` (Phase 1) — decision to introduce a single top-level `/llm-wiki-stack:wiki` orchestrator command + agent, mirroring `claude-aws-architect`'s `/aws`. Records the dispatch table, the `NEXT_STEP:` hand-off signal, and why state-probing lives in the orchestrator (not specialists).
- `docs/adr/0002-agent-naming-convention.md` (Phase 2) — adoption of `{plugin-name}-{role}-agent`. Records the rename map, the choice of `curator` over `lint-fix`, hard-rename + `0.2.0` rationale.
- `docs/adr/0003-polish-agent-and-obsidian-side.md` (Phase 3) — extraction of graph-color / index-refresh / MOC-consistency into a dedicated specialist. Records why these belonged together and why they're orchestrator-driven (not user-invoked).

`docs/adr/README.md` lists the index, references the template, and points to MADR or Nygard format (pick one, mirror what claude-aws-architect uses if it has a preference).

### Files to create
- `SPEC.md` (root, moved from `docs/SPECIFICATION.md`)
- `SECURITY.md` (root)
- `SUPPORT.md` (root)
- `docs/adr/README.md` (index + template pointer)
- `docs/adr/0001-four-layer-orchestrator.md` (Phase 1 deliverable; stub now, fill in Phase 1)
- `docs/adr/0002-agent-naming-convention.md` (Phase 2 deliverable)
- `docs/adr/0003-polish-agent-and-obsidian-side.md` (Phase 3 deliverable)
- `docs/plan/0001-four-layer-dx-retrofit.md` (this plan, copied verbatim)

### Files to modify
- `README.md` — link to root `SPEC.md`, `SECURITY.md`, `SUPPORT.md`, `docs/adr/`. Update any `docs/SPECIFICATION.md` reference.
- `docs/SPECIFICATION.md` — replace with one-line stub: `> Moved to /SPEC.md` (one-version transition; remove in `0.3.0`).
- `CLAUDE.md` (root) — update the "Authorities" section to point to `SPEC.md` (was `docs/SPECIFICATION.md`).
- `scripts/validate-docs.sh` — update vocabulary file path references if they point to `docs/SPECIFICATION.md`.
- `.github/` (if present) — point issue / PR templates' "report a vulnerability" link to root `SECURITY.md`.

### Acceptance
- `gh repo view` (or GitHub UI) auto-detects `SECURITY.md`, `SUPPORT.md`, `LICENSE`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md` at root.
- Every reference to `docs/SPECIFICATION.md` in markdown returns zero hits except in `CHANGELOG.md` and the one-line stub.
- `docs/adr/README.md` lists three seeded ADRs; index links resolve.
- A contributor opening the repo can find the contract (`SPEC.md`), the vuln process (`SECURITY.md`), the support channel (`SUPPORT.md`), the rationale for active changes (`docs/adr/`), and the in-flight roadmap (`docs/plan/`) without reading source.

---

## Phase 1 — Orchestrator + doctor (additive, no breaking changes)

### Files to create

**`commands/wiki.md`** — L4 entry. Frontmatter:
```yaml
---
description: Run the LLM Wiki — initialize, ingest, curate, or analyze. The plugin figures out the next step.
argument-hint: [free-form goal, e.g. "ingest the new papers" or "what does the wiki say about retrieval?"]
allowed-tools: Task, Bash, Read, Glob, Grep
---
```
Body: brief preamble that delegates to `llm-wiki-stack-orchestrator-agent` via `Task`, passing `$ARGUMENTS` plus a state probe (does `vault/CLAUDE.md` exist? `raw/` count vs `wiki/log.md`?). Mirror the shape of `commands/aws.md` from `/Users/aleksandrderechei/Git/claude-aws-architect/commands/aws.md`.

**`commands/wiki-doctor.md`** — `description: Health-check the LLM Wiki install. allowed-tools: Bash`. Body invokes `bash ${CLAUDE_PLUGIN_ROOT}/scripts/doctor.sh` and surfaces stdout verbatim.

**`agents/llm-wiki-stack-orchestrator-agent.md`** — `user-invocable: true`, model `sonnet`. Owns the dispatch table (single-pass; specialists must not re-probe state):

| State probe | Handoff |
|---|---|
| `vault/CLAUDE.md` missing OR no `schema_version` | Invoke `llm-wiki` skill (init wizard); on `READY:` + `NEXT_STEP:` line, re-probe and continue. |
| `raw/` has files not in `wiki/log.md` ingest entries | `Task → llm-wiki-stack-ingest-agent` with `{run: "full pipeline", scope: "<N> new sources"}`. After return, `Task → llm-wiki-stack-polish-agent` (Phase 3). |
| `verify-ingest.sh --target $VAULT` non-zero, OR last log entry is `ingest` not followed by `lint` | `Task → llm-wiki-stack-curator-agent` with `{mode: "audit-and-fix"}`. |
| Prompt matches analytical verbs (`query`, `summarize`, `report`, `dashboard`, `compile`, `extract`, `challenge`) | `Task → llm-wiki-stack-analyst-agent` with verbatim question + chosen mode. |
| Ambiguous | Ask one clarifying question; never fan out on ambiguity. |

Always pass `vault_path` (resolved via `scripts/resolve-vault.sh`) and `plugin_root` in every `Task` payload.

**`scripts/doctor.sh`** — exit codes:
- `0` healthy
- `1` vault path unresolvable
- `2` `schema_version` absent or unsupported
- `3` `raw/` unreadable or `wiki/` unwritable
- `4` hooks not executable (`hooks/hooks.json` references missing/non-+x scripts)
- `5` `validate-docs.sh` fails (vocabulary drift)

Each check prints `OK: <name>` or `FAIL[<code>]: <name> — <why>`.

### Files to modify

- `.claude-plugin/plugin.json` — no changes; commands/ is auto-discovered, surfaces as `/llm-wiki-stack:wiki` and `/llm-wiki-stack:wiki-doctor`.
- `skills/llm-wiki/SKILL.md` — at completion, append a structured trailing line the orchestrator parses:
  ```
  NEXT_STEP: ingest_pending=<true|false> raw_count=<N> recommended=<llm-wiki-stack-ingest-agent|none>
  ```
  This removes the "remember to run ingest next" step — the orchestrator chains automatically when `ingest_pending=true`.
- `tests/scripts/` — add `doctor.bats` covering each exit code.

### Acceptance
- `/llm-wiki-stack:wiki ingest the papers I dropped in raw/`: with no vault scaffolds + ingests; with vault + new raw files ingests directly; clean vault + a question routes to analyst.
- `/llm-wiki-stack:wiki-doctor` exits 0 on a fresh install; produces clear failure diagnosis on a broken one.

---

## Phase 2 — Renames + vocab (breaking, bump to `0.2.0`)

### Renames (hard rename — confirmed)

| Old `agents/<name>.md` | New `agents/<name>.md` | `user-invocable` |
|---|---|---|
| `llm-wiki-ingest-pipeline.md` | `llm-wiki-stack-ingest-agent.md` | `false` |
| `llm-wiki-lint-fix.md` | `llm-wiki-stack-curator-agent.md` | `false` |
| `llm-wiki-analyst.md` | `llm-wiki-stack-analyst-agent.md` | `false` |

`curator` over `lint-fix`: the agent already gates judgment fixes behind plans (per its own contract), which is curation, not just linting. Verb upgrade earns its keep.

### Files to modify

- `agents/*.md` — rename files + update `name:` frontmatter inside each. Set `user-invocable: false`.
- `agents/llm-wiki-stack-ingest-agent.md` — Step 2 (and Step 3.4) invocation of `subagent_type: llm-wiki-lint-fix` → `llm-wiki-stack-curator-agent`.
- `skills/llm-wiki/SKILL.md` — update suggested next-step (~line 144) and the "pipeline agent looks for `READY:`" note (~line 168) to use the new name.
- `hooks/hooks.json` — grep for the three old names; rewire any `SubagentStop` matchers (`subagent-lint-gate.sh`, `subagent-ingest-gate.sh` may match by agent name).
- `docs/VOCABULARY.md` — rename rows for the three agents (~108–110); update row 85 (`pipeline` shorthand → `llm-wiki-stack-ingest-agent`); add three new terms: `orchestrator`, `specialist`, `doctor`. Add `wiki` and `wiki-doctor` to the slash-command surface row. Naming-convention bullet (~line 95): "compound suffix (verb+noun or role)" → `{plugin-name}-{role}-agent`.
- `docs/SPECIFICATION.md` — §5 (layers): L4 = "orchestrator command + doctor + hooks + scripts" (was just "hooks/scripts/rules"). §9 (command contracts): add `wiki` and `wiki-doctor` entries; rename agent table rows; update default-verb reference (~line 377). §11 (agent contracts): rename the three subsections; add a fourth for `llm-wiki-stack-orchestrator-agent` documenting the dispatch table from Phase 1.
- `scripts/validate-docs.sh` — add the three old agent names to the banned-string list (allowlist CHANGELOG history) so prose drift gets caught.
- `CHANGELOG.md` — `## 0.2.0` with "Vocabulary changes" subsection per the existing convention; list every renamed term.
- `.claude-plugin/plugin.json` — bump `version` to `0.2.0`.

### Acceptance
- `bash scripts/validate-docs.sh` clean.
- `grep -RE 'llm-wiki-ingest-pipeline|llm-wiki-lint-fix|llm-wiki-analyst' --include='*.md' --include='*.json'` returns hits only in `CHANGELOG.md`.
- End-to-end run via `/llm-wiki-stack:wiki` produces a final report whose handoff lines all use the new names.

---

## Phase 3 — Polish-agent + Obsidian wins

### Files to create

**`agents/llm-wiki-stack-polish-agent.md`** — `user-invocable: false`, model `sonnet`, single-pass, no destructive ops. Owns three cheap tasks centralized in one place:

1. **Graph colors.** Move existing logic from ingest Step 1.7 here. Reads `obsidian-graph-colors` skill; runs `obsidian eval` for any new top-level topic folders (uses `obsidian-cli` reference skill).
2. **Index refresh.** Regenerate `wiki/index.md` from `_index.md` files: each topic with current page count and last-updated date. Today this drifts because the ingest agent only appends.
3. **Vault MOC consistency.** Walk every folder; ensure `_index.md` `children:` matches actual `.md` siblings. Append-only fixes; never delete.

### Files to modify

- `agents/llm-wiki-stack-ingest-agent.md` — strip Step 1.7 (graph colors) and the index-update half of Step 1.8; replace with a one-line note "polish-agent runs after this agent returns; do not duplicate its work." Avoids the duplication that's currently split between agents.
- `agents/llm-wiki-stack-orchestrator-agent.md` — append `Task → llm-wiki-stack-polish-agent` after every successful ingest or curator run, in parallel with the final-report compose step.
- `docs/SPECIFICATION.md` §11 — add polish-agent contract.
- `docs/VOCABULARY.md` — add `polish` row.

### Obsidian-side win

**After any ingest or curator run, Obsidian's graph view re-colors itself, `wiki/index.md` reflects the new page counts, and every topic folder's `_index.md` matches its actual children — without the user typing a second command.** Drop a paper into `raw/`, run `/llm-wiki-stack:wiki`, switch to Obsidian: the new topic is a distinct color in the graph and listed with an accurate count in the vault MOC. Single biggest "it just works" moment the retrofit unlocks.

### Acceptance
- After ingesting a source that creates a new top-level topic, `obsidian eval` confirms a new color group is present without any user action.
- `wiki/index.md` page-count line for the affected topic equals `find wiki/<topic> -name '*.md' -not -name '_index.md' | wc -l`.

---

## Critical files

Reused / referenced (do not duplicate logic in new files):
- `scripts/resolve-vault.sh` — vault path resolution (orchestrator + doctor both call it).
- `scripts/validate-docs.sh` — vocab gate (extended in Phase 2).
- `scripts/verify-ingest.sh` — used by orchestrator state probe.
- `skills/obsidian-graph-colors/SKILL.md`, `skills/obsidian-cli/SKILL.md` — consumed by polish-agent.
- `commands/aws.md`, `commands/aws-doctor.md`, `agents/claude-aws-architect-orchestrator-agent.md` in `/Users/aleksandrderechei/Git/claude-aws-architect/` — copy frontmatter shape and the single-message fan-out pattern.

To create:
- `commands/wiki.md`, `commands/wiki-doctor.md`
- `agents/llm-wiki-stack-orchestrator-agent.md`, `agents/llm-wiki-stack-polish-agent.md`
- `scripts/doctor.sh`, `tests/scripts/doctor.bats`

To modify:
- `agents/llm-wiki-ingest-pipeline.md` → rename + edit
- `agents/llm-wiki-lint-fix.md` → rename + edit
- `agents/llm-wiki-analyst.md` → rename + edit
- `skills/llm-wiki/SKILL.md` (Phase 1 trailing line + Phase 2 name update)
- `hooks/hooks.json` (Phase 2 name rewires)
- `docs/SPECIFICATION.md` §5, §9, §11
- `docs/VOCABULARY.md`
- `scripts/validate-docs.sh`
- `CHANGELOG.md`
- `.claude-plugin/plugin.json` (version bump)

---

## Guides & docs (per phase)

User-facing prose lives in `docs/llm-wiki/` (voice authority) and the root `README.md` (public install + quick start). Long-form architecture lives in `docs/architecture.md`. All three need updates so the new DX is discoverable; without them, the orchestrator exists but no one finds it.

### Phase 1 guides

- `README.md` — replace the current "Quick start" section. New flow: install plugin → `/llm-wiki-stack:wiki-doctor` → `/llm-wiki-stack:wiki <free-form prompt>`. Show one example end-to-end (drop file in `raw/` → run `/wiki` → see ingest happen). Demote the per-skill command list to a "Power users / scripting" section; the orchestrator is the headline now.
- `docs/llm-wiki/getting-started.md` (create if absent; otherwise update) — single-page walkthrough mirroring the README example with annotated screenshots/transcripts. Voice: per `docs/llm-wiki/` style. Reference the orchestrator's dispatch table at a high level (no internal agent names) so users understand *why* one command does the right thing.
- `docs/llm-wiki/troubleshooting.md` (create) — what each `wiki-doctor` exit code means and how to fix it. One row per code 1–5.
- `docs/architecture.md` — extend the L4 section to describe the orchestrator command + doctor as part of the orchestration layer (today it lists only hooks/scripts/rules). Add a sequence diagram or bullet flow: user prompt → command → orchestrator → state probe → specialist fan-out.

### Phase 2 guides

- `docs/llm-wiki/migration-0.2.md` (create) — short migration note for users with scripts hardcoding the old agent names. Table of old→new. Point to `CHANGELOG.md` for the full rationale.
- `README.md` — update any prose that names `llm-wiki-ingest-pipeline` etc. (root README, contribution notes).
- `docs/architecture.md` — agent-table rename pass (mirrors §11 of SPECIFICATION.md but in long-form prose).
- `docs/llm-wiki/getting-started.md` — naming convention sentence updated: "specialist agents follow `{plugin}-{role}-agent`."

### Phase 3 guides

- `docs/llm-wiki/obsidian-experience.md` (create) — explains what the polish-agent does, with a before/after of the graph view and `wiki/index.md`. Calls out that users never invoke it directly; the orchestrator runs it after every ingest or curator pass. List the three operations (graph colors, index refresh, MOC consistency) and what each one fixes. Cross-link to `skills/obsidian-graph-colors/`.
- `README.md` — add a one-paragraph "Obsidian-side experience" section above the architecture link, with a single screenshot or animated GIF of the graph re-coloring after ingest if practical.
- `docs/llm-wiki/troubleshooting.md` — extend with "graph colors aren't applying" + "index.md count is wrong" entries pointing at polish-agent diagnostics.

### Acceptance for guides

- A new user reading only `README.md` can run `/llm-wiki-stack:wiki-doctor` then `/llm-wiki-stack:wiki` and complete a full ingest without opening any other doc.
- `bash scripts/validate-docs.sh` clean (vocab gate covers the new prose).
- Every renamed agent name has zero references in `docs/` and `README.md` outside `CHANGELOG.md` and `migration-0.2.md`.

---

## Verification

End-to-end (run sequentially after each phase):

1. `bash tests/install-deps.sh --check` — toolchain healthy.
2. `bash tests/run-tests.sh tier0` and `tier1` — green.
3. `bash scripts/doctor.sh` — exit 0 in this worktree.
4. `bash scripts/validate-docs.sh` — clean (catches vocab drift).
5. `bash scripts/verify-ingest.sh docs/vault-example/` — reference vault still passes.
6. **Manual smoke (Phase 1):** in a fresh test vault dir, run `/llm-wiki-stack:wiki "what's in the wiki?"` against an empty state → orchestrator runs init wizard, then routes to analyst. Drop a file in `raw/`, run `/llm-wiki-stack:wiki` again → orchestrator detects new source, fans out ingest agent.
7. **Manual smoke (Phase 3):** after the smoke ingest above, switch to Obsidian → graph view shows the new topic colored, `wiki/index.md` lists it with count `1`.
8. `grep -RE 'llm-wiki-ingest-pipeline|llm-wiki-lint-fix|llm-wiki-analyst' --include='*.md' --include='*.json'` (post-Phase-2) → only `CHANGELOG.md` matches.
9. **Governance parity (Phase 0):** `ls SPEC.md SECURITY.md SUPPORT.md docs/adr/README.md docs/plan/0001-four-layer-dx-retrofit.md` returns all five. Each ADR has a non-stub Status line by the close of its owning phase.
