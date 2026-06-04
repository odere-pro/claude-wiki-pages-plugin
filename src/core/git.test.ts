import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  isRepo,
  isClean,
  ensureRepo,
  head,
  stashUserChanges,
  stashPop,
  checkpoint,
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
