/**
 * H20 — unit tests for src/core/index-check.ts
 *
 * Covers:
 *   - checkIndex: missing index.md → error finding
 *   - checkIndex: duplicate entries in index.md → error finding
 *   - checkIndex: page missing from index.md → warn finding
 *   - checkIndex: _synthesis/ pages excluded from MOC membership check
 *   - checkIndex: unresolvable wikilinks in children/child_indexes are silently skipped
 *   - checkIndex: well-formed index with all pages → no findings
 *   - checkSourcesFormat: plain string in sources → error finding
 *   - checkSourcesFormat: [[wikilink]] in sources → no finding
 *   - checkSourcesFormat: empty sources → no finding
 *   - checkSourcesFormat: bookkeeping files are skipped
 */

import { test, expect, describe, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkIndex, checkSourcesFormat } from "./index-check.ts";

let tmpDir: string;

function setup(): string {
  tmpDir = mkdtempSync(join(tmpdir(), "cwp-index-check-"));
  return tmpDir;
}

function teardown(): void {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
}

function makeWiki(base: string): string {
  const wiki = join(base, "wiki");
  mkdirSync(join(wiki, "_sources"), { recursive: true });
  return wiki;
}

function writePage(wiki: string, filename: string, title: string, type = "entity"): void {
  writeFileSync(
    join(wiki, filename),
    `---\ntitle: "${title}"\ntype: ${type}\nsources:\n  - "[[Source A]]"\n---\n# ${title}\n`,
  );
}

function writeIndex(wiki: string, body: string): void {
  writeFileSync(
    join(wiki, "index.md"),
    `---\ntitle: "Index"\ntype: index\n---\n# Index\n\n${body}\n`,
  );
}

/**
 * Write the root index.md with a `children:` list — the hierarchical MOC
 * membership source (ADR-0031). `children` are piped-basename wikilinks the
 * reachability walk resolves; `body` is optional prose.
 */
function writeIndexWithChildren(wiki: string, children: readonly string[], body = ""): void {
  const childYaml =
    children.length === 0
      ? "children: []"
      : `children:\n${children.map((c) => `  - "${c}"`).join("\n")}`;
  writeFileSync(
    join(wiki, "index.md"),
    `---\ntitle: "Index"\ntype: index\n${childYaml}\n---\n# Index\n\n${body}\n`,
  );
}

// ── checkIndex ────────────────────────────────────────────────────────────────

describe("Feature: Verify › index consistency — missing index.md", () => {
  afterEach(teardown);

  test("returns error finding when index.md does not exist", () => {
    const base = setup();
    const wiki = makeWiki(base);
    // No index.md created

    const findings = checkIndex(wiki);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("error");
    expect(findings[0]!.check).toBe("index-duplicates");
    expect(findings[0]!.message).toContain("not found");
  });
});

describe("Feature: Verify › index consistency — duplicate entries", () => {
  afterEach(teardown);

  test("emits error for each duplicate wikilink in index.md", () => {
    const base = setup();
    const wiki = makeWiki(base);

    writePage(wiki, "alpha.md", "Alpha");
    writeIndex(wiki, "- [[Alpha]]\n- [[Alpha]]\n- [[Beta]]\n- [[Beta]]");
    writePage(wiki, "beta.md", "Beta");

    const findings = checkIndex(wiki);
    const errors = findings.filter((f) => f.check === "index-duplicates" && f.severity === "error");
    expect(errors.some((e) => e.message.includes('"Alpha"'))).toBe(true);
    expect(errors.some((e) => e.message.includes('"Beta"'))).toBe(true);
  });

  test("reports the count of duplicate appearances", () => {
    const base = setup();
    const wiki = makeWiki(base);

    writePage(wiki, "gamma.md", "Gamma");
    writeIndex(wiki, "- [[Gamma]]\n- [[Gamma]]\n- [[Gamma]]");

    const findings = checkIndex(wiki);
    const dup = findings.find(
      (f) => f.check === "index-duplicates" && f.message.includes('"Gamma"'),
    );
    expect(dup).toBeDefined();
    expect(dup!.message).toContain("3 times");
  });
});

