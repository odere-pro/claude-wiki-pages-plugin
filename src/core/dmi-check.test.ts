/**
 * TDD: dmi-check — disable-model-invocation enforcement for SKILL.md writes.
 *
 * Ports the decision logic of scripts/enforce-dmi.sh (the lone PreToolUse hook
 * that exits 2 — a HARD block) into a pure TypeScript core module. The bash
 * script blocks writes to a skills SKILL.md path when the body carries a
 * side-effecting verb (scaffold/deploy/commit/push/publish/release/delete/post/
 * write/create/overwrite) but the frontmatter is MISSING
 * `disable-model-invocation: true`.
 *
 * CRITICAL integration contract (migration-plan.md Phase 3): the thin bash
 * wrapper must preserve enforce-dmi's HARD `exit 2` semantics. This module
 * encodes the violation DISTINCTLY — a dedicated `DMI_CHECK` finding plus a
 * typed `dmiDecision()` helper that maps a violation to exit code 2 — so the
 * wrapper never confuses a DMI hard-block with a normal error-tier (exit 1)
 * finding.
 *
 * Cases mirrored from scripts/enforce-dmi.sh:
 *   1. Non-SKILL.md path → no finding (path filter, bash exits 0).
 *   2. SKILL.md with `disable-model-invocation: true` → no finding (bash exits 0).
 *   3. SKILL.md with a side-effecting verb and NO DMI flag → DMI finding (bash exits 2).
 *   4. SKILL.md with no side-effecting verb and no DMI flag → no finding.
 *   5. Empty content → no finding (bash exits 0).
 *   6. Each side-effecting verb individually triggers the block.
 *   7. Verb only in frontmatter (before second `---`) → still scanned per bash:
 *      bash scans the BODY after the closing fence; verb in frontmatter is not
 *      a body verb. (We mirror the awk body-extraction.)
 *   8. dmiDecision() maps a violation to exit 2, a clean input to exit 0.
 */

import { test, expect, describe } from "bun:test";
import { checkDmi, dmiDecision, DMI_CHECK } from "./dmi-check.ts";

const SKILL_PATH = "skills/deploy/SKILL.md";

const withDmi = (body: string): string =>
  `---\nname: deploy\ndisable-model-invocation: true\n---\n${body}`;

const withoutDmi = (body: string): string => `---\nname: deploy\n---\n${body}`;

// ---------------------------------------------------------------------------
// Unit: check name constant
// ---------------------------------------------------------------------------

describe("Feature: Verify › DMI check — unit: constant", () => {
  test("DMI_CHECK is 'dmi'", () => {
    expect(DMI_CHECK).toBe("dmi");
  });
});

// ---------------------------------------------------------------------------
// Unit: path filter
// ---------------------------------------------------------------------------

