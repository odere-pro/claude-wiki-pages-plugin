---
title: "Offline Policy"
type: concept
aliases: ["Offline Policy", "offline policy", "offlinePolicy", "degraded mode", "prefer-local"]
parent: "[[LLM]]"
path: "llm"
sources: ["[[adr-0018-offline-policy|ADR-0018: Offline Policy and Degraded-Mode Routing]]", "[[adr-0019-query-tier|ADR-0019: Query Tier and Answer Verification]]", "[[_sources/operations|Operations Guide]]", "[[_sources/local-models|Local Models]]"]
related: ["[[approved-local-model|Approved Local Model]]", "[[capability-tier|Capability Tier]]", "[[no-rag-principle|NO-RAG Principle]]"]
tags: ["concept", "offline", "local-model"]
created: 2026-06-13
updated: 2026-06-13
update_count: 5
status: active
confidence: 1.0
---

# Offline Policy

> [!summary]
> The offline policy (`localModel.offlinePolicy`) governs whether and how the plugin falls back to a local model when Claude is unreachable. Three values: `off` (default, never fall back), `strict` (fail if Claude unreachable, no fallback), `prefer-local` (route to approved local tier when Claude is down). The routing decision is handled by a network-free engine command (`engine route`), which takes pre-computed reachability flags as inputs. Every fallback path is fail-closed: an unapproved tier is BLOCKED with a teaching message, never run silently.

## Definition

The offline policy (`localModel.offlinePolicy`) governs whether and how the plugin falls back to a local model when Claude is unreachable. Three values: `off` (default, never fall back), `strict` (fail if Claude unreachable, no fallback), `prefer-local` (route to approved local tier when Claude is down).

## Key Principles

- `off` is the default: existing installs see no behavioral change; no reachability probes are made.
- The routing decision (`engine route`) is network-free: reachability is passed in as flags so the function never touches the network.
- Every fallback path is fail-closed: an unapproved tier returns `blocked`, never silently runs with an unapproved model.
- The reachability probe fails closed: any error reports `down`/`unreachable`, never a false `up`.
- Local drafts in `prefer-local` mode go to `_proposed/` via the standard review gate — they do not bypass provenance discipline.

## Examples

Routing decision matrix for `prefer-local` policy:

| Claude API  | Tier approved? | Ollama | Decision  |
| ----------- | -------------- | ------ | --------- |
| reachable   | —              | —      | `claude`  |
| unreachable | yes            | up     | `local`   |
| unreachable | yes            | down   | `blocked` |
| unreachable | no             | —      | `blocked` |

Configuration for prefer-local routing:

```json
{
  "localModel": {
    "enabled": true,
    "model": "qwen3-coder:30b",
    "offlinePolicy": "prefer-local",
    "tier": "ingest-extract"
  }
}
```

## The Problem (ADR-0018)

The plugin's north star is a full Claude→Ollama swap for offline use. Two constraints shape how this can be built:

1. **The plugin runs inside Claude Code.** If the network is genuinely down, Claude Code is not running — so an agent cannot "notice it is offline and switch" mid-session. Only Layer 4 (the Deterministic Engine, bash scripts, and a local Ollama model) runs with zero network.
2. **Local models are only as trustworthy as their measured evidence.** An unapproved model running silently is worse than no fallback — it produces unverified output in the wiki.

The offline policy addresses both: it defines when a fallback is allowed, what quality bar the fallback must meet, and how the routing decision is made without a network call.

## The Three Policy Values

### `off` (default)

Never probe reachability. Never fall back. Claude is always required. If Claude is unreachable, the session fails. This is the safe default: existing installs see no behavioral change.

```json
{ "localModel": { "offlinePolicy": "off" } }
```

### `strict`

Probe reachability. If Claude is unreachable, fail with a clear error message — no local fallback. Use this for scripts or CI pipelines that must use Claude and should never silently downgrade.

### `prefer-local`

Probe reachability. If Claude is unreachable AND a local model is approved at the requested tier AND Ollama is running, route to the local model. If the tier is unapproved or Ollama is down, the decision is `blocked` — not `local`.

## The Routing Decision (`engine route`)

