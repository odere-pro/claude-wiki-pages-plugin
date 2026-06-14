/**
 * H17/M21 — unit tests for src/core/staleness.ts
 *
 * Covers:
 *   - dateField: Date instance branch (M21 — yaml may parse YYYY-MM-DD as Date)
 *   - checkCitedSourceStaleness: happy-path (no findings when source is older)
 *   - checkCitedSourceStaleness: stale finding when source is newer than page
 *   - checkCitedSourceStaleness: dangling-source warning for unresolved wikilink
 *   - checkCitedSourceStaleness: skip when page has no `updated:` field
 *   - checkCitedSourceStaleness: skip source when source has no date fields
 */

import { test, expect, describe, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkCitedSourceStaleness } from "./staleness.ts";

let tmpDir: string;

function setup(): string {
  tmpDir = mkdtempSync(join(tmpdir(), "cwp-staleness-"));
  return tmpDir;
}

function teardown(): void {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
}

/**
 * Build a minimal wiki directory with a _sources/ subdir.
 * Returns { wiki, sourcesDir } paths for convenience.
 */
function makeWiki(base: string): { wiki: string; sourcesDir: string } {
  const wiki = join(base, "wiki");
  const sourcesDir = join(wiki, "_sources");
  mkdirSync(sourcesDir, { recursive: true });
  return { wiki, sourcesDir };
}

function writeSource(
  sourcesDir: string,
  filename: string,
  {
    title,
    updated = "",
    date_ingested = "",
    date_published = "",
  }: {
    title: string;
    updated?: string;
    date_ingested?: string;
    date_published?: string;
  },
): void {
  const dateLines = [
    updated ? `updated: ${updated}` : "",
    date_ingested ? `date_ingested: ${date_ingested}` : "",
    date_published ? `date_published: ${date_published}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  writeFileSync(
    join(sourcesDir, filename),
    `---\ntitle: "${title}"\ntype: source\n${dateLines}\n---\n# ${title}\n`,
  );
}

function writePage(
  wiki: string,
  filename: string,
  {
    title,
    updated = "",
    sources = [],
    type = "entity",
  }: {
    title: string;
    updated?: string;
    sources?: string[];
    type?: string;
  },
): void {
  const sourcesYaml =
    sources.length > 0 ? `sources:\n${sources.map((s) => `  - "${s}"`).join("\n")}` : "sources: []";
  const updatedLine = updated ? `updated: ${updated}` : "";
  writeFileSync(
    join(wiki, filename),
    `---\ntitle: "${title}"\ntype: ${type}\n${updatedLine}\n${sourcesYaml}\n---\n# ${title}\n`,
  );
}

// ── dateField Date-instance branch (M21) ──────────────────────────────────────

describe("dateField — Date instance from yaml parsing", () => {
  afterEach(teardown);

  test("source with yaml-parsed Date in updated field is handled without crash", () => {
    // The yaml library may parse `updated: 2024-01-15` as a Date object.
    // staleness.ts handles this via `v instanceof Date` branch in dateField().
    // We simulate this indirectly: write a valid ISO date string that frontmatter.ts
    // parses correctly, then verify staleness detection works end-to-end.
    const base = setup();
    const { wiki, sourcesDir } = makeWiki(base);

    // Source updated on 2024-03-01 (newer)
    writeSource(sourcesDir, "alpha.md", { title: "Alpha Source", updated: "2024-03-01" });
    // Page updated on 2024-01-01 (older than source)
    writePage(wiki, "my-page.md", {
      title: "My Page",
      updated: "2024-01-01",
      sources: ["[[Alpha Source]]"],
    });
    // Write a stub index.md so listMarkdownRecursive includes the wiki root
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    const findings = checkCitedSourceStaleness(wiki);
    const stale = findings.filter(
      (f) => f.check === "stale-source" && f.message.includes("stale-source"),
    );
    expect(stale.length).toBe(1);
    expect(stale[0]!.severity).toBe("warn");
    expect(stale[0]!.message).toContain("Alpha Source");
  });
});

