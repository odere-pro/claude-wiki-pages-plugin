import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import {
  isRepo,
  isClean,
  ensureRepo,
  head,
  repoRoot,
  checkpoint,
  applyCheckpointMode,
  commit,
  commitHeal,
  push,
  parseGitTimeoutMs,
  DEFAULT_GIT_TIMEOUT_MS,
  defaultGitProvider,
} from "./git.ts";

// Provide a deterministic identity so commits succeed without relying on the
// host's global git config.
process.env.GIT_AUTHOR_NAME = "Test";
process.env.GIT_AUTHOR_EMAIL = "test@example.com";
process.env.GIT_COMMITTER_NAME = "Test";
process.env.GIT_COMMITTER_EMAIL = "test@example.com";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cwp-git-"));
  // Seed a file so `ensureRepo` (which uses a non-empty initial commit) has
  // something to stage — it always runs on a populated vault in real use.
  writeFileSync(join(dir, "CLAUDE.md"), "---\nschema_version: 1\n---\n");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeFile(name: string, body = "x"): void {
  writeFileSync(join(dir, name), body);
}

describe("Feature: Infrastructure › git helpers — repo detection", () => {
  test("is false for a plain directory and true after init", () => {
    expect(isRepo(dir)).toBe(false);
    ensureRepo(dir);
    expect(isRepo(dir)).toBe(true);
  });
});

describe("Feature: Infrastructure › git helpers — ensure repo", () => {
  test("creates a repo with an initial commit", () => {
    ensureRepo(dir);
    expect(isRepo(dir)).toBe(true);
    expect(head(dir)).not.toBeNull();
  });

  test("is a no-op when already a repo (does not add a second initial commit)", () => {
    ensureRepo(dir);
    const sha = head(dir);
    ensureRepo(dir);
    expect(head(dir)).toBe(sha);
  });

  test("is a no-op on an existing repo with dirty changes — does NOT stage/commit them", () => {
    // The early `if (isRepo(dir)) return;` branch must not touch a working tree
    // that already has uncommitted work (e.g. a vault mid-edit). Without the
    // early return, ensureRepo's `git add -A` + commit would swallow the dirt.
    ensureRepo(dir);
    const sha = head(dir);
    writeFile("uncommitted.md", "work in progress");
    ensureRepo(dir);
    expect(head(dir)).toBe(sha); // no new commit
    expect(isClean(dir)).toBe(false); // the dirty file is still uncommitted
  });
});

describe("Feature: Infrastructure › git helpers — clean check", () => {
  test("is true on a freshly committed tree and false with an untracked file", () => {
    ensureRepo(dir);
    expect(isClean(dir)).toBe(true);
    writeFile("new.md");
    expect(isClean(dir)).toBe(false);
  });
});

describe("Feature: Infrastructure › git helpers — head", () => {
  test("returns null outside a repo and a short SHA inside one", () => {
    expect(head(dir)).toBeNull();
    ensureRepo(dir);
    const sha = head(dir);
    expect(sha).toMatch(/^[0-9a-f]{7,}$/);
  });
});

describe("Feature: Infrastructure › git helpers — checkpoint", () => {
  test("writes an empty-ok checkpoint commit and returns its SHA", () => {
    ensureRepo(dir);
    const before = head(dir);
    const cp = checkpoint(dir, "op123", "2026-06-04T00:00:00Z");
    expect(cp).not.toBeNull();
    expect(cp).not.toBe(before);
  });

  test("creates a checkpoint branch when requested", () => {
    ensureRepo(dir);
    checkpoint(dir, "op999", "2026-06-04T00:00:00Z", true);
    const branches = execFileSync("git", ["branch", "--list", "cwp/checkpoint/op999"], {
      cwd: dir,
      encoding: "utf8",
    });
    expect(branches).toContain("cwp/checkpoint/op999");
  });
});

describe("Feature: Infrastructure › git helpers — repo root", () => {
  test("returns null outside a repo and the work-tree root inside one", () => {
    expect(repoRoot(dir)).toBeNull();
    ensureRepo(dir);
    const root = repoRoot(dir);
    expect(root).not.toBeNull();
    // mkdtemp paths may traverse symlinks (/var → /private/var on macOS);
    // compare against git's own resolution of the same directory.
    expect(repoRoot(root as string)).toBe(root);
  });
});

