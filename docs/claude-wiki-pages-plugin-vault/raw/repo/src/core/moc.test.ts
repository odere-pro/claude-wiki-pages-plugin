/**
 * H19 — unit tests for src/core/moc.ts
 *
 * Covers:
 *   - checkIndexConsistency: page in folder but missing from children → warn
 *   - checkIndexConsistency: child listed in index but no matching page → error
 *   - checkIndexConsistency: subfolder missing its own index file → error
 *   - checkIndexConsistency: consistent index has no findings
 *   - checkOrphanSources: source not cited by any wiki page → warn
 *   - checkOrphanSources: source cited by a wiki page → no finding
 *   - checkOrphanSources: no _sources/ directory → info finding
 *   - checkTopicFolders: top-level folder without index → error
 *   - checkTopicFolders: top-level folder with folder note → no error
 *   - checkLegacyIndexFilename: schema_version < 3 emits nothing
 *   - checkLegacyIndexFilename: schema_version 3 emits warn for _index.md files
 */

import { test, expect, describe, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkIndexConsistency,
  checkOrphanSources,
  checkTopicFolders,
  checkLegacyIndexFilename,
} from "./moc.ts";

let tmpDir: string;

function setup(): string {
  tmpDir = mkdtempSync(join(tmpdir(), "cwp-moc-"));
  return tmpDir;
}

function teardown(): void {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
}

function makeWiki(base: string): string {
  const wiki = join(base, "wiki");
  mkdirSync(join(wiki, "_sources"), { recursive: true });
  writeFileSync(join(wiki, "index.md"), "# Index\n");
  return wiki;
}

function writeFolderNote(dir: string, folderName: string, children: string[]): void {
  const childrenYaml =
    children.length > 0
      ? `children:\n${children.map((c) => `  - "[[${c}]]"`).join("\n")}`
      : "children: []";
  writeFileSync(
    join(dir, `${folderName}.md`),
    `---\ntitle: "${folderName}"\ntype: index\n${childrenYaml}\n---\n# ${folderName}\n`,
  );
}

function writeLegacyIndex(dir: string, children: string[]): void {
  const childrenYaml =
    children.length > 0
      ? `children:\n${children.map((c) => `  - "[[${c}]]"`).join("\n")}`
      : "children: []";
  writeFileSync(
    join(dir, "_index.md"),
    `---\ntitle: "index"\ntype: index\n${childrenYaml}\n---\n# Index\n`,
  );
}

function writePage(dir: string, filename: string, title: string, type = "entity"): void {
  writeFileSync(
    join(dir, filename),
    `---\ntitle: "${title}"\ntype: ${type}\nsources:\n  - "[[Source]]"\n---\n# ${title}\n`,
  );
}

// ── checkIndexConsistency ────────────────────────────────────────────────────

describe("checkIndexConsistency — warn: page in folder but not in children", () => {
  afterEach(teardown);

  test("emits warn when a page exists in the folder but is not in the children list", () => {
    const base = setup();
    const wiki = makeWiki(base);

    const topicDir = join(wiki, "ai");
    mkdirSync(topicDir);
    writeFolderNote(topicDir, "ai", ["Alpha"]); // only lists Alpha
    writePage(topicDir, "alpha.md", "Alpha");
    writePage(topicDir, "beta.md", "Beta"); // exists but not in children

    const findings = checkIndexConsistency(wiki);
    const warns = findings.filter((f) => f.check === "moc" && f.severity === "warn");
    expect(warns.some((w) => w.message.includes('"Beta"'))).toBe(true);
  });

  test("emits warn when children list is empty but pages exist in folder", () => {
    const base = setup();
    const wiki = makeWiki(base);

    const topicDir = join(wiki, "biology");
    mkdirSync(topicDir);
    writeFolderNote(topicDir, "biology", []); // empty children
    writePage(topicDir, "cell.md", "Cell");

    const findings = checkIndexConsistency(wiki);
    const warns = findings.filter((f) => f.check === "moc" && f.severity === "warn");
    expect(
      warns.some((w) => w.message.includes('"Cell"') && w.message.includes("empty children")),
    ).toBe(true);
  });
});

