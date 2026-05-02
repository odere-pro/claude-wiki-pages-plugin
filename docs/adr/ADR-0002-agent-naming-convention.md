# ADR-0002: Agent naming convention — `{plugin-name}-{role}-agent`

- **Status:** Proposed
- **Date:** 2026-05-02
- **SPEC anchor:** §11 (agent contracts), §VOCABULARY architecture-terms

## Context

The 3 existing Layer 3 agents in `agents/` carry compound role-specific names: `llm-wiki-ingest-pipeline`, `llm-wiki-lint-fix`, `llm-wiki-analyst`. They sit in the same flat namespace as the 13 skills (single-verb names like `llm-wiki-ingest`). Two problems follow.

1. **No way to tell a skill from an agent by name.** `llm-wiki-ingest` is a skill; `llm-wiki-ingest-pipeline` is an agent that calls that skill. Users learning the plugin mistake one for the other and invoke the wrong one. The flat surface promised under-the-hood simplicity but exported the layering problem to users who don't care about it.
2. **The orchestrator (ADR-0001) is also an agent.** Adding `llm-wiki-stack-orchestrator-agent` next to `llm-wiki-ingest-pipeline` puts two different naming conventions in the same directory. That's the kind of inconsistency that ages badly: every new contributor asks "which is the convention" and the answer is "both, sorry".

The vocabulary-gate (`scripts/validate-docs.sh`) already enforces term consistency in prose. Without a convention for agent file names, the enforcement asymmetry — strict in prose, loose in code — leaks into the user-facing surface (slash commands).

## Decision

Adopt a single naming convention for all Layer 3 / Layer 4 agents:

> `{plugin-name}-{role}-agent`

Apply it as a hard rename, bumping `plugin.json` `version` to `0.2.0` and recording every renamed term in `CHANGELOG.md` under a "Vocabulary changes" subsection. Three concrete renames:

| Old (pre-`0.2.0`)              | New (`0.2.0`+)                          | `user-invocable` |
| ------------------------------ | --------------------------------------- | ---------------- |
| `llm-wiki-ingest-pipeline`     | `llm-wiki-stack-ingest-agent`           | `false`          |
| `llm-wiki-lint-fix`            | `llm-wiki-stack-curator-agent`          | `false`          |
| `llm-wiki-analyst`             | `llm-wiki-stack-analyst-agent`          | `false`          |
| _(new in `0.2.0`)_             | `llm-wiki-stack-orchestrator-agent`     | `true`           |

Two notes on the rename map:

- **`curator` over `lint-fix`.** The existing agent gates judgment fixes (restructures, merges) behind explicit user approval and only auto-applies mechanical repairs. That is curation, not just linting. The verb upgrade earns its keep by matching what the agent actually does.
- **`-agent` suffix is mandatory.** Even though "agent" is implied by the directory, the suffix is what disambiguates the agent from the skill on first read of a slash command or `Task` invocation. The redundancy is intentional.

Skills keep their existing names. `llm-wiki-ingest` is fine because no agent named `llm-wiki-ingest-agent` will ever exist (the agent is `llm-wiki-stack-ingest-agent`); the namespace shape itself disambiguates.

## Alternatives considered

- **Keep current names; add only the new orchestrator.** Rejected. Mixing two conventions in `agents/` is the failure mode this ADR exists to fix. Half-applying it now means doing the rename later, with more inbound references to update.
- **Soft rename — keep old names as shim files for one minor version.** Rejected. The plugin is pre-1.0, so back-compat cost is low. Shims double the surface area, complicate `validate-docs.sh` (which would have to allow both names), and confuse users reading the directory listing. A clean break with a CHANGELOG entry is honest and cheaper.
- **Drop the `-agent` suffix.** Rejected. The suffix is what distinguishes `llm-wiki-stack-ingest-agent` from a hypothetical future skill `llm-wiki-stack-ingest`. Without it, future skills can't share the prefix without ambiguity, and the convention has to be re-decided then.
- **Use `llm-wiki-` prefix instead of `llm-wiki-stack-`.** Rejected. The plugin id is `llm-wiki-stack`; the slash-command namespace is `/llm-wiki-stack:`. Agent file names should match the plugin id exactly so future search-and-replace operations are unambiguous. `llm-wiki-` is a substring of `llm-wiki-stack-`, which makes regex-based renames brittle.
- **Use a verb-only convention (`ingest-agent`, `curator-agent`).** Rejected. Two `*-agent.md` files from two different plugins in the same `agents/` directory would collide. The plugin-prefix is what makes the convention safe to mix across plugins.

## Consequences

**Positive.**

- Reading `agents/` shows the layering at a glance: every file is `llm-wiki-stack-<role>-agent.md`. New contributors don't have to learn which name is which kind.
- `validate-docs.sh` can extend the banned-string list to include the three old names, catching prose drift in PRs.
- The pattern transfers to other plugins. A future plugin that adopts the same convention plugs into the same vocabulary discipline.

**Negative.**

- **Breaking change.** Any user script, internal documentation, or muscle memory pinned to the old names breaks at `0.2.0`. Mitigated by a `docs/llm-wiki/migration-0.2.md` page and a "Vocabulary changes" CHANGELOG section that lists every rename inline.
- **CHANGELOG.md grows.** The historical "ingested-pipeline" references are preserved in CHANGELOG.md and `validate-docs.sh` allowlists CHANGELOG from the banned-string check. This means new contributors searching for `ingest-pipeline` in the repo will see CHANGELOG hits and may briefly be confused. The CHANGELOG entry is explicit about the rename to short-circuit that confusion.
- **`-agent` suffix is verbose.** `llm-wiki-stack-orchestrator-agent` is 32 characters. Acceptable: it appears in `Task` calls and ADRs, not in user-facing slash commands.

## Revisit when

- A second plugin in this codebase adopts a different convention. Outcome: align them or document the divergence.
- The plugin reaches v1.0 and the surface stabilises. Outcome: re-evaluate whether the `-agent` suffix is still pulling its weight versus shorter forms.
- A user-research signal shows the convention helps or hinders discoverability. Outcome: tune or simplify.
