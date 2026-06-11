/**
 * `snapshot` — git-bound a write phase that happens OUTSIDE the engine.
 *
 * Engine verbs (`heal`/`migrate`/`propose`) checkpoint their own writes; the
 * LLM write phases (ingest, curator judgment fixes, polish) edit the vault
 * through Claude's tools with no engine in the loop. `snapshot pre` captures
 * the pre-write state under the configured `gitCheckpoint.mode`; `snapshot
 * post` commits whatever the phase wrote. Both honor `mode: off` and are
 * pathspec-scoped to the vault, so a vault inheriting the parent project repo
 * never swallows unrelated user files. Snapshot reports — it never gates: the
 * CLI always exits 0.
 */

import { resolveVault } from "../../core/vault.ts";
import {
  ensureRepo,
  applyCheckpointMode,
  commit,
  isClean,
  isRepo,
  push,
} from "../../core/git.ts";
import { loadConfig } from "../../data/config/config.ts";

export type SnapshotSub = "pre" | "post";

export interface SnapshotReport {
  readonly command: "snapshot";
  readonly sub: SnapshotSub;
  readonly vault: string;
  readonly mode: "commit" | "branch" | "both" | "off";
  readonly sha: string | null;
  readonly skipped: boolean;
  readonly reason: string | null;
  readonly message: string;
}

export interface SnapshotOptions {
  readonly sub: SnapshotSub;
  readonly target?: string;
  readonly cwd?: string;
  readonly label?: string;
  /** Injectable for deterministic tests; default derived from the wall clock. */
  readonly opId?: string;
  readonly isoTime?: string;
}

export function snapshot(opts: SnapshotOptions): SnapshotReport {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");
  const now = opts.isoTime ?? new Date().toISOString();
  const opId = opts.opId ?? `snap-${now.replace(/[^0-9]/g, "").slice(0, 14)}`;
  const gitCfg = loadConfig({ cwd: opts.cwd }).config.gitCheckpoint;
  const mode = gitCfg.mode;

  const base = { command: "snapshot" as const, sub: opts.sub, vault, mode };

  if (mode === "off") {
    return {
      ...base,
      sha: null,
      skipped: true,
      reason: "gitCheckpoint.mode=off",
      message: `snapshot ${opts.sub}: skipped (gitCheckpoint.mode=off)`,
    };
  }

  if (opts.sub === "pre") {
    ensureRepo(vault);
    const sha = applyCheckpointMode(vault, mode, opId, now);
    return {
      ...base,
      sha,
      skipped: false,
      reason: null,
      message: `snapshot pre: checkpoint ${sha ?? "?"} (rollback: git revert ${sha ?? "<sha>"})`,
    };
  }

  // post — commit only what the phase actually wrote; never an empty commit.
  if (!isRepo(vault)) {
    // Degraded path: pre was skipped or the repo vanished. Recover rather than
    // lose the write — coverage is the guarantee.
    ensureRepo(vault);
  }
  if (isClean(vault)) {
    return {
      ...base,
      sha: null,
      skipped: true,
      reason: "clean",
      message: "snapshot post: nothing to commit (vault clean)",
    };
  }
  const label = opts.label ?? "claude-wiki-pages write phase";
  const sha = commit(vault, `snapshot: ${label} ${opId}`);
  if (sha && gitCfg.push === "auto") push(vault);
  return {
    ...base,
    sha,
    skipped: false,
    reason: null,
    message: `snapshot post: committed ${sha ?? "?"} (${label}; rollback: git revert ${sha ?? "<sha>"})`,
  };
}
