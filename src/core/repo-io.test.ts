/**
 * Tests for repo-io.ts — the git-tracked file discovery seam.
 *
 * Covers the in-memory RepoIO (used by design-drift tests) and the git-backed
 * RepoIO against a throwaway git repo (init + commit), asserting ls-files,
 * read, gitignore membership, and relative-path conversion.
 */

import { test, expect, describe, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeMemoryRepoIO, makeGitRepoIO } from "./repo-io.ts";

let roots: string[] = [];
afterEach(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
  roots = [];
});

function tmp(): string {
  const r = mkdtempSync(join(tmpdir(), "cwp-repo-io-"));
  roots.push(r);
  return r;
}

describe("Feature: Infrastructure › repo IO — memory repo IO", () => {
  test("lsFiles defaults to the file keys, sorted", () => {
    const io = makeMemoryRepoIO({
      root: "/x",
      files: { "b.md": "b", "a.md": "a" },
    });
    expect(io.lsFiles()).toEqual(["a.md", "b.md"]);
  });

  test("explicit tracked set overrides the file keys", () => {
    const io = makeMemoryRepoIO({
      root: "/x",
      files: { "a.md": "a", "b.md": "b" },
      tracked: ["a.md"],
    });
    expect(io.lsFiles()).toEqual(["a.md"]);
  });

  test("read returns content for known files, null otherwise", () => {
    const io = makeMemoryRepoIO({ root: "/x", files: { "a.md": "hello" } });
    expect(io.read("a.md")).toBe("hello");
    expect(io.read("missing.md")).toBeNull();
  });

  test("isGitIgnored reflects the ignored set", () => {
    const io = makeMemoryRepoIO({
      root: "/x",
      files: { "a.md": "a" },
      ignored: ["build/out.md"],
    });
    expect(io.isGitIgnored("build/out.md")).toBe(true);
    expect(io.isGitIgnored("a.md")).toBe(false);
  });

  test("relFromRoot produces a repo-relative POSIX path", () => {
    const io = makeMemoryRepoIO({ root: "/x/y", files: {} });
    expect(io.relFromRoot("/x/y/docs/a.md")).toBe("docs/a.md");
  });
});

describe("Feature: Infrastructure › repo IO — git repo IO", () => {
  function initRepo(): string {
    const root = tmp();
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(join(root, "docs/a.md"), "# A\n");
    writeFileSync(join(root, ".gitignore"), "ignored.md\n");
    writeFileSync(join(root, "ignored.md"), "ignore me\n");
    execFileSync("git", ["-C", root, "init", "-q"]);
    execFileSync("git", ["-C", root, "config", "user.email", "t@e.com"]);
    execFileSync("git", ["-C", root, "config", "user.name", "T"]);
    execFileSync("git", ["-C", root, "config", "commit.gpgsign", "false"]);
    execFileSync("git", ["-C", root, "add", "docs/a.md", ".gitignore"]);
    execFileSync("git", ["-C", root, "commit", "-q", "-m", "init"]);
    return root;
  }

  test("lsFiles returns tracked files only (untracked/ignored excluded)", () => {
    const root = initRepo();
    const io = makeGitRepoIO(root);
    const files = io.lsFiles();
    expect(files).toContain("docs/a.md");
    expect(files).toContain(".gitignore");
    expect(files).not.toContain("ignored.md");
  });

  test("lsFiles is cached (second call returns the same array)", () => {
    const root = initRepo();
    const io = makeGitRepoIO(root);
    expect(io.lsFiles()).toBe(io.lsFiles());
  });

  test("read returns file content, null for missing", () => {
    const root = initRepo();
    const io = makeGitRepoIO(root);
    expect(io.read("docs/a.md")).toBe("# A\n");
    expect(io.read("docs/missing.md")).toBeNull();
  });

  test("isGitIgnored is true for a gitignored path, false for a tracked one", () => {
    const root = initRepo();
    const io = makeGitRepoIO(root);
    expect(io.isGitIgnored("ignored.md")).toBe(true);
    expect(io.isGitIgnored("docs/a.md")).toBe(false);
  });

  test("lsFiles returns empty for a non-git directory (no throw)", () => {
    const root = tmp();
    const io = makeGitRepoIO(root);
    expect(io.lsFiles()).toEqual([]);
  });
});
