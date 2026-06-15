/**
 * Obsidian-accurate link resolution (ADR-0030).
 *
 * Tests the priority ladder (exact-path > basename > alias > title), the
 * tie-break (shortest-path → same-folder-as-source → alphabetical), and
 * `resolvableNames` (the basename ∪ alias ∪ title membership set the dangling
 * check consumes — the `byPath` tier excluded).
 */

import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { makeVault } from "../test-helpers/sandbox/vault.ts";
import { buildLinkIndex, resolveLink, resolvableNames } from "./link-resolver.ts";

function wikiOf(files: Record<string, string>): { wiki: string; cleanup: () => void } {
  const sb = makeVault(files);
  return { wiki: join(sb.vault, "wiki"), cleanup: sb.cleanup };
}

describe("resolveLink — priority ladder", () => {
  test("a real file basename ALWAYS beats an alias (the #18 collision case)", () => {
    const { wiki, cleanup } = wikiOf({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      // basename "install"
      "wiki/_sources/install.md": "---\ntitle: install (source)\n---\nthin summary\n",
      // alias "install" on a different page
      "wiki/how-it-works/installation.md":
        '---\ntitle: Installation\naliases: ["install"]\n---\nrich page\n',
    });
    const idx = buildLinkIndex(wiki);
    const r = resolveLink("install", "", idx);
    expect(r?.file).toBe("_sources/install.md");
    expect(r?.kind).toBe("basename");
    cleanup();
  });

  test("exact vault path resolves before basename/alias", () => {
    const { wiki, cleanup } = wikiOf({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/how-it-works/installation.md": "---\ntitle: Installation\n---\nbody\n",
    });
    const idx = buildLinkIndex(wiki);
    expect(resolveLink("how-it-works/installation", "", idx)?.kind).toBe("path");
    expect(resolveLink("how-it-works/installation.md", "", idx)?.kind).toBe("path");
    cleanup();
  });

  test("alias resolves when no basename matches", () => {
    const { wiki, cleanup } = wikiOf({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/page-x.md": '---\ntitle: Page X\naliases: ["fancy name"]\n---\nbody\n',
    });
    const idx = buildLinkIndex(wiki);
    const r = resolveLink("fancy name", "", idx);
    expect(r?.file).toBe("topics/page-x.md");
    expect(r?.kind).toBe("alias");
    cleanup();
  });

  test("title resolves as the lowest tier (engine superset of Obsidian)", () => {
    const { wiki, cleanup } = wikiOf({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/p1.md": "---\ntitle: Title One\n---\nbody\n",
    });
    const idx = buildLinkIndex(wiki);
    const r = resolveLink("title one", "", idx);
    expect(r?.file).toBe("topics/p1.md");
    expect(r?.kind).toBe("title");
    cleanup();
  });

  test("unresolved target returns null", () => {
    const { wiki, cleanup } = wikiOf({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
    });
    const idx = buildLinkIndex(wiki);
    expect(resolveLink("nope", "", idx)).toBeNull();
    cleanup();
  });

  test("resolution is case-insensitive and strips |alias/#heading/^block", () => {
    const { wiki, cleanup } = wikiOf({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/installation.md": "---\ntitle: Installation\n---\nbody\n",
    });
    const idx = buildLinkIndex(wiki);
    expect(resolveLink("INSTALLATION", "", idx)?.file).toBe("topics/installation.md");
    expect(resolveLink("installation|see here", "", idx)?.file).toBe("topics/installation.md");
    expect(resolveLink("installation#section", "", idx)?.file).toBe("topics/installation.md");
    expect(resolveLink("installation^blk", "", idx)?.file).toBe("topics/installation.md");
    cleanup();
  });
});

describe("resolveLink — tie-break", () => {
  const dupVault: Record<string, string> = {
    "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
    "wiki/index.md": "---\ntitle: index\n---\n",
    "wiki/log.md": "---\ntitle: log\n---\n",
    "wiki/a/dup.md": "---\ntitle: Dup A\n---\nbody\n",
    "wiki/a/b/dup.md": "---\ntitle: Dup AB\n---\nbody\n",
  };

  test("shortest vault-relative path wins", () => {
    const { wiki, cleanup } = wikiOf(dupVault);
    const idx = buildLinkIndex(wiki);
    expect(resolveLink("dup", "", idx)?.file).toBe("a/dup.md");
    cleanup();
  });

  test("same folder as the source wins among equal-length paths", () => {
    const { wiki, cleanup } = wikiOf({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/x/dup.md": "---\ntitle: Dup X\n---\nbody\n",
      "wiki/y/dup.md": "---\ntitle: Dup Y\n---\nbody\n",
    });
    const idx = buildLinkIndex(wiki);
    expect(resolveLink("dup", "x/src.md", idx)?.file).toBe("x/dup.md");
    expect(resolveLink("dup", "y/src.md", idx)?.file).toBe("y/dup.md");
    cleanup();
  });

  test("alphabetical is the final fallback with no source context", () => {
    const { wiki, cleanup } = wikiOf({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/m/dup.md": "---\ntitle: Dup M\n---\nbody\n",
      "wiki/n/dup.md": "---\ntitle: Dup N\n---\nbody\n",
    });
    const idx = buildLinkIndex(wiki);
    expect(resolveLink("dup", "", idx)?.file).toBe("m/dup.md");
    cleanup();
  });
});

describe("resolvableNames", () => {
  test("includes basenames, aliases, and titles; excludes path-only forms", () => {
    const { wiki, cleanup } = wikiOf({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/how-it-works/installation.md":
        '---\ntitle: Installation\naliases: ["install", "setup"]\n---\nbody\n',
    });
    const idx = buildLinkIndex(wiki);
    const names = resolvableNames(idx);
    expect(names.has("installation")).toBe(true); // basename + title
    expect(names.has("install")).toBe(true); // alias
    expect(names.has("setup")).toBe(true); // alias
    // The path-only form is resolvable via the ladder but NOT a member of the
    // dangling membership set (ADR-0030 §2).
    expect(names.has("how-it-works/installation")).toBe(false);
    cleanup();
  });
});
