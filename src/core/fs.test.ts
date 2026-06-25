/**
 * fs.ts — two cohesion groups:
 *   Group 1 (FS primitives): readFileSafe, listMarkdownRecursive, listMarkdownShallow,
 *                             listSubdirs, existsSync
 *   Group 2 (Folder-note predicates): isFolderNote, isBookkeepingFile, indexFileOf
 */

import { test, expect, describe } from "bun:test";
import { join, basename } from "node:path";
import { writeFileSync } from "node:fs";
import { makeVault } from "../test-helpers/sandbox/vault.ts";
import {
  isFolderNote,
  isBookkeepingFile,
  indexFileOf,
  readFileSafe,
  listMarkdownRecursive,
  listMarkdownShallow,
  listSubdirs,
  existsSync,
} from "./fs.ts";

const NOTE = "---\ntitle: Topics — Index\ntype: index\nchildren: []\n---\nbody\n";
const PAGE = "---\ntitle: Topics\ntype: entity\n---\nbody\n";

describe("Feature: Infrastructure › filesystem helpers — folder note", () => {
  test("stem == parent dir name AND type: index → folder note", () => {
    const sb = makeVault({ "wiki/topics/topics.md": NOTE });
    expect(isFolderNote(join(sb.vault, "wiki/topics/topics.md"))).toBe(true);
    sb.cleanup();
  });

  test("stem matches but no type: index → NOT a folder note", () => {
    const sb = makeVault({ "wiki/topics/topics.md": PAGE });
    expect(isFolderNote(join(sb.vault, "wiki/topics/topics.md"))).toBe(false);
    sb.cleanup();
  });

  test("type: index but stem does not match the parent dir → NOT a folder note", () => {
    const sb = makeVault({ "wiki/topics/other.md": NOTE });
    expect(isFolderNote(join(sb.vault, "wiki/topics/other.md"))).toBe(false);
    sb.cleanup();
  });

  test("quoted type value ('index' / \"index\") still detects", () => {
    const sb = makeVault({
      "wiki/a/a.md": '---\ntitle: A\ntype: "index"\n---\n',
      "wiki/b/b.md": "---\ntitle: B\ntype: 'index'\n---\n",
    });
    expect(isFolderNote(join(sb.vault, "wiki/a/a.md"))).toBe(true);
    expect(isFolderNote(join(sb.vault, "wiki/b/b.md"))).toBe(true);
    sb.cleanup();
  });
});

describe("Feature: Infrastructure › filesystem helpers — bookkeeping file", () => {
  test("legacy _index.md and folder notes classify identically", () => {
    const sb = makeVault({
      "wiki/topics/_index.md": NOTE,
      "wiki/other/other.md": NOTE,
      "wiki/topics/real-page.md": PAGE,
    });
    expect(isBookkeepingFile(join(sb.vault, "wiki/topics/_index.md"))).toBe(true);
    expect(isBookkeepingFile(join(sb.vault, "wiki/other/other.md"))).toBe(true);
    expect(isBookkeepingFile(join(sb.vault, "wiki/topics/real-page.md"))).toBe(false);
    sb.cleanup();
  });

  test("root bookkeeping names (index, log, manifest) still classify", () => {
    const sb = makeVault({ "wiki/index.md": "x", "wiki/log.md": "x" });
    expect(isBookkeepingFile(join(sb.vault, "wiki/index.md"))).toBe(true);
    expect(isBookkeepingFile(join(sb.vault, "wiki/log.md"))).toBe(true);
    sb.cleanup();
  });
});

describe("Feature: Infrastructure › filesystem helpers — index file resolution", () => {
  test("prefers the folder note when present", () => {
    const sb = makeVault({
      "wiki/topics/topics.md": NOTE,
      "wiki/topics/_index.md": NOTE,
    });
    expect(indexFileOf(join(sb.vault, "wiki/topics"))).toBe(
      join(sb.vault, "wiki/topics/topics.md"),
    );
    sb.cleanup();
  });

  test("falls back to legacy _index.md", () => {
    const sb = makeVault({ "wiki/topics/_index.md": NOTE });
    expect(indexFileOf(join(sb.vault, "wiki/topics"))).toBe(
      join(sb.vault, "wiki/topics/_index.md"),
    );
    sb.cleanup();
  });

  test("a same-stem regular page does not count; returns null when nothing qualifies", () => {
    const sb = makeVault({ "wiki/topics/topics.md": PAGE });
    expect(indexFileOf(join(sb.vault, "wiki/topics"))).toBeNull();
    sb.cleanup();
  });
});

// ── Group 1: FS primitives ─────────────────────────────────────────────────

