/**
 * `heal` — fully automatic, git-bounded self-heal.
 *
 * No approval prompts: safety comes from git. Before changing anything the loop
 * writes a checkpoint commit capturing the current state, then runs
 * verify → fix → re-verify until the verifier is clean or stops making progress.
 * On success the auto-fixes land in a single `heal:` commit (rollback =
 * `git revert <heal>`); on non-convergence the checkpoint is left in place and
 * the unresolved findings are surfaced — the loop never spins forever.
 *
 * M17 (layering note): heal intentionally composes the verify and fix command
 * handlers directly — it IS the verify → fix → re-verify loop, not a generic
 * orchestrator. Shared primitives (git operations, log append, vault resolution)
 * live in core/. No mediator layer is warranted here. Cross-reference:
 * src/commands/CLAUDE.md — "Commands stay thin — they compose core checks."
 */

import { verify } from "../verify/verify.ts";
import { fix, type FixChange } from "../fix/fix.ts";
import { resolveVault } from "../../core/vault.ts";
import {
  ensureRepo,
  applyCheckpointMode,
  commitHeal,
  push,
  type CheckpointMode,
} from "../../core/git.ts";
import { appendLog } from "../../core/log.ts";
import { loadConfig } from "../../data/config/config.ts";
import { withVaultLockSync } from "../../core/vault-lock.ts";

const DEFAULT_MAX_ITERATIONS = 5;

export interface HealReport {
  readonly command: "heal";
  readonly vault: string;
  readonly errorsBefore: number;
  readonly errorsAfter: number;
  readonly iterations: number;
  readonly clean: boolean;
  readonly checkpoint: string | null;
  readonly healCommit: string | null;
  readonly changes: readonly FixChange[];
  /** Unresolved findings requiring judgment (curator/human), when not clean. */
  readonly unresolved: readonly string[];
}

export interface HealOptions {
  readonly target?: string;
  readonly cwd?: string;
  readonly maxIterations?: number;
  readonly checkpointBranch?: boolean;
  /** Injectable for deterministic tests; default derived from the wall clock. */
  readonly opId?: string;
  readonly isoTime?: string;
  readonly today?: string;
}

export async function heal(opts: HealOptions = {}): Promise<HealReport> {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");
  const maxIterations = opts.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const now = opts.isoTime ?? new Date().toISOString();
  const opId = opts.opId ?? `op-${now.replace(/[^0-9]/g, "").slice(0, 14)}`;
  const gitCfg = loadConfig({ cwd: opts.cwd }).config.gitCheckpoint;
  // The test-only checkpointBranch option forces branch creation on top of the
  // configured mode; gitCheckpoint.mode is the production control.
  const mode: CheckpointMode = opts.checkpointBranch ? "both" : gitCfg.mode;

  const before = await verify({ target: vault });

  // Already clean — no-op, no git churn.
  if (before.errors === 0) {
    return base(vault, before.errors, before.errors, 0, true, null, null, [], []);
  }

  if (mode !== "off") ensureRepo(vault);
  const checkpointSha = applyCheckpointMode(vault, mode, opId, now);

  const changes: FixChange[] = [];
  let iterations = 0;
  let last = before;
  while (iterations < maxIterations) {
    const f = fix({ target: vault, today: opts.today });
    iterations++;
    changes.push(...f.changes);
    last = await verify({ target: vault });
    if (last.errors === 0) break;
    if (f.changed === 0) break; // no progress — stop rather than spin
  }

  const clean = last.errors === 0;
  // Guard the appendLog → commitHeal sequence with the advisory vault lock to
  // prevent TOCTOU races between concurrent heal invocations (H08 / M29).
  const healSha = withVaultLockSync(vault, () => {
    // Record the operation in the log before committing, so the entry lands in
    // the heal commit itself (the precise SHA lives in git; the log stays
    // human-readable).
    if (clean && changes.length > 0) {
      appendLog(vault, {
        verb: "heal",
        summary: `errors ${before.errors} → ${last.errors} in ${iterations} iteration(s)`,
        details: [
          // Paper trace: the checkpoint SHA is the rollback anchor, known before
          // the heal commit exists (a commit cannot contain its own SHA).
          ...(checkpointSha ? [`checkpoint: ${checkpointSha}`] : []),
          "rollback: git revert the heal commit below",
        ],
        today: opts.today,
      });
    }
    return clean && mode !== "off" ? commitHeal(vault, opId, iterations) : null;
  });
  if (healSha && gitCfg.push === "auto") push(vault);
  const unresolved = clean
    ? []
    : last.findings.filter((x) => x.severity === "error").map((x) => x.message);

  return base(
    vault,
    before.errors,
    last.errors,
    iterations,
    clean,
    checkpointSha,
    healSha,
    changes,
    unresolved,
  );
}

function base(
  vault: string,
  errorsBefore: number,
  errorsAfter: number,
  iterations: number,
  clean: boolean,
  checkpointSha: string | null,
  healCommit: string | null,
  changes: readonly FixChange[],
  unresolved: readonly string[],
): HealReport {
  return {
    command: "heal",
    vault,
    errorsBefore,
    errorsAfter,
    iterations,
    clean,
    checkpoint: checkpointSha,
    healCommit,
    changes,
    unresolved,
  };
}
