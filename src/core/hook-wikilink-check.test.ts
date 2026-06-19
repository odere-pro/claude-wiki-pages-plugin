/**
 * TDD: hook-wikilink-check — the PreToolUse Write|Edit half of
 * scripts/check-wikilinks.sh (the stdin-JSON path), ported as a pure function.
 *
 * Distinct from the CLI half in markdown-link-check.ts: that one scans a whole
 * vault directory; this one operates over a *single changed file's* content +
 * path (the exact slice a PreToolUse hook sees on one Write/Edit) and returns
 * the broken/missing-wikilink Findings the hook would block on.
 *
 * Spec mirrored from scripts/check-wikilinks.sh hook mode (lines 50–143):
 *   1. Only wiki files (`.../<vault-name>/wiki/...`) are in scope.
 *   2. Write content + Edit new_string carrying `[text](file.md)` → a finding.
 *   3. Frontmatter and fenced code blocks are stripped before scanning.
 *   4. Non-wiki paths produce no findings (out of scope).
 *   5. Clean wiki content → no findings.
 *   6. The offending fragment is included in the message (U4 errors-that-teach).
 */

import { test, expect, describe } from "bun:test";
import {
  HOOK_WIKILINK_CHECK,
  isWikiFilePath,
  checkChangedWikilinks,
} from "./hook-wikilink-check.ts";

// ---------------------------------------------------------------------------
// isWikiFilePath — path gating (mirrors `*/${VAULT_NAME}/wiki/*` case)
// ---------------------------------------------------------------------------

describe("isWikiFilePath", () => {
  test("path under <vault>/wiki/ is in scope", () => {
    expect(isWikiFilePath("/home/u/docs/vault/wiki/concepts/page.md", "vault")).toBe(true);
  });

  test("nested path under wiki/ is in scope", () => {
    expect(isWikiFilePath("/a/b/myvault/wiki/topics/sub/deep.md", "myvault")).toBe(true);
  });

  test("path outside wiki/ is out of scope", () => {
    expect(isWikiFilePath("/home/u/docs/vault/raw/source.md", "vault")).toBe(false);
  });

  test("path in a different vault name is out of scope", () => {
    expect(isWikiFilePath("/home/u/docs/other/wiki/page.md", "vault")).toBe(false);
  });

  test("empty path is out of scope", () => {
    expect(isWikiFilePath("", "vault")).toBe(false);
  });

  test("vault root (no /wiki/ segment) is out of scope", () => {
    expect(isWikiFilePath("/home/u/docs/vault/CLAUDE.md", "vault")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkChangedWikilinks — the pure rule over one changed file
// ---------------------------------------------------------------------------

describe("checkChangedWikilinks — markdown-link rule", () => {
  test("wiki content with [text](file.md) → one error finding", () => {
    const findings = checkChangedWikilinks({
      filePath: "/p/vault/wiki/page.md",
      vaultName: "vault",
      content: "---\ntitle: Page\n---\n# Page\n\nSee [other](other.md).\n",
    });
    expect(findings).toHaveLength(1);
    const f = findings[0];
    expect(f).toBeDefined();
    if (f) {
      expect(f.severity).toBe("error");
      expect(f.check).toBe(HOOK_WIKILINK_CHECK);
      expect(f.check).toBe("md-links");
      expect(f.file).toBe("/p/vault/wiki/page.md");
    }
  });

  test("offending fragment is included in the message (errors-that-teach)", () => {
    const findings = checkChangedWikilinks({
      filePath: "/p/vault/wiki/frag.md",
      vaultName: "vault",
      content: "---\ntitle: Frag\n---\nRead [the guide](guide.md).\n",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("[the guide](guide.md)");
  });

  test("clean wiki content with [[wikilinks]] → no findings", () => {
    const findings = checkChangedWikilinks({
      filePath: "/p/vault/wiki/page.md",
      vaultName: "vault",
      content: "---\ntitle: Page\n---\n# Page\n\nSee [[Other Page]].\n",
    });
    expect(findings).toHaveLength(0);
  });

  test("markdown link inside a fenced code block is excluded", () => {
    const findings = checkChangedWikilinks({
      filePath: "/p/vault/wiki/code.md",
      vaultName: "vault",
      content: "---\ntitle: Code\n---\n# Code\n\n```\n[example](file.md)\n```\n\nText.\n",
    });
    expect(findings).toHaveLength(0);
  });

  test("markdown link only in frontmatter is excluded", () => {
    const findings = checkChangedWikilinks({
      filePath: "/p/vault/wiki/fm.md",
      vaultName: "vault",
      content: "---\ntitle: FM\ndescription: 'see [note](note.md)'\n---\n# FM\n\nClean body.\n",
    });
    expect(findings).toHaveLength(0);
  });

  test("non-wiki file path → no findings even with a violation", () => {
    const findings = checkChangedWikilinks({
      filePath: "/p/vault/raw/source.md",
      vaultName: "vault",
      content: "See [other](other.md).\n",
    });
    expect(findings).toHaveLength(0);
  });

  test("empty content → no findings", () => {
    const findings = checkChangedWikilinks({
      filePath: "/p/vault/wiki/page.md",
      vaultName: "vault",
      content: "",
    });
    expect(findings).toHaveLength(0);
  });

  test("Edit-style new_string fragment with a violation → finding", () => {
    // The hook's Edit path scans only the new_string; pass it as content.
    const findings = checkChangedWikilinks({
      filePath: "/p/vault/wiki/page.md",
      vaultName: "vault",
      content: "Added [link](dest.md) to the page.",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("[link](dest.md)");
  });

  test("carriage-return inside link text is still detected (dotAll regression anchor)", () => {
    const findings = checkChangedWikilinks({
      filePath: "/p/vault/wiki/page.md",
      vaultName: "vault",
      content: "---\ntitle: P\n---\n[the\rsample](page.md)\n",
    });
    expect(findings).toHaveLength(1);
  });

  test("never throws on malformed content", () => {
    expect(() =>
      checkChangedWikilinks({
        filePath: "/p/vault/wiki/page.md",
        vaultName: "vault",
        content: "---\nunterminated frontmatter\n[x](y.md)",
      }),
    ).not.toThrow();
  });
});
