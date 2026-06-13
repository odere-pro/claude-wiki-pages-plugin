# ADR-0001: Four-layer orchestrator — single top-level command, state-probing dispatch

- **Status:** Proposed
- **Date:** 2026-05-02
- **SPEC anchor:** §5 (four-layer stack), §9 (command contracts), §11 (agent contracts)

## Context

`llm-wiki-stack` ships 13 skills and 3 agents under a flat `/llm-wiki-stack:<name>` namespace. Onboarding a vault and keeping it healthy currently requires the user to remember and chain four to five commands: scaffold (`llm-wiki`) → ingest (`llm-wiki-ingest-pipeline`) → audit (`llm-wiki-lint`) → repair (`llm-wiki-fix`) → verify (`llm-wiki-status`). The plugin has no top-level "do the right thing" verb, no environment health check, and no mechanism for one skill to hand off to the next without the user typing again.

Two failure shapes follow:

1. **Drop-out after init.** Users run the wizard, get a scaffolded vault, and stop — because the wizard ends with "you're set up" instead of immediately ingesting whatever they put in `raw/`. The pipeline agent exists, but discovering it requires reading the README.
2. **Manual chain fragility.** Users who do find the pipeline run it once, then forget to run lint-fix on the next session. Drift accumulates silently because no top-level verb re-probes vault state.

The plugin's promise — a vault that maintains itself given sources — is undermined when the maintenance is contingent on the user remembering the next command.

## Decision

Adopt a **single top-level orchestrator** that mirrors the four-layer dispatch pattern proven in similar Claude Code plugins (a slash command at the user surface, an orchestrator agent immediately behind it, specialist agents fanned out from the orchestrator, and skills consumed by specialists).

Concretely:

- **L4 — `commands/wiki.md`** — a single slash command (`/llm-wiki-stack:wiki <free-form prompt>`) that delegates to the orchestrator agent via `Task`. Mirror command: `commands/wiki-doctor.md` for environment health.
- **L4 — `agents/llm-wiki-stack-orchestrator-agent.md`** — `user-invocable: true`. Owns vault state probing and dispatch:
  - No vault → run the `llm-wiki` init wizard skill, parse its `NEXT_STEP:` trailing line, then re-probe.
  - `raw/` has files not yet logged in `wiki/log.md` → fan out to the ingest specialist.
  - Lint or `verify-ingest.sh` reports drift → fan out to the curator specialist.
  - Prompt matches an analytical verb → fan out to the analyst specialist.
  - Ambiguous → ask one clarifying question. Never fan out on ambiguity.
- **L3 specialists** — the existing 3 agents, renamed in ADR-0002, marked `user-invocable: false`. Specialists must not re-probe state; the orchestrator owns that.
- **Hand-off signal** — the init wizard ends with a structured `NEXT_STEP: ingest_pending=<bool> raw_count=<N> recommended=<agent|none>` line that the orchestrator parses to decide whether to chain immediately.

The user's mental model collapses to one verb: `/llm-wiki-stack:wiki`. The plugin figures out the rest.

## Alternatives considered

- **Add an orchestrator agent without a slash command.** Rejected. The slash command is the discoverable surface; without it, the orchestrator is just another agent name to remember. The pattern that works — proven elsewhere — is `command → agent → specialists`, not `agent → agent`.
- **Keep the flat namespace; document a recommended workflow.** Rejected. Documentation is a poor substitute for the right default. Users don't read READMEs between turns.
- **Replace the existing skills/agents wholesale with one omnibus agent.** Rejected. Single-responsibility skills are testable in isolation (Tier 1 Bats) and composable; an omnibus agent is neither. The four-layer model already exists in `/SPEC.md §5` — the gap is the user surface, not the internals.
- **Mode-toggle plugin (init mode / ingest mode / query mode).** Rejected. Modes export the routing problem to the user. Empirically, users land in the wrong mode and abandon. The orchestrator's state probe makes the same call without the cognitive tax.
- **Make every existing skill chain its successor directly.** Rejected. Skills are single-responsibility on purpose; chaining inside skills couples them and breaks the testability boundary in `/SPEC.md §5 Layer 2`. Chaining belongs at L3 (agents) and L4 (orchestrator), not L2.

## Consequences

**Positive.**

- One verb to teach, one verb to demo. New users go from `git clone` to a maintained vault without reading the per-skill contracts.
- The state probe replaces user memory. A user who hasn't touched the vault in three months runs `/llm-wiki-stack:wiki`, the orchestrator finds new files in `raw/` and unverified entries in `wiki/log.md`, and the right specialists run automatically.
- `/llm-wiki-stack:wiki-doctor` catches misconfiguration at install time instead of at first failure.
- Existing skills and agents stay untouched in their contracts; only the wizard's exit signal changes (Phase 1 only). Layer 2 / Layer 3 invariants from `/SPEC.md` continue to hold.
- The dispatch table is auditable: `/SPEC.md §11` documents which state triggers which specialist. There is no hidden routing.

**Negative.**

- **Latency on shallow asks.** A pure analytical question pays the cost of one orchestrator hop. Mitigated by limiting the orchestrator to a single-pass probe with no MCP calls — the probe is filesystem-only.
- **Two surfaces for power users.** Existing skills and agents remain user-invocable for scripting and edge cases, so the surface area grows by two commands rather than collapsing. Acceptable: power users explicitly want the lower-level verbs.
- **Init wizard signal is now load-bearing.** The orchestrator depends on the `NEXT_STEP:` trailing line. If the wizard regresses, the orchestrator misroutes. Mitigated by a Tier 1 Bats test asserting the line shape.

## Revisit when

- Users report that the orchestrator's state probe misclassifies a real vault — e.g. ingest fans out when it should not. Outcome: tighten the probe rules in `agents/llm-wiki-stack-orchestrator-agent.md` and add a regression fixture under `tests/fixtures/`.
- A second top-level surface emerges (e.g. a read-only "render this query as a deck"). At that point the layering generalises to "1 or more L4 commands, each with a paired orchestrator agent".
- Tier 4 adversarial CI catches a prompt that escapes the orchestrator's clarifying-question rule and forces an unintended fan-out. Outcome: add the prompt to the corpus and tighten the heuristic.