describe("checkIndexConsistency — error: child listed but no page exists", () => {
  afterEach(teardown);

  test("emits error when index lists a child that has no matching page", () => {
    const base = setup();
    const wiki = makeWiki(base);

    const topicDir = join(wiki, "physics");
    mkdirSync(topicDir);
    writeFolderNote(topicDir, "physics", ["Quantum", "Missing Page"]);
    writePage(topicDir, "quantum.md", "Quantum");
    // "Missing Page" does not exist on disk

    const findings = checkIndexConsistency(wiki);
    const errors = findings.filter((f) => f.check === "moc" && f.severity === "error");
    expect(errors.some((e) => e.message.includes('"Missing Page"'))).toBe(true);
  });

  test("emits error when children list is non-empty but folder has no pages", () => {
    const base = setup();
    const wiki = makeWiki(base);

    const topicDir = join(wiki, "chemistry");
    mkdirSync(topicDir);
    writeFolderNote(topicDir, "chemistry", ["Atom"]);
    // No actual pages

    const findings = checkIndexConsistency(wiki);
    const errors = findings.filter((f) => f.check === "moc" && f.severity === "error");
    expect(errors.some((e) => e.message.includes('"Atom"'))).toBe(true);
  });
});

describe("checkIndexConsistency — error: subfolder missing index", () => {
  afterEach(teardown);

  test("emits error when a subfolder has no folder note or _index.md", () => {
    const base = setup();
    const wiki = makeWiki(base);

    const topicDir = join(wiki, "science");
    const subDir = join(topicDir, "sub");
    mkdirSync(subDir, { recursive: true });
    writeFolderNote(topicDir, "science", []);
    writePage(subDir, "page.md", "Page");
    // No index in subDir

    const findings = checkIndexConsistency(wiki);
    const errors = findings.filter(
      (f) => f.check === "moc" && f.severity === "error" && f.message.includes("no index file"),
    );
    expect(errors.some((e) => e.message.includes("sub"))).toBe(true);
  });
});

describe("checkIndexConsistency — no findings for consistent index", () => {
  afterEach(teardown);

  test("returns no findings when index children match folder pages exactly", () => {
    const base = setup();
    const wiki = makeWiki(base);

    const topicDir = join(wiki, "math");
    mkdirSync(topicDir);
    writeFolderNote(topicDir, "math", ["Algebra", "Calculus"]);
    writePage(topicDir, "algebra.md", "Algebra");
    writePage(topicDir, "calculus.md", "Calculus");

    const findings = checkIndexConsistency(wiki);
    // No moc findings expected for this consistent topic
    const mocFindings = findings.filter(
      (f) => f.check === "moc" && (f.message.includes("Algebra") || f.message.includes("Calculus")),
    );
    expect(mocFindings).toHaveLength(0);
  });
});

// ── checkOrphanSources ────────────────────────────────────────────────────────

describe("checkOrphanSources", () => {
  afterEach(teardown);

  test("emits info when _sources/ directory does not exist", () => {
    const base = setup();
    const wiki = join(base, "wiki");
    mkdirSync(wiki);
    // No _sources/ directory

    const findings = checkOrphanSources(wiki);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("info");
    expect(findings[0]!.check).toBe("orphan-sources");
    expect(findings[0]!.message).toContain("No _sources/");
  });

  test("emits warn for a source not cited by any wiki page", () => {
    const base = setup();
    const wiki = makeWiki(base);

    const sourcesDir = join(wiki, "_sources");
    writeFileSync(
      join(sourcesDir, "orphan.md"),
      `---\ntitle: "Orphan Source"\ntype: source\n---\n# Orphan Source\n`,
    );
    // No wiki page references [[Orphan Source]]

    const findings = checkOrphanSources(wiki);
    const orphans = findings.filter((f) => f.check === "orphan-sources" && f.severity === "warn");
    expect(orphans).toHaveLength(1);
    expect(orphans[0]!.message).toContain("Orphan Source");
  });

  test("no warn when source is cited by a wiki page", () => {
    const base = setup();
    const wiki = makeWiki(base);

    const sourcesDir = join(wiki, "_sources");
    writeFileSync(
      join(sourcesDir, "cited.md"),
      `---\ntitle: "Cited Source"\ntype: source\n---\n# Cited Source\n`,
    );
    // Wiki page that cites [[Cited Source]]
    writeFileSync(
      join(wiki, "page.md"),
      `---\ntitle: "Page"\ntype: entity\nsources:\n  - "[[Cited Source]]"\n---\n# Page\n`,
    );

    const findings = checkOrphanSources(wiki);
    const orphans = findings.filter((f) => f.check === "orphan-sources" && f.severity === "warn");
    expect(orphans).toHaveLength(0);
  });

  test("manifest page (type: manifest) is not considered an orphan", () => {
    const base = setup();
    const wiki = makeWiki(base);

    const sourcesDir = join(wiki, "_sources");
    writeFileSync(
      join(sourcesDir, "manifest.md"),
      `---\ntitle: "Source Manifest"\ntype: manifest\n---\n# Source Manifest\n`,
    );
    // No page references the manifest

    const findings = checkOrphanSources(wiki);
    const orphans = findings.filter(
      (f) => f.check === "orphan-sources" && f.message.includes("Source Manifest"),
    );
    expect(orphans).toHaveLength(0);
  });
});

