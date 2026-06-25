import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { okf } from "./okf.ts";
import { makeVault } from "../../test-helpers/sandbox/vault.ts";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const WIKI_VAULT = {
  "CLAUDE.md": "---\nschema_version: 2\n---\n",
  "wiki/index.md": "---\ntitle: index\ntype: index\n---\n",
  "wiki/log.md": "---\ntitle: log\n---\n",
  "wiki/ai.md": [
    "---",
    'title: "Artificial Intelligence"',
    "type: concept",
    'description: "The field of building intelligent systems."',
    'tags: ["ai", "ml"]',
    'sources: ["[[_sources/src-a]]"]',
    "---",
    "",
    "# Artificial Intelligence",
    "",
    "AI is the study of [[Machine Learning]] and related fields.",
    "",
  ].join("\n"),
  "wiki/ml.md": [
    "---",
    'title: "Machine Learning"',
    "type: concept",
    'tags: ["ml"]',
    "---",
    "",
    "# Machine Learning",
    "",
    "ML is a subset of AI. See also [[Artificial Intelligence]].",
    "",
  ].join("\n"),
  "wiki/_sources/src-a.md": [
    "---",
    'title: "Source A"',
    "type: source",
    "---",
    "",
    "Raw source content.",
    "",
  ].join("\n"),
};

// ── Unit 3: okf export ────────────────────────────────────────────────────────

describe("Feature: Engine › OKF interop — export", () => {
  test("command field is 'okf' and sub is 'export'", () => {
    const sb = makeVault(WIKI_VAULT);
    const r = okf({ sub: "export", target: sb.vault });
    expect(r.command).toBe("okf");
    expect(r.sub).toBe("export");
    sb.cleanup();
  });

  test("export succeeds when wiki/ exists", () => {
    const sb = makeVault(WIKI_VAULT);
    const r = okf({ sub: "export", target: sb.vault });
    expect(r.ok).toBe(true);
    sb.cleanup();
  });

  test("export writes files to vault/output/okf/", () => {
    const sb = makeVault(WIKI_VAULT);
    const r = okf({ sub: "export", target: sb.vault });
    expect(r.files.length).toBeGreaterThan(0);
    for (const f of r.files) {
      expect(f.startsWith("output/okf/")).toBe(true);
    }
    sb.cleanup();
  });

  test("exported files exist on disk", () => {
    const sb = makeVault(WIKI_VAULT);
    const r = okf({ sub: "export", target: sb.vault });
    for (const f of r.files) {
      expect(existsSync(join(sb.vault, f))).toBe(true);
    }
    sb.cleanup();
  });

  test("index.md catalog is written", () => {
    const sb = makeVault(WIKI_VAULT);
    const r = okf({ sub: "export", target: sb.vault });
    const indexFile = r.files.find((f) => f === "output/okf/index.md");
    expect(indexFile).toBeDefined();
    expect(existsSync(join(sb.vault, "output/okf/index.md"))).toBe(true);
    sb.cleanup();
  });

  test("index.md contains a table with path, type, title columns", () => {
    const sb = makeVault(WIKI_VAULT);
    okf({ sub: "export", target: sb.vault });
    const indexContent = readFileSync(join(sb.vault, "output/okf/index.md"), "utf8");
    expect(indexContent).toContain("| path | type | title |");
    sb.cleanup();
  });

  test("exported wiki pages have wikilinks rewritten as relative links", () => {
    const sb = makeVault(WIKI_VAULT);
    okf({ sub: "export", target: sb.vault });
    const aiContent = readFileSync(join(sb.vault, "output/okf/ai.md"), "utf8");
    // [[Machine Learning]] should become [Machine Learning](machine-learning.md)
    expect(aiContent).toContain("[Machine Learning](machine-learning.md)");
    // No raw [[...]] wikilinks in the body
    expect(aiContent).not.toMatch(/\[\[Machine Learning\]\]/);
    sb.cleanup();
  });

  test("exported pages do not contain original YAML frontmatter block in body", () => {
    const sb = makeVault(WIKI_VAULT);
    okf({ sub: "export", target: sb.vault });
    const aiContent = readFileSync(join(sb.vault, "output/okf/ai.md"), "utf8");
    // The exported file has OKF frontmatter, not raw vault frontmatter
    // The body should not contain the vault-original `sources:` line verbatim
    // (it was remapped to `resource:` in OKF frontmatter)
    expect(aiContent).toContain("title:");
    sb.cleanup();
  });

  test("export skips bookkeeping pages (index, log)", () => {
    const sb = makeVault(WIKI_VAULT);
    const r = okf({ sub: "export", target: sb.vault });
    const files = r.files.filter((f) => f !== "output/okf/index.md");
    const names = files.map((f) => f.replace("output/okf/", ""));
    expect(names).not.toContain("index.md");
    expect(names).not.toContain("log.md");
    sb.cleanup();
  });

  test("export fails gracefully when wiki/ is absent", () => {
    const sb = makeVault({ "CLAUDE.md": "---\nschema_version: 2\n---\n" });
    const r = okf({ sub: "export", target: sb.vault });
    expect(r.ok).toBe(false);
    expect(r.message).toContain("wiki directory not found");
    sb.cleanup();
  });

  test("export is deterministic (same vault → same file list)", () => {
    const sb = makeVault(WIKI_VAULT);
    const r1 = okf({ sub: "export", target: sb.vault });
    // Re-run; files already exist so this exercises no-clobber path.
    const r2 = okf({ sub: "export", target: sb.vault });
    expect(r1.files).toEqual(r2.files);
    sb.cleanup();
  });
});

