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
 *
 * P1-A6: The report also carries `parallelExtract: {requested, effective, reason}`,
 * the observable degrade-ladder decision for bounded parallel EXTRACT (D10).
 * `requested` is maintenance.maxParallelExtract (default 1 when unset — Lane B
 * adds the config leaf in P1-A5; this code reads it defensively). `effective` is
 * NEVER >1 in any non-claude tier or at the default; each tier is a separate,
 * independently-tested rule.
 */

import { buildReport, type Report, type Finding } from "../../core/report.ts";
import { loadConfig, checkLocalModelApproval, type Config } from "../../data/config/config.ts";

export type RouteDecision = "claude" | "local" | "blocked";

/**
 * The parallel-extract degrade decision (P1-A6 / D10).
 * `requested` reflects maintenance.maxParallelExtract (1 when unset/default).
 * `effective` is NEVER >1 for any degraded tier; each tier is a separate rule.
 */
export interface ParallelExtractDecision {
  /** Value of maintenance.maxParallelExtract; 1 when the key is unset/default. */
  readonly requested: number;
  /**
   * The number of parallel extract workers that will actually run.
   * Equals `requested` only when `route == "claude"` AND `requested > 1`.
   * All other cases clamp to 1 (degrade-to-sequential).
   */
  readonly effective: number;
  /**
   * Human-readable rationale:
   * - "claude"             — Claude route; requested concurrency honoured.
   * - "default-sequential" — requested is 1 (unset/default); no parallelism.
   * - "local — degrade-to-sequential"   — local model route; must be sequential.
   * - "blocked — degrade-to-sequential" — blocked route; must be sequential.
   */
  readonly reason: string;
}

export interface RouteReport extends Report {
  readonly decision: RouteDecision;
  readonly reason: string;
  readonly tier: Config["localModel"]["tier"];
  readonly offlinePolicy: Config["localModel"]["offlinePolicy"];
  /** Additive parallel-extract degrade decision (P1-A6). JSON-only; no text render. */
  readonly parallelExtract: ParallelExtractDecision;
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

/**
 * Pure parallel-extract degrade-ladder decision (P1-A6 / D10).
 *
 * Rules (each tier is a separate, independently-tested case):
 * 1. `requested` is `maxParallelExtract` from config; `undefined` → 1 (unset/default).
 * 2. When `requested === 1` (unset or explicitly 1): effective=1, reason="default-sequential".
 * 3. When `requested > 1` AND route is "claude": effective=requested, reason="claude".
 * 4. When `requested > 1` AND route is "local":   effective=1, reason="local — degrade-to-sequential".
 * 5. When `requested > 1` AND route is "blocked":  effective=1, reason="blocked — degrade-to-sequential".
 *
 * `effective` is NEVER >1 in any non-claude tier — this is the degrade-to-sequential invariant.
 */
export function decideParallelExtract(
  maxParallelExtract: number | undefined,
  decision: RouteDecision,
): ParallelExtractDecision {
  const requested = maxParallelExtract ?? 1;

  // Case 1: unset or default (1) — no parallelism regardless of route.
  if (requested === 1) {
    return Object.freeze({ requested, effective: 1, reason: "default-sequential" });
  }

  // Cases 2–4: requested > 1, outcome depends on the routing decision.
  if (decision === "claude") {
    return Object.freeze({ requested, effective: requested, reason: "claude" });
  }
  // "local" or "blocked" — degrade-to-sequential.
  return Object.freeze({
    requested,
    effective: 1,
    reason: `${decision} — degrade-to-sequential`,
  });
}

/**
 * RouteInput is the focused, pre-resolved decision input extracted from Config
 * (C11). route() passes this to decideRoute/decideParallelExtract instead of
 * forwarding the full Config object, so callers read Config exactly once and
 * downstream functions receive only the values they need.
 */
interface RouteInput {
  readonly policy: Config["localModel"]["offlinePolicy"];
  readonly tier: Config["localModel"]["tier"];
  readonly tierApproved: boolean;
  readonly claudeReachable: boolean;
  readonly ollamaUp: boolean;
  readonly maxParallelExtract: number | undefined;
}

/** Extract the focused routing inputs from Config (C11 — single read point). */
function resolveRouteInput(config: Config, opts: RouteOptions): RouteInput {
  // A tier is usable only when localModel is enabled AND its model cleared the
  // per-tier gate — reuse checkLocalModelApproval so this can never disagree
  // with `config validate` (the single source of truth).
  const tierApproved = config.localModel.enabled && checkLocalModelApproval(config).length === 0;
  // Reachability is an input. Defaults are Claude-favouring: an unknown/unprobed
  // Claude state is treated as reachable (prefer the primary), and an unknown
  // Ollama state is treated as not-up (do not assume a fallback exists).
  const claudeReachable = opts.claude !== "unreachable";
  const ollamaUp = opts.ollama === "up";
  return {
    policy: config.localModel.offlinePolicy,
    tier: config.localModel.tier,
    tierApproved,
    claudeReachable,
    ollamaUp,
    // C12: Config.maintenance now declares maxParallelExtract; no cast needed.
    maxParallelExtract: config.maintenance.maxParallelExtract,
  };
}

export function route(opts: RouteOptions = {}): RouteReport {
  const { config } = loadConfig({ cwd: opts.cwd });
  // C11: resolve all Config reads in one place; pass the focused input object.
  const input = resolveRouteInput(config, opts);

  const { decision, reason } = decideRoute(
    input.policy,
    input.claudeReachable,
    input.tierApproved,
    input.ollamaUp,
  );

  // P1-A6: read maintenance.maxParallelExtract — now typed in Config (C12).
  const parallelExtract = decideParallelExtract(input.maxParallelExtract, decision);

  // A BLOCKED decision is an error-severity finding so exitCode() returns 1
  // (fail-closed), exactly like `config` and `firewall`.
  const findings: readonly Finding[] =
    decision === "blocked" ? [{ severity: "error", check: "route", message: reason }] : [];
  const base = buildReport("route", "", findings);
  return Object.freeze({
    ...base,
    decision,
    reason,
    tier: input.tier,
    offlinePolicy: input.policy,
    parallelExtract,
  });
}
