# route — the degraded-mode routing decision

`route` is the deterministic answer to one question (ADR-0018): for a task, given
the effective offline policy, the configured capability tier, model approval, and
the reachability of Claude and Ollama, should the work run on **Claude**, on an
**approved local tier**, or be **BLOCKED**? The orchestrator consults this
decision; it never re-derives it. The handler in [`route.ts`](./route.ts) is pure
and **network-free** — reachability is an input (`--ollama` / `--claude`), not
something this command probes. The probe lives in
[`../../../scripts/reachability.sh`](../../../scripts/reachability.sh) so the
engine stays free of network code (gate-13 NO-RAG).

## Usage

```text
claude-wiki-pages route --ollama up|down --claude reachable|unreachable [--json]
```

- `--ollama` — Ollama reachability from the probe (`up` | `down` | `unprobed`).
- `--claude` — Claude API reachability (`reachable` | `unreachable` | `unprobed`).
- `--json` — emit the structured `RouteReport`.

Defaults are Claude-favouring: an unknown `--claude` is treated as reachable
(prefer the primary), and an unknown `--ollama` as not-up (do not assume a
fallback exists). The offline policy, tier, and model are read from the effective
config; `route` does not take them as flags.

## Decision matrix (ADR-0018 §4)

| offlinePolicy  | claude      | tier approved? | ollama | decision  |
| -------------- | ----------- | -------------- | ------ | --------- |
| `off`          | —           | —              | —      | `claude`  |
| `strict`       | reachable   | —              | —      | `claude`  |
| `strict`       | unreachable | —              | —      | `blocked` |
| `prefer-local` | reachable   | —              | —      | `claude`  |
| `prefer-local` | unreachable | yes            | up     | `local`   |
| `prefer-local` | unreachable | yes            | down   | `blocked` |
| `prefer-local` | unreachable | no             | —      | `blocked` |

"tier approved?" is `localModel.enabled && checkLocalModelApproval(config).length
=== 0` — the same per-tier gate `config validate` enforces, so the two can never
disagree.

## RouteReport

```ts
interface RouteReport extends Report {
  decision: "claude" | "local" | "blocked";
  reason: string;
  tier: "draft" | "ingest-extract";
  offlinePolicy: "strict" | "prefer-local" | "off";
}
```

A `blocked` decision is recorded as an error-severity finding, so `exitCode`
returns `1` (fail-closed); `claude` and `local` exit `0`.

## Covered by

- [`route.test.ts`](./route.test.ts) — the pure `decideRoute` matrix and the
  config-aware handler (exit codes, tier gating).
- [`../../../tests/engine/capabilities-contract.test.ts`](../../../tests/engine/capabilities-contract.test.ts)
  — `route` is in the implemented-verb golden list.
