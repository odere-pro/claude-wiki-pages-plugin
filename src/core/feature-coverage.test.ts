import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseFeatureIndex,
  checkIndexFreshness,
  checkBatsTitles,
  checkTsDescribes,
  buildCoverage,
  checkCompleteness,
  checkFeatureCoverage,
} from "./feature-coverage.ts";
import type { FeatureIndexRow, Inventory } from "./feature-coverage.ts";

const REPO_ROOT = process.cwd();

function row(file: string, feature: string, documents: string[]): FeatureIndexRow {
  return { file, feature, layer: "L4", documents };
}

describe("Feature: Tests-as-documentation › index freshness", () => {
  test("a .bats file with no FEATURE INDEX row is an error", () => {
    const v = checkIndexFreshness([row("a.bats", "A", [])], ["a.bats", "b.bats"]);
    expect(v.some((x) => x.kind === "index-freshness" && x.message.includes("b.bats"))).toBe(true);
  });

  test("an INDEX row with no file on disk is an error", () => {
    const v = checkIndexFreshness([row("a.bats", "A", []), row("ghost.bats", "G", [])], ["a.bats"]);
    expect(v.some((x) => x.message.includes("ghost.bats"))).toBe(true);
  });

  test("a duplicate INDEX row is an error", () => {
    const v = checkIndexFreshness([row("a.bats", "A", []), row("a.bats", "A", [])], ["a.bats"]);
    expect(v.some((x) => x.message.includes("duplicate"))).toBe(true);
  });

  test("a matched file set produces no findings", () => {
    expect(checkIndexFreshness([row("a.bats", "A", [])], ["a.bats"])).toHaveLength(0);
  });
});

describe("Feature: Tests-as-documentation › bats title conformance", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "fc-bats-"));
    mkdirSync(join(dir, "tests", "scripts"), { recursive: true });
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test("a title not leading with the feature label is flagged", () => {
    writeFileSync(
      join(dir, "tests", "scripts", "foo.bats"),
      [
        '@test "Foo: does the right thing" {',
        "  true",
        "}",
        '@test "bar: legacy title" {',
        "  true",
        "}",
        "",
      ].join("\n"),
    );
    const v = checkBatsTitles(dir, [row("foo.bats", "Foo", [])]);
    expect(v).toHaveLength(1);
    expect(v[0]?.message).toContain("legacy title");
  });

  test("all-conforming titles produce no findings", () => {
    writeFileSync(
      join(dir, "tests", "scripts", "foo.bats"),
      ['@test "Foo: case one" {', "}", '@test "Foo: case two" {  # spec X1', "}", ""].join("\n"),
    );
    expect(checkBatsTitles(dir, [row("foo.bats", "Foo", [])])).toHaveLength(0);
  });
});

describe("Feature: Tests-as-documentation › TS describe conformance", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "fc-ts-"));
    mkdirSync(join(dir, "src", "core"), { recursive: true });
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test("a top-level describe without the Feature prefix is flagged; strings are harvested", () => {
    writeFileSync(
      join(dir, "src", "core", "x.test.ts"),
      [
        'describe("Feature: Verify › verify verb", () => {',
        "});",
        'describe("checkThing — bare symbol", () => {',
        "});",
        "",
      ].join("\n"),
    );
    const { violations, describeStrings } = checkTsDescribes(dir);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toContain("checkThing");
    expect(describeStrings).toContain("Feature: Verify › verify verb");
  });
});

describe("Feature: Tests-as-documentation › inventory completeness", () => {
  const inv: Inventory = {
    hooks: ["PreToolUse"],
    skills: ["ingest", "voice"],
    agents: ["ingest", "orchestrator"],
    commands: ["doctor", "wiki"],
    verbs: ["verify"],
  };

  test("an uncovered skill/agent/command is reported at the given severity", () => {
    const rows = [row("a.bats", "A", ["PreToolUse", "skill:ingest", "agent:ingest", "cmd:doctor"])];
    const describeStrings = ["Feature: Verify › verify verb"];
    const v = checkCompleteness(inv, rows, describeStrings, "warn");
    const messages = v.map((x) => x.message);
    expect(messages.some((m) => m.includes('skill "voice"'))).toBe(true);
    expect(messages.some((m) => m.includes('agent "orchestrator"'))).toBe(true);
    expect(messages.some((m) => m.includes('command "wiki"'))).toBe(true);
    expect(v.every((x) => x.severity === "warn")).toBe(true);
  });

  test("a fully covered inventory yields no completeness findings", () => {
    const rows = [
      row("a.bats", "A", [
        "PreToolUse",
        "skill:ingest",
        "skill:voice",
        "agent:ingest",
        "agent:orchestrator",
        "cmd:doctor",
        "cmd:wiki",
      ]),
    ];
    expect(checkCompleteness(inv, rows, ["Feature: Verify › verify verb"], "error")).toHaveLength(
      0,
    );
  });

  test("buildCoverage marks an engine verb covered when a describe names it", () => {
    const cov = buildCoverage([], ["Feature: Engine › backlog verb"], ["backlog"]);
    expect(cov.verbs.has("backlog")).toBe(true);
  });
});

describe("Feature: Tests-as-documentation › live repo contract", () => {
  test("the real suite has zero ERROR-severity violations (titles + index conform)", () => {
    const result = checkFeatureCoverage(REPO_ROOT);
    const errors = result.violations.filter((v) => v.severity === "error");
    expect(errors).toEqual([]);
    expect(result.errorCount).toBe(0);
  });

  test("with completeness enforced, every inventory feature has a documenting test", () => {
    const result = checkFeatureCoverage(REPO_ROOT, { completenessSeverity: "error" });
    expect(result.violations.filter((v) => v.severity === "error")).toEqual([]);
    expect(result.errorCount).toBe(0);
  });

  test("the FEATURE INDEX is set-equal to the real .bats files", () => {
    const rows = parseFeatureIndex(REPO_ROOT);
    expect(rows.length).toBeGreaterThan(0);
    const batsFiles = readdirSync(join(REPO_ROOT, "tests", "scripts")).filter((f) =>
      f.endsWith(".bats"),
    );
    expect(checkIndexFreshness(rows, batsFiles)).toHaveLength(0);
  });
});
