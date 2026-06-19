/**
 * repo-io — the git-tracked file discovery seam for docs/design checks.
 *
 * scripts/validate-docs.sh drives file discovery with `git ls-files` and tests
 * gitignore membership with `git check-ignore`. The engine's docs-check needs the
 * SAME tracked-only scope to be byte/count-identical with the bash gate on the
 * real repo — a filesystem walk would also scan untracked files (e.g. the test
 * fixture corpus) that the bash gate never sees.
 *
 * RepoIO is a tiny abstraction over those git queries plus file reads. The
 * production path (`makeGitRepoIO`) shells to git; tests inject a `makeMemoryRepoIO`
 * backed by an in-memory file map + explicit tracked/ignored sets, so the
 * design-drift logic stays testable without a real git repo (per the module's
 * "no git dependency in tests" design).
 *
 * Deterministic and read-only. No embeddings, no network.
 *
 * @module repo-io
 */

import { relative } from "node:path";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Read-only repository IO used by the docs/design-drift checks. */
export interface RepoIO {
  /** Absolute repository root. */
  readonly root: string;
  /** Tracked repo-relative paths (sorted, POSIX separators) — git ls-files. */
  lsFiles(): readonly string[];
  /** Read a repo-relative file as UTF-8; null on any failure (never throws). */
  read(rel: string): string | null;
  /** True when a repo-relative path is gitignored — git check-ignore. */
  isGitIgnored(rel: string): boolean;
  /** Convert an absolute path to a repo-relative POSIX path. */
  relFromRoot(abs: string): string;
}

/** Normalise to POSIX separators. */
function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Production RepoIO backed by git, rooted at `root`.
 * `git ls-files` is run once and cached; `git check-ignore` is per-call (rare path).
 */
export function makeGitRepoIO(root: string): RepoIO {
  let cache: readonly string[] | null = null;
  return {
    root,
    lsFiles(): readonly string[] {
      if (cache !== null) return cache;
      try {
        const out = execFileSync("git", ["-C", root, "ls-files"], {
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
        });
        cache = Object.freeze(
          out
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l !== "")
            .map(toPosix)
            .sort(),
        );
      } catch {
        cache = Object.freeze([]);
      }
      return cache;
    },
    read(rel: string): string | null {
      try {
        return readFileSync(`${root}/${rel}`, "utf8");
      } catch {
        return null;
      }
    },
    isGitIgnored(rel: string): boolean {
      try {
        execFileSync("git", ["-C", root, "check-ignore", "-q", rel], { stdio: "ignore" });
        return true; // exit 0 → ignored
      } catch {
        return false; // exit 1 (not ignored) or git error → not ignored
      }
    },
    relFromRoot(abs: string): string {
      return toPosix(relative(root, abs));
    },
  };
}

/** In-memory RepoIO for tests: explicit files + tracked + ignored sets. */
export interface MemoryRepoSpec {
  /** Absolute root the IO reports (need not exist on disk). */
  readonly root: string;
  /** Map of repo-relative path → file content. Existence is membership here. */
  readonly files: Record<string, string>;
  /**
   * Tracked repo-relative paths (git ls-files). Defaults to the keys of `files`
   * when omitted — the common case where everything written is tracked.
   */
  readonly tracked?: readonly string[];
  /** Gitignored repo-relative paths (git check-ignore). Defaults to none. */
  readonly ignored?: readonly string[];
}

/**
 * Build an in-memory RepoIO. Note: `read`/existence is driven by `files`, but
 * `resolveLink` in design-drift uses `existsSync` against the real filesystem for
 * OK detection. For pure in-memory link tests, point `root` at a real tmp dir that
 * actually contains the link targets, or assert on token/count behaviours that do
 * not depend on on-disk existence.
 */
export function makeMemoryRepoIO(spec: MemoryRepoSpec): RepoIO {
  const trackedSet = Object.freeze(
    [...(spec.tracked ?? Object.keys(spec.files))].map(toPosix).sort(),
  );
  const ignoredSet = new Set((spec.ignored ?? []).map(toPosix));
  return {
    root: spec.root,
    lsFiles(): readonly string[] {
      return trackedSet;
    },
    read(rel: string): string | null {
      const key = toPosix(rel);
      return Object.prototype.hasOwnProperty.call(spec.files, key) ? spec.files[key]! : null;
    },
    isGitIgnored(rel: string): boolean {
      return ignoredSet.has(toPosix(rel));
    },
    relFromRoot(abs: string): string {
      return toPosix(relative(spec.root, abs));
    },
  };
}