The routing decision is a **network-free** engine command. Reachability is passed in as flags so the decision function never touches the network:

```bash
bash scripts/engine.sh route \
  --ollama up|down \
  --claude reachable|unreachable \
  --policy prefer-local \
  --tier ingest-extract
```

Decision matrix:

| Policy         | Claude API  | Tier approved? | Ollama | Decision  |
| -------------- | ----------- | -------------- | ------ | --------- |
| `off`          | —           | —              | —      | `claude`  |
| `strict`       | reachable   | —              | —      | `claude`  |
| `strict`       | unreachable | —              | —      | `blocked` |
| `prefer-local` | reachable   | —              | —      | `claude`  |
| `prefer-local` | unreachable | yes            | up     | `local`   |
| `prefer-local` | unreachable | yes            | down   | `blocked` |
| `prefer-local` | unreachable | no             | —      | `blocked` |

"Tier approved?" reuses `checkLocalModelApproval` — the single source of truth from `APPROVED_LOCAL_MODELS_BY_TIER` — so the routing decision and `config validate` can never disagree.

## Reachability Probe (`scripts/reachability.sh`)

The reachability probe is a separate bash script that runs before the routing decision. It keeps all network code in bash (not TypeScript) so the engine's source files stay free of `fetch`/`http` tokens (gate-13 NO-RAG enforcement):

- **Ollama:** `GET /api/tags` on `localhost:11434`.
- **Anthropic API:** unauthenticated `HEAD` to `https://api.anthropic.com/` — any HTTP response (including 401) means reachable; the API key is never sent in the probe.
- **Policy `off`:** no network call at all.

The probe fails closed: any error reports `down`/`unreachable`, never a false `up`.

Output:

```json
{ "ollama": "up", "claudeApi": "reachable" }
```

## Two Fallback Paths

### In-Session (Degraded Advisory)

When `localModel.enabled` and `offlinePolicy != off`, `session-start.sh` emits a `DEGRADED:` advisory line at SessionStart:

```
DEGRADED: claude=unreachable ollama=up tier=ingest-extract → local (approved)
```

The orchestrator consults `engine route` and, if the decision is `local`, routes an eligible ingest to `/claude-wiki-pages:draft` (which uses the local model to draft into `_proposed/`).

### Standalone (True Offline)

`scripts/offline-draft.sh` runs with Claude Code stopped entirely — no active session. It reads `vault/raw/`, calls Ollama directly, and writes drafts to `vault/_proposed/` (stamped with `proposed_by: "ollama:<model>"` and `status: draft`). Because hooks do not fire offline, the script enforces `_proposed/`-only write confinement itself.

`scripts/offline-query.sh` answers queries offline (ADR-0019): deterministic lexical search selects pages; the local model composes a cited answer; runtime answer verification checks every citation is verbatim. A non-verifying answer is denied — never shown to the user.

## NO-RAG Holds

The [[no-rag-principle|NO-RAG Principle]] applies to offline routing and verification:

- The reachability probe is plain HTTP status — no embeddings.
- The routing decision is a pure decision table — no similarity scoring.
- Runtime answer verification is exact string containment (`includes()`) — not semantic similarity.

## What Does NOT Change

- §5 NO-RAG holds: the offline path adds no embeddings.
- §6 one `_proposed/` channel holds: local drafts use `propose`, not a new write path.
- §7 provenance holds: local drafts reach `wiki/` only through the human review gate.
- ADR-0011 gate is unchanged: this ADR generalizes its allow-list into a per-tier map and adds policy/probe/routing around it.

## Configuration

```json
{
  "localModel": {
    "enabled": true,
    "model": "qwen3-coder:30b",
    "offlinePolicy": "prefer-local",
    "tier": "ingest-extract"
  }
}
```

`localModel.enabled: false` is the default. With this default, `offlinePolicy` has no effect.

## Related Concepts

- [[approved-local-model|Approved Local Model]] — the allow-list the routing decision consults
- [[capability-tier|Capability Tier]] — the tier the routing decision checks
- [[no-rag-principle|NO-RAG Principle]] — maintained throughout the offline path
- Hook System — `session-start.sh` emits the DEGRADED advisory
