/**
 * TDD — failing first (RED) for FU1: dangling-wikilink check.
 *
 * Tests `checkDanglingWikilinks(wiki: string): Finding[]` from ./wikilink-check.ts.
 *
 * Resolution model (ADR-0028 §2):
 *   A link [[T]] resolves iff, case-insensitively, the normalised target
 *   (stripped of "|alias" and "#heading"/"^block" anchor) equals the
 *   filename stem, the `title:` value, or an `aliases:` entry of some page.
 *   One Finding per (file, distinct-normalised-target). BOOKKEEPING pages are
 *   not scanned as subjects.
 */

import { test, expect, describe } from "bun:test";
import { makeVault } from "../test-helpers/sandbox/vault.ts";
import { checkDanglingWikilinks } from "./wikilink-check.ts";
import { join } from "node:path";

// ── Fixtures ──────────────────────────────────────────────────────────────────

/**
 * CLEAN_VAULT_WIKILINKS: every [[wikilink]] in every page resolves to a real
 * page. Should produce zero findings.
 */
const CLEAN_VAULT_WIKILINKS: Record<string, string> = {
  "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
  "wiki/index.md": "---\ntitle: index\n---\n- [[Real Page]]\n- [[Another Page]]\n",
  "wiki/log.md": "---\ntitle: log\n---\n",
  "wiki/topics/real-page.md":
    '---\ntitle: Real Page\naliases: ["real"]\n---\nSee [[Another Page]] for more.\n',
  "wiki/topics/another-page.md":
    '---\ntitle: Another Page\naliases: ["another"]\n---\nRefers back to [[Real Page]].\n',
};

/**
 * DIRTY_VAULT_WIKILINKS: one page contains a [[Target]] that resolves to no
 * page in wiki/. Should produce exactly one finding per distinct dangling target.
 */
