import { test, expect, describe } from "bun:test";
import {
  replaceYamlListField,
  syncChildren,
  dedupeIndexLinks,
  buildIndexStub,
} from "./moc-build.ts";

describe("Feature: Lint › MOC build — YAML list-field replacement", () => {
  test("replaces a block list", () => {
    const fm = 'title: x\nchildren:\n  - "[[Old]]"\ntags: []';
    expect(replaceYamlListField(fm, "children", ["[[A]]", "[[B]]"])).toBe(
      'title: x\nchildren:\n  - "[[A]]"\n  - "[[B]]"\ntags: []',
    );
  });
  test("replaces an inline list", () => {
    expect(replaceYamlListField('children: ["[[Old]]"]\ntags: []', "children", [])).toBe(
      "children: []\ntags: []",
    );
  });
  test("leaves frontmatter untouched when the field is absent", () => {
    expect(replaceYamlListField("title: x", "children", ["[[A]]"])).toBe("title: x");
  });
});

describe("Feature: Lint › MOC build — children sync", () => {
  test("rewrites children to the given titles, preserving body", () => {
    const content = "---\ntitle: i\nchildren: []\n---\n# Body\nkeep me\n";
    const out = syncChildren(content, ["Alpha", "Beta"]);
    expect(out).toContain('  - "[[Alpha]]"');
    expect(out).toContain('  - "[[Beta]]"');
    expect(out).toContain("keep me");
  });
  test("is idempotent", () => {
    const once = syncChildren("---\ntitle: i\nchildren: []\n---\nb\n", ["A"]);
    expect(syncChildren(once, ["A"])).toBe(once);
  });
});

describe("Feature: Lint › MOC build — index link dedup", () => {
  test("removes repeated wikilink bullets, keeps first", () => {
    const out = dedupeIndexLinks("---\nt: i\n---\n- [[A]]\n- [[A]]\n- [[B]]\n");
    expect(out).toBe("---\nt: i\n---\n- [[A]]\n- [[B]]\n");
  });
  test("is a no-op when there are no duplicates", () => {
    const c = "---\nt: i\n---\n- [[A]]\n- [[B]]\n";
    expect(dedupeIndexLinks(c)).toBe(c);
  });
});

describe("Feature: Lint › MOC build — index stub generation", () => {
  test("produces schema-shaped frontmatter and a Pages section", () => {
    const stub = buildIndexStub("my-topic", ["Page One"], "2026-06-01");
    expect(stub).toContain('title: "My Topic — Index"');
    expect(stub).toContain("type: index");
    expect(stub).toContain('  - "[[Page One]]"');
    expect(stub).toContain("## Pages");
    expect(stub).toContain("- [[Page One]]");
  });
});
