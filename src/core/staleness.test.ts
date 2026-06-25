/**
 * H17/M21 — unit tests for src/core/staleness.ts
 *
 * Covers:
 *   - dateField: Date instance branch (M21 — yaml may parse YYYY-MM-DD as Date)
 *   - dateField: invalid Date (NaN) returns "" — defensive guard
 *   - dateField: number value coerced to string
 *   - checkCitedSourceStaleness: happy-path (no findings when source is older)
 *   - checkCitedSourceStaleness: stale finding when source is newer than page
 *   - checkCitedSourceStaleness: dangling-source warning for unresolved wikilink
 *   - checkCitedSourceStaleness: skip when page has no `updated:` field
 *   - checkCitedSourceStaleness: skip source when source has no date fields
 *   - checkCitedSourceStaleness: piped wikilink [[target|display]] resolved by target part
 *   - checkCitedSourceStaleness: wikilink resolving to non-_sources wiki page is dangling
 */

import { test, expect, describe, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkCitedSourceStaleness, dateField } from "./staleness.ts";

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

// ── dateField unit tests (M21) ────────────────────────────────────────────────
// Direct unit tests for the dateField helper, which is exported so each
// branch can be asserted in isolation without a full vault round-trip.

describe("Feature: Verify › staleness check — dateField direct unit tests", () => {
  test("returns trimmed string when value is a plain string", () => {
    expect(dateField({ updated: "  2024-06-15  " }, "updated")).toBe("2024-06-15");
  });

  test("returns '' when key is absent", () => {
    expect(dateField({}, "updated")).toBe("");
  });

  test("returns '' when value is null", () => {
    expect(dateField({ updated: null }, "updated")).toBe("");
  });

  test("returns '' when value is undefined", () => {
    expect(dateField({ updated: undefined }, "updated")).toBe("");
  });

  test("returns ISO day string when value is a valid Date instance (M21 — yaml Date branch)", () => {
    // The yaml library parses an unquoted YYYY-MM-DD scalar as a Date object.
    // dateField must normalise it to the ISO day slice "YYYY-MM-DD".
    const d = new Date("2024-03-15T00:00:00.000Z");
    expect(dateField({ updated: d }, "updated")).toBe("2024-03-15");
  });

  test("returns '' when value is an invalid Date (NaN guard)", () => {
    // An invalid Date (NaN time) must not produce a nonsense string — the
    // Number.isNaN guard in dateField ensures we return "" instead of "Invalid Date".
    const bad = new Date("not-a-date");
    // Engine behaviour: dateField must return "" so invalid dates are silently
    // skipped rather than producing a non-empty, nonsense comparison string.
    expect(dateField({ updated: bad }, "updated")).toBe("");
    // Contrast: a valid Date must NOT return "", so the two branches are distinct.
    const good = new Date("2024-06-15T00:00:00.000Z");
    expect(dateField({ updated: good }, "updated")).toBe("2024-06-15");
  });

  test("returns string representation when value is a number (bare-year branch)", () => {
    // A bare YAML integer such as `updated: 2023` is parsed as the number 2023.
    expect(dateField({ updated: 2023 }, "updated")).toBe("2023");
  });
});

// ── dateField Date-instance branch (M21) ──────────────────────────────────────