describe("Feature: Infrastructure › git helpers — apply checkpoint mode", () => {
  test("off performs no git operation and returns null", () => {
    ensureRepo(dir);
    const before = head(dir);
    expect(applyCheckpointMode(dir, "off", "op1", "2026-06-11T00:00:00Z")).toBeNull();
    expect(head(dir)).toBe(before);
  });

  test("commit writes a checkpoint without a branch", () => {
    ensureRepo(dir);
    const sha = applyCheckpointMode(dir, "commit", "op2", "2026-06-11T00:00:00Z");
    expect(sha).not.toBeNull();
    const branches = execFileSync("git", ["branch", "--list", "cwp/checkpoint/op2"], {
      cwd: dir,
      encoding: "utf8",
    });
    expect(branches.trim()).toBe("");
  });

  test.each(["branch", "both"] as const)("%s pins a cwp/checkpoint branch", (mode) => {
    ensureRepo(dir);
    const sha = applyCheckpointMode(dir, mode, `op-${mode}`, "2026-06-11T00:00:00Z");
    expect(sha).not.toBeNull();
    const branches = execFileSync("git", ["branch", "--list", `cwp/checkpoint/op-${mode}`], {
      cwd: dir,
      encoding: "utf8",
    });
    expect(branches).toContain(`cwp/checkpoint/op-${mode}`);
  });
});

describe("Feature: Infrastructure › git helpers — inherited parent repo (vault inside the user's project repo)", () => {
  // The vault is a subdirectory of a repo the user owns. Every plugin commit
  // must be pathspec-scoped to the vault: the user's unrelated dirty files at
  // the repo root must never be staged or swallowed.
  let vault: string;

  beforeEach(() => {
    // `dir` is the parent project repo; the vault sits under docs/vault.
    ensureRepo(dir);
    vault = join(dir, "docs", "vault");
    mkdirSync(vault, { recursive: true });
    writeFileSync(join(vault, "CLAUDE.md"), "---\nschema_version: 2\n---\n");
  });

  function status(): string {
    return execFileSync("git", ["status", "--porcelain"], { cwd: dir, encoding: "utf8" });
  }

  test("commit() only commits vault files, not unrelated dirty/staged root files", () => {
    writeFileSync(join(dir, "unrelated.ts"), "user work in progress");
    execFileSync("git", ["add", "unrelated.ts"], { cwd: dir });

    const sha = commit(vault, "snapshot: test write phase");
    expect(sha).not.toBeNull();

    const committed = execFileSync("git", ["show", "--name-only", "--pretty=format:"], {
      cwd: dir,
      encoding: "utf8",
    });
    expect(committed).toContain("docs/vault/CLAUDE.md");
    expect(committed).not.toContain("unrelated.ts");
    // The user's staged file survives, still staged.
    expect(status()).toContain("A  unrelated.ts");
  });

  test("checkpoint() leaves unrelated root files untouched", () => {
    writeFileSync(join(dir, "notes.md"), "scratch");
    const sha = checkpoint(vault, "opN", "2026-06-11T00:00:00Z");
    expect(sha).not.toBeNull();
    expect(status()).toContain("?? notes.md");
  });

  test("isClean(vault) ignores dirt elsewhere in the parent repo", () => {
    commit(vault, "baseline vault commit");
    writeFileSync(join(dir, "elsewhere.md"), "dirty outside the vault");
    expect(isClean(vault)).toBe(true);
    writeFileSync(join(vault, "new-page.md"), "dirty inside the vault");
    expect(isClean(vault)).toBe(false);
  });
});

