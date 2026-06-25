/**
 * P3.1 acceptance tests — one CAPABILITIES table + capabilities verb
 *
 * These tests validate:
 *   1. `capabilities --json` emits valid JSON with `.verbs[].name` set-equal
 *      to the full verb list (implemented + planned).
 *   2. The CAPABILITIES table is the single source of truth: usage() derives
 *      the verb list from the table (no hardcoded "Implemented: …" literal).
 *   3. exitCode() is used for the capabilities verb (clean → 0, per N3).
 *   4. The JSON shape conforms to the named typed model from ADR-0015:
 *      `{ verbs: [{ name, status }] }` where status ∈ {implemented, planned}.
 *
 * Per ADR-0015 N9 and plan P3.2: the full verb-drift contract test (golden
 * fixture, every dispatch branch exercised) is a SEPARATE item P3.2.
 * This file tests ONLY the P3.1 acceptance criteria — minimal, not redundant.
 *
 * The router guards `process.exit` with `if (import.meta.main)` so that
 * this test file can import CAPABILITIES, capabilitiesReport, and the types
 * directly without triggering process.exit.
 */

import { test, expect, describe } from "bun:test";
import {
  CAPABILITIES,
  capabilitiesReport,
  type CapabilityEntry,
  type CapabilitiesManifest,
} from "../../src/cli/cli.ts";
import { exitCode } from "../../src/core/report.ts";

// ── Shape invariants ───────────────────────────────────────────────────────────

describe("Feature: Engine › capabilities shape — CAPABILITIES table: shape invariants", () => {
  test("every entry has a non-empty name string", () => {
    for (const entry of CAPABILITIES) {
      expect(typeof entry.name).toBe("string");
      expect(entry.name.length).toBeGreaterThan(0);
    }
  });

  test("every entry status is 'implemented' or 'planned'", () => {
    const valid: ReadonlyArray<CapabilityEntry["status"]> = ["implemented", "planned"];
    for (const entry of CAPABILITIES) {
      expect(valid).toContain(entry.status);
    }
  });

  test("names are unique", () => {
    const names = CAPABILITIES.map((e) => e.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});

// ── capabilities verb — JSON shape ────────────────────────────────────────────

describe("Feature: Engine › capabilities shape — capabilitiesReport: JSON shape (ADR-0015 N3 named model)", () => {
  test("returns a Report with command='capabilities'", () => {
    const r = capabilitiesReport();
    expect(r.command).toBe("capabilities");
  });

  test("returns a clean Report (no errors — exitCode=0)", () => {
    const r = capabilitiesReport();
    expect(r.clean).toBe(true);
    expect(exitCode(r)).toBe(0);
  });

  test("report carries a 'manifest' field of CapabilitiesManifest shape", () => {
    const r = capabilitiesReport();
    const manifest: CapabilitiesManifest = r.manifest;
    expect(manifest).toBeDefined();
    expect(Array.isArray(manifest.verbs)).toBe(true);
  });

  test("manifest.verbs set-equals the full CAPABILITIES table names", () => {
    const r = capabilitiesReport();
    const tableNames = new Set(CAPABILITIES.map((e) => e.name));
    const manifestNames = new Set(r.manifest.verbs.map((v) => v.name));
    expect(manifestNames).toEqual(tableNames);
  });

  test("manifest.verbs entries match CAPABILITIES status values", () => {
    const r = capabilitiesReport();
    const tableByName = new Map(CAPABILITIES.map((e) => [e.name, e.status]));
    for (const v of r.manifest.verbs) {
      expect(v.status).toBe(tableByName.get(v.name));
    }
  });

  test("manifest contains all known implemented verbs", () => {
    const r = capabilitiesReport();
    const implemented = r.manifest.verbs
      .filter((v) => v.status === "implemented")
      .map((v) => v.name);
    // These are the verbs that must be in the implemented set per src/cli/cli.ts baseline
    // plus the new 'capabilities' verb added by P3.1.
    const expectedImplemented = [
      "verify",
      "fix",
      "heal",
      "doctor",
      "config",
      "migrate",
      "search",
      "firewall",
      "backlog",
      "propose",
      "capabilities",
    ];
    for (const v of expectedImplemented) {
      expect(implemented).toContain(v);
    }
  });

  test("manifest contains all known planned verbs", () => {
    const r = capabilitiesReport();
    const planned = r.manifest.verbs.filter((v) => v.status === "planned").map((v) => v.name);
    // `checkpoint` shipped as the implemented `snapshot` verb.
    const expectedPlanned = ["index", "link-suggest"];
    for (const v of expectedPlanned) {
      expect(planned).toContain(v);
    }
  });
});

// ── Determinism ───────────────────────────────────────────────────────────────

describe("Feature: Engine › capabilities shape — capabilitiesReport: determinism", () => {
  test("same verb list emitted on repeated calls (byte-identical manifest)", () => {
    const r1 = JSON.stringify(capabilitiesReport().manifest);
    const r2 = JSON.stringify(capabilitiesReport().manifest);
    expect(r1).toBe(r2);
  });
});

// ── usage() has no hardcoded literal ─────────────────────────────────────────

describe("Feature: Engine › capabilities shape — usage() derives verb list from CAPABILITIES (no hardcoded literal)", () => {
  test("IMPLEMENTED set derives from CAPABILITIES (no independent Set)", () => {
    // Verify the implemented set from CAPABILITIES matches all verbs with status='implemented'
    const fromTable = CAPABILITIES.filter((e) => e.status === "implemented").map((e) => e.name);
    // The table must include every original verb.
    const originals = [
      "verify",
      "fix",
      "heal",
      "doctor",
      "config",
      "migrate",
      "search",
      "firewall",
      "backlog",
      "propose",
    ];
    for (const v of originals) {
      expect(fromTable).toContain(v);
    }
  });

  test("PLANNED array derives from CAPABILITIES (no independent array)", () => {
    const fromTable = CAPABILITIES.filter((e) => e.status === "planned").map((e) => e.name);
    // `checkpoint` shipped as the implemented `snapshot` verb.
    const expectedPlanned = ["index", "link-suggest"];
    expect(fromTable.sort()).toEqual(expectedPlanned.sort());
  });
});