describe("Feature: Verify › staleness check — dateField: Date instance from yaml parsing", () => {
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

describe("Feature: Verify › staleness check — happy path", () => {
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

describe("Feature: Verify › staleness check — stale finding", () => {
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

describe("Feature: Verify › staleness check — dangling source", () => {
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

// ── dateField number branch ───────────────────────────────────────────────────

describe("Feature: Verify › staleness check — dateField: number value in date field", () => {
  afterEach(teardown);

  test("source with a numeric updated field (e.g. bare year) is coerced to string", () => {
    // dateField handles `typeof v === "number"` by returning String(v).
    // A bare 4-digit year in YAML (e.g. `updated: 2023`) is parsed as a number.
    // The resulting string "2023" is lexicographically < "2024-01-01", so no stale
    // finding should be emitted (source "date" "2023" < page "2024-01-01").
    const base = setup();
    const { wiki, sourcesDir } = makeWiki(base);

    // Write source with numeric year — yaml parses this as a number (2023), not a string.
    writeFileSync(
      join(sourcesDir, "numeric-date.md"),
      `---\ntitle: "Numeric Date Source"\ntype: source\nupdated: 2023\n---\n# Numeric Date Source\n`,
    );
    writePage(wiki, "page-numeric.md", {
      title: "Page With Numeric Source",
      updated: "2024-01-01",
      sources: ["[[Numeric Date Source]]"],
    });
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    const findings = checkCitedSourceStaleness(wiki);
    // "2023" < "2024-01-01" lexicographically — source is not newer, so no stale finding.
    const stale = findings.filter(
      (f) => f.check === "stale-source" && f.message.includes("stale-source"),
    );
    expect(stale).toHaveLength(0);
    // No dangling either — source resolved
    expect(findings.filter((f) => f.message.includes("dangling-source"))).toHaveLength(0);
  });

  test("source with a numeric updated field newer than page triggers stale finding", () => {
    // "2026" > "2024-01-01" lexicographically — ensures the number branch leads to a stale hit.
    const base = setup();
    const { wiki, sourcesDir } = makeWiki(base);

    writeFileSync(
      join(sourcesDir, "future-numeric.md"),
      `---\ntitle: "Future Numeric Source"\ntype: source\nupdated: 2026\n---\n# Future Numeric Source\n`,
    );
    writePage(wiki, "page-future-numeric.md", {
      title: "Page Future Numeric",
      updated: "2024-01-01",
      sources: ["[[Future Numeric Source]]"],
    });
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    const findings = checkCitedSourceStaleness(wiki);
    const stale = findings.filter(
      (f) => f.check === "stale-source" && f.message.includes("stale-source"),
    );
    expect(stale.length).toBeGreaterThanOrEqual(1);
    expect(stale[0]!.message).toContain("Future Numeric Source");
  });
});

// ── piped wikilink format ─────────────────────────────────────────────────────

describe("Feature: Verify › staleness check — piped wikilink [[target|display]]", () => {
  afterEach(teardown);

  test("resolves [[target|display name]] by the target part, ignoring display text", () => {
    // stripWikilink + split("|")[0] extracts "target" from [[target|display name]].
    // This exercises the `.split("|")[0]?.trim()` branch in checkCitedSourceStaleness.
    const base = setup();
    const { wiki, sourcesDir } = makeWiki(base);

    writeSource(sourcesDir, "piped-source.md", {
      title: "Piped Source",
      updated: "2023-01-01",
    });
    writePage(wiki, "page-piped.md", {
      title: "Page With Piped Wikilink",
      updated: "2024-01-01",
      sources: ["[[Piped Source|Custom Display Name]]"],
    });
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    const findings = checkCitedSourceStaleness(wiki);
    // Source (2023) is older than page (2024) — no stale finding
    expect(findings.filter((f) => f.message.includes("stale-source"))).toHaveLength(0);
    // And it resolves — no dangling finding
    expect(findings.filter((f) => f.message.includes("dangling-source"))).toHaveLength(0);
  });

  test("piped wikilink to newer source emits stale finding with original target reference", () => {
    const base = setup();
    const { wiki, sourcesDir } = makeWiki(base);

    writeSource(sourcesDir, "piped-new.md", {
      title: "Piped New Source",
      updated: "2025-06-01",
    });
    writePage(wiki, "page-piped-stale.md", {
      title: "Stale Piped Page",
      updated: "2024-01-01",
      sources: ["[[Piped New Source|See Also: Piped New Source]]"],
    });
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    const findings = checkCitedSourceStaleness(wiki);
    const stale = findings.filter(
      (f) => f.check === "stale-source" && f.message.includes("stale-source"),
    );
    expect(stale).toHaveLength(1);
    expect(stale[0]!.message).toContain("2025-06-01");
    expect(stale[0]!.message).toContain("2024-01-01");
  });
});

// ── resolved-to-non-sources wiki page ────────────────────────────────────────

describe("Feature: Verify › staleness check — wikilink resolves to non-_sources page", () => {
  afterEach(teardown);

  test("wikilink resolving to a regular wiki page (not in _sources/) is treated as dangling", () => {
    // resolveLink may succeed (file exists in wiki/), but sourceFmByRel will not
    // have an entry for it because the pre-parse loop filters to _sources/ only.
    // The srcFm===null branch fires and emits a dangling-source finding.
    const base = setup();
    const { wiki } = makeWiki(base);

    // A regular wiki page (not in _sources/)
    writePage(wiki, "not-a-source.md", {
      title: "Not A Source",
      updated: "2025-01-01",
      type: "entity",
    });
    // Another page citing it as if it were a source
    writePage(wiki, "citing-non-source.md", {
      title: "Citing Non Source",
      updated: "2024-01-01",
      sources: ["[[Not A Source]]"],
    });
    writeFileSync(join(wiki, "index.md"), "# Index\n");

    const findings = checkCitedSourceStaleness(wiki);
    // The link resolves in the wiki index, but NOT to a _sources/ page,
    // so srcFm is null → dangling-source finding.
    const dangling = findings.filter(
      (f) => f.check === "stale-source" && f.message.includes("dangling-source"),
    );
    expect(dangling).toHaveLength(1);
    expect(dangling[0]!.message).toContain("Not A Source");
  });
});

// ── skip conditions ───────────────────────────────────────────────────────────

describe("Feature: Verify › staleness check — skip conditions", () => {
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
