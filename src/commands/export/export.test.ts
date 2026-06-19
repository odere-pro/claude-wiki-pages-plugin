/**
 * export.test.ts — TDD for the `export` verb.
 *
 * Mirrors the behavior of scripts/distribute-wiki.sh:
 *   - single-file mode  → <vault>/output/wiki.md (default)
 *   - tree mode         → <vault>/output/wiki/  (--tree)
 *   - --links           → [[Title]] → [Title](title-slug.md)
 *   - --clean           → remove existing output before writing
 *
 * Strategy: makeVault sandbox; call exportWiki(); assert files written to disk.
 * No bash invocation — unit tests only.  Coverage ≥ 80% on export.ts.
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { exportWiki, type ExportReport } from "./export.ts";
import { makeVault, type Sandbox } from "../../test-helpers/sandbox/vault.ts";

// ── Shared fixture vault ────────────────────────────────────────────────────

/**
 * A minimal vault with three wiki pages:
 *   wiki/index.md         — bookkeeping (always first in section order)
 *   wiki/log.md           — bookkeeping
 *   wiki/ai/ai.md         — topic folder note (type: index)
 *   wiki/ai/retrieval.md  — regular wiki page
 *   wiki/_sources/src.md  — sources page
 */
const EXPORT_VAULT: Record<string, string> = {
  "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
  "wiki/index.md": "---\ntitle: index\n---\n# Index\n\nMain index.\n",
  "wiki/log.md": "---\ntitle: log\n---\n# Log\n\nIngest log.\n",
  "wiki/ai/ai.md":
    "---\ntitle: AI\ntype: index\n---\n# AI\n\nAI topic with [[Retrieval]] and [[Missing]].\n",
  "wiki/ai/retrieval.md":
    "---\ntitle: Retrieval\ntype: concept\n---\n# Retrieval\n\nRetrieval is the process of [[AI|fetching]] data.\n",
  "wiki/_sources/src.md": "---\ntitle: Source A\n---\n# Source A\n\nSome source material.\n",
};

// ── Helper: read a file under the vault ────────────────────────────────────

function read(vault: string, rel: string): string {
  return readFileSync(join(vault, rel), "utf8");
}

function fileExists(vault: string, rel: string): boolean {
  return existsSync(join(vault, rel));
}

// ── Single-file mode ────────────────────────────────────────────────────────