const DIRTY_VAULT_WIKILINKS: Record<string, string> = {
  "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
  "wiki/index.md": "---\ntitle: index\n---\n- [[Real Page]]\n",
  "wiki/log.md": "---\ntitle: log\n---\n",
  "wiki/topics/real-page.md": "---\ntitle: Real Page\n---\nSee [[Nonexistent Target]] for more.\n",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("checkDanglingWikilinks", () => {
  test("clean vault with all resolved wikilinks yields zero findings", () => {
    const sb = makeVault(CLEAN_VAULT_WIKILINKS);
    const findings = checkDanglingWikilinks(join(sb.vault, "wiki"));
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });

  test("dangling [[Target]] yields severity:warn check:wikilink-dangling finding", () => {
    const sb = makeVault(DIRTY_VAULT_WIKILINKS);
    const findings = checkDanglingWikilinks(join(sb.vault, "wiki"));

    expect(findings.length).toBeGreaterThanOrEqual(1);
    const dangling = findings.filter((f) => f.check === "wikilink-dangling");
    expect(dangling.length).toBeGreaterThanOrEqual(1);
    expect(dangling[0]?.severity).toBe("warn");
    expect(dangling[0]?.message).toContain("Nonexistent Target");
    sb.cleanup();
  });

  test("one finding per (file, distinct-normalized-target) — repeated link counts once", () => {
    const files: Record<string, string> = {
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Real Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      // [[Ghost]] appears three times in one page → one finding
      "wiki/topics/real-page.md":
        "---\ntitle: Real Page\n---\nSee [[Ghost]] and [[Ghost]] and [[Ghost]].\n",
    };
    const sb = makeVault(files);
    const findings = checkDanglingWikilinks(join(sb.vault, "wiki"));
    const danglingForGhost = findings.filter(
      (f) => f.check === "wikilink-dangling" && f.message.includes("Ghost"),
    );
    expect(danglingForGhost).toHaveLength(1);
    sb.cleanup();
  });

  test("two distinct dangling targets in one page yield two findings", () => {
    const files: Record<string, string> = {
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Real Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/real-page.md":
        "---\ntitle: Real Page\n---\nSee [[Ghost One]] and [[Ghost Two]].\n",
    };
    const sb = makeVault(files);
    const findings = checkDanglingWikilinks(join(sb.vault, "wiki"));
    const dangling = findings.filter((f) => f.check === "wikilink-dangling");
    expect(dangling).toHaveLength(2);
    sb.cleanup();
  });

  test("resolution is case-insensitive: [[real page]] resolves to 'Real Page'", () => {
    const files: Record<string, string> = {
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Real Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/real-page.md":
        // lowercase link → must resolve to 'Real Page' by case-insensitive match
        "---\ntitle: Real Page\n---\nSee [[real page]] here.\n",
    };
    const sb = makeVault(files);
    const findings = checkDanglingWikilinks(join(sb.vault, "wiki"));
    expect(findings.filter((f) => f.check === "wikilink-dangling")).toHaveLength(0);
    sb.cleanup();
  });

  test("aliases are considered for resolution", () => {
    const files: Record<string, string> = {
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Real Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/real-page.md":
        '---\ntitle: Real Page\naliases: ["rp", "the real page"]\n---\nSee [[rp]] here.\n',
    };
    const sb = makeVault(files);
    const findings = checkDanglingWikilinks(join(sb.vault, "wiki"));
    expect(findings.filter((f) => f.check === "wikilink-dangling")).toHaveLength(0);
    sb.cleanup();
  });

  test("filename stem resolves without title field", () => {
    const files: Record<string, string> = {
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[some-topic]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      // no title: field; stem is "some-topic"
      "wiki/topics/some-topic.md": "---\n---\nPage with no title field.\n",
    };
    const sb = makeVault(files);
    const findings = checkDanglingWikilinks(join(sb.vault, "wiki"));
    expect(findings.filter((f) => f.check === "wikilink-dangling")).toHaveLength(0);
    sb.cleanup();
  });

  test("|alias suffix is stripped before resolution", () => {
    const files: Record<string, string> = {
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Real Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      // [[Real Page|display text]] → target is "Real Page"
      "wiki/topics/real-page.md":
        "---\ntitle: Real Page\n---\nSee [[Real Page|the real one]] here.\n",
    };
    const sb = makeVault(files);
    const findings = checkDanglingWikilinks(join(sb.vault, "wiki"));
    expect(findings.filter((f) => f.check === "wikilink-dangling")).toHaveLength(0);
    sb.cleanup();
  });

  test("escaped-pipe `\\|` in a table cell is not a dangling ghost", () => {
    const files: Record<string, string> = {
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Real Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/real-page.md": "---\ntitle: Real Page\n---\nbody\n",
      // Manifest-style table citation: `[[real-page\|Real Page]]` must resolve
      // to real-page.md, not dangle as the ghost `real-page\`.
      "wiki/_sources/manifest.md":
        "---\ntitle: manifest\n---\n| src | page |\n| --- | --- |\n| x | [[real-page\\|Real Page]] |\n",
    };
    const sb = makeVault(files);
    const findings = checkDanglingWikilinks(join(sb.vault, "wiki"));
    expect(findings.filter((f) => f.check === "wikilink-dangling")).toHaveLength(0);
    sb.cleanup();
  });

  test("#heading anchor is stripped before resolution", () => {
    const files: Record<string, string> = {
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Real Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      // [[Real Page#section]] → target is "Real Page"
      "wiki/topics/real-page.md": "---\ntitle: Real Page\n---\nSee [[Real Page#section]] here.\n",
    };
    const sb = makeVault(files);
    const findings = checkDanglingWikilinks(join(sb.vault, "wiki"));
    expect(findings.filter((f) => f.check === "wikilink-dangling")).toHaveLength(0);
    sb.cleanup();
  });

  test("^block anchor is stripped before resolution", () => {
    const files: Record<string, string> = {
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Real Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/real-page.md": "---\ntitle: Real Page\n---\nSee [[Real Page^blockref]] here.\n",
    };
    const sb = makeVault(files);
    const findings = checkDanglingWikilinks(join(sb.vault, "wiki"));
    expect(findings.filter((f) => f.check === "wikilink-dangling")).toHaveLength(0);
    sb.cleanup();
  });

  test("BOOKKEEPING pages are not scanned as link subjects", () => {
    // index.md and log.md contain dangling links — should produce zero findings
    // because they are bookkeeping pages (subjects are skipped).
    const files: Record<string, string> = {
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Ghost Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n[[Another Ghost]]\n",
    };
    const sb = makeVault(files);
    const findings = checkDanglingWikilinks(join(sb.vault, "wiki"));
    expect(findings.filter((f) => f.check === "wikilink-dangling")).toHaveLength(0);
    sb.cleanup();
  });

  test("frontmatter wikilinks in subjects are scanned (sources: field)", () => {
    // A page whose frontmatter sources: field contains a dangling [[link]] is
    // flagged. The dangling-source check covers only the body; here we verify
    // frontmatter links are also covered by the dangling-wikilink check.
    const files: Record<string, string> = {
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Topic Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/topic-page.md":
        '---\ntitle: Topic Page\nsources: ["[[Missing Source]]"]\n---\nbody\n',
    };
    const sb = makeVault(files);
    const findings = checkDanglingWikilinks(join(sb.vault, "wiki"));
    const dangling = findings.filter(
      (f) => f.check === "wikilink-dangling" && f.message.includes("Missing Source"),
    );
    expect(dangling.length).toBe(1);
    sb.cleanup();
  });

  test("finding includes the file path", () => {
    const sb = makeVault(DIRTY_VAULT_WIKILINKS);
    const findings = checkDanglingWikilinks(join(sb.vault, "wiki"));
    const dangling = findings.filter((f) => f.check === "wikilink-dangling");
    expect(dangling.length).toBeGreaterThanOrEqual(1);
    // Every dangling finding must carry a file reference.
    for (const f of dangling) {
      expect(f.file).toBeDefined();
      expect(f.file).toContain(".md");
    }
    sb.cleanup();
  });

  test("a [[link]] inside an inline code span is not flagged dangling", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Real Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/real-page.md":
        "---\ntitle: Real Page\n---\nWrite `[[Ghost In Code]]` to link a page.\n",
    });
    const findings = checkDanglingWikilinks(join(sb.vault, "wiki"));
    expect(findings.some((f) => f.message.includes("Ghost In Code"))).toBe(false);
    sb.cleanup();
  });

  test("a [[link]] inside a fenced code block is not flagged dangling", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Real Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/real-page.md":
        "---\ntitle: Real Page\n---\nExample:\n```\n[[Ghost In Fence]]\n```\n",
    });
    const findings = checkDanglingWikilinks(join(sb.vault, "wiki"));
    expect(findings.some((f) => f.message.includes("Ghost In Fence"))).toBe(false);
    sb.cleanup();
  });
});
