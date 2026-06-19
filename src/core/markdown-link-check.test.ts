/**
 * TDD: markdown-link-check — detect [text](file.md) links in wiki pages.
 *
 * Unit tests for `checkMarkdownLinks`:
 *   1. Clean page → no findings.
 *   2. Page with [text](file.md) → error finding.
 *   3. Markdown link in fenced code block → excluded (no finding).
 *   4. Markdown link in frontmatter → excluded (no finding; frontmatter stripped).
 *   5. Bookkeeping/folder-note files → skipped (not scanned).
 *   6. Non-.md files in wiki dir → ignored.
 *   7. Missing wiki/ dir → returns [] without throwing.
 *   8. Multiple violations → one finding per violating file.
 *   9. Integration: lint --check md-links on a sandbox vault.
 *  10. First offending fragment is included in the message.
 */

import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { makeVault, CLEAN_VAULT } from "../test-helpers/sandbox/vault.ts";
import { checkMarkdownLinks } from "./markdown-link-check.ts";
import { lint } from "../commands/lint/lint.ts";
import { exitCode } from "./report.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MdLinkVault {
  vault: string;
  cleanup: () => void;
}

/**
 * Build a minimal scratch vault (wiki/ only) with arbitrary per-file content.
 * The vault has a CLAUDE.md so resolveVault/lint can anchor to it.
 */
