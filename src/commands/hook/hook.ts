/**
 * hook — the firewall-adjacent engine entry that consumes a PreToolUse hook's
 * stdin JSON and emits the `{"decision":"block","reason":…}` contract
 * (migration-plan.md Phase 3).
 *
 * The CLI reads the raw stdin body, resolves the active vault, and calls
 * `runHookGate`. The handler narrows the payload at the boundary
 * (src/core/hook-input.ts), dispatches to the named gate via a registry, and
 * returns a typed HookResult the router serialises. The `frontmatter` and
 * `firewall` gates are wired here; `check-wikilinks`, `protect-raw`,
 * `attachments`, and `dmi` plug into the same dispatch in later units, each
 * fail-closed on the same contract.
 *
 * Gate dispatch uses a Strategy registry: each GateName maps to a GateHandler
 * that already wraps its gate into a HookResult. Adding a new gate requires only
 * one entry in GATE_REGISTRY — no new branch in runHookGate.
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
import { parseHookInput, type HookInput } from "../../core/hook-input.ts";
import { frontmatterGate } from "./frontmatter-gate.ts";
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
 * A resolved gate handler: receives the parsed vault context and HookInput,
 * returns a frozen HookResult.  Each entry in GATE_REGISTRY wraps its
 * underlying gate function (which may have its own parameter shape) into this
 * uniform signature so runHookGate needs no gate-specific branches.
 */
type GateHandler = (ctx: {
  readonly vault: string;
  readonly vaultName: string;
  readonly input: HookInput;
  readonly otherVaults?: readonly string[];
  readonly cwd?: string;
}) => HookResult;

/**
 * Strategy registry: maps every GateName to a GateHandler.
 *
 * To add a new gate:
 *   1. Add its name to the GateName union and GATE_NAMES tuple.
 *   2. Add one entry here — no changes to runHookGate.
 */
const GATE_REGISTRY: Readonly<Record<GateName, GateHandler>> = {
  // ── stdout-block security gates (block → JSON on stdout, exit 0) ─────────
  frontmatter: ({ vault, vaultName, input }) => {
    const d = frontmatterGate({ vault, vaultName, input });
    return d.block
      ? Object.freeze({ block: true, reason: d.reason, exitCode: 0, stderr: "" })
      : Object.freeze({ block: false, exitCode: 0, stderr: "" });
  },

  firewall: ({ vault, input, otherVaults, cwd }) => {
    const d = firewallHookGate({ vault, input, otherVaults, cwd });
    return d.block
      ? Object.freeze({ block: true, reason: d.reason, exitCode: 0, stderr: "" })
      : Object.freeze({ block: false, exitCode: 0, stderr: "" });
  },

  "check-wikilinks": ({ vaultName, input }) => {
    const d = wikilinkHookGate({ vaultName, input });
    return d.block
      ? Object.freeze({ block: true, reason: d.reason, exitCode: 0, stderr: "" })
      : Object.freeze({ block: false, exitCode: 0, stderr: "" });
  },

  "protect-raw": ({ vault, vaultName, input }) => {
    const d = protectRawHookGate({ vault, vaultName, input });
    return d.block
      ? Object.freeze({ block: true, reason: d.reason, exitCode: 0, stderr: "" })
      : Object.freeze({ block: false, exitCode: 0, stderr: "" });
  },

  attachments: ({ input }) => {
    const d = attachmentHookGate({ input });
    return d.block
      ? Object.freeze({ block: true, reason: d.reason, exitCode: 0, stderr: "" })
      : Object.freeze({ block: false, exitCode: 0, stderr: "" });
  },

  // ── Hard-block gate: stderr + exit 2, never a stdout block ───────────────
  dmi: ({ input }) => {
    const r = dmiHookGate({ input });
    return Object.freeze({ block: false, exitCode: r.exitCode, stderr: r.stderr });
  },

  // ── Advisory gate: stderr notice, always exit 0, never a block ───────────
  "must-rule": ({ input }) => {
    const r = mustRuleHookGate({ input });
    return Object.freeze({ block: false, exitCode: r.exitCode, stderr: r.stderr });
  },
};

/**
 * Run the named hook gate over the stdin payload, returning a decision.
 *
 * Resolves the active vault and its basename (the bash `$VAULT_NAME`) so the
 * gate's path filter and wiki-relative computation match the shell hook exactly.
 * Dispatches to the appropriate gate via GATE_REGISTRY (Strategy pattern) —
 * adding a new gate requires only a new entry in the registry, not a new branch
 * here.
 */
export function runHookGate(opts: RunHookOptions): HookResult {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");
  const vaultName = basename(vault);
  const input = parseHookInput(opts.stdin);

  const handler = GATE_REGISTRY[opts.gate];
  return handler({ vault, vaultName, input, otherVaults: opts.otherVaults, cwd: opts.cwd });
}