describe("Feature: Verify › DMI check — unit: path filter", () => {
  test("non-SKILL.md path → no finding", () => {
    const findings = checkDmi("wiki/concepts/deploy.md", withoutDmi("This deploy will push code."));
    expect(findings).toEqual([]);
  });

  test("README.md inside skills/ → no finding (only SKILL.md is gated)", () => {
    const findings = checkDmi("skills/deploy/README.md", withoutDmi("Deploy and push."));
    expect(findings).toEqual([]);
  });

  test("SKILL.md under skills/ matches the path filter", () => {
    const findings = checkDmi(SKILL_PATH, withoutDmi("This will deploy the build."));
    expect(findings.length).toBeGreaterThan(0);
  });

  test("nested skills path also matches (.../skills/x/SKILL.md)", () => {
    const findings = checkDmi(
      "plugin/skills/release/SKILL.md",
      withoutDmi("This will publish a release."),
    );
    expect(findings.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Unit: DMI flag present → pass
// ---------------------------------------------------------------------------

describe("Feature: Verify › DMI check — unit: disable-model-invocation present", () => {
  test("DMI flag present + side-effecting verb → no finding", () => {
    const findings = checkDmi(SKILL_PATH, withDmi("This skill will deploy and push code."));
    expect(findings).toEqual([]);
  });

  test("DMI flag with extra spacing still recognised", () => {
    const content = `---\nname: deploy\ndisable-model-invocation:    true\n---\nThis will publish.`;
    const findings = checkDmi(SKILL_PATH, content);
    expect(findings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Unit: side-effecting verb without DMI flag → block finding
// ---------------------------------------------------------------------------

describe("Feature: Verify › DMI check — unit: side-effecting verb without DMI", () => {
  test("side-effecting verb + no DMI flag → one DMI finding", () => {
    const findings = checkDmi(SKILL_PATH, withoutDmi("This skill will deploy the artifact."));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.check).toBe(DMI_CHECK);
  });

  test("finding is error-severity (hard block, distinct via check name)", () => {
    const findings = checkDmi(SKILL_PATH, withoutDmi("Push to remote."));
    expect(findings[0]?.severity).toBe("error");
  });

  test("finding message names the file and the missing flag", () => {
    const findings = checkDmi(SKILL_PATH, withoutDmi("This will commit."));
    expect(findings[0]?.message).toContain("disable-model-invocation");
    expect(findings[0]?.message.toLowerCase()).toContain("block");
  });

  test("finding carries the file path", () => {
    const findings = checkDmi(SKILL_PATH, withoutDmi("Will delete the page."));
    expect(findings[0]?.file).toBe(SKILL_PATH);
  });

  test.each([
    "scaffold",
    "deploy",
    "commit",
    "push",
    "publish",
    "release",
    "delete",
    "post",
    "write",
    "writes",
    "create",
    "creates",
    "overwrite",
    "overwrites",
  ])("verb '%s' triggers the block", (verb) => {
    const findings = checkDmi(SKILL_PATH, withoutDmi(`This skill will ${verb} things.`));
    expect(findings.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Unit: clean / no-op cases
// ---------------------------------------------------------------------------

describe("Feature: Verify › DMI check — unit: clean inputs", () => {
  test("no side-effecting verb + no DMI flag → no finding", () => {
    const findings = checkDmi(SKILL_PATH, withoutDmi("This skill reads and summarises notes."));
    expect(findings).toEqual([]);
  });

  test("empty content → no finding", () => {
    const findings = checkDmi(SKILL_PATH, "");
    expect(findings).toEqual([]);
  });

  test("whitespace-only content → no finding", () => {
    const findings = checkDmi(SKILL_PATH, "   \n  \n");
    expect(findings).toEqual([]);
  });

  test("verb as substring of a larger word is NOT matched (word boundary)", () => {
    // 'deploys' contains 'deploy' but 'redeployment' should not trip 'deploy'.
    const findings = checkDmi(
      SKILL_PATH,
      withoutDmi("This documents redeployment-style approaches abstractly."),
    );
    expect(findings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Unit: body extraction
// ---------------------------------------------------------------------------

describe("Feature: Verify › DMI check — unit: body extraction", () => {
  test("verb only inside frontmatter is not counted as a body verb", () => {
    // bash awk extracts the body after the second `---`; a verb living only in
    // frontmatter metadata is not body prose.
    const content = `---\nname: deploy\ndescription: how to deploy safely\n---\nThis skill reads notes only.`;
    const findings = checkDmi(SKILL_PATH, content);
    expect(findings).toEqual([]);
  });

  test("content with no frontmatter fences is scanned as a whole", () => {
    // bash falls back to scanning the whole content when no body is extracted.
    const findings = checkDmi(SKILL_PATH, "This skill will deploy without frontmatter.");
    expect(findings.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Unit: typed decision helper (exit-2 mapping)
// ---------------------------------------------------------------------------

describe("Feature: Verify › DMI check — unit: dmiDecision (exit-2 contract)", () => {
  test("violation maps to exitCode 2 (HARD block)", () => {
    const findings = checkDmi(SKILL_PATH, withoutDmi("This will push to prod."));
    const decision = dmiDecision(findings, SKILL_PATH);
    expect(decision.blocked).toBe(true);
    expect(decision.exitCode).toBe(2);
    expect(decision.reason).toContain("disable-model-invocation");
  });

  test("clean input maps to exitCode 0 (pass)", () => {
    const findings = checkDmi(SKILL_PATH, withDmi("This will deploy safely."));
    const decision = dmiDecision(findings, SKILL_PATH);
    expect(decision.blocked).toBe(false);
    expect(decision.exitCode).toBe(0);
    expect(decision.reason).toBe("");
  });

  test("non-DMI findings do not trigger the exit-2 block", () => {
    // A finding from another check (different `check` name) must not be mapped
    // to the DMI hard block — only DMI_CHECK findings drive exit 2.
    const foreign = [
      { severity: "error" as const, check: "schema", message: "unrelated", file: SKILL_PATH },
    ];
    const decision = dmiDecision(foreign, SKILL_PATH);
    expect(decision.blocked).toBe(false);
    expect(decision.exitCode).toBe(0);
  });
});
