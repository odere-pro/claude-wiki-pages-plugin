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
  stashUserChanges,
  stashPop,
  checkpoint,
  applyCheckpointMode,
  commit,
  commitHeal,
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

describe("isRepo", () => {
  test("is false for a plain directory and true after init", () => {
    expect(isRepo(dir)).toBe(false);
    ensureRepo(dir);
    expect(isRepo(dir)).toBe(true);
  });
});

describe("ensureRepo", () => {
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
});

describe("isClean", () => {
  test("is true on a freshly committed tree and false with an untracked file", () => {
    ensureRepo(dir);
    expect(isClean(dir)).toBe(true);
    writeFile("new.md");
    expect(isClean(dir)).toBe(false);
  });
});

describe("head", () => {
  test("returns null outside a repo and a short SHA inside one", () => {
    expect(head(dir)).toBeNull();
    ensureRepo(dir);
    const sha = head(dir);
    expect(sha).toMatch(/^[0-9a-f]{7,}$/);
  });
});

describe("stashUserChanges / stashPop", () => {
  test("returns false when the tree is clean", () => {
    ensureRepo(dir);
    expect(stashUserChanges(dir, "label")).toBe(false);
  });

  test("stashes dirty work then restores it on pop (round-trip)", () => {
    ensureRepo(dir);
    writeFile("draft.md", "wip");
    expect(stashUserChanges(dir, "pre-heal")).toBe(true);
    expect(isClean(dir)).toBe(true);

    const popped = stashPop(dir);
    expect(popped.ok).toBe(true);
    expect(isClean(dir)).toBe(false);
  });
});

describe("checkpoint", () => {
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

describe("repoRoot", () => {
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

describe("applyCheckpointMode", () => {
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

describe("inherited parent repo (vault inside the user's project repo)", () => {
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

describe("commitHeal", () => {
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
});