// ── checkTopicFolders ─────────────────────────────────────────────────────────

describe("checkTopicFolders", () => {
  afterEach(teardown);

  test("emits error for top-level topic folder without an index file", () => {
    const base = setup();
    const wiki = makeWiki(base);

    mkdirSync(join(wiki, "noindex"), { recursive: true });
    writePage(join(wiki, "noindex"), "page.md", "Page");
    // No folder note or _index.md for "noindex"

    const findings = checkTopicFolders(wiki);
    const errors = findings.filter((f) => f.check === "topic-folder" && f.severity === "error");
    expect(errors.some((e) => e.message.includes("noindex"))).toBe(true);
  });

  test("no error when top-level folder has a folder note (folderName.md)", () => {
    const base = setup();
    const wiki = makeWiki(base);

    const topicDir = join(wiki, "history");
    mkdirSync(topicDir);
    writeFolderNote(topicDir, "history", []);

    const findings = checkTopicFolders(wiki);
    expect(
      findings.filter((f) => f.check === "topic-folder" && f.message.includes("history")),
    ).toHaveLength(0);
  });

  test("no error when top-level folder has a legacy _index.md", () => {
    const base = setup();
    const wiki = makeWiki(base);

    const topicDir = join(wiki, "legacy");
    mkdirSync(topicDir);
    writeLegacyIndex(topicDir, []);

    const findings = checkTopicFolders(wiki);
    expect(
      findings.filter((f) => f.check === "topic-folder" && f.message.includes("legacy")),
    ).toHaveLength(0);
  });

  test("_sources and _synthesis folders are exempt", () => {
    const base = setup();
    const wiki = makeWiki(base);
    mkdirSync(join(wiki, "_synthesis"), { recursive: true });
    // Neither _sources/ nor _synthesis/ has a folder note

    const findings = checkTopicFolders(wiki);
    expect(
      findings.filter(
        (f) =>
          f.check === "topic-folder" &&
          (f.message.includes("_sources") || f.message.includes("_synthesis")),
      ),
    ).toHaveLength(0);
  });
});

// ── checkLegacyIndexFilename ──────────────────────────────────────────────────

describe("checkLegacyIndexFilename", () => {
  afterEach(teardown);

  test("returns empty array when schema_version < 3 (back-compat)", () => {
    const base = setup();
    const wiki = makeWiki(base);

    const topicDir = join(wiki, "topic");
    mkdirSync(topicDir);
    writeLegacyIndex(topicDir, []);

    writeFileSync(join(base, "CLAUDE.md"), "schema_version: 2\n");

    const findings = checkLegacyIndexFilename(base, wiki);
    expect(findings).toHaveLength(0);
  });

  test("returns empty array when CLAUDE.md has no schema_version", () => {
    const base = setup();
    const wiki = makeWiki(base);

    writeFileSync(join(base, "CLAUDE.md"), "# No version\n");

    const findings = checkLegacyIndexFilename(base, wiki);
    expect(findings).toHaveLength(0);
  });

  test("returns warn for each _index.md when schema_version >= 3", () => {
    const base = setup();
    const wiki = makeWiki(base);

    const topicDir = join(wiki, "legacy-topic");
    mkdirSync(topicDir);
    writeLegacyIndex(topicDir, []);

    writeFileSync(join(base, "CLAUDE.md"), "schema_version: 3\n");

    const findings = checkLegacyIndexFilename(base, wiki);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("warn");
    expect(findings[0]!.check).toBe("legacy-index-filename");
    expect(findings[0]!.message).toContain("legacy-index-filename");
    expect(findings[0]!.message).toContain("_index.md");
  });

  test("does not flag folder-note files (not named _index.md)", () => {
    const base = setup();
    const wiki = makeWiki(base);

    const topicDir = join(wiki, "modern-topic");
    mkdirSync(topicDir);
    writeFolderNote(topicDir, "modern-topic", []);

    writeFileSync(join(base, "CLAUDE.md"), "schema_version: 3\n");

    const findings = checkLegacyIndexFilename(base, wiki);
    expect(findings).toHaveLength(0);
  });
});