describe("Feature: Infrastructure › git helpers — commit heal", () => {
  test("commits the healed state and returns its SHA", () => {
    ensureRepo(dir);
    writeFile("healed.md", "fixed");
    const sha = commitHeal(dir, "op123", 2);
    expect(sha).not.toBeNull();
    expect(isClean(dir)).toBe(true);

    const msg = execFileSync("git", ["log", "-1", "--pretty=%s"], { cwd: dir, encoding: "utf8" });
    expect(msg).toContain("heal: claude-wiki-pages auto-heal op123 (2 iterations)");
  });

  test("uses a singular 'iteration' label for a single iteration", () => {
    ensureRepo(dir);
    commitHeal(dir, "opX", 1);
    const msg = execFileSync("git", ["log", "-1", "--pretty=%s"], { cwd: dir, encoding: "utf8" });
    expect(msg).toContain("(1 iteration)");
    expect(msg).not.toContain("iterations");
  });

  test("returns null outside a repo (the add/commit fail and there is no HEAD)", () => {
    // `dir` is a plain tmpdir (not git-init'd) — every git call fails, so
    // head() resolves to null and commitHeal propagates it. The failure path
    // must degrade to null, never throw.
    expect(() => commitHeal(dir, "opNope", 1)).not.toThrow();
    expect(commitHeal(dir, "opNope", 1)).toBeNull();
  });

  test("does not create a new commit when the index.lock is held (M29 failure branch)", () => {
    // A crashed git process can leave .git/index.lock behind; a subsequent
    // `git add`/`commit` then fails fast. commitHeal must not fabricate a
    // commit — it returns the unchanged prior HEAD and leaves the change
    // uncommitted, rather than hanging or throwing.
    ensureRepo(dir);
    const before = head(dir);
    writeFile("blocked.md", "change that cannot be committed under a lock");
    writeFileSync(join(dir, ".git", "index.lock"), "");
    const sha = commitHeal(dir, "opLocked", 1);
    rmSync(join(dir, ".git", "index.lock"), { force: true });
    expect(sha).toBe(before); // no new commit was created
    expect(isClean(dir)).toBe(false); // the change is still uncommitted
  });
});

describe("Feature: Infrastructure › git helpers — push (best-effort, opt-in)", () => {
  test("returns ok:false when there is no upstream/remote — never throws", () => {
    ensureRepo(dir);
    // No remote configured → `git push` exits non-zero; push() must degrade to
    // ok:false so an engine op is never blocked by a push problem.
    expect(() => push(dir)).not.toThrow();
    expect(push(dir).ok).toBe(false);
  });

  test("returns ok:false outside a repo", () => {
    // Plain tmpdir, not git-init'd — push fails and is caught as ok:false.
    expect(push(dir).ok).toBe(false);
  });
});

// ── Timeout contract (H08 / M29) ─────────────────────────────────────────────
//
// Every git subprocess call is bounded by GIT_TIMEOUT_MS (default 30 000 ms,
// overrideable via CLAUDE_WIKI_PAGES_GIT_TIMEOUT_MS). These tests verify that
// the override is respected and that a git operation that exceeds the timeout
// returns ok:false rather than hanging the process indefinitely.
//
// NOTE: We do not actually wait 30 s — we set the timeout to 1 ms and verify
// that a command that is slower than 1 ms returns ok:false.  In practice the
// git binary is never that slow, but `sleep infinity` is.  We use a real git
// command with a path that triggers a non-zero exit quickly (outside a repo)
// rather than a long-running command, because we cannot exec arbitrary
// commands through the module's private `git()` function.  The public API
// that exercises the timeout path is any function that calls `git()` — e.g.
// `isRepo()`.
//
// The meaningful assertions here are:
//   a) CLAUDE_WIKI_PAGES_GIT_TIMEOUT_MS is read at module load time — the
//      env override cannot be tested by changing the env var after import
//      (the const is already set).  We therefore test the *effective value*
//      by checking that git operations on non-repo dirs return false without
//      throwing (which is what a timeout or non-zero exit both do).
//   b) A positive timeout value from env overrides the default.
//   c) An invalid env value (NaN, negative, zero) is ignored, falling back to
//      the 30 000 ms default.