// ── happy path ────────────────────────────────────────────────────────────────

describe("checkCitedSourceStaleness — happy path", () => {
  afterEach(teardown);

  test("no findings when source date is older than page updated", () => {
    const base = setup();
    const { wiki, sourcesDir } = makeWiki(base);

    writeSource(sourcesDir, "old-source.md", {
      title: "Old Source",
      updated: "2023-06-01",
    });
    writePage(wiki, "fresh-page.md", {
      title: "Fresh Page",
      updated: "2024-06-01",
      sources: ["[[Old Source]]"],
    });
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    const findings = checkCitedSourceStaleness(wiki);
    const stale = findings.filter((f) => f.check === "stale-source");
    expect(stale).toHaveLength(0);
  });

  test("no findings when source date equals page updated (not strictly newer)", () => {
    const base = setup();
    const { wiki, sourcesDir } = makeWiki(base);

    writeSource(sourcesDir, "same-date-source.md", {
      title: "Same Date Source",
      updated: "2024-05-01",
    });
    writePage(wiki, "page.md", {
      title: "Page",
      updated: "2024-05-01",
      sources: ["[[Same Date Source]]"],
    });
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    const findings = checkCitedSourceStaleness(wiki);
    expect(findings.filter((f) => f.check === "stale-source")).toHaveLength(0);
  });

  test("no findings when wiki has no pages at all", () => {
    const base = setup();
    const { wiki } = makeWiki(base);
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    const findings = checkCitedSourceStaleness(wiki);
    expect(findings).toHaveLength(0);
  });
});

// ── stale finding ─────────────────────────────────────────────────────────────

describe("checkCitedSourceStaleness — stale finding", () => {
  afterEach(teardown);

  test("emits warn finding when source updated is strictly newer than page", () => {
    const base = setup();
    const { wiki, sourcesDir } = makeWiki(base);

    writeSource(sourcesDir, "beta.md", {
      title: "Beta Source",
      updated: "2025-01-01",
    });
    writePage(wiki, "stale-page.md", {
      title: "Stale Page",
      updated: "2024-01-01",
      sources: ["[[Beta Source]]"],
    });
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    const findings = checkCitedSourceStaleness(wiki);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    const f = findings.find(
      (x) => x.check === "stale-source" && x.message.includes("stale-source"),
    );
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warn");
    expect(f!.message).toContain("Beta Source");
    expect(f!.message).toContain("2025-01-01");
    expect(f!.message).toContain("2024-01-01");
  });

  test("uses date_ingested as fallback when updated is absent on source", () => {
    const base = setup();
    const { wiki, sourcesDir } = makeWiki(base);

    writeSource(sourcesDir, "gamma.md", {
      title: "Gamma Source",
      date_ingested: "2025-03-01",
    });
    writePage(wiki, "older-page.md", {
      title: "Older Page",
      updated: "2024-03-01",
      sources: ["[[Gamma Source]]"],
    });
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    const findings = checkCitedSourceStaleness(wiki);
    const stale = findings.filter(
      (f) => f.check === "stale-source" && f.message.includes("stale-source"),
    );
    expect(stale).toHaveLength(1);
    expect(stale[0]!.message).toContain("2025-03-01");
  });

  test("uses date_published as last fallback when updated and date_ingested absent", () => {
    const base = setup();
    const { wiki, sourcesDir } = makeWiki(base);

    writeSource(sourcesDir, "delta.md", {
      title: "Delta Source",
      date_published: "2025-06-01",
    });
    writePage(wiki, "page2.md", {
      title: "Page Two",
      updated: "2024-06-01",
      sources: ["[[Delta Source]]"],
    });
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    const findings = checkCitedSourceStaleness(wiki);
    const stale = findings.filter(
      (f) => f.check === "stale-source" && f.message.includes("stale-source"),
    );
    expect(stale).toHaveLength(1);
    expect(stale[0]!.message).toContain("2025-06-01");
  });
});

// ── dangling source ───────────────────────────────────────────────────────────

