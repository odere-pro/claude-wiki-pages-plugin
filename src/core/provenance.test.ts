/**
 * H18 — unit tests for src/core/provenance.ts
 *
 * Covers:
 *   - checkProvenance CHECK 5a: error when source-requiring type has no sources
 *   - checkProvenance CHECK 5a: no error when type is exempt (source / index / manifest / log)
 *   - checkProvenance CHECK 5b: warn when derived: true + confidence >= 0.8
 *   - checkProvenance CHECK 5b: no warn when derived: true + confidence < 0.8
 *   - checkProvenance CHECK 5b: no warn when derived: false
 *   - Skip _sources/ and _synthesis/ directories
 */

import { test, expect, describe, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkProvenance } from "./provenance.ts";

let tmpDir: string;

function setup(): string {
  tmpDir = mkdtempSync(join(tmpdir(), "cwp-provenance-"));
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

function writePage(
  wiki: string,
  filename: string,
  {
    title,
    type = "entity",
    sources = [],
    derived,
    confidence,
  }: {
    title: string;
    type?: string;
    sources?: string[];
    derived?: boolean | string;
    confidence?: number | string;
  },
): void {
  const sourcesYaml =
    sources.length > 0 ? `sources:\n${sources.map((s) => `  - "${s}"`).join("\n")}` : "sources: []";
  const derivedLine = derived !== undefined ? `derived: ${derived}` : "";
  const confidenceLine = confidence !== undefined ? `confidence: ${confidence}` : "";
  writeFileSync(
    join(wiki, filename),
    `---\ntitle: "${title}"\ntype: ${type}\n${sourcesYaml}\n${derivedLine}\n${confidenceLine}\n---\n# ${title}\n`,
  );
}

// ── CHECK 5a: source-presence ─────────────────────────────────────────────────

describe("checkProvenance CHECK 5a — source-presence", () => {
  afterEach(teardown);

  const SOURCE_REQUIRING = ["entity", "concept", "topic", "project", "synthesis"];

  for (const pageType of SOURCE_REQUIRING) {
    test(`error when type="${pageType}" has no sources`, () => {
      const base = setup();
      const wiki = makeWiki(base);
      writePage(wiki, `no-sources-${pageType}.md`, {
        title: `No Sources ${pageType}`,
        type: pageType,
      });

      const findings = checkProvenance(wiki);
      const errors = findings.filter(
        (f) => f.check === "provenance-completeness" && f.severity === "error",
      );
      expect(errors).toHaveLength(1);
      expect(errors[0]!.message).toContain("no-sources");
      expect(errors[0]!.message).toContain(pageType);
    });

    test(`no error when type="${pageType}" has at least one source`, () => {
      const base = setup();
      const wiki = makeWiki(base);
      writePage(wiki, `has-sources-${pageType}.md`, {
        title: `Has Sources ${pageType}`,
        type: pageType,
        sources: ["[[Some Source]]"],
      });

      const findings = checkProvenance(wiki);
      expect(findings.filter((f) => f.check === "provenance-completeness")).toHaveLength(0);
    });
  }

  const EXEMPT_TYPES = ["source", "index", "manifest", "log"];

  for (const pageType of EXEMPT_TYPES) {
    test(`no error when type="${pageType}" has no sources (exempt)`, () => {
      const base = setup();
      const wiki = makeWiki(base);
      writePage(wiki, `exempt-${pageType}.md`, {
        title: `Exempt ${pageType}`,
        type: pageType,
        sources: [],
      });

      const findings = checkProvenance(wiki);
      expect(findings.filter((f) => f.check === "provenance-completeness")).toHaveLength(0);
    });
  }

  test("no error when type is unknown/unclassified with no sources", () => {
    const base = setup();
    const wiki = makeWiki(base);
    // Custom type not in SOURCE_REQUIRING_TYPES
    writePage(wiki, "custom.md", { title: "Custom Page", type: "custom", sources: [] });

    const findings = checkProvenance(wiki);
    expect(findings.filter((f) => f.check === "provenance-completeness")).toHaveLength(0);
  });

  test("malformed-source entry still satisfies source-presence (avoid double-flag)", () => {
    // A page with a plain-string entry (malformed; CHECK 2's concern) should NOT fire CHECK 5a
    // because sources.length === 1, not 0.
    const base = setup();
    const wiki = makeWiki(base);
    writePage(wiki, "malformed.md", {
      title: "Malformed Sources Page",
      type: "entity",
      sources: ["plain-string-not-a-wikilink"],
    });

    const findings = checkProvenance(wiki);
    expect(findings.filter((f) => f.check === "provenance-completeness")).toHaveLength(0);
  });
});

// ── CHECK 5b: derived/confidence consistency ───────────────────────────────────

describe("checkProvenance CHECK 5b — derived/confidence consistency", () => {
  afterEach(teardown);

  test("warn when derived:true and confidence >= 0.8 (exact threshold)", () => {
    const base = setup();
    const wiki = makeWiki(base);
    writePage(wiki, "derived-high.md", {
      title: "Derived High Confidence",
      type: "entity",
      sources: ["[[Some Source]]"],
      derived: true,
      confidence: 0.8,
    });

    const findings = checkProvenance(wiki);
    const warns = findings.filter(
      (f) => f.check === "provenance-consistency" && f.severity === "warn",
    );
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("derived-high-confidence");
    expect(warns[0]!.message).toContain("0.8");
  });

  test("warn when derived:true and confidence > 0.8 (above threshold)", () => {
    const base = setup();
    const wiki = makeWiki(base);
    writePage(wiki, "derived-very-high.md", {
      title: "Derived Very High",
      type: "entity",
      sources: ["[[Source]]"],
      derived: true,
      confidence: 0.95,
    });

    const findings = checkProvenance(wiki);
    expect(findings.filter((f) => f.check === "provenance-consistency")).toHaveLength(1);
  });

  test("no warn when derived:true and confidence < 0.8 (below threshold)", () => {
    const base = setup();
    const wiki = makeWiki(base);
    writePage(wiki, "derived-low.md", {
      title: "Derived Low Confidence",
      type: "entity",
      sources: ["[[Source]]"],
      derived: true,
      confidence: 0.7,
    });

    const findings = checkProvenance(wiki);
    expect(findings.filter((f) => f.check === "provenance-consistency")).toHaveLength(0);
  });

  test("no warn when derived:false regardless of confidence", () => {
    const base = setup();
    const wiki = makeWiki(base);
    writePage(wiki, "not-derived.md", {
      title: "Not Derived",
      type: "entity",
      sources: ["[[Source]]"],
      derived: false,
      confidence: 0.9,
    });

    const findings = checkProvenance(wiki);
    expect(findings.filter((f) => f.check === "provenance-consistency")).toHaveLength(0);
  });

  test("no warn when derived:true but no confidence field", () => {
    const base = setup();
    const wiki = makeWiki(base);
    writePage(wiki, "derived-no-confidence.md", {
      title: "Derived No Confidence",
      type: "entity",
      sources: ["[[Source]]"],
      derived: true,
    });

    const findings = checkProvenance(wiki);
    expect(findings.filter((f) => f.check === "provenance-consistency")).toHaveLength(0);
  });

  test("accepts derived as string 'true' (yaml coercion)", () => {
    // yaml may produce the string "true" instead of boolean true
    const base = setup();
    const wiki = makeWiki(base);
    writePage(wiki, "derived-string.md", {
      title: "Derived String True",
      type: "entity",
      sources: ["[[Source]]"],
      derived: "true" as unknown as boolean,
      confidence: 0.9,
    });

    const findings = checkProvenance(wiki);
    expect(findings.filter((f) => f.check === "provenance-consistency")).toHaveLength(1);
  });

  test("accepts confidence as a string number", () => {
    const base = setup();
    const wiki = makeWiki(base);
    // Write the file manually to get string confidence
    writeFileSync(
      join(wiki, "string-confidence.md"),
      `---\ntitle: "String Confidence"\ntype: entity\nsources:\n  - "[[Source]]"\nderived: true\nconfidence: "0.85"\n---\n# String Confidence\n`,
    );

    const findings = checkProvenance(wiki);
    expect(findings.filter((f) => f.check === "provenance-consistency")).toHaveLength(1);
  });
});

// ── skip directories ──────────────────────────────────────────────────────────

describe("checkProvenance — skip directories", () => {
  afterEach(teardown);

  test("skips pages under _sources/ directory", () => {
    const base = setup();
    const wiki = makeWiki(base);
    // Write a page directly in _sources/ that would trigger CHECK 5a if not skipped
    writeFileSync(
      join(wiki, "_sources", "raw-source.md"),
      `---\ntitle: "Raw Source"\ntype: entity\nsources: []\n---\n# Raw Source\n`,
    );

    const findings = checkProvenance(wiki);
    expect(findings.filter((f) => f.check === "provenance-completeness")).toHaveLength(0);
  });

  test("skips pages under _synthesis/ directory", () => {
    const base = setup();
    const wiki = makeWiki(base);
    mkdirSync(join(wiki, "_synthesis"), { recursive: true });
    writeFileSync(
      join(wiki, "_synthesis", "synthesised.md"),
      `---\ntitle: "Synthesised"\ntype: synthesis\nsources: []\n---\n# Synthesised\n`,
    );

    const findings = checkProvenance(wiki);
    expect(findings.filter((f) => f.check === "provenance-completeness")).toHaveLength(0);
  });
});
