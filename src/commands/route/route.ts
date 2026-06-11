/**
 * `route` — the deterministic degraded-mode routing decision (ADR-0018).
 *
 * Given the effective offline policy, the configured capability tier, model
 * approval, and the reachability of Claude/Ollama (passed in as flags), it
 * returns whether a task runs on Claude, on an approved local tier, or is
 * BLOCKED. The decision is pure and NETWORK-FREE — reachability is an input, not
 * something this command probes (the probe lives in scripts/reachability.sh so
 * the engine stays free of network code, gate-13 NO-RAG). The orchestrator
 * consults this decision; it never re-derives it.
 *
 *   route --ollama up|down --claude reachable|unreachable [--json]
 */

import { buildReport, type Report, type Finding } from "../../core/report.ts";
import { loadConfig, checkLocalModelApproval, type Config } from "../../data/config/config.ts";

export type RouteDecision = "claude" | "local" | "blocked";

export interface RouteReport extends Report {
  readonly decision: RouteDecision;
  readonly reason: string;
  readonly tier: Config["localModel"]["tier"];
  readonly offlinePolicy: Config["localModel"]["offlinePolicy"];
}

export interface RouteOptions {
  readonly cwd?: string;
  /** Ollama reachability from scripts/reachability.sh ("up" | "down" | "unprobed"). */
  readonly ollama?: string;
  /** Claude API reachability ("reachable" | "unreachable" | "unprobed"). */
  readonly claude?: string;
}

/**
 * The pure decision matrix (ADR-0018 §4). Exported for direct unit testing.
 *
 * | offlinePolicy | claudeReachable | tierApproved | ollamaUp | decision  |
 * | off           | —               | —            | —        | claude    |
 * | strict        | true            | —            | —        | claude    |
 * | strict        | false           | —            | —        | blocked   |
 * | prefer-local  | true            | —            | —        | claude    |
 * | prefer-local  | false           | true         | true     | local     |
 * | prefer-local  | false           | true         | false    | blocked   |
 * | prefer-local  | false           | false        | —        | blocked   |
 */
export function decideRoute(
  policy: Config["localModel"]["offlinePolicy"],
  claudeReachable: boolean,
  tierApproved: boolean,
  ollamaUp: boolean,
): { decision: RouteDecision; reason: string } {
  if (policy === "off")
    return {
      decision: "claude",
      reason: "offlinePolicy is off — Claude is primary, no local fallback.",
    };
  if (claudeReachable) return { decision: "claude", reason: "Claude is reachable — primary." };
  // Claude is unreachable from here on.
  if (policy === "strict")
    return {
      decision: "blocked",
      reason: "offlinePolicy is strict and Claude is unreachable — no local fallback.",
    };
  // prefer-local + Claude unreachable.
  if (!tierApproved)
    return {
      decision: "blocked",
      reason:
        "Claude is unreachable and no gate-approved local tier is configured — " +
        "enable localModel with an approved tier/model (see ADR-0018) or run 'config validate'.",
    };
  if (!ollamaUp)
    return {
      decision: "blocked",
      reason: "Claude is unreachable and Ollama is not up — no local fallback available.",
    };
  return {
    decision: "local",
    reason: "Claude is unreachable — routing to the approved local tier.",
  };
}

export function route(opts: RouteOptions = {}): RouteReport {
  const { config } = loadConfig({ cwd: opts.cwd });
  const policy = config.localModel.offlinePolicy;
  const tier = config.localModel.tier;

  // A tier is usable only when localModel is enabled AND its model cleared the
  // per-tier gate — reuse checkLocalModelApproval so this can never disagree with
  // `config validate` (the single source of truth).
  const tierApproved = config.localModel.enabled && checkLocalModelApproval(config).length === 0;

  // Reachability is an input. Defaults are Claude-favouring: an unknown/unprobed
  // Claude state is treated as reachable (prefer the primary), and an unknown
  // Ollama state is treated as not-up (do not assume a fallback exists).
  const claudeReachable = opts.claude !== "unreachable";
  const ollamaUp = opts.ollama === "up";

  const { decision, reason } = decideRoute(policy, claudeReachable, tierApproved, ollamaUp);

  // A BLOCKED decision is an error-severity finding so exitCode() returns 1
  // (fail-closed), exactly like `config` and `firewall`.
  const findings: readonly Finding[] =
    decision === "blocked" ? [{ severity: "error", check: "route", message: reason }] : [];
  const base = buildReport("route", "", findings);
  return Object.freeze({ ...base, decision, reason, tier, offlinePolicy: policy });
}
