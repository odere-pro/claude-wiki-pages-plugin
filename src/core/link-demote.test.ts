/**
 * Tests for the one demote-not-delete core (ADR-0033 / ADR-0036).
 *
 * The contract: demote rejected `[[wikilinks]]` to their display text without
 * touching fenced/inline code, prune rejected entries from association arrays,
 * and never alter an accepted link. The policy (which links to keep) is the
 * caller's; these tests pin the text surgery for any predicate.
 */

import { test, expect, describe } from "bun:test";
import { splitFrontmatter, linkDisplay, demoteInBody, pruneFields } from "./link-demote.ts";

/** Keep links whose target basename starts with "keep"; demote everything else. */
const keepKeepers = (raw: string): boolean => raw.split("|")[0]!.trim().startsWith("keep");

describe("Feature: Lint › link demotion — display-text derivation", () => {
  test("uses the piped alias when present", () => {
    expect(linkDisplay("entity-name|Entity Name")).toBe("Entity Name");
  });
  test("falls back to the bare target minus anchor/block", () => {
    expect(linkDisplay("Some Page#heading")).toBe("Some Page");
    expect(linkDisplay("Some Page^block")).toBe("Some Page");
  });
});

describe("Feature: Lint › link demotion — frontmatter split", () => {
  test("preserves the exact block so a rewrite can reassemble byte-for-byte", () => {
    const text = "---\ntitle: X\ntags: []\n---\n# Body\nhello\n";
    const { fm, body, block } = splitFrontmatter(text);
    expect(fm).toBe("\ntitle: X\ntags: []");
    expect(block).toBe("---\ntitle: X\ntags: []\n---");
    expect(block + body).toBe(text);
  });
  test("returns null frontmatter when the document has none", () => {
    expect(splitFrontmatter("# No frontmatter\n").fm).toBeNull();
  });
});

describe("Feature: Lint › link demotion — body rewrite", () => {
  test("demotes rejected links and keeps accepted ones, counting demotions", () => {
    const [out, n] = demoteInBody("See [[keep-me|Keep Me]] and [[drop-it|Drop It]].", keepKeepers);
    expect(out).toBe("See [[keep-me|Keep Me]] and Drop It.");
    expect(n).toBe(1);
  });

  test("never rewrites links inside an inline code span", () => {
    const [out, n] = demoteInBody("text `[[drop-it|Drop It]]` more", keepKeepers);
    expect(out).toBe("text `[[drop-it|Drop It]]` more");
    expect(n).toBe(0);
  });

  test("never rewrites links inside a fenced code block", () => {
    const body = "```\n[[drop-it|Drop It]]\n```\nand [[drop-it|Drop It]] outside";
    const [out, n] = demoteInBody(body, keepKeepers);
    expect(out).toBe("```\n[[drop-it|Drop It]]\n```\nand Drop It outside");
    expect(n).toBe(1);
  });
});

describe("Feature: Lint › link demotion — field pruning", () => {
  const FIELDS = new Set(["related", "depends_on"]);

  test("prunes rejected entries only from listed fields", () => {
    const fm =
      '\nrelated: ["[[keep-me|Keep Me]]", "[[drop-it|Drop It]]"]\nsources: ["[[drop-it|Drop It]]"]';
    const [out, n] = pruneFields(fm, keepKeepers, FIELDS);
    expect(n).toBe(1);
    expect(out).toContain('related: ["[[keep-me|Keep Me]]"]');
    // sources is not in FIELDS — left untouched.
    expect(out).toContain('sources: ["[[drop-it|Drop It]]"]');
  });

  test("leaves a field with no rejected entries unchanged in count", () => {
    const fm = '\nrelated: ["[[keep-a|Keep A]]", "[[keep-b|Keep B]]"]';
    const [, n] = pruneFields(fm, keepKeepers, FIELDS);
    expect(n).toBe(0);
  });
});
