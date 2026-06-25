import { test, expect, describe } from "bun:test";
import { extractWikilinks, duplicates, markdownLinkViolation } from "./wikilinks.ts";

describe("extractWikilinks", () => {
  test("extracts targets and drops aliases", () => {
    expect(extractWikilinks("see [[Alpha]] and [[Beta|the beta]]")).toEqual(["Alpha", "Beta"]);
  });
  test("preserves document order and repeats", () => {
    expect(extractWikilinks("[[A]] [[B]] [[A]]")).toEqual(["A", "B", "A"]);
  });
});

test("duplicates reports counts for repeated targets only", () => {
  const d = duplicates(["A", "B", "A", "A"]);
  expect(d.get("A")).toBe(3);
  expect(d.has("B")).toBe(false);
});

describe("markdownLinkViolation", () => {
  test("flags [text](file.md) links in the body", () => {
    expect(markdownLinkViolation("---\nt: 1\n---\nsee [x](y.md)")).toContain("wikilinks");
  });
  test("ignores links inside fenced code blocks", () => {
    expect(markdownLinkViolation("---\nt: 1\n---\n```\n[x](y.md)\n```\n")).toBeNull();
  });
  test("returns null for clean wikilink bodies", () => {
    expect(markdownLinkViolation("---\nt: 1\n---\nsee [[X]]")).toBeNull();
  });
  test("detects markdown link containing a CR (\\r) byte in link text", () => {
    // The 's' (dotAll) flag is required so '.' matches '\r'.
    // Without it the regex silently misses '[the\rsample](page.md)'.
    // Regression anchor for json-envelope.bats test 311.
    const content = "---\ntitle: T\ntype: topic\n---\n\nSee [the\rsample](page.md) here.";
    expect(markdownLinkViolation(content)).not.toBeNull();
    expect(markdownLinkViolation(content)).toContain("wikilinks");
  });
  test("detects markdown link containing a tab (\\t) byte in link text", () => {
    const content = "---\ntitle: T\ntype: topic\n---\n\nSee [the\tsample](page.md) here.";
    expect(markdownLinkViolation(content)).not.toBeNull();
  });
});
