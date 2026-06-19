/**
 * firewall-gate — the hook-mode decision logic that scripts/firewall.sh ran
 * inline (lines 347-370), now in the engine. firewall-twin-retire
 * (migration-plan.md Phase 3).
 *
 * This is the "firewall-adjacent engine entry" half of the gate: it consumes a
 * parsed HookInput plus the resolved active vault (and the sibling-vault set) and
 * returns a HookDecision the CLI serialises into the
 * `{"decision":"block","reason":…}` contract. The decision authority itself stays
 * in src/core/firewall.ts (via firewallCheck) — this module adds only the
 * hook-specific wrapping the bash hook performed:
 *
 *   1. Empty file_path → allow (the bash `[ -z "$FILE_PATH" ] && exit 0`).
 *   2. enforce block → return the B03-redacted reason (the active vault BASENAME
 *      only, never the absolute path), using the cross-vault message for a
 *      cross-vault rule and the "confined to the vault … allowPaths" message for
 *      every other block (deny / outside-vault).
 *   3. warn mode → never blocks (the bash warn branch advises on stderr; the CLI
 *      mirrors that — this module just returns allow).
 *
 * The cross-vault SET (otherVaults) is computed by the bash wrapper from the
 * registry (or CLAUDE_WIKI_PAGES_OTHER_VAULTS), fail-closed, and passed in — the
 * registry read stays in the bash spine (migration-plan.md "What stays in bash").
 *
 * No `any`; the HookInput is already narrowed at the boundary
 * (src/core/hook-input.ts). Deterministic: same input + policy → same decision.
 */

import { basename } from "node:path";
import type { HookInput } from "../../core/hook-input.ts";
import { firewallCheck } from "../firewall/firewall.ts";
import type { HookDecision } from "./frontmatter-gate.ts";

/** Frozen allow decision (the bash `exit 0` with no block JSON). */
const ALLOW: HookDecision = Object.freeze({ block: false });

export interface FirewallGateOptions {
  /** Absolute path to the resolved active vault root. */
  readonly vault: string;
  /** The parsed, boundary-narrowed hook payload. */
  readonly input: HookInput;
  /**
   * S3 cross-vault: the OTHER registered vault roots (all vaults[] paths minus
   * the active one), as the bash wrapper derived them. Writes into these block
   * as "cross-vault"; allowPaths cannot override.
   */
  readonly otherVaults?: readonly string[];
  /** cwd for config resolution; injectable for tests. */
  readonly cwd?: string;
}

/**
 * Build the B03-redacted block reason — verbatim from scripts/firewall.sh's hook
 * mode. The cross-vault rule gets the dedicated "different registered vault"
 * message; every other block gets the "confined to the vault … allowPaths"
 * message. Only the active vault BASENAME is exposed, never the absolute path
 * (which contains the username).
 */
function blockReason(matchedRule: string, vault: string): string {
  const vaultDisplay = basename(vault);
  if (matchedRule === "cross-vault") {
    return (
      `firewall: writes are confined to the active vault (${vaultDisplay}/); ` +
      `target belongs to a different registered vault. Blocked by cross-vault ` +
      `rule. Switch vaults first to write there.`
    );
  }
  return (
    `firewall: writes are confined to the vault (${vaultDisplay}/). ` +
    `Blocked by ${matchedRule}. Add the path to firewall.allowPaths to permit it.`
  );
}

/**
 * The hook-mode firewall gate decision.
 *
 * Returns an allow/block decision matching scripts/firewall.sh's hook mode
 * exactly. The block reason is the B03-redacted message verbatim, so the
 * user-facing copy is unchanged from the bash hook.
 */
export function firewallHookGate(opts: FirewallGateOptions): HookDecision {
  const { vault, input } = opts;

  // Empty file path → allow (the bash `[ -z "$FILE_PATH" ] && exit 0`).
  if (input.filePath === "") return ALLOW;

  const report = firewallCheck({
    target: vault,
    cwd: opts.cwd,
    file: input.filePath,
    otherVaults: opts.otherVaults ?? [],
  });

  // allow (inside vault / off / disabled), AND warn mode (allowed===true even on
  // a boundary hit) → never block. The bash warn branch advises on stderr; the
  // CLI mirrors that. enforce blocks → emit the redacted reason.
  if (report.allowed) return ALLOW;

  return Object.freeze({ block: true, reason: blockReason(report.matchedRule, report.vault) });
}