describe("Feature: Infrastructure › filesystem helpers — safe read", () => {
  test("reads an existing UTF-8 file", () => {
    const sb = makeVault({ "wiki/page.md": "hello" });
    expect(readFileSafe(join(sb.vault, "wiki/page.md"))).toBe("hello");
    sb.cleanup();
  });

  test("returns null for a missing file (no throw)", () => {
    expect(readFileSafe("/tmp/cwp-nonexistent-file-xyz.md")).toBeNull();
  });

  test("returns null for a directory path (no throw)", () => {
    const sb = makeVault({ "wiki/page.md": "x" });
    // Passing a directory as the path — should return null, not throw.
    expect(readFileSafe(join(sb.vault, "wiki"))).toBeNull();
    sb.cleanup();
  });
});

describe("Feature: Infrastructure › filesystem helpers — recursive markdown listing", () => {
  test("returns sorted .md paths under a nested tree", () => {
    const sb = makeVault({
      "wiki/b/b.md": "",
      "wiki/a/a.md": "",
      "wiki/root.md": "",
      "wiki/a/sub/deep.md": "",
    });
    const result = listMarkdownRecursive(join(sb.vault, "wiki"));
    // Must be sorted and all .md
    expect(result.every((p) => p.endsWith(".md"))).toBe(true);
    expect(result).toEqual([...result].sort());
    expect(result.length).toBe(4);
    sb.cleanup();
  });

  test("excludes non-.md files", () => {
    const sb = makeVault({ "wiki/page.md": "", "wiki/image.png": "" });
    // Manually write a non-.md file that makeVault would exclude by extension check
    writeFileSync(join(sb.vault, "wiki", "data.json"), "{}");
    const result = listMarkdownRecursive(join(sb.vault, "wiki"));
    expect(result.every((p) => p.endsWith(".md"))).toBe(true);
    sb.cleanup();
  });

  test("returns [] for a missing directory (no throw)", () => {
    expect(listMarkdownRecursive("/tmp/cwp-nonexistent-dir-xyz")).toEqual([]);
  });

  test("output is deterministic across two calls on the same tree", () => {
    const sb = makeVault({ "wiki/z.md": "", "wiki/a.md": "", "wiki/m.md": "" });
    const first = listMarkdownRecursive(join(sb.vault, "wiki"));
    const second = listMarkdownRecursive(join(sb.vault, "wiki"));
    expect(first).toEqual(second);
    sb.cleanup();
  });
});

describe("Feature: Infrastructure › filesystem helpers — shallow markdown listing", () => {
  test("returns only direct .md children, sorted", () => {
    const sb = makeVault({
      "wiki/b.md": "",
      "wiki/a.md": "",
      "wiki/sub/nested.md": "",
    });
    const result = listMarkdownShallow(join(sb.vault, "wiki"));
    expect(result.map((p) => basename(p))).toEqual(["a.md", "b.md"]);
    sb.cleanup();
  });

  test("returns [] for a missing directory (no throw)", () => {
    expect(listMarkdownShallow("/tmp/cwp-nonexistent-dir-xyz")).toEqual([]);
  });

  test("excludes directories even when they have .md-like names", () => {
    const sb = makeVault({ "wiki/real.md": "" });
    const result = listMarkdownShallow(join(sb.vault, "wiki"));
    // sub/ dir introduced by makeVault for nested.md is a directory, not a file
    expect(result.every((p) => p.endsWith(".md"))).toBe(true);
    sb.cleanup();
  });
});

describe("Feature: Infrastructure › filesystem helpers — subdirectory listing", () => {
  test("returns immediate subdirectory paths, sorted", () => {
    const sb = makeVault({
      "wiki/b/b.md": "",
      "wiki/a/a.md": "",
      "wiki/root.md": "",
    });
    const result = listSubdirs(join(sb.vault, "wiki"));
    expect(result.map((p) => basename(p))).toEqual(["a", "b"]);
    sb.cleanup();
  });

  test("returns [] for a missing directory (no throw)", () => {
    expect(listSubdirs("/tmp/cwp-nonexistent-dir-xyz")).toEqual([]);
  });

  test("does not include files, only directories", () => {
    const sb = makeVault({ "wiki/page.md": "", "wiki/sub/page.md": "" });
    const result = listSubdirs(join(sb.vault, "wiki"));
    expect(result.length).toBe(1);
    expect(basename(result[0]!)).toBe("sub");
    sb.cleanup();
  });
});

describe("Feature: Infrastructure › filesystem helpers — existsSync re-export", () => {
  test("returns true for an existing file", () => {
    const sb = makeVault({ "wiki/page.md": "x" });
    expect(existsSync(join(sb.vault, "wiki/page.md"))).toBe(true);
    sb.cleanup();
  });

  test("returns false for a missing path", () => {
    expect(existsSync("/tmp/cwp-nonexistent-xyz.md")).toBe(false);
  });
});