describe("Feature: Verify › index consistency — page missing from MOC", () => {
  afterEach(teardown);

  test("emits warn when a non-bookkeeping page is not reachable from the MOC", () => {
    const base = setup();
    const wiki = makeWiki(base);

    writePage(wiki, "listed.md", "Listed Page");
    writePage(wiki, "unlisted.md", "Unlisted Page");
    // Only `listed` is in the root index's children; `unlisted` is unreachable.
    writeIndexWithChildren(wiki, ["[[listed|Listed Page]]"]);

    const findings = checkIndex(wiki);
    const warns = findings.filter((f) => f.check === "index-duplicates" && f.severity === "warn");
    expect(warns.some((w) => w.message.includes('"Unlisted Page"'))).toBe(true);
    // The page reachable via children is NOT flagged.
    expect(warns.some((w) => w.message.includes('"Listed Page"'))).toBe(false);
  });

  test("does not warn for bookkeeping files (index.md, log.md, _index.md)", () => {
    const base = setup();
    const wiki = makeWiki(base);

    writeIndex(wiki, "");
    writeFileSync(join(wiki, "log.md"), "# Log\n");

    const findings = checkIndex(wiki);
    const warns = findings.filter(
      (f) =>
        f.severity === "warn" &&
        (f.message.includes("index.md") ||
          f.message.includes("log.md") ||
          f.message.includes("_index.md")),
    );
    expect(warns).toHaveLength(0);
  });

  test("does not warn for pages under _synthesis/ (excluded like _sources/)", () => {
    // _synthesis/ pages are provenance aggregates, not topic MOC members.
    // The branch at index-check.ts line 107 must silently skip them.
    const base = setup();
    const wiki = makeWiki(base);

    mkdirSync(join(wiki, "_synthesis"), { recursive: true });
    writeFileSync(
      join(wiki, "_synthesis", "synth-a.md"),
      `---\ntitle: "Synthesis A"\ntype: synthesis\n---\n# Synthesis A\n`,
    );
    // Root index with no children — _synthesis/ page is unreachable from MOC.
    writeIndexWithChildren(wiki, []);

    const findings = checkIndex(wiki);
    const warns = findings.filter((f) => f.check === "index-duplicates" && f.severity === "warn");
    // _synthesis/ page must NOT produce a "not in MOC" warning.
    expect(warns.some((w) => w.message.includes("Synthesis A"))).toBe(false);
    expect(warns.some((w) => w.file?.includes("_synthesis"))).toBe(false);
  });

  test("silently ignores unresolvable wikilinks in children and child_indexes", () => {
    // resolveLink returns null when a target has no matching file in the index;
    // the if (r !== null) guard must skip it without throwing or emitting a finding.
    const base = setup();
    const wiki = makeWiki(base);

    writePage(wiki, "real.md", "Real Page");
    // Root index: children contains a dangling link + a valid one;
    // child_indexes contains a dangling link too.
    writeFileSync(
      join(wiki, "index.md"),
      `---\ntitle: "Index"\ntype: index\nchildren:\n  - "[[ghost-page|Ghost]]"\n  - "[[real|Real Page]]"\nchild_indexes:\n  - "[[no-such-folder]]"\n---\n# Index\n`,
    );

    // Must not throw; Real Page is covered; Ghost and no-such-folder have no file.
    const findings = checkIndex(wiki);
    const warns = findings.filter((f) => f.check === "index-duplicates" && f.severity === "warn");
    // "Real Page" is reachable — no warn for it.
    expect(warns.some((w) => w.message.includes('"Real Page"'))).toBe(false);
    // checkIndex returned without throwing; result is a plain array.
    expect(Array.isArray(findings)).toBe(true);
  });
});

describe("Feature: Verify › index consistency — well-formed index", () => {
  afterEach(teardown);

  test("returns no findings when all pages are reachable from the MOC children", () => {
    const base = setup();
    const wiki = makeWiki(base);

    writePage(wiki, "page-a.md", "Page A");
    writePage(wiki, "page-b.md", "Page B");
    // Both pages reachable via the root index's children (piped-basename links).
    writeIndexWithChildren(wiki, ["[[page-a|Page A]]", "[[page-b|Page B]]"]);

    const findings = checkIndex(wiki);
    // No errors (no duplicates, no missing pages)
    expect(findings.filter((f) => f.severity === "error")).toHaveLength(0);
    // No warns for Page A or Page B
    expect(
      findings.filter(
        (f) =>
          f.severity === "warn" && (f.message.includes("Page A") || f.message.includes("Page B")),
      ),
    ).toHaveLength(0);
  });

  test("reaches pages through nested folder notes via child_indexes", () => {
    const base = setup();
    const wiki = makeWiki(base);

    // A topic folder with its own folder note listing a child page.
    mkdirSync(join(wiki, "topic"), { recursive: true });
    writeFileSync(
      join(wiki, "topic", "topic.md"),
      `---\ntitle: "Topic"\ntype: index\nchildren:\n  - "[[deep-page|Deep Page]]"\n---\n# Topic\n`,
    );
    writeFileSync(
      join(wiki, "topic", "deep-page.md"),
      `---\ntitle: "Deep Page"\ntype: entity\nsources:\n  - "[[Source A]]"\n---\n# Deep Page\n`,
    );
    // Root index points at the folder note via child_indexes.
    writeFileSync(
      join(wiki, "index.md"),
      `---\ntitle: "Index"\ntype: index\nchildren: []\nchild_indexes:\n  - "[[topic|Topic]]"\n---\n# Index\n`,
    );

    const findings = checkIndex(wiki);
    const warns = findings.filter((f) => f.check === "index-duplicates" && f.severity === "warn");
    // Deep Page is reachable: index.md -> topic.md (child_indexes) -> deep-page (children).
    expect(warns.some((w) => w.message.includes("Deep Page"))).toBe(false);
  });
});