function makeWikiVault(files: Record<string, string>): MdLinkVault {
  const root = mkdtempSync(join(tmpdir(), "cwp-mdlink-test-"));
  const vault = join(root, "vault");
  mkdirSync(join(vault, "wiki"), { recursive: true });
  writeFileSync(join(vault, "CLAUDE.md"), "---\nschema_version: 1\n---\n# Vault\n");
  for (const [rel, content] of Object.entries(files)) {
    const full = join(vault, "wiki", rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  return { vault, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

// ---------------------------------------------------------------------------
// Unit: checkMarkdownLinks
// ---------------------------------------------------------------------------

describe("checkMarkdownLinks — unit", () => {
  test("clean wiki page returns no findings", () => {
    const v = makeWikiVault({
      "index.md": "---\ntitle: index\n---\n# Index\n\nSee [[Other Page]].\n",
      "page.md": "---\ntitle: Page\n---\n# Page\n\nSee [[Another]].\n",
    });
    const findings = checkMarkdownLinks(v.vault);
    expect(findings).toHaveLength(0);
    v.cleanup();
  });

  test("page with [text](file.md) produces an error finding", () => {
    const v = makeWikiVault({
      "index.md": "---\ntitle: index\n---\n# Index\n",
      "bad.md": "---\ntitle: Bad\n---\n# Bad\n\nSee [other](other.md).\n",
    });
    const findings = checkMarkdownLinks(v.vault);
    expect(findings.length).toBeGreaterThan(0);
    const f = findings[0];
    expect(f).toBeDefined();
    if (f) {
      expect(f.severity).toBe("error");
      expect(f.check).toBe("md-links");
      expect(f.message).toContain("[text](file.md)");
      expect(f.file).toContain("bad.md");
    }
    v.cleanup();
  });

  test("offending fragment is included in the finding message", () => {
    const v = makeWikiVault({
      "index.md": "---\ntitle: index\n---\n",
      "frag.md": "---\ntitle: Frag\n---\n# Frag\n\nRead [the guide](guide.md).\n",
    });
    const findings = checkMarkdownLinks(v.vault);
    expect(findings.length).toBeGreaterThan(0);
    const msg = findings[0]?.message ?? "";
    expect(msg).toContain("[the guide](guide.md)");
    v.cleanup();
  });

  test("markdown link inside fenced code block is excluded", () => {
    const v = makeWikiVault({
      "index.md": "---\ntitle: index\n---\n",
      "code.md": "---\ntitle: Code\n---\n# Code\n\n```\n[example](file.md)\n```\n\nNormal text.\n",
    });
    const findings = checkMarkdownLinks(v.vault);
    expect(findings).toHaveLength(0);
    v.cleanup();
  });

  test("markdown link in frontmatter is excluded (frontmatter stripped)", () => {
    const v = makeWikiVault({
      "index.md": "---\ntitle: index\n---\n",
      "fm.md": "---\ntitle: FM\ndescription: 'see [note](note.md)'\n---\n# FM\n\nNo links here.\n",
    });
    const findings = checkMarkdownLinks(v.vault);
    // frontmatter stripped → no finding
    expect(findings).toHaveLength(0);
    v.cleanup();
  });

  test("bookkeeping file (index.md stem) is not checked", () => {
    // The check skips bookkeeping files even when they contain md-links
    const v = makeWikiVault({
      "index.md": "---\ntitle: index\n---\n\nSee [old link](old.md).\n",
    });
    const findings = checkMarkdownLinks(v.vault);
    // index.md is a bookkeeping file — must be skipped
    expect(findings).toHaveLength(0);
    v.cleanup();
  });

  test("log.md bookkeeping file is not checked", () => {
    const v = makeWikiVault({
      "index.md": "---\ntitle: index\n---\n",
      "log.md": "---\ntitle: log\n---\n\nSee [old log entry](old.md).\n",
    });
    const findings = checkMarkdownLinks(v.vault);
    expect(findings).toHaveLength(0);
    v.cleanup();
  });

  test("folder note (stem == parent dir name + type: index) is skipped", () => {
    const v = makeWikiVault({
      "index.md": "---\ntitle: index\n---\n",
      "topics/topics.md": "---\ntitle: Topics\ntype: index\n---\n\nSee [old link](old.md).\n",
      "topics/real-page.md": "---\ntitle: Real Page\n---\n# Real\n",
    });
    const findings = checkMarkdownLinks(v.vault);
    // topics/topics.md is a folder note → skipped
    const topicsFindings = findings.filter((f) => f.file?.includes("topics.md"));
    expect(topicsFindings).toHaveLength(0);
    v.cleanup();
  });

  test("multiple files with violations → one finding per violating file", () => {
    const v = makeWikiVault({
      "index.md": "---\ntitle: index\n---\n",
      "a.md": "---\ntitle: A\n---\n# A\n\nSee [link-a](a.md).\n",
      "b.md": "---\ntitle: B\n---\n# B\n\nSee [link-b](b.md).\n",
      "c.md": "---\ntitle: C\n---\n# C\n\nNo links here.\n",
    });
    const findings = checkMarkdownLinks(v.vault);
    expect(findings).toHaveLength(2);
    const files = findings.map((f) => f.file ?? "");
    expect(files.some((f) => f.includes("a.md"))).toBe(true);
    expect(files.some((f) => f.includes("b.md"))).toBe(true);
    v.cleanup();
  });

  test("missing wiki/ dir returns empty findings without throwing", () => {
    const root = mkdtempSync(join(tmpdir(), "cwp-mdlink-empty-"));
    const vault = join(root, "vault");
    mkdirSync(vault, { recursive: true });
    writeFileSync(join(vault, "CLAUDE.md"), "---\nschema_version: 1\n---\n");
    // no wiki/ subdir
    expect(() => checkMarkdownLinks(vault)).not.toThrow();
    const findings = checkMarkdownLinks(vault);
    expect(findings).toHaveLength(0);
    rmSync(root, { recursive: true, force: true });
  });

  test("findings are sorted deterministically (file path order)", () => {
    const v = makeWikiVault({
      "index.md": "---\ntitle: index\n---\n",
      "z-page.md": "---\ntitle: Z\n---\n# Z\n\nSee [z link](z.md).\n",
      "a-page.md": "---\ntitle: A\n---\n# A\n\nSee [a link](a.md).\n",
    });
    const findings = checkMarkdownLinks(v.vault);
    expect(findings).toHaveLength(2);
    // sorted: a-page < z-page
    const paths = findings.map((f) => f.file ?? "");
    expect(paths[0]).toBeDefined();
    expect(paths[1]).toBeDefined();
    expect((paths[0] ?? "").localeCompare(paths[1] ?? "")).toBeLessThan(0);
    v.cleanup();
  });
});

// ---------------------------------------------------------------------------
// Integration: lint --check md-links
// ---------------------------------------------------------------------------

describe("lint --check md-links — integration", () => {
  test("clean vault → clean report (no md-link findings)", async () => {
    const sb = makeVault(CLEAN_VAULT);
    const report = await lint({ target: sb.vault, check: "md-links" });
    expect(report.command).toBe("lint");
    expect(report.errors).toBe(0);
    expect(report.clean).toBe(true);
    const mdFindings = report.findings.filter((f) => f.check === "md-links");
    expect(mdFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("vault with [text](file.md) link → error report (check md-links)", async () => {
    const sb = makeVault({
      ...CLEAN_VAULT,
      "wiki/bad-page.md": "---\ntitle: Bad Page\n---\n# Bad\n\nSee [other page](other.md).\n",
    });
    const report = await lint({ target: sb.vault, check: "md-links" });
    expect(report.errors).toBeGreaterThan(0);
    expect(report.clean).toBe(false);
    expect(exitCode(report)).toBe(1);
    const mdFindings = report.findings.filter((f) => f.check === "md-links");
    expect(mdFindings.length).toBeGreaterThan(0);
    sb.cleanup();
  });

  test("check=all includes md-links check findings", async () => {
    const sb = makeVault({
      ...CLEAN_VAULT,
      "wiki/bad-page.md": "---\ntitle: Bad\n---\n# Bad\n\nSee [link](x.md).\n",
    });
    const report = await lint({ target: sb.vault, check: "all" });
    const mdFindings = report.findings.filter((f) => f.check === "md-links");
    expect(mdFindings.length).toBeGreaterThan(0);
    sb.cleanup();
  });

  test("reference vault → 0 md-link findings (parity anchor)", async () => {
    const REFERENCE_VAULT = join(import.meta.dir, "../../tests/fixtures/reference-vault");
    const report = await lint({ target: REFERENCE_VAULT, check: "md-links" });
    const mdFindings = report.findings.filter((f) => f.check === "md-links");
    expect(mdFindings).toHaveLength(0);
    expect(report.errors).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CLI dispatch: lint --check md-links
// ---------------------------------------------------------------------------

const CLI = join(import.meta.dir, "../cli/cli.ts");

interface RunResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

function run(...args: string[]): RunResult {
  const proc = Bun.spawnSync(["bun", CLI, ...args], { stdout: "pipe", stderr: "pipe" });
  return {
    code: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

describe("lint --check md-links — CLI", () => {
  test("lint --check md-links --json on clean vault exits 0", () => {
    const sb = makeVault(CLEAN_VAULT);
    const r = run("lint", "--target", sb.vault, "--check", "md-links", "--json");
    expect(r.code).toBe(0);
    const report = JSON.parse(r.stdout);
    expect(report.command).toBe("lint");
    expect(report.clean).toBe(true);
    sb.cleanup();
  });

  test("lint --check md-links --json on dirty vault exits 1 with findings", () => {
    const sb = makeVault({
      ...CLEAN_VAULT,
      "wiki/dirty.md": "---\ntitle: Dirty\n---\n# Dirty\n\nSee [bad link](bad.md).\n",
    });
    const r = run("lint", "--target", sb.vault, "--check", "md-links", "--json");
    expect(r.code).toBe(1);
    const report = JSON.parse(r.stdout);
    expect(report.errors).toBeGreaterThan(0);
    const mdFindings = (report.findings as Array<{ check: string }>).filter(
      (f) => f.check === "md-links",
    );
    expect(mdFindings.length).toBeGreaterThan(0);
    sb.cleanup();
  });

  test("resolveLintCheck accepts 'md-links'", () => {
    // The resolveLintCheck function in lint.ts must know about the "md-links" check
    const r = run("lint", "--check", "md-links", "--json");
    // The call resolves without "Unknown command" even without --target
    expect(r.stderr).not.toContain("Unknown command");
  });
});
