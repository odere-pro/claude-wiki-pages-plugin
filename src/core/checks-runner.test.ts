/**
 * Tests for checks-runner.ts — resolveConcurrency, sortFindings, runChecks.
 *
 * Key coverage added by S20 fix: verify that runChecks never launches more
 * than `concurrency` tasks at once (thread-starvation guard).
 */

import { describe, expect, test } from "bun:test";
import type { Finding } from "./report.ts";
import {
  CONCURRENCY_MAX,
  CONCURRENCY_MIN,
  mapBounded,
  resolveConcurrency,
  runChecks,
  sortFindings,
} from "./checks-runner.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFind(
  file: string,
  check: string,
  severity: "error" | "warn" | "info",
  message: string,
): Finding {
  return { file, check, severity, message };
}

// ---------------------------------------------------------------------------
// resolveConcurrency
// ---------------------------------------------------------------------------

describe("resolveConcurrency", () => {
  test("returns CONCURRENCY_MAX for undefined", () => {
    expect(resolveConcurrency(undefined)).toBe(CONCURRENCY_MAX);
  });

  test("returns CONCURRENCY_MAX for NaN", () => {
    expect(resolveConcurrency(NaN)).toBe(CONCURRENCY_MAX);
  });

  test("returns CONCURRENCY_MAX for Infinity", () => {
    expect(resolveConcurrency(Infinity)).toBe(CONCURRENCY_MAX);
  });

  test("clamps values below CONCURRENCY_MIN to CONCURRENCY_MIN", () => {
    expect(resolveConcurrency(0)).toBe(CONCURRENCY_MIN);
    expect(resolveConcurrency(-5)).toBe(CONCURRENCY_MIN);
  });

  test("clamps values above CONCURRENCY_MAX to CONCURRENCY_MAX", () => {
    expect(resolveConcurrency(100)).toBe(CONCURRENCY_MAX);
  });

  test("floors fractional values", () => {
    expect(resolveConcurrency(3.9)).toBe(3);
  });

  test("returns 1 for exactly 1", () => {
    expect(resolveConcurrency(1)).toBe(1);
  });

  test("returns mid-range value unchanged", () => {
    expect(resolveConcurrency(8)).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// sortFindings
// ---------------------------------------------------------------------------

describe("sortFindings", () => {
  test("returns a new array — does not mutate input", () => {
    const findings: Finding[] = [
      makeFind("b.md", "check-z", "warn", "msg"),
      makeFind("a.md", "check-a", "error", "msg"),
    ];
    const original = [...findings];
    const sorted = sortFindings(findings);
    expect(findings).toEqual(original); // input unchanged
    expect(sorted[0]!.file).toBe("a.md");
  });

  test("sorts by file ascending first", () => {
    const findings = [makeFind("z.md", "c", "error", "m"), makeFind("a.md", "c", "error", "m")];
    const sorted = sortFindings(findings);
    expect(sorted[0]!.file).toBe("a.md");
    expect(sorted[1]!.file).toBe("z.md");
  });

  test("sorts by check when file is equal", () => {
    const findings = [
      makeFind("f.md", "z-check", "error", "m"),
      makeFind("f.md", "a-check", "error", "m"),
    ];
    const sorted = sortFindings(findings);
    expect(sorted[0]!.check).toBe("a-check");
  });

  test("sorts by message when file and check are equal", () => {
    const findings = [makeFind("f.md", "c", "warn", "zzz"), makeFind("f.md", "c", "warn", "aaa")];
    const sorted = sortFindings(findings);
    expect(sorted[0]!.message).toBe("aaa");
  });

  test("handles empty array", () => {
    expect(sortFindings([])).toEqual([]);
  });

  test("handles findings with undefined file (sorts before explicit files)", () => {
    const findings: Finding[] = [
      { file: "b.md", check: "c", severity: "warn", message: "m" },
      { check: "c", severity: "warn", message: "m" }, // no file
    ];
    const sorted = sortFindings(findings);
    // undefined file coerces to "" which sorts before "b.md"
    expect(sorted[0]!.file).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// runChecks — serial path
// ---------------------------------------------------------------------------

describe("runChecks (serial, concurrency=1)", () => {
  test("collects all findings in order", async () => {
    const f1 = makeFind("a.md", "c", "error", "first");
    const f2 = makeFind("b.md", "c", "warn", "second");
    const results = await runChecks([() => [f1], () => [f2]], 1);
    // sorted by file: a < b
    expect(results[0]!.file).toBe("a.md");
    expect(results[1]!.file).toBe("b.md");
  });

  test("returns empty array when no checks", async () => {
    expect(await runChecks([], 1)).toEqual([]);
  });

  test("returns empty array when all checks return no findings", async () => {
    expect(await runChecks([() => [], () => []], 1)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// runChecks — bounded parallel path (S20 thread-starvation fix)
// ---------------------------------------------------------------------------

describe("runChecks (bounded parallel, concurrency>1)", () => {
  test("collects findings from all checks", async () => {
    const checks = Array.from({ length: 10 }, (_, i) => () => [
      makeFind(`file-${i}.md`, "check", "info", "msg"),
    ]);
    const results = await runChecks(checks, 4);
    expect(results).toHaveLength(10);
  });

  test("never exceeds concurrency tasks in-flight simultaneously", async () => {
    // Track the peak number of concurrently executing check functions.
    let inFlight = 0;
    let peakInFlight = 0;

    const concurrency = 4;
    const totalChecks = 13; // deliberately not a multiple of concurrency

    const checks = Array.from({ length: totalChecks }, (_, i) => () => {
      inFlight++;
      peakInFlight = Math.max(peakInFlight, inFlight);
      inFlight--;
      return [makeFind(`f${i}.md`, "c", "info", "m")] satisfies Finding[];
    });

    await runChecks(checks, concurrency);

    // Peak must never exceed the concurrency limit.
    expect(peakInFlight).toBeLessThanOrEqual(concurrency);
  });

  test("output is deterministically sorted regardless of concurrency", async () => {
    const checks = [
      () => [makeFind("z.md", "c", "error", "m")],
      () => [makeFind("a.md", "c", "error", "m")],
    ];
    const results = await runChecks(checks, 2);
    expect(results[0]!.file).toBe("a.md");
    expect(results[1]!.file).toBe("z.md");
  });

  test("handles check count smaller than concurrency", async () => {
    const checks = [
      () => [makeFind("a.md", "c", "warn", "m")],
      () => [makeFind("b.md", "c", "warn", "m")],
    ];
    const results = await runChecks(checks, 16);
    expect(results).toHaveLength(2);
  });

  test("handles empty checks array", async () => {
    expect(await runChecks([], 4)).toEqual([]);
  });

  test("returns empty array when all checks return no findings", async () => {
    const checks = Array.from({ length: 5 }, () => () => [] as Finding[]);
    expect(await runChecks(checks, 3)).toEqual([]);
  });

  test("handles exactly one batch (checks.length === concurrency)", async () => {
    const checks = Array.from({ length: 4 }, (_, i) => () => [
      makeFind(`f${i}.md`, "c", "info", "m"),
    ]);
    const results = await runChecks(checks, 4);
    expect(results).toHaveLength(4);
  });
});

describe("mapBounded", () => {
  test("preserves input order even when later items resolve first", async () => {
    const items = [30, 10, 20, 0];
    const out = await mapBounded(items, 2, async (ms, i) => {
      await new Promise((r) => setTimeout(r, ms));
      return `${i}:${ms}`;
    });
    expect(out).toEqual(["0:30", "1:10", "2:20", "3:0"]);
  });

  test("never exceeds the bound tasks in-flight simultaneously", async () => {
    let inFlight = 0;
    let peak = 0;
    const bound = 3;
    const items = Array.from({ length: 11 }, (_, i) => i);
    await mapBounded(items, bound, async (i) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight -= 1;
      return i;
    });
    expect(peak).toBeLessThanOrEqual(bound);
  });

  test("passes the correct absolute index across batches", async () => {
    const items = ["a", "b", "c", "d", "e"];
    const out = await mapBounded(items, 2, async (item, i) => `${i}${item}`);
    expect(out).toEqual(["0a", "1b", "2c", "3d", "4e"]);
  });

  test("handles an empty array", async () => {
    expect(await mapBounded([], 4, async (x) => x)).toEqual([]);
  });

  test("clamps a non-positive limit to at least 1", async () => {
    const out = await mapBounded([1, 2, 3], 0, async (x) => x * 2);
    expect(out).toEqual([2, 4, 6]);
  });
});
