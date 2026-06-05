/**
 * `firewall check --file <path>` — the engine-side decision authority for vault
 * isolation. Agents and the parity gate call this; the hot-path PreToolUse hook
 * (`scripts/firewall.sh`) mirrors the same logic in bash so writes are gated
 * without a Bun spawn on every tool call.
 */

import { resolveVault } from "../../core/vault.ts";
import { loadConfig } from "../../data/config/config.ts";
import { decide, type FirewallDecision } from "../../core/firewall.ts";

export interface FirewallReport extends FirewallDecision {
  readonly command: "firewall";
  readonly vault: string;
  readonly file: string;
}

export interface FirewallOptions {
  readonly target?: string;
  readonly cwd?: string;
  readonly file: string;
  /**
   * S3 cross-vault: the OTHER registered vault roots (all vaults[] paths minus
   * the active one). Writes into these are blocked as "cross-vault".
   */
  readonly otherVaults?: readonly string[];
}

export function firewallCheck(opts: FirewallOptions): FirewallReport {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");
  const { firewall } = loadConfig({ cwd: opts.cwd }).config;
  const decision = decide(opts.file, {
    enabled: firewall.enabled,
    mode: firewall.mode,
    vault,
    allowPaths: firewall.allowPaths,
    denyPaths: firewall.denyPaths,
    otherVaults: opts.otherVaults ?? [],
  });
  return { command: "firewall", vault, file: opts.file, ...decision };
}