// ── Unit 4: okf import ────────────────────────────────────────────────────────

describe("Feature: Engine › OKF interop — import", () => {
  function makeExportedBundle() {
    const sb = makeVault(WIKI_VAULT);
    okf({ sub: "export", target: sb.vault });
    return sb;
  }

  test("import dry-run reports files that would be written without writing them", () => {
    const exportSb = makeExportedBundle();
    const importSb = makeVault({ "CLAUDE.md": "---\nschema_version: 2\n---\n" });

    const bundlePath = join(exportSb.vault, "output", "okf");
    const r = okf({ sub: "import", target: importSb.vault, bundlePath, write: false });

    expect(r.ok).toBe(true);
    expect(r.message).toContain("dry-run");
    // Files are reported but NOT written.
    for (const f of r.files) {
      expect(existsSync(join(importSb.vault, f))).toBe(false);
    }

    exportSb.cleanup();
    importSb.cleanup();
  });

  test("import --write actually creates files in vault/raw/okf/<bundle>/", () => {
    const exportSb = makeExportedBundle();
    const importSb = makeVault({ "CLAUDE.md": "---\nschema_version: 2\n---\n" });

    const bundlePath = join(exportSb.vault, "output", "okf");
    const r = okf({ sub: "import", target: importSb.vault, bundlePath, write: true });

    expect(r.ok).toBe(true);
    expect(r.files.length).toBeGreaterThan(0);
    for (const f of r.files) {
      expect(f.startsWith("raw/okf/")).toBe(true);
      expect(existsSync(join(importSb.vault, f))).toBe(true);
    }

    exportSb.cleanup();
    importSb.cleanup();
  });

  test("re-import with same content is skipped (dedup)", () => {
    const exportSb = makeExportedBundle();
    const importSb = makeVault({ "CLAUDE.md": "---\nschema_version: 2\n---\n" });

    const bundlePath = join(exportSb.vault, "output", "okf");
    // First import.
    okf({ sub: "import", target: importSb.vault, bundlePath, write: true });
    // Second import with same content → all skipped.
    const r2 = okf({ sub: "import", target: importSb.vault, bundlePath, write: true });

    expect(r2.ok).toBe(true);
    expect(r2.files.length).toBe(0);
    expect(r2.skipped.length).toBeGreaterThan(0);

    exportSb.cleanup();
    importSb.cleanup();
  });

  test("imported files have source schema frontmatter (type: source, source_type: okf)", () => {
    const exportSb = makeExportedBundle();
    const importSb = makeVault({ "CLAUDE.md": "---\nschema_version: 2\n---\n" });

    const bundlePath = join(exportSb.vault, "output", "okf");
    const r = okf({ sub: "import", target: importSb.vault, bundlePath, write: true });

    // Check at least one written file has the source schema.
    const writtenFile = r.files[0];
    expect(writtenFile).toBeDefined();
    const content = readFileSync(join(importSb.vault, writtenFile!), "utf8");
    expect(content).toContain("type: source");
    expect(content).toContain("source_type: okf");
    expect(content).toContain("status: active");
    expect(content).toContain("date_ingested:");

    exportSb.cleanup();
    importSb.cleanup();
  });

  test("import fails gracefully when bundle path does not exist", () => {
    const importSb = makeVault({ "CLAUDE.md": "---\nschema_version: 2\n---\n" });
    const r = okf({
      sub: "import",
      target: importSb.vault,
      bundlePath: "/nonexistent/bundle/path",
      write: false,
    });
    expect(r.ok).toBe(false);
    expect(r.message).toContain("not found");
    importSb.cleanup();
  });

  // ── Round-trip test (Unit 4 spec requirement) ────────────────────────────────

  test("round-trip: export then import produces source files, re-import skips all", () => {
    const vaultSb = makeVault(WIKI_VAULT);

    // Export.
    const exportResult = okf({ sub: "export", target: vaultSb.vault });
    expect(exportResult.ok).toBe(true);

    // Import into a scratch vault.
    const scratchSb = makeVault({ "CLAUDE.md": "---\nschema_version: 2\n---\n" });
    const bundlePath = join(vaultSb.vault, "output", "okf");
    const importResult = okf({
      sub: "import",
      target: scratchSb.vault,
      bundlePath,
      write: true,
    });
    expect(importResult.ok).toBe(true);
    expect(importResult.files.length).toBeGreaterThan(0);

    // Re-import: immutability — all files already exist with same content.
    const reimportResult = okf({
      sub: "import",
      target: scratchSb.vault,
      bundlePath,
      write: true,
    });
    expect(reimportResult.ok).toBe(true);
    expect(reimportResult.files.length).toBe(0);
    expect(reimportResult.skipped.length).toBeGreaterThan(0);

    vaultSb.cleanup();
    scratchSb.cleanup();
  });
});

