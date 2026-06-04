import { test, expect, describe } from "bun:test";
import { buildReport, exitCode, renderText, type Finding } from "./report.ts";

const err: Finding = { severity: "error", check: "schema", message: "no schema_version" };
const warn: Finding = { severity: "warn", check: "moc", message: "orphan source", file: "a.md" };
const info: Finding = { severity: "info", check: "sources", message: "no _sources/ dir" };

describe("buildReport", () => {
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

describe("exitCode", () => {
  test("is 1 when any error is present", () => {
    expect(exitCode(buildReport("verify", "/v", [err]))).toBe(1);
  });

  test("is 0 when only warnings/info are present", () => {
    expect(exitCode(buildReport("verify", "/v", [warn, info]))).toBe(0);
  });
});

describe("renderText", () => {
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
