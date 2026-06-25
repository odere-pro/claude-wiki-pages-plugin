/**
 * Git helpers for the self-heal safety net.
 *
 * Auto-heal is fully automatic (no approval prompts); its safety comes from git.
 * Before changing anything, the engine writes a checkpoint commit, so every
 * heal is reversible with `git revert` or a branch checkout. These helpers wrap
 * the few porcelain commands that loop needs.
 *
 * Concurrency note (H08 / M29 / C03): every read-then-write sequence (isClean →
 * add → commit; isClean → appendLog → commit) that spans multiple git calls is
 * vulnerable to TOCTOU races when two callers operate on the same vault
 * concurrently. `withVaultLockSync` in `vault-lock.ts` guards these sequences at
 * the call-site level (snapshot.ts, heal.ts, migrate.ts, propose.ts). All
 * `execFileSync` calls carry a `GIT_TIMEOUT_MS` timeout to prevent held
 * index.lock hangs from blocking the process indefinitely (M29).
 *
 * Gateway (C03): `GitProvider` is the domain port that isolates git from core
 * callers. `defaultGitProvider` is the default implementation backed by the git
 * CLI. Callers that previously imported helpers directly now go through the
 * provider; the top-level functions remain as thin shims for backwards
 * compatibility with existing call sites. Tests and callers may inject a
 * `GitProvider` implementation in place of the default for isolation.
 */

import { execFileSync } from "node:child_process";

export interface GitResult {
  readonly ok: boolean;
  readonly stdout: string;
}

/**
 * Gateway port (C03): domain-friendly interface that isolates callers from the
 * git CLI. The default implementation (`defaultGitProvider`) shells out via
 * `execFileSync`; tests may substitute an in-memory stub. Callers depend on
 * this interface, not on the underlying CLI specifics.
 */
export interface GitProvider {
  /** True when `dir` is inside a git work tree. */
  isRepo(dir: string): boolean;
  /** The work-tree root covering `dir`, or null when not in a repo. */
  repoRoot(dir: string): string | null;
  /** True when there are no staged or unstaged changes under `dir`. */
  isClean(dir: string): boolean;
  /** Initialise a repo (with an initial commit) if not already one. */
  ensureRepo(dir: string): void;
  /** The current HEAD short SHA, or null when unavailable. */
  head(dir: string): string | null;
  /** Write a checkpoint commit and optionally create a checkpoint branch. */
  checkpoint(dir: string, opId: string, isoTime: string, branch?: boolean): string | null;
  /** Apply the configured checkpoint mode before a write phase. */
  applyCheckpointMode(
    dir: string,
    mode: CheckpointMode,
    opId: string,
    isoTime: string,
  ): string | null;
  /** Push to the configured upstream (best-effort, opt-in). */
  push(dir: string): GitResult;
  /** Commit the current state with an arbitrary message. */
  commit(dir: string, message: string): string | null;
  /** Commit the healed state with a descriptive message. */
  commitHeal(dir: string, opId: string, iterations: number): string | null;
}

/**
 * Timeout for every git subprocess call (M29 / H08). Git operations that
 * hold the index.lock (e.g. `git add`, `git stash`) can hang indefinitely
 * when a lock file is left behind by a crashed process. Capping every call
 * prevents the engine from blocking the Claude session. 30 s is generous for
 * a local repository; large repos with slow I/O can increase via the env var
 * CLAUDE_WIKI_PAGES_GIT_TIMEOUT_MS.
 */
/** Default git subprocess timeout when the env override is unset/invalid. */
export const DEFAULT_GIT_TIMEOUT_MS = 30_000;

/**
 * Parse the `CLAUDE_WIKI_PAGES_GIT_TIMEOUT_MS` override into a positive,
 * finite millisecond value, falling back to {@link DEFAULT_GIT_TIMEOUT_MS} for
 * unset / NaN / non-positive inputs. Exported so the parsing rule is testable
 * against the real implementation (not a re-derived copy).
 */
export function parseGitTimeoutMs(raw: string | undefined): number {
  const v = Number(raw ?? "");
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_GIT_TIMEOUT_MS;
}

const GIT_TIMEOUT_MS: number = parseGitTimeoutMs(process.env["CLAUDE_WIKI_PAGES_GIT_TIMEOUT_MS"]);

