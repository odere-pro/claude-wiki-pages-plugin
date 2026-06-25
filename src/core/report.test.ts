import { test, expect, describe } from "bun:test";
import { buildReport, exitCode, renderText, type Finding, type Report } from "./report.ts";

const err: Finding = { severity: "error", check: "schema", message: "no schema_version" };
const warn: Finding = { severity: "warn", check: "moc", message: "orphan source", file: "a.md" };
const info: Finding = { severity: "info", check: "sources", message: "no _sources/ dir" };

describe("Feature: Infrastructure › report model — build report", () => {
  test("counts errors and warnings, ignoring info", () => {
    const r = buildReport("verify", "/v", [err, warn, info]);
    expect(r.errors).toBe(1);
    expect(r.warnings).toBe(1);
    expect(r.findings.length).toBe(3);
  });

  test("is clean only when there are zero error-severity findings", () => {
    expect(buildReport("verify", "/v", [warn, info]).clean).toBe(true);
    expect(buildReport("verify", "/v", [err]).clean).toBe(false);
  });

  test("returns a frozen report with a frozen findings copy (immutability)", () => {
    const input: Finding[] = [warn];
    const r = buildReport("verify", "/v", input);
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.findings)).toBe(true);
    // Mutating the caller's array must not affect the report's snapshot.
    input.push(err);
    expect(r.findings.length).toBe(1);
  });

  test("carries command and vault through", () => {
    const r = buildReport("doctor", "/some/vault", []);
    expect(r.command).toBe("doctor");
    expect(r.vault).toBe("/some/vault");
    expect(r.clean).toBe(true);
  });
});

describe("Feature: Infrastructure › report model — exit code", () => {
  test("is 1 when any error is present", () => {
    expect(exitCode(buildReport("verify", "/v", [err]))).toBe(1);
  });

  test("is 0 when only warnings/info are present", () => {
    expect(exitCode(buildReport("verify", "/v", [warn, info]))).toBe(0);
  });
});

describe("Feature: Infrastructure › report model — render text", () => {
  test("tags each finding by severity and shows the check name", () => {
    const out = renderText(buildReport("verify", "/v", [err, warn, info]));
    expect(out).toContain("ERROR [schema] no schema_version");
    expect(out).toContain("WARN  [moc] orphan source");
    expect(out).toContain("INFO  [sources] no _sources/ dir");
  });

  test("does not echo the structured `file` field (parity with bash output)", () => {
    const out = renderText(buildReport("verify", "/v", [warn]));
    expect(out).not.toContain("a.md");
  });

  test("summarises counts and a pass verdict when clean", () => {
    const out = renderText(buildReport("verify", "/v", [warn]));
    expect(out).toContain("Errors:   0");
    expect(out).toContain("Warnings: 1");
    expect(out).toContain("OK: all checks passed");
  });

  test("shows a fail verdict when there are errors", () => {
    const out = renderText(buildReport("verify", "/v", [err]));
    expect(out).toContain("FAIL: fix errors before continuing");
  });
});

// ── U5: optional next? on Report ─────────────────────────────────────────────

describe("Feature: Infrastructure › report model — Report.next (U5)", () => {
  test("next is absent from buildReport output (buildReport does not set it)", () => {
    const r = buildReport("verify", "/v", [warn]);
    expect(r.next).toBeUndefined();
  });

  test("next survives JSON.stringify round-trip when set on an extended object", () => {
    const base = buildReport("verify", "/v", [warn]);
    // Commands that want next extend the frozen object by re-freezing a spread.
    const withNext: Report = Object.freeze({
      ...base,
      next: Object.freeze(["wiki/a.md", "wiki/b.md"]) as readonly string[],
    });
    const parsed = JSON.parse(JSON.stringify(withNext)) as { next?: string[] };
    expect(parsed.next).toEqual(["wiki/a.md", "wiki/b.md"]);
  });

  test("renderText output is byte-identical whether next is absent or set (gate-05 parity)", () => {
    const base = buildReport("verify", "/v", [warn]);
    const withNext: Report = Object.freeze({
      ...base,
      next: Object.freeze(["wiki/a.md"]) as readonly string[],
    });
    // renderText must NOT emit next — output must be identical.
    expect(renderText(base)).toBe(renderText(withNext));
  });

  test("renderText does not contain 'next' in its output", () => {
    const base = buildReport("verify", "/v", [warn]);
    const withNext: Report = Object.freeze({
      ...base,
      next: Object.freeze(["wiki/should-not-appear.md"]) as readonly string[],
    });
    const out = renderText(withNext);
    expect(out).not.toContain("next");
    expect(out).not.toContain("wiki/should-not-appear.md");
  });

  test("next is readonly string[] when present (type assertion)", () => {
    const base = buildReport("verify", "/v", []);
    const items: readonly string[] = Object.freeze(["wiki/x.md"]);
    const withNext: Report = Object.freeze({ ...base, next: items });
    // Type guard: if next exists it must be an array of strings.
    if (withNext.next !== undefined) {
      expect(withNext.next.every((s) => typeof s === "string")).toBe(true);
    }
  });
});
