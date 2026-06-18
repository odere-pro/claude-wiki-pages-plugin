/**
 * hook — the firewall-adjacent engine entry that consumes a PreToolUse hook's
 * stdin JSON and emits the `{"decision":"block","reason":…}` contract
 * (migration-plan.md Phase 3).
 *
 * The CLI reads the raw stdin body, resolves the active vault, and calls
 * `runHookGate`. The handler narrows the payload at the boundary
 * (src/core/hook-input.ts), dispatches to the named gate, and returns a typed
 * HookResult the router serialises. Only the `frontmatter` gate is wired here
 * (this unit); `check-wikilinks`, `protect-raw`, `attachments`, and `dmi` plug
 * into the same `GATES` table in later units, each fail-closed on the same
 * contract.
 *
 * Decision-emission contract (preserved verbatim from the bash hooks):
 *   - block  → print `{"decision":"block","reason":…}` on stdout, exit 0.
 *   - allow  → no stdout, exit 0.
 *   (enforce-dmi keeps its hard exit 2 — handled by its own gate when wired.)
 *
 * No `any`; the stdin body is `unknown` until parseHookInput narrows it.
 */

import { basename } from "node:path";
import { resolveVault } from "../../core/vault.ts";
import { parseHookInput } from "../../core/hook-input.ts";
import { frontmatterGate, type HookDecision } from "./frontmatter-gate.ts";

/** The names of the security gates routed through the engine hook entry. */
export type GateName = "frontmatter";

/** The list of gate names this entry knows (one source of truth for the CLI). */
export const GATE_NAMES: readonly GateName[] = ["frontmatter"] as const;

/** Narrow an arbitrary string to a known GateName, or undefined. */
export function resolveGateName(raw: string | undefined): GateName | undefined {
  return raw !== undefined && (GATE_NAMES as readonly string[]).includes(raw)
    ? (raw as GateName)
    : undefined;
}

export interface RunHookOptions {
  /** The gate to run (e.g. "frontmatter"). */
  readonly gate: GateName;
  /** The raw stdin body (the PreToolUse tool-call JSON). */
  readonly stdin: string;
  /** Explicit vault override (the bash `--target`); else four-tier resolution. */
  readonly target?: string;
  /** cwd for vault resolution; injectable for tests. */
  readonly cwd?: string;
}

/** The structured outcome the CLI maps to stdout + exit code. */
export interface HookResult {
  /** True → the CLI prints the block JSON; false → no output. */
  readonly block: boolean;
  /** The block reason, present when `block` is true. */
  readonly reason?: string;
}

/**
 * Run the named hook gate over the stdin payload, returning a decision.
 *
 * Resolves the active vault and its basename (the bash `$VAULT_NAME`) so the
 * gate's path filter and wiki-relative computation match the shell hook exactly.
 */
export function runHookGate(opts: RunHookOptions): HookResult {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");
  const vaultName = basename(vault);
  const input = parseHookInput(opts.stdin);

  let decision: HookDecision;
  switch (opts.gate) {
    case "frontmatter":
      decision = frontmatterGate({ vault, vaultName, input });
      break;
    default:
      // Exhaustive: GateName has no other members. Allow rather than throw so a
      // future-gate typo can never turn into a fail-open security hole here.
      decision = { block: false };
  }

  return decision.block
    ? Object.freeze({ block: true, reason: decision.reason })
    : Object.freeze({ block: false });
}
