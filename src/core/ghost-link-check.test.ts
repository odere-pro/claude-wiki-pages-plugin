/**
 * Tests for the ghost-wikilink check.
 *
 * A "ghost" is a link the plugin's index resolves but Obsidian does not: it
 * wins ONLY at the alias/title tier (never path/basename). These are the gray
 * floating nodes in the graph. The check must:
 *   - flag a bare link that resolves only via `title:`
 *   - flag a bare link that resolves only via `aliases:`
 *   - NOT flag a piped basename link (`[[slug|Display]]`)
 *   - NOT flag a basename or path link (the forms Obsidian resolves)
 *   - NOT flag a dangling link (resolves to nothing — the dangling check's job)
 *   - skip BOOKKEEPING pages (index/log/folder notes) as subjects
 */

import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { makeVault } from "../test-helpers/sandbox/vault.ts";
import { checkGhostLinks } from "./ghost-link-check.ts";

/** Frontmatter+body helper keeping the fixtures terse. */
function page(title: string, body: string, extra = ""): string {
  return `---\ntitle: ${title}\n${extra}---\n${body}\n`;
}

describe("checkGhostLinks", () => {
  test("flags a link that resolves only via title", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 3\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/aliased-page.md": page("Aliased Page", "Body."),
      "wiki/topics/linker.md": page("Linker", "See [[Aliased Page]] for details."),
    });
    try {
      const findings = checkGhostLinks(join(sb.vault, "wiki"));
      expect(findings).toHaveLength(1);
      expect(findings[0]?.check).toBe("wikilink-ghost");
      expect(findings[0]?.severity).toBe("warn");
      expect(findings[0]?.message).toContain("[[Aliased Page]]");
      expect(findings[0]?.message).toContain("title");
    } finally {
      sb.cleanup();
    }
  });

  test("flags a link that resolves only via an alias", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 3\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/target-two.md": page("Target Two", "Body.", 'aliases: ["Nick Name"]\n'),
      "wiki/topics/linker.md": page("Linker", "Refers to [[Nick Name]] here."),
    });
    try {
      const findings = checkGhostLinks(join(sb.vault, "wiki"));
      expect(findings).toHaveLength(1);
      expect(findings[0]?.message).toContain("alias");
    } finally {
      sb.cleanup();
    }
  });

  test("does NOT flag a piped basename link", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 3\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/aliased-page.md": page("Aliased Page", "Body."),
      "wiki/topics/linker.md": page("Linker", "See [[aliased-page|Aliased Page]]."),
    });
    try {
      expect(checkGhostLinks(join(sb.vault, "wiki"))).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("does NOT flag a bare basename link (Obsidian resolves it)", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 3\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/aliased-page.md": page("Aliased Page", "Body."),
      "wiki/topics/linker.md": page("Linker", "See [[aliased-page]]."),
    });
    try {
      expect(checkGhostLinks(join(sb.vault, "wiki"))).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("does NOT flag a dangling link (resolves to nothing)", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 3\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/linker.md": page("Linker", "See [[Does Not Exist]]."),
    });
    try {
      // A link resolving to nothing is dangling, not a ghost — out of scope here.
      expect(checkGhostLinks(join(sb.vault, "wiki"))).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("skips bookkeeping pages (index/log/folder notes) as subjects", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 3\n---\n",
      // The ghost link lives in index.md (bookkeeping) → not scanned as a subject.
      "wiki/index.md": "---\ntitle: index\n---\nSee [[Aliased Page]].",
      "wiki/topics/aliased-page.md": page("Aliased Page", "Body."),
    });
    try {
      expect(checkGhostLinks(join(sb.vault, "wiki"))).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });
});