describe("checkCitedSourceStaleness — dangling source", () => {
  afterEach(teardown);

  test("emits warn finding for unresolvable wikilink in sources", () => {
    const base = setup();
    const { wiki } = makeWiki(base);

    writePage(wiki, "citing-page.md", {
      title: "Citing Page",
      updated: "2024-06-01",
      sources: ["[[Nonexistent Source]]"],
    });
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    const findings = checkCitedSourceStaleness(wiki);
    const dangling = findings.filter(
      (f) => f.check === "stale-source" && f.message.includes("dangling-source"),
    );
    expect(dangling).toHaveLength(1);
    expect(dangling[0]!.severity).toBe("warn");
    expect(dangling[0]!.message).toContain("Nonexistent Source");
  });

  test("resolves source by alias when title does not match directly", () => {
    const base = setup();
    const { wiki, sourcesDir } = makeWiki(base);

    // Source with an alias
    writeFileSync(
      join(sourcesDir, "aliased.md"),
      `---\ntitle: "Full Title"\ntype: source\naliases:\n  - "Short Name"\nupdated: 2023-01-01\n---\n# Full Title\n`,
    );
    writePage(wiki, "using-alias.md", {
      title: "Using Alias",
      updated: "2024-01-01",
      sources: ["[[Short Name]]"],
    });
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    const findings = checkCitedSourceStaleness(wiki);
    // Should NOT be dangling — alias resolves
    expect(findings.filter((f) => f.message.includes("dangling-source"))).toHaveLength(0);
    // Should NOT be stale either (source older)
    expect(findings.filter((f) => f.message.includes("stale-source"))).toHaveLength(0);
  });
});

// ── skip conditions ───────────────────────────────────────────────────────────

describe("checkCitedSourceStaleness — skip conditions", () => {
  afterEach(teardown);

  test("skips page with no updated field", () => {
    const base = setup();
    const { wiki, sourcesDir } = makeWiki(base);

    writeSource(sourcesDir, "epsilon.md", { title: "Epsilon Source", updated: "2025-01-01" });
    // Page without updated field
    writeFileSync(
      join(wiki, "no-updated.md"),
      `---\ntitle: "No Updated Page"\ntype: entity\nsources:\n  - "[[Epsilon Source]]"\n---\n# No Updated Page\n`,
    );
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    const findings = checkCitedSourceStaleness(wiki);
    // Should emit nothing: no `updated` on the page → staleness cannot be evaluated
    expect(
      findings.filter((f) => f.check === "stale-source" && f.message.includes("No Updated Page")),
    ).toHaveLength(0);
  });

  test("skips source with no date fields at all", () => {
    const base = setup();
    const { wiki, sourcesDir } = makeWiki(base);

    // Source with no date fields
    writeFileSync(
      join(sourcesDir, "nodates.md"),
      `---\ntitle: "No Dates Source"\ntype: source\n---\n# No Dates Source\n`,
    );
    writePage(wiki, "page-citing-nodates.md", {
      title: "Page With No Dates Source",
      updated: "2024-01-01",
      sources: ["[[No Dates Source]]"],
    });
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    const findings = checkCitedSourceStaleness(wiki);
    // Cannot evaluate staleness without a source date
    expect(findings.filter((f) => f.message.includes("stale-source"))).toHaveLength(0);
    // Resolved cleanly — no dangling either
    expect(findings.filter((f) => f.message.includes("dangling-source"))).toHaveLength(0);
  });

  test("skips plain-string sources (not [[wikilinks]])", () => {
    const base = setup();
    const { wiki } = makeWiki(base);

    writePage(wiki, "plain-sources.md", {
      title: "Plain Sources Page",
      updated: "2024-01-01",
      sources: ["plain-string-entry"],
    });
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    // Plain string entries are CHECK 2's concern; staleness check ignores them
    const findings = checkCitedSourceStaleness(wiki);
    expect(findings.filter((f) => f.check === "stale-source")).toHaveLength(0);
  });
});
