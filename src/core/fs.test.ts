/** Folder-note predicates (schema v3): isFolderNote, isBookkeepingFile, indexFileOf. */

import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { makeVault } from "../test-helpers/sandbox/vault.ts";
import { isFolderNote, isBookkeepingFile, indexFileOf } from "./fs.ts";

const NOTE = "---\ntitle: Topics — Index\ntype: index\nchildren: []\n---\nbody\n";
const PAGE = "---\ntitle: Topics\ntype: entity\n---\nbody\n";

describe("isFolderNote", () => {
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

describe("isBookkeepingFile", () => {
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

describe("indexFileOf", () => {
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