// ── checkSourcesFormat ────────────────────────────────────────────────────────

describe("Feature: Verify › index consistency — sources format: plain string in sources", () => {
  afterEach(teardown);

  test("emits error for plain string (non-wikilink) in sources field", () => {
    const base = setup();
    const wiki = makeWiki(base);
    writeIndex(wiki, "");

    writeFileSync(
      join(wiki, "plain.md"),
      `---\ntitle: "Plain Sources"\ntype: entity\nsources:\n  - "raw-string-not-a-wikilink"\n---\n# Plain Sources\n`,
    );

    const findings = checkSourcesFormat(wiki);
    const errors = findings.filter((f) => f.check === "sources-format" && f.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain("raw-string-not-a-wikilink");
  });

  test("emits error for each plain string entry, one per violation", () => {
    const base = setup();
    const wiki = makeWiki(base);
    writeIndex(wiki, "");

    writeFileSync(
      join(wiki, "multi-plain.md"),
      `---\ntitle: "Multi Plain"\ntype: entity\nsources:\n  - "entry-one"\n  - "[[wikilink-ok]]"\n  - "entry-two"\n---\n# Multi Plain\n`,
    );

    const findings = checkSourcesFormat(wiki);
    const errors = findings.filter((f) => f.check === "sources-format");
    expect(errors).toHaveLength(2);
    expect(errors.some((e) => e.message.includes("entry-one"))).toBe(true);
    expect(errors.some((e) => e.message.includes("entry-two"))).toBe(true);
  });
});

describe("Feature: Verify › index consistency — sources format: valid wikilinks", () => {
  afterEach(teardown);

  test("no error when all sources are [[wikilinks]]", () => {
    const base = setup();
    const wiki = makeWiki(base);
    writeIndex(wiki, "");

    writeFileSync(
      join(wiki, "valid.md"),
      `---\ntitle: "Valid Sources"\ntype: entity\nsources:\n  - "[[Source A]]"\n  - "[[Source B]]"\n---\n# Valid Sources\n`,
    );

    const findings = checkSourcesFormat(wiki);
    expect(findings.filter((f) => f.check === "sources-format")).toHaveLength(0);
  });

  test("no error when sources is an empty list", () => {
    const base = setup();
    const wiki = makeWiki(base);
    writeIndex(wiki, "");

    writeFileSync(
      join(wiki, "empty-sources.md"),
      `---\ntitle: "Empty Sources"\ntype: entity\nsources: []\n---\n# Empty Sources\n`,
    );

    const findings = checkSourcesFormat(wiki);
    expect(findings.filter((f) => f.check === "sources-format")).toHaveLength(0);
  });

  test("no error when sources field is absent", () => {
    const base = setup();
    const wiki = makeWiki(base);
    writeIndex(wiki, "");

    writeFileSync(
      join(wiki, "no-sources-field.md"),
      `---\ntitle: "No Sources Field"\ntype: index\n---\n# No Sources Field\n`,
    );

    const findings = checkSourcesFormat(wiki);
    expect(findings.filter((f) => f.check === "sources-format")).toHaveLength(0);
  });
});

describe("Feature: Verify › index consistency — sources format: bookkeeping files skipped", () => {
  afterEach(teardown);

  test("does not check bookkeeping files like index.md and log.md", () => {
    const base = setup();
    const wiki = makeWiki(base);

    // Write index.md and log.md with plain-string sources (should be skipped)
    writeFileSync(
      join(wiki, "index.md"),
      `---\ntitle: "Index"\ntype: index\nsources:\n  - "plain-string"\n---\n# Index\n`,
    );
    writeFileSync(
      join(wiki, "log.md"),
      `---\ntitle: "Log"\ntype: log\nsources:\n  - "another-plain"\n---\n# Log\n`,
    );

    const findings = checkSourcesFormat(wiki);
    // Bookkeeping files are skipped; no sources-format errors expected
    expect(
      findings.filter(
        (f) =>
          f.check === "sources-format" &&
          (f.file?.includes("index.md") || f.file?.includes("log.md")),
      ),
    ).toHaveLength(0);
  });
});
