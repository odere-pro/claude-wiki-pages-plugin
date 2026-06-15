/**
 * Wikilink-collision check (ADR-0030 §4).
 *
 * A collision is a normalised name claimed by >1 distinct page over basename ∪
 * alias. Tests the #18 basename-beats-alias case, the self-collision guard,
 * the title-excluded rule, and pure-basename collisions.
 */

import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { makeVault } from "../test-helpers/sandbox/vault.ts";
import { checkCollisions } from "./collision-check.ts";

function wikiOf(files: Record<string, string>): { wiki: string; cleanup: () => void } {
  const sb = makeVault(files);
  return { wiki: join(sb.vault, "wiki"), cleanup: sb.cleanup };
}

describe("checkCollisions", () => {
  test("basename of one page == alias of another → one WARN (#18)", () => {
    const { wiki, cleanup } = wikiOf({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/_sources/install.md": "---\ntitle: install (source)\n---\nthin\n",
      "wiki/how-it-works/installation.md":
        '---\ntitle: Installation\naliases: ["install"]\n---\nrich\n',
    });
    const findings = checkCollisions(wiki);
    const c = findings.filter((f) => f.check === "wikilink-collision");
    expect(c).toHaveLength(1);
    expect(c[0]?.severity).toBe("warn");
    // Obsidian opens the basename page; the alias page is shadowed.
    expect(c[0]?.message).toContain("[[install]]");
    expect(c[0]?.message).toContain("_sources/install.md");
    expect(c[0]?.message).toContain("how-it-works/installation.md");
    expect(c[0]?.file).toBe("_sources/install.md");
    cleanup();
  });

  test("clean vault (no shared names) yields zero collisions", () => {
    const { wiki, cleanup } = wikiOf({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/alpha.md": '---\ntitle: Alpha\naliases: ["a"]\n---\nbody\n',
      "wiki/topics/beta.md": '---\ntitle: Beta\naliases: ["b"]\n---\nbody\n',
    });
    const findings = checkCollisions(wiki);
    expect(findings.filter((f) => f.check === "wikilink-collision")).toHaveLength(0);
    cleanup();
  });

  test("a page whose basename equals its own alias is NOT flagged", () => {
    const { wiki, cleanup } = wikiOf({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      // stem "foo" and alias "foo" both point at the same single page.
      "wiki/topics/foo.md": '---\ntitle: Foo\naliases: ["foo"]\n---\nbody\n',
    });
    const findings = checkCollisions(wiki);
    expect(findings.filter((f) => f.check === "wikilink-collision")).toHaveLength(0);
    cleanup();
  });

  test("two files with the same basename in different folders collide", () => {
    const { wiki, cleanup } = wikiOf({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/a/dup.md": "---\ntitle: Dup A\n---\nbody\n",
      "wiki/b/dup.md": "---\ntitle: Dup B\n---\nbody\n",
    });
    const findings = checkCollisions(wiki);
    const c = findings.filter((f) => f.check === "wikilink-collision");
    expect(c).toHaveLength(1);
    expect(c[0]?.message).toContain("[[dup]]");
    cleanup();
  });

  test("a shared title alone (no basename/alias overlap) is NOT a collision", () => {
    // Obsidian never resolves by title, so a title/title overlap is not a misroute.
    const { wiki, cleanup } = wikiOf({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/alpha.md": "---\ntitle: Shared\n---\nbody\n",
      "wiki/topics/beta.md": "---\ntitle: Shared\n---\nbody\n",
    });
    const findings = checkCollisions(wiki);
    expect(findings.some((f) => f.message.includes("[[shared]]"))).toBe(false);
    cleanup();
  });

  test("findings are sorted by colliding name", () => {
    const { wiki, cleanup } = wikiOf({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/a/zebra.md": "---\ntitle: Zebra A\n---\nbody\n",
      "wiki/b/zebra.md": "---\ntitle: Zebra B\n---\nbody\n",
      "wiki/a/apple.md": "---\ntitle: Apple A\n---\nbody\n",
      "wiki/b/apple.md": "---\ntitle: Apple B\n---\nbody\n",
    });
    const c = checkCollisions(wiki).filter((f) => f.check === "wikilink-collision");
    expect(c.map((f) => f.message.match(/\[\[(.+?)\]\]/)?.[1])).toEqual(["apple", "zebra"]);
    cleanup();
  });
});
