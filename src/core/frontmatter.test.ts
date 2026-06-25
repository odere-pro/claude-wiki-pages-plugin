import { test, expect, describe } from "bun:test";
import {
  splitFrontmatter,
  parseFrontmatter,
  titleOf,
  stringList,
  stripWikilink,
} from "./frontmatter.ts";

describe("Feature: Schema › frontmatter parsing — split", () => {
  test("isolates a leading YAML block", () => {
    const { frontmatter, body } = splitFrontmatter("---\ntitle: A\n---\nhello\n");
    expect(frontmatter).toBe("title: A");
    expect(body).toBe("hello\n");
  });

  test("returns null frontmatter when the file does not start with ---", () => {
    const { frontmatter, body } = splitFrontmatter("hello\n");
    expect(frontmatter).toBeNull();
    expect(body).toBe("hello\n");
  });

  test("treats an unterminated block as body", () => {
    expect(splitFrontmatter("---\ntitle: A\n").frontmatter).toBeNull();
  });
});

describe("Feature: Schema › frontmatter parsing — parse", () => {
  test("parses inline and block arrays", () => {
    const inline = parseFrontmatter('---\nsources: ["[[A]]", "[[B]]"]\n---\n');
    expect(stringList(inline["sources"])).toEqual(["[[A]]", "[[B]]"]);
    const block = parseFrontmatter("---\nchildren:\n  - foo\n  - bar\n---\n");
    expect(stringList(block["children"])).toEqual(["foo", "bar"]);
  });

  test("returns {} on invalid YAML", () => {
    expect(parseFrontmatter("---\n: : :\n---\n")).toEqual({});
  });
});

describe("Feature: Schema › frontmatter parsing — title extraction", () => {
  test("prefers the title field", () => {
    expect(titleOf("---\ntitle: Real Page\n---\n", "/x/real-page.md")).toBe("Real Page");
  });
  test("falls back to the filename stem", () => {
    expect(titleOf("body only\n", "/x/sample-entity.md")).toBe("sample-entity");
  });
});

test("stripWikilink unwraps [[ ]]", () => {
  expect(stripWikilink("[[Ghost Page]]")).toBe("Ghost Page");
  expect(stripWikilink("Plain")).toBe("Plain");
});