function git(cwd: string, args: readonly string[]): GitResult {
  try {
    const stdout = execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: GIT_TIMEOUT_MS,
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

/**
 * Per-invocation commit identity. Passed as `-c` overrides so commits succeed
 * even where git's user.name/user.email are unset (e.g. CI runners), without
 * mutating global config. GPG signing is disabled too: these are internal
 * bookkeeping commits (never user-attributed), and a user with
 * commit.gpgsign=true would otherwise hang the engine on a passphrase prompt.
 */
const COMMIT_IDENTITY: readonly string[] = [
  "-c",
  "user.name=claude-wiki-pages",
  "-c",
  "user.email=claude-wiki-pages@users.noreply.github.com",
  "-c",
  "commit.gpgsign=false",
];

/** True when `dir` is inside a git work tree. */
export function isRepo(dir: string): boolean {
  return git(dir, ["rev-parse", "--is-inside-work-tree"]).stdout === "true";
}

/**
 * The work-tree root covering `dir`, or null when not in a repo. When the vault
 * inherits the parent project's repo this is the parent root, not the vault.
 */
export function repoRoot(dir: string): string | null {
  const r = git(dir, ["rev-parse", "--show-toplevel"]);
  return r.ok && r.stdout ? r.stdout : null;
}

/** True when there are no staged or unstaged changes under `dir` (pathspec-scoped). */
export function isClean(dir: string): boolean {
  return git(dir, ["status", "--porcelain", "--", "."]).stdout === "";
}

/**
 * Pathspec that confines every add/commit to the vault directory. Load-bearing
 * for the inherited-repo case (vault inside the user's project repo): a bare
 * `git add -A` with cwd=vault would stage the ENTIRE work tree and a commit
 * would swallow the user's unrelated dirty files. `-- .` scopes both the
 * staging and the commit to paths under the vault, and leaves anything the
 * user had staged elsewhere untouched.
 */
const VAULT_PATHSPEC: readonly string[] = ["--", "."];

/** Initialise a repo (with an initial commit) if `dir` is not already one. */
export function ensureRepo(dir: string): void {
  if (isRepo(dir)) return;
  git(dir, ["init"]);
  git(dir, ["add", "-A", ...VAULT_PATHSPEC]);
  git(dir, [
    ...COMMIT_IDENTITY,
    "commit",
    "--no-verify",
    "-m",
    "chore(claude-wiki-pages): initial vault commit",
    ...VAULT_PATHSPEC,
  ]);
}

/** The current HEAD short SHA, or null when unavailable. */
export function head(dir: string): string | null {
  const r = git(dir, ["rev-parse", "--short", "HEAD"]);
  return r.ok && r.stdout ? r.stdout : null;
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
  git(dir, ["add", "-A", ...VAULT_PATHSPEC]);
  git(dir, [
    ...COMMIT_IDENTITY,
    "commit",
    "--no-verify",
    "--allow-empty",
    "-m",
    `checkpoint: claude-wiki-pages pre-heal ${isoTime} ${opId}`,
    ...VAULT_PATHSPEC,
  ]);
  return head(dir);
}

/** How a write-path operation snapshots the vault, from `gitCheckpoint.mode`. */
export type CheckpointMode = "commit" | "branch" | "both" | "off";

/**
 * Apply the configured checkpoint mode before a write phase. `off` performs no
 * git operation and returns null; every other mode writes the checkpoint commit
 * (the commit is what makes uncommitted pre-state capturable), and `branch` /
 * `both` additionally pin it with a `cwp/checkpoint/<opId>` branch as the
 * rollback pointer.
 */
export function applyCheckpointMode(
  dir: string,
  mode: CheckpointMode,
  opId: string,
  isoTime: string,
): string | null {
  if (mode === "off") return null;
  return checkpoint(dir, opId, isoTime, mode === "branch" || mode === "both");
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
  git(dir, ["add", "-A", ...VAULT_PATHSPEC]);
  git(dir, [
    ...COMMIT_IDENTITY,
    "commit",
    "--no-verify",
    "--allow-empty",
    "-m",
    message,
    ...VAULT_PATHSPEC,
  ]);
  return head(dir);
}

/** Commit the healed state with a descriptive message. Returns the commit SHA. */
export function commitHeal(dir: string, opId: string, iterations: number): string | null {
  git(dir, ["add", "-A", ...VAULT_PATHSPEC]);
  git(dir, [
    ...COMMIT_IDENTITY,
    "commit",
    "--no-verify",
    "--allow-empty",
    "-m",
    `heal: claude-wiki-pages auto-heal ${opId} (${iterations} iteration${iterations === 1 ? "" : "s"})`,
    ...VAULT_PATHSPEC,
  ]);
  return head(dir);
}

/**
 * Default GitProvider implementation (C03 gateway): delegates every operation
 * to the module-level functions above, which shell out to the git CLI via
 * `execFileSync` with `GIT_TIMEOUT_MS`. Inject an alternative implementation
 * for testing or to swap the underlying VCS.
 */
export const defaultGitProvider: GitProvider = {
  isRepo,
  repoRoot,
  isClean,
  ensureRepo,
  head,
  checkpoint,
  applyCheckpointMode,
  push,
  commit,
  commitHeal,
};
