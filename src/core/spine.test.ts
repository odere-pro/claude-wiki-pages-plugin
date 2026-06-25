/**
 * Tests for the one strict-tree spine derivation (ADR-0036).
 *
 * Every page must hang beneath exactly one parent up to ROOT (`index.md`).
 * deriveSpine resolves the `parent:` wikilink with the engine's own resolver and
 * surfaces the three forbidden shapes: orphans, multi-parent, and cycles.
 */

import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { makeVault } from "../test-helpers/sandbox/vault.ts";
import { deriveSpine, ROOT_REL } from "./spine.ts";

const page = (parent: string, title: string): string =>
  `---\ntitle: "${title}"\nparent: "${parent}"\ntags: []\n---\n# ${title}\n`;

/**
 * A small vault that exercises every spine shape:
 *  - index.md (ROOT)
 *  - topic-a: folder note → page-1 → page-2 (a 3-deep attached chain)
 *  - topic-a/multi: parent resolves to two pages (multi-parent)
 *  - topic-b: folder note + orphan (no parent) + a cyc-x↔cyc-y cycle
 */
const VAULT: Record<string, string> = {
  "CLAUDE.md": "---\nschema_version: 3\n---\n# Vault\n",
  "wiki/index.md":
    '---\ntitle: "Wiki Index"\ntype: index\nparent: ""\naliases: ["Wiki Index", "ROOT"]\ntags: []\n---\n',
  "wiki/topic-a/topic-a.md": page("[[index|Wiki Index]]", "Topic A"),
  "wiki/topic-a/page-1.md": page("[[topic-a|Topic A]]", "Page 1"),
  "wiki/topic-a/page-2.md": page("[[page-1|Page 1]]", "Page 2"),
  "wiki/topic-a/multi.md": page("[[topic-a|Topic A]] [[topic-b|Topic B]]", "Multi"),
  "wiki/topic-b/topic-b.md": page("[[index|Wiki Index]]", "Topic B"),
  "wiki/topic-b/orphan.md": '---\ntitle: "Orphan"\ntags: []\n---\n# Orphan\n',
  "wiki/topic-b/cyc-x.md": page("[[cyc-y|Cyc Y]]", "Cyc X"),
  "wiki/topic-b/cyc-y.md": page("[[cyc-x|Cyc X]]", "Cyc Y"),
};

describe("Feature: Lint › tree spine", () => {
  test("ROOT has depth 0, empty path, and the folder notes as children", () => {
    const sb = makeVault(VAULT);
    const spine = deriveSpine(join(sb.vault, "wiki"));
    expect(spine.root).toBe(ROOT_REL);
    const root = spine.nodes.get("index.md")!;
    expect(root.depth).toBe(0);
    expect(root.pathToRoot).toEqual([]);
    expect(root.children).toEqual(["topic-a/topic-a.md", "topic-b/topic-b.md"]);
    sb.cleanup();
  });

  test("an attached page reports its parent, depth, full pathToRoot, and tree", () => {
    const sb = makeVault(VAULT);
    const spine = deriveSpine(join(sb.vault, "wiki"));

    const folderNote = spine.nodes.get("topic-a/topic-a.md")!;
    expect(folderNote.parent).toBe("index.md");
    expect(folderNote.depth).toBe(1);
    expect(folderNote.tree).toBe("topic-a");

    const p1 = spine.nodes.get("topic-a/page-1.md")!;
    expect(p1.parent).toBe("topic-a/topic-a.md");
    expect(p1.depth).toBe(2);
    expect(p1.pathToRoot).toEqual(["topic-a/topic-a.md", "index.md"]);

    const p2 = spine.nodes.get("topic-a/page-2.md")!;
    expect(p2.depth).toBe(3);
    expect(p2.pathToRoot).toEqual(["topic-a/page-1.md", "topic-a/topic-a.md", "index.md"]);
    sb.cleanup();
  });

  test("a page with no parent is an orphan (and not flagged as anything else)", () => {
    const sb = makeVault(VAULT);
    const spine = deriveSpine(join(sb.vault, "wiki"));
    expect(spine.orphans).toContain("topic-b/orphan.md");
    expect(spine.multiParent).not.toContain("topic-b/orphan.md");
    expect(spine.nodes.get("topic-b/orphan.md")!.depth).toBe(-1);
    sb.cleanup();
  });

  test("a parent resolving to two pages is multi-parent; the chain uses the first", () => {
    const sb = makeVault(VAULT);
    const spine = deriveSpine(join(sb.vault, "wiki"));
    expect(spine.multiParent).toEqual(["topic-a/multi.md"]);
    // Functional walk picks the first sorted parent.
    expect(spine.nodes.get("topic-a/multi.md")!.parent).toBe("topic-a/topic-a.md");
    sb.cleanup();
  });

  test("a parent loop is reported once as a cycle; its members do not reach ROOT", () => {
    const sb = makeVault(VAULT);
    const spine = deriveSpine(join(sb.vault, "wiki"));
    expect(spine.cycles).toEqual([["topic-b/cyc-x.md", "topic-b/cyc-y.md"]]);
    expect(spine.nodes.get("topic-b/cyc-x.md")!.depth).toBe(-1);
    expect(spine.orphans).not.toContain("topic-b/cyc-x.md");
    sb.cleanup();
  });

  test("a clean reference-style vault has no orphans, multi-parents, or cycles", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 3\n---\n# Vault\n",
      "wiki/index.md": '---\ntitle: "Wiki Index"\ntype: index\nparent: ""\ntags: []\n---\n',
      "wiki/topic-a/topic-a.md": page("[[index|Wiki Index]]", "Topic A"),
      "wiki/topic-a/page-1.md": page("[[topic-a|Topic A]]", "Page 1"),
    });
    const spine = deriveSpine(join(sb.vault, "wiki"));
    expect(spine.orphans).toEqual([]);
    expect(spine.multiParent).toEqual([]);
    expect(spine.cycles).toEqual([]);
    sb.cleanup();
  });
});
