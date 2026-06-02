/**
 * Git helpers for the self-heal safety net.
 *
 * Auto-heal is fully automatic (no approval prompts); its safety comes from git.
 * Before changing anything, the engine stashes uncommitted user work and writes
 * a checkpoint commit, so every heal is reversible with `git revert` or a branch
 * checkout. These helpers wrap the few porcelain commands that loop needs.
 */

import { execFileSync } from "node:child_process";

export interface GitResult {
  readonly ok: boolean;
  readonly stdout: string;
}

function git(cwd: string, args: readonly string[]): GitResult {
  try {
    const stdout = execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, stdout: stdout.trim() };
  } catch (error: unknown) {
    const stdout = isExecError(error) ? String(error.stdout ?? "").trim() : "";
    return { ok: false, stdout };
  }
}

function isExecError(error: unknown): error is { stdout?: unknown } {
  return typeof error === "object" && error !== null && "stdout" in error;
}

// Internal machine commits must never GPG-sign — a user with commit.gpgsign=true
// would otherwise hang the engine on a passphrase prompt. Prepended to every
// commit the engine makes (these commits are bookkeeping, never user-attributed).
const NOSIGN = ["-c", "commit.gpgsign=false"] as const;

/** True when `dir` is inside a git work tree. */
export function isRepo(dir: string): boolean {
  return git(dir, ["rev-parse", "--is-inside-work-tree"]).stdout === "true";
}

/** True when there are no staged or unstaged changes (a clean working tree). */
export function isClean(dir: string): boolean {
  return git(dir, ["status", "--porcelain"]).stdout === "";
}

/** Initialise a repo (with an initial commit) if `dir` is not already one. */
export function ensureRepo(dir: string): void {
  if (isRepo(dir)) return;
  git(dir, ["init"]);
  git(dir, ["add", "-A"]);
  git(dir, [
    ...NOSIGN,
    "commit",
    "--no-verify",
    "-m",
    "chore(claude-wiki-pages): initial vault commit",
  ]);
}

/** The current HEAD short SHA, or null when unavailable. */
export function head(dir: string): string | null {
  const r = git(dir, ["rev-parse", "--short", "HEAD"]);
  return r.ok && r.stdout ? r.stdout : null;
}

/** Stash uncommitted user work (including untracked). Returns true if a stash was created. */
export function stashUserChanges(dir: string, label: string): boolean {
  if (isClean(dir)) return false;
  const r = git(dir, ["stash", "push", "--include-untracked", "-m", label]);
  return r.ok;
}

/** Re-apply the most recent stash. */
export function stashPop(dir: string): GitResult {
  return git(dir, ["stash", "pop"]);
}

/**
 * Write a checkpoint commit (empty-ok) labelling the pre-heal state, and
 * optionally create a checkpoint branch. Returns the checkpoint SHA.
 */
export function checkpoint(
  dir: string,
  opId: string,
  isoTime: string,
  branch = false,
): string | null {
  if (branch) git(dir, ["branch", `cwp/checkpoint/${opId}`]);
  git(dir, ["add", "-A"]);
  git(dir, [
    ...NOSIGN,
    "commit",
    "--no-verify",
    "--allow-empty",
    "-m",
    `checkpoint: claude-wiki-pages pre-heal ${isoTime} ${opId}`,
  ]);
  return head(dir);
}

/**
 * Push to the configured upstream. Best-effort and opt-in: returns ok:false
 * (never throws) when there is no upstream or the push fails, so an engine op is
 * never blocked by a push problem. Callers gate this on `gitCheckpoint.push`.
 */
export function push(dir: string): GitResult {
  return git(dir, ["push"]);
}

/** Commit the current state with an arbitrary message. Returns the commit SHA. */
export function commit(dir: string, message: string): string | null {
  git(dir, ["add", "-A"]);
  git(dir, [...NOSIGN, "commit", "--no-verify", "--allow-empty", "-m", message]);
  return head(dir);
}

/** Commit the healed state with a descriptive message. Returns the commit SHA. */
export function commitHeal(dir: string, opId: string, iterations: number): string | null {
  git(dir, ["add", "-A"]);
  git(dir, [
    ...NOSIGN,
    "commit",
    "--no-verify",
    "--allow-empty",
    "-m",
    `heal: claude-wiki-pages auto-heal ${opId} (${iterations} iteration${iterations === 1 ? "" : "s"})`,
  ]);
  return head(dir);
}
