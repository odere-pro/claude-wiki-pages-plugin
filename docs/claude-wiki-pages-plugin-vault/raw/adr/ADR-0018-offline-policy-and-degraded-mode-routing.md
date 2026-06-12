# ADR-0018: Offline policy and degraded-mode routing — the Claude→Ollama fallback machinery

- **Status:** Accepted (2026-06-11)
- **Date:** 2026-06-11
- **Builds on:** [ADR-0011](./ADR-0011-local-model-quality-gate.md) (the per-tier quality gate) and [ADR-0017](./ADR-0017-fabrication-floor-verbatim-partition.md) (the fabrication floor)
- **Anchor:** §5 (NO-RAG, absolute); §6 (one `_proposed/` write channel); §7 (provenance, non-negotiable); Decision #7 (local LLM draft-only now, full Claude→Ollama swap is the north star, gated)

## Context

The product north star (Decision #7) is a full Claude→Ollama swap so the plugin
keeps working when the network or the Claude API is unavailable. Two facts
constrain how that swap can be built:

1. **The plugin runs _inside_ Claude Code.** Claude (cloud) is what executes the
   agents and skills. If the network is genuinely down, Claude Code is not
   running — so an agent cannot "notice it is offline and switch" mid-session.
   Only **Layer 4** (the deterministic Bun engine `src/`, the bash `scripts/`,
   and a local Ollama model) runs with zero network.
2. **A local model is only as trustworthy as its measured evidence.** ADR-0011
   established that a local model is unlocked for a capability tier only after it
   clears that tier's golden-set quality gate with committed, reproducible
   evidence. Today exactly one cell is unlocked: `qwen3-coder:30b` at the
   `ingest-extract` tier.

The schema already _declares_ `localModel.tier` and `localModel.offlinePolicy`
(`schemas/config.schema.json`), but neither is wired into the engine, and there
is no reachability probe or routing decision anywhere. "Use a local LLM when the
network is down" is therefore a feature to build, not a flag to flip.

## Decision

Build the **complete** Claude→Ollama swap machinery, but keep every capability
tier **fail-closed** until it has cleared its own quality gate. Nothing ungated
ever runs locally.

### 1. Config dimensions

Wire the two already-declared fields into the engine config
(`src/data/config/config.ts`):

- `localModel.offlinePolicy ∈ { strict, prefer-local, off }`, default **`off`**.
  `off` performs no network probe and never falls back; `strict` fails if Claude
  is unreachable (no local fallback); `prefer-local` routes an eligible task to
  an approved local tier when Claude is unreachable.
- `localModel.tier ∈ { draft, ingest-extract }`, default **`draft`**.

Defaults are the **safest**, not the most capable: `off` guarantees zero network
at SessionStart unless explicitly opted in, and `draft` is the narrowest tier —
and because the `draft` tier has no quality gate yet, a default-enabled
misconfiguration lands fail-closed (BLOCKED), never on an unmeasured local run.

### 2. Per-tier approval map

Generalize the flat `APPROVED_LOCAL_MODELS` allow-list into a
**capability-tier → approved-model map** (`APPROVED_LOCAL_MODELS_BY_TIER`). Today
only `ingest-extract → ["qwen3-coder:30b"]` is non-empty; every other tier maps
to `[]` = **WIRED but BLOCKED**. The existing `APPROVED_LOCAL_MODELS` export is
retained as the `ingest-extract` row for backward compatibility. Adding a model
to a tier is the same governance act as ADR-0011: run the tier's golden-set eval,
commit the `tests/eval/runs/` evidence, and add the `name:tag` to that tier's row
in the same change — and amend this ADR's tier table.

### 3. Reachability probe (Layer 4, bash)

`scripts/reachability.sh` reports `{ollama, claudeApi}` as JSON. It keeps all
network code in **bash**, never TypeScript, so the engine stays free of
`fetch`/`http` tokens (gate-13 NO-RAG). It performs **no network call** when
`offlinePolicy` is `off`, probes Ollama via `GET /api/tags`, and probes Anthropic
reachability with an **unauthenticated HEAD** to `https://api.anthropic.com/`
(any HTTP response — including 401 — means reachable; the API key is never sent).
It fails closed: any error reports `down`/`unreachable`, never a false `up`.

### 4. Routing decision (Layer 4, engine `route`)

A single deterministic, **network-free** engine command `route` answers, for a
task: run on Claude, run on an approved local tier, or BLOCK. Reachability is
passed in as flags (`--ollama`, `--claude`) so the decision function never
touches the network. The decision matrix:

| offlinePolicy  | claudeApi   | tier approved? | ollama | decision  |
| -------------- | ----------- | -------------- | ------ | --------- |
| `off`          | —           | —              | —      | `claude`  |
| `strict`       | reachable   | —              | —      | `claude`  |
| `strict`       | unreachable | —              | —      | `blocked` |
| `prefer-local` | reachable   | —              | —      | `claude`  |
| `prefer-local` | unreachable | yes            | up     | `local`   |
| `prefer-local` | unreachable | yes            | down   | `blocked` |
| `prefer-local` | unreachable | no             | —      | `blocked` |

"tier approved?" reuses `checkLocalModelApproval` — the single source of truth —
so the routing decision and `config validate` can never disagree. The
orchestrator consults this decision; it never re-derives it.

### 5. Two consumers, one core

- **In-session (degraded-advisory):** SessionStart surfaces a `DEGRADED:` line
  (only when `localModel.enabled && offlinePolicy != off`) reporting reachability
  and which tier is available or BLOCKED; the orchestrator routes an eligible
  ingest to `/claude-wiki-pages:draft` when `route` says `local`.
- **Standalone (true offline):** `scripts/offline-draft.sh` runs with Claude Code
  stopped — it reads `raw/`, calls Ollama, and writes drafts through the **one**
  `_proposed/` channel (§6), stamped `proposed_by`/`status: draft`, for promotion
  via the existing review gate. Because hooks do not fire offline, the script
  itself enforces the `_proposed/`-only write confinement.

## What this does not change

- §5 NO-RAG holds: no embeddings, no vectors, no similarity. The probe is plain
  reachability; routing is a pure decision table.
- §6 one `_proposed/` channel holds: the offline path reuses `propose`, it does
  not fork a second write path.
- §7 provenance holds: local drafts land in `_proposed/` and reach `wiki/` only
  through the human review gate, exactly as the existing draft skill.
- The ADR-0011 gate is unchanged; this ADR only generalizes its allow-list into a
  per-tier map and adds the policy/probe/routing around it.

## Consequences

- "Full swap" is reconciled with "honor governance": the machinery is complete,
  but each tier is unlocked only by measured evidence. Today the only working
  fallback is `ingest-extract` drafting with `qwen3-coder:30b`; every other tier
  is BLOCKED with a teaching message until it earns its gate.
- Unlocking the next tier (e.g. full ingest, curator/heal, query, synthesis)
  requires its own golden set, threshold, and measured run, plus an amendment to
  the per-tier map and to this ADR — the same reversible edit ADR-0011 defines.
- The fallback is opt-in and fail-closed by default (`offlinePolicy: off`), so
  existing installs see no behavioural change.