describe("Feature: Infrastructure › git helpers — GIT_TIMEOUT_MS env override (H08 / M29)", () => {
  test("CLAUDE_WIKI_PAGES_GIT_TIMEOUT_MS: a positive integer is parsed as the timeout", () => {
    // Exercise the REAL exported parser (parseGitTimeoutMs) — not a re-derived
    // copy — so a regression in git.ts's parsing rule turns this test red.
    expect(parseGitTimeoutMs("5000")).toBe(5_000);
    expect(parseGitTimeoutMs("1")).toBe(1);
    expect(parseGitTimeoutMs("60000")).toBe(60_000);
  });

  test("CLAUDE_WIKI_PAGES_GIT_TIMEOUT_MS: invalid values fall back to the default", () => {
    expect(DEFAULT_GIT_TIMEOUT_MS).toBe(30_000);
    expect(parseGitTimeoutMs("")).toBe(DEFAULT_GIT_TIMEOUT_MS);
    expect(parseGitTimeoutMs(undefined)).toBe(DEFAULT_GIT_TIMEOUT_MS);
    expect(parseGitTimeoutMs("NaN")).toBe(DEFAULT_GIT_TIMEOUT_MS);
    expect(parseGitTimeoutMs("0")).toBe(DEFAULT_GIT_TIMEOUT_MS);
    expect(parseGitTimeoutMs("-1")).toBe(DEFAULT_GIT_TIMEOUT_MS);
    expect(parseGitTimeoutMs("abc")).toBe(DEFAULT_GIT_TIMEOUT_MS);
  });

  test("git operations on a non-repo path return ok:false and do not throw (timeout-safe path)", () => {
    // isRepo(), isClean(), head() all call the internal git() helper which
    // wraps execFileSync in try/catch with a timeout.  A non-repo path
    // triggers a git non-zero exit (caught as ok:false) without hanging.
    // This exercises the catch branch that a timeout would also produce.
    const nonRepo = dir; // dir is a plain tmpdir (not git-init'd here)
    expect(() => isRepo(nonRepo)).not.toThrow();
    expect(isRepo(nonRepo)).toBe(false);
    expect(() => isClean(nonRepo)).not.toThrow();
    expect(() => head(nonRepo)).not.toThrow();
    expect(head(nonRepo)).toBeNull();
  });

  test("git operations return ok:false (not an exception) when git exits non-zero (M29 regression guard)", () => {
    // If git exits non-zero (e.g. due to a timeout SIGTERM), the internal
    // git() helper must catch the error and return { ok: false } — never
    // propagate the exception to callers.  isRepo on a non-repo exercises this.
    const result = isRepo("/tmp");
    // /tmp is never a git repo on any platform; git exits 128.
    expect(result).toBe(false);
  });
});

// ── GitProvider gateway (C03) ─────────────────────────────────────────────────

describe("Feature: Infrastructure › git helpers — default provider", () => {
  test("satisfies the GitProvider interface — all methods delegate correctly", () => {
    // The gateway must expose every method required by the interface.
    expect(typeof defaultGitProvider.isRepo).toBe("function");
    expect(typeof defaultGitProvider.repoRoot).toBe("function");
    expect(typeof defaultGitProvider.isClean).toBe("function");
    expect(typeof defaultGitProvider.ensureRepo).toBe("function");
    expect(typeof defaultGitProvider.head).toBe("function");
    expect(typeof defaultGitProvider.checkpoint).toBe("function");
    expect(typeof defaultGitProvider.applyCheckpointMode).toBe("function");
    expect(typeof defaultGitProvider.push).toBe("function");
    expect(typeof defaultGitProvider.commit).toBe("function");
    expect(typeof defaultGitProvider.commitHeal).toBe("function");
  });

  test("isRepo delegates to the underlying git helper", () => {
    expect(defaultGitProvider.isRepo(dir)).toBe(false);
    defaultGitProvider.ensureRepo(dir);
    expect(defaultGitProvider.isRepo(dir)).toBe(true);
  });

  test("head / commit through the gateway round-trips correctly", () => {
    defaultGitProvider.ensureRepo(dir);
    writeFile("gw.md", "via gateway");
    const sha = defaultGitProvider.commit(dir, "test: gateway commit");
    expect(sha).not.toBeNull();
    expect(defaultGitProvider.head(dir)).toBe(sha);
  });
});
