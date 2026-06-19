/**
 * hook — the firewall-adjacent engine entry that consumes a PreToolUse hook's
 * stdin JSON and emits the `{"decision":"block","reason":…}` contract
 * (migration-plan.md Phase 3).
 *
 * The CLI reads the raw stdin body, resolves the active vault, and calls
 * `runHookGate`. The handler narrows the payload at the boundary
 * (src/core/hook-input.ts), dispatches to the named gate, and returns a typed
 * HookResult the router serialises. The `frontmatter` and `firewall` gates are
 * wired here; `check-wikilinks`, `protect-raw`, `attachments`, and `dmi` plug
 * into the same dispatch in later units, each fail-closed on the same contract.
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
import { firewallHookGate } from "./firewall-gate.ts";
import { wikilinkHookGate } from "./wikilink-gate.ts";
import { protectRawHookGate } from "./protect-raw-gate.ts";
import { attachmentHookGate } from "./attachment-gate.ts";
import { dmiHookGate } from "./dmi-gate.ts";
import { mustRuleHookGate } from "./must-rule-gate.ts";

/**
 * The names of the gates routed through the engine hook entry.
 *
 * `frontmatter`, `firewall`, `protect-raw`, `attachments`, and `dmi` are SECURITY
 * gates (fail-closed in their bash wrappers); `check-wikilinks` and `must-rule`
 * are ADVISORY (fail-open). `dmi` is the lone HARD-block gate — it exits 2 via
 * stderr, never the stdout block JSON.
 */
export type GateName =
  | "frontmatter"
  | "firewall"
  | "check-wikilinks"
  | "protect-raw"
  | "attachments"
  | "dmi"
  | "must-rule";

/** The list of gate names this entry knows (one source of truth for the CLI). */
export const GATE_NAMES: readonly GateName[] = [
  "frontmatter",
  "firewall",
  "check-wikilinks",
  "protect-raw",
  "attachments",
  "dmi",
  "must-rule",
] as const;

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
  /**
   * S3 cross-vault: the OTHER registered vault roots (the bash `--other-vaults`).
   * Consumed only by the `firewall` gate; ignored by gates that do not isolate
   * across vaults.
   */
  readonly otherVaults?: readonly string[];
}

/** The structured outcome the CLI maps to stdout + stderr + exit code. */
export interface HookResult {
  /**
   * True → the CLI prints the `{"decision":"block","reason":…}` JSON on stdout.
   * Only the stdout-block gates (frontmatter, firewall, check-wikilinks,
   * protect-raw, attachments) set this; dmi/must-rule signal via stderr+exitCode.
   */
  readonly block: boolean;
  /** The block reason, present when `block` is true. */
  readonly reason?: string;
  /**
   * Exit code the CLI must return. Default 0 (every PreToolUse gate exits 0 and
   * signals a block via stdout JSON) EXCEPT `dmi`, which exits 2 on a hard block.
   */
  readonly exitCode: number;
  /**
   * Verbatim stderr text the CLI must write (the `dmi` / `must-rule` notices).
   * "" when the gate writes nothing to stderr.
   */
  readonly stderr: string;
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

  // ── DMI — the lone HARD-block gate: stderr + exit 2, never a stdout block. ──
  if (opts.gate === "dmi") {
    const r = dmiHookGate({ input });
    return Object.freeze({ block: false, exitCode: r.exitCode, stderr: r.stderr });
  }

  // ── must-rule — advisory: a stderr notice, always exit 0, never a block. ────
  if (opts.gate === "must-rule") {
    const r = mustRuleHookGate({ input });
    return Object.freeze({ block: false, exitCode: r.exitCode, stderr: r.stderr });
  }

  // ── The stdout-block gates: block → {"decision":"block",reason}, exit 0. ────
  let decision: HookDecision;
  switch (opts.gate) {
    case "frontmatter":
      decision = frontmatterGate({ vault, vaultName, input });
      break;
    case "firewall":
      decision = firewallHookGate({
        vault,
        input,
        otherVaults: opts.otherVaults,
        cwd: opts.cwd,
      });
      break;
    case "check-wikilinks":
      decision = wikilinkHookGate({ vaultName, input });
      break;
    case "protect-raw":
      decision = protectRawHookGate({ vault, vaultName, input });
      break;
    case "attachments":
      decision = attachmentHookGate({ input });
      break;
    default:
      // Exhaustive: GateName has no other members. Allow rather than throw so a
      // future-gate typo can never turn into a fail-open security hole here.
      decision = { block: false };
  }

  return decision.block
    ? Object.freeze({ block: true, reason: decision.reason, exitCode: 0, stderr: "" })
    : Object.freeze({ block: false, exitCode: 0, stderr: "" });
}