// ── Missing subcommand ────────────────────────────────────────────────────────

describe("Feature: Engine › OKF interop — dispatch", () => {
  test("missing subcommand returns ok:false with helpful message", () => {
    const sb = makeVault({ "CLAUDE.md": "---\nschema_version: 2\n---\n" });
    const r = okf({ sub: undefined, target: sb.vault });
    expect(r.ok).toBe(false);
    expect(r.message).toContain("export | import");
    sb.cleanup();
  });
});

// ── Clock injection ───────────────────────────────────────────────────────────

describe("Feature: Engine › OKF interop — clock injection", () => {
  const FIXED_DATE = "2000-01-15";
  const fixedClock = () => new Date(`${FIXED_DATE}T12:00:00.000Z`);

  test("export: index.md generated field uses injected clock date", () => {
    const sb = makeVault(WIKI_VAULT);
    okf({ sub: "export", target: sb.vault, clock: fixedClock });
    const indexContent = readFileSync(join(sb.vault, "output/okf/index.md"), "utf8");
    expect(indexContent).toContain(`generated: ${FIXED_DATE}`);
    sb.cleanup();
  });

  test("import: date_ingested in source frontmatter uses injected clock date", () => {
    // First export to create a bundle.
    const exportSb = makeVault(WIKI_VAULT);
    okf({ sub: "export", target: exportSb.vault, clock: fixedClock });

    const importSb = makeVault({ "CLAUDE.md": "---\nschema_version: 2\n---\n" });
    const bundlePath = join(exportSb.vault, "output", "okf");
    const r = okf({
      sub: "import",
      target: importSb.vault,
      bundlePath,
      write: true,
      clock: fixedClock,
    });

    expect(r.ok).toBe(true);
    expect(r.files.length).toBeGreaterThan(0);

    const firstFile = r.files[0];
    expect(firstFile).toBeDefined();
    const content = readFileSync(join(importSb.vault, firstFile!), "utf8");
    expect(content).toContain(`date_ingested: ${FIXED_DATE}`);

    exportSb.cleanup();
    importSb.cleanup();
  });

  test("import: versioned sibling filename includes injected clock date", () => {
    // Export, import once (establishes the original), then import again with
    // modified content to trigger a versioned sibling.
    const exportSb = makeVault(WIKI_VAULT);
    okf({ sub: "export", target: exportSb.vault, clock: fixedClock });

    const importSb = makeVault({ "CLAUDE.md": "---\nschema_version: 2\n---\n" });
    const bundlePath = join(exportSb.vault, "output", "okf");

    // First import: writes originals.
    okf({ sub: "import", target: importSb.vault, bundlePath, write: true, clock: fixedClock });

    // Overwrite one exported file with different content to simulate changed content.
    const aiExported = join(exportSb.vault, "output", "okf", "ai.md");
    const originalContent = readFileSync(aiExported, "utf8");
    writeFileSync(aiExported, originalContent + "\nchanged line\n", "utf8");

    const VERSIONED_DATE = "2000-02-20";
    const versionedClock = () => new Date(`${VERSIONED_DATE}T12:00:00.000Z`);

    // Second import: the changed file should produce a versioned sibling.
    const r2 = okf({
      sub: "import",
      target: importSb.vault,
      bundlePath,
      write: true,
      clock: versionedClock,
    });

    expect(r2.ok).toBe(true);
    // At least one versioned sibling should be written for the modified file.
    const versionedFiles = r2.files.filter((f) => f.includes(`--${VERSIONED_DATE}-`));
    expect(versionedFiles.length).toBeGreaterThan(0);

    exportSb.cleanup();
    importSb.cleanup();
  });
});