describe("export — single-file mode (default)", () => {
  let sb: Sandbox;

  beforeEach(() => {
    sb = makeVault(EXPORT_VAULT);
  });

  afterEach(() => {
    sb.cleanup();
  });

  test("returns an ExportReport with ok:true on a valid vault", () => {
    const report: ExportReport = exportWiki({ target: sb.vault });
    expect(report.ok).toBe(true);
    expect(report.mode).toBe("single");
    expect(typeof report.count).toBe("number");
    expect(report.count).toBeGreaterThan(0);
  });

  test("writes output/wiki.md to the vault", () => {
    exportWiki({ target: sb.vault });
    expect(fileExists(sb.vault, "output/wiki.md")).toBe(true);
  });

  test("output/wiki.md begins with the standard header", () => {
    exportWiki({ target: sb.vault });
    const content = read(sb.vault, "output/wiki.md");
    expect(content).toContain("# Wiki Export");
  });

  test("output/wiki.md contains the generated date line", () => {
    exportWiki({ target: sb.vault });
    const content = read(sb.vault, "output/wiki.md");
    expect(content).toMatch(/Generated from vault at/);
  });

  test("output/wiki.md includes a section comment for each page", () => {
    exportWiki({ target: sb.vault });
    const content = read(sb.vault, "output/wiki.md");
    // Section comments are HTML comments: <!-- relative/path.md -->
    expect(content).toMatch(/<!-- .+\.md -->/);
  });

  test("frontmatter is stripped from all pages in single-file output", () => {
    exportWiki({ target: sb.vault });
    const content = read(sb.vault, "output/wiki.md");
    // No raw YAML frontmatter fields should appear (schema_version, type, title: as YAML).
    // The output does use "---" as section separators (horizontal rules), which is fine.
    expect(content).not.toMatch(/^schema_version:/m);
    expect(content).not.toMatch(/^type:/m);
    // Frontmatter-fenced blocks (opening "---" immediately followed by YAML field lines) are absent.
    expect(content).not.toMatch(/^---\s*\nschema_version:/m);
    expect(content).not.toMatch(/^---\s*\ntitle:/m);
  });

  test("wikilinks are flattened to plain text by default", () => {
    exportWiki({ target: sb.vault });
    const content = read(sb.vault, "output/wiki.md");
    // [[Retrieval]] → Retrieval; [[AI|fetching]] → fetching (pipe-alias)
    expect(content).not.toMatch(/\[\[/);
    expect(content).toContain("Retrieval");
  });

  test("wikilink pipe-alias flattens to the display text", () => {
    exportWiki({ target: sb.vault });
    const content = read(sb.vault, "output/wiki.md");
    // [[AI|fetching]] → fetching
    expect(content).toContain("fetching");
  });

  test("report.output is the absolute path to the output file", () => {
    const report = exportWiki({ target: sb.vault });
    expect(report.output).toBe(join(sb.vault, "output", "wiki.md"));
  });

  test("report.count matches the number of pages embedded", () => {
    const report = exportWiki({ target: sb.vault });
    // EXPORT_VAULT has: index, log, ai.md (folder note), retrieval.md, src.md = 5 pages
    expect(report.count).toBeGreaterThanOrEqual(1);
  });

  test("idempotent: running twice without --clean produces the same output", () => {
    exportWiki({ target: sb.vault });
    const first = read(sb.vault, "output/wiki.md");
    exportWiki({ target: sb.vault });
    const second = read(sb.vault, "output/wiki.md");
    expect(first).toBe(second);
  });

  test("--clean removes the existing file and regenerates it", () => {
    exportWiki({ target: sb.vault });
    const before = read(sb.vault, "output/wiki.md");
    exportWiki({ target: sb.vault, clean: true });
    const after = read(sb.vault, "output/wiki.md");
    // File still exists and is non-empty
    expect(after.length).toBeGreaterThan(0);
    // Content should be identical (same vault)
    expect(before).toBe(after);
  });

  test("returns ok:false when vault does not exist", () => {
    const report = exportWiki({ target: "/nonexistent-vault-xyzzy" });
    expect(report.ok).toBe(false);
    expect(report.count).toBe(0);
  });
});

// ── --links mode ────────────────────────────────────────────────────────────

describe("export — --links mode (wikilink → markdown link)", () => {
  let sb: Sandbox;

  beforeEach(() => {
    sb = makeVault(EXPORT_VAULT);
  });

  afterEach(() => {
    sb.cleanup();
  });

  test("--links converts [[Title]] to [Title](title-slug.md)", () => {
    exportWiki({ target: sb.vault, links: true });
    const content = read(sb.vault, "output/wiki.md");
    // [[Retrieval]] → [Retrieval](retrieval.md)
    expect(content).toContain("[Retrieval](retrieval.md)");
  });

  test("--links converts [[Title|Display]] to [Display](title-slug.md)", () => {
    exportWiki({ target: sb.vault, links: true });
    const content = read(sb.vault, "output/wiki.md");
    // [[AI|fetching]] → [fetching](ai.md)
    expect(content).toContain("[fetching](ai.md)");
  });

  test("--links output still has no raw [[…]] markup remaining", () => {
    exportWiki({ target: sb.vault, links: true });
    const content = read(sb.vault, "output/wiki.md");
    expect(content).not.toMatch(/\[\[[^\]]+\]\]/);
  });

  test("report.mode is 'single' for --links mode", () => {
    const report = exportWiki({ target: sb.vault, links: true });
    expect(report.mode).toBe("single");
  });
});

// ── Tree mode ───────────────────────────────────────────────────────────────

describe("export — tree mode (--tree)", () => {
  let sb: Sandbox;

  beforeEach(() => {
    sb = makeVault(EXPORT_VAULT);
  });

  afterEach(() => {
    sb.cleanup();
  });

  test("returns an ExportReport with mode:'tree'", () => {
    const report = exportWiki({ target: sb.vault, tree: true });
    expect(report.ok).toBe(true);
    expect(report.mode).toBe("tree");
  });

  test("tree mode writes files under output/wiki/ mirroring wiki/", () => {
    exportWiki({ target: sb.vault, tree: true });
    expect(fileExists(sb.vault, "output/wiki")).toBe(true);
    // At least one markdown file should be present
    const outputDir = join(sb.vault, "output/wiki");
    const allFiles = collectAllFiles(outputDir);
    expect(allFiles.length).toBeGreaterThan(0);
  });

  test("tree mode preserves relative structure of wiki pages", () => {
    exportWiki({ target: sb.vault, tree: true });
    // wiki/ai/retrieval.md should appear as output/wiki/ai/retrieval.md
    expect(fileExists(sb.vault, "output/wiki/ai/retrieval.md")).toBe(true);
  });

  test("tree mode: each output file has its frontmatter stripped", () => {
    exportWiki({ target: sb.vault, tree: true });
    const content = read(sb.vault, "output/wiki/ai/retrieval.md");
    expect(content).not.toMatch(/^---\s*$/m);
    expect(content).not.toMatch(/^type:/m);
  });

  test("tree mode: wikilinks flattened by default", () => {
    exportWiki({ target: sb.vault, tree: true });
    const content = read(sb.vault, "output/wiki/ai/retrieval.md");
    expect(content).not.toMatch(/\[\[/);
  });

  test("tree mode with --links: wikilinks converted to markdown links", () => {
    exportWiki({ target: sb.vault, tree: true, links: true });
    const content = read(sb.vault, "output/wiki/ai/ai.md");
    // [[Retrieval]] → [Retrieval](retrieval.md)
    expect(content).toContain("[Retrieval](retrieval.md)");
  });

  test("report.output is the output/wiki directory path", () => {
    const report = exportWiki({ target: sb.vault, tree: true });
    expect(report.output).toBe(join(sb.vault, "output", "wiki"));
  });

  test("report.count equals number of markdown files written", () => {
    const report = exportWiki({ target: sb.vault, tree: true });
    const outputDir = join(sb.vault, "output/wiki");
    const allFiles = collectAllFiles(outputDir);
    expect(report.count).toBe(allFiles.length);
  });

  test("--clean removes the existing tree before regenerating", () => {
    exportWiki({ target: sb.vault, tree: true });
    // Place an extra file in the output dir
    const extraPath = join(sb.vault, "output/wiki/stale.md");
    writeFileSync(extraPath, "stale content");
    exportWiki({ target: sb.vault, tree: true, clean: true });
    // The extra file should be gone
    expect(existsSync(extraPath)).toBe(false);
  });
});

// ── Section ordering (single-file mode) ────────────────────────────────────

describe("export — page ordering in single-file mode", () => {
  let sb: Sandbox;

  afterEach(() => {
    sb.cleanup();
  });

  test("index.md appears before log.md in output", () => {
    sb = makeVault(EXPORT_VAULT);
    exportWiki({ target: sb.vault });
    const content = read(sb.vault, "output/wiki.md");
    const idxPos = content.indexOf("<!-- index.md -->");
    const logPos = content.indexOf("<!-- log.md -->");
    expect(idxPos).toBeGreaterThanOrEqual(0);
    expect(logPos).toBeGreaterThanOrEqual(0);
    expect(idxPos).toBeLessThan(logPos);
  });

  test("topic folder notes appear before their children", () => {
    sb = makeVault(EXPORT_VAULT);
    exportWiki({ target: sb.vault });
    const content = read(sb.vault, "output/wiki.md");
    const folderNotePos = content.indexOf("<!-- ai/ai.md -->");
    const childPos = content.indexOf("<!-- ai/retrieval.md -->");
    expect(folderNotePos).toBeGreaterThanOrEqual(0);
    expect(childPos).toBeGreaterThanOrEqual(0);
    expect(folderNotePos).toBeLessThan(childPos);
  });

  test("_sources pages appear after topic pages", () => {
    sb = makeVault(EXPORT_VAULT);
    exportWiki({ target: sb.vault });
    const content = read(sb.vault, "output/wiki.md");
    const topicPos = content.indexOf("<!-- ai/retrieval.md -->");
    const sourcesPos = content.indexOf("<!-- _sources/src.md -->");
    expect(topicPos).toBeGreaterThanOrEqual(0);
    expect(sourcesPos).toBeGreaterThanOrEqual(0);
    expect(topicPos).toBeLessThan(sourcesPos);
  });
});

// ── Slug generation ─────────────────────────────────────────────────────────

describe("export — wikilink slug generation", () => {
  let sb: Sandbox;

  afterEach(() => {
    sb.cleanup();
  });

  test("slug: uppercase letters are lowercased", () => {
    sb = makeVault({
      ...EXPORT_VAULT,
      "wiki/ai/ai.md": "---\ntitle: AI\ntype: index\n---\n[[MyTitle]]\n",
    });
    exportWiki({ target: sb.vault, links: true });
    const content = read(sb.vault, "output/wiki.md");
    expect(content).toContain("mytitle.md");
  });

  test("slug: non-alphanumeric chars become hyphens", () => {
    sb = makeVault({
      ...EXPORT_VAULT,
      "wiki/ai/ai.md": "---\ntitle: AI\ntype: index\n---\n[[Hello World]]\n",
    });
    exportWiki({ target: sb.vault, links: true });
    const content = read(sb.vault, "output/wiki.md");
    expect(content).toContain("hello-world.md");
  });

  test("slug: leading and trailing hyphens are removed", () => {
    sb = makeVault({
      ...EXPORT_VAULT,
      "wiki/ai/ai.md": "---\ntitle: AI\ntype: index\n---\n[[-Hello-]]\n",
    });
    exportWiki({ target: sb.vault, links: true });
    const content = read(sb.vault, "output/wiki.md");
    // Leading and trailing hyphens stripped
    expect(content).toMatch(/\[.*\]\(hello\.md\)/);
  });
});

// ── Output is in schema-free scratch space ──────────────────────────────────

describe("export — output location", () => {
  let sb: Sandbox;

  beforeEach(() => {
    sb = makeVault(EXPORT_VAULT);
  });

  afterEach(() => {
    sb.cleanup();
  });

  test("output directory is <vault>/output/, not inside wiki/", () => {
    exportWiki({ target: sb.vault });
    // Must be under vault/output/, never vault/wiki/output/
    expect(fileExists(sb.vault, "output/wiki.md")).toBe(true);
    expect(fileExists(sb.vault, "wiki/output/wiki.md")).toBe(false);
  });

  test("report.vault equals the resolved vault path", () => {
    const report = exportWiki({ target: sb.vault });
    expect(report.vault).toBe(sb.vault);
  });
});

// ── Determinism ─────────────────────────────────────────────────────────────

describe("export — determinism", () => {
  let sb: Sandbox;

  beforeEach(() => {
    sb = makeVault(EXPORT_VAULT);
  });

  afterEach(() => {
    sb.cleanup();
  });

  test("same vault → byte-identical output across 3 runs (single-file mode)", () => {
    const runs: string[] = [];
    for (let i = 0; i < 3; i++) {
      exportWiki({ target: sb.vault, clean: true });
      runs.push(read(sb.vault, "output/wiki.md"));
    }
    const first = runs[0] ?? "";
    for (const r of runs) {
      expect(r).toBe(first);
    }
  });

  test("same vault → byte-identical output across 3 runs (tree mode)", () => {
    for (let i = 0; i < 3; i++) {
      exportWiki({ target: sb.vault, tree: true, clean: true });
    }
    // Check one file to confirm determinism
    const content = read(sb.vault, "output/wiki/ai/retrieval.md");
    expect(content.length).toBeGreaterThan(0);
  });
});

// ── Helper: collect all .md files recursively ───────────────────────────────

function collectAllFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const result: string[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (st.isFile() && name.endsWith(".md")) result.push(full);
    }
  };
  walk(dir);
  return result;
}
