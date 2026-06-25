/**
 * Colocated tests for must-rule-check.ts — TS port of scripts/enforce-must-rule.sh.
 *
 * Behavioural-equivalence targets (the bash script, lines 22-38):
 *   - path filter: only a nested CLAUDE.md or bare CLAUDE.md are inspected
 *   - text source: Write→content, Edit→new_string; MultiEdit (neither) → no-op
 *   - heuristic: grep -ciE '\b(must|never|always)\b' counts MATCHING LINES
 *   - never blocks: warn-tier only, always advisory (bash always exits 0)
 *
 * makeVault is not needed here — this gate inspects the hook stdin payload, not
 * the on-disk vault — so the tests synthesise payload objects directly.
 */

import { describe, expect, test } from "bun:test";
import { checkMustRule } from "./must-rule-check.ts";

/** Build a minimal Write-tool payload as the hook receives it on stdin. */
function writePayload(filePath: string, content: string): unknown {
  return { tool_input: { file_path: filePath, content } };
}

/** Build a minimal Edit-tool payload (new_string carries the added text). */
function editPayload(filePath: string, newString: string): unknown {
  return { tool_input: { file_path: filePath, new_string: newString } };
}

describe("checkMustRule — path filter", () => {
  test("ignores a non-CLAUDE.md file even with rule words", () => {
    const findings = checkMustRule(writePayload("wiki/page.md", "You must never do this."));
    expect(findings).toEqual([]);
  });

  test("acts on a nested CLAUDE.md path", () => {
    const findings = checkMustRule(writePayload("skills/foo/CLAUDE.md", "Always commit."));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warn");
    expect(findings[0]?.check).toBe("must-rule");
  });

  test("acts on a bare CLAUDE.md path", () => {
    const findings = checkMustRule(writePayload("CLAUDE.md", "You must do X."));
    expect(findings).toHaveLength(1);
  });

  test("ignores a file whose basename merely contains CLAUDE.md", () => {
    const findings = checkMustRule(writePayload("NOTCLAUDE.md", "You must do X."));
    expect(findings).toEqual([]);
  });

  test("ignores a path with empty file_path", () => {
    const findings = checkMustRule(writePayload("", "You must do X."));
    expect(findings).toEqual([]);
  });
});

describe("checkMustRule — text source selection", () => {
  test("reads content for a Write payload", () => {
    const findings = checkMustRule(writePayload("CLAUDE.md", "must"));
    expect(findings).toHaveLength(1);
  });

  test("reads new_string for an Edit payload", () => {
    const findings = checkMustRule(editPayload("CLAUDE.md", "never"));
    expect(findings).toHaveLength(1);
  });

  test("prefers content over new_string when both present", () => {
    const payload = {
      tool_input: { file_path: "CLAUDE.md", content: "must", new_string: "plain text" },
    };
    const findings = checkMustRule(payload);
    expect(findings).toHaveLength(1);
  });

  test("no-ops on MultiEdit-style payload with neither content nor new_string", () => {
    const payload = {
      tool_input: { file_path: "CLAUDE.md", edits: [{ old_string: "a", new_string: "must" }] },
    };
    const findings = checkMustRule(payload);
    expect(findings).toEqual([]);
  });

  test("no-ops when the added text is empty", () => {
    const findings = checkMustRule(writePayload("CLAUDE.md", ""));
    expect(findings).toEqual([]);
  });
});

describe("checkMustRule — rule-word heuristic (grep -ciE line semantics)", () => {
  test("no finding when no imperative rule word is present", () => {
    const findings = checkMustRule(writePayload("CLAUDE.md", "This is a gentle suggestion."));
    expect(findings).toEqual([]);
  });

  test("is case-insensitive (Must / NEVER / Always)", () => {
    const findings = checkMustRule(
      writePayload("CLAUDE.md", "You Must.\nNEVER again.\nAlways verify."),
    );
    expect(findings).toHaveLength(1);
    // three matching lines
    expect(findings[0]?.message).toContain("3");
  });

  test("counts matching LINES, not total occurrences (multiple words on one line)", () => {
    const findings = checkMustRule(writePayload("CLAUDE.md", "You must always never deviate."));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("1");
  });

  test("requires word boundaries — 'mustard' alone does not match", () => {
    const findings = checkMustRule(writePayload("CLAUDE.md", "I like mustard and sweaters."));
    expect(findings).toEqual([]);
  });

  test("counts each distinct matching line", () => {
    const findings = checkMustRule(
      writePayload("CLAUDE.md", "line one must\nplain line\nline three never\n"),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("2");
  });

  test("reports the CLAUDE.md path in the finding file field", () => {
    const findings = checkMustRule(writePayload("skills/x/CLAUDE.md", "must"));
    expect(findings[0]?.file).toBe("skills/x/CLAUDE.md");
  });
});

describe("checkMustRule — untrusted-input narrowing (never throws)", () => {
  test("returns [] on a non-object payload", () => {
    expect(checkMustRule(null)).toEqual([]);
    expect(checkMustRule(undefined)).toEqual([]);
    expect(checkMustRule("a string")).toEqual([]);
    expect(checkMustRule(42)).toEqual([]);
  });

  test("returns [] when tool_input is missing", () => {
    expect(checkMustRule({})).toEqual([]);
  });

  test("returns [] when tool_input is not an object", () => {
    expect(checkMustRule({ tool_input: "nope" })).toEqual([]);
  });

  test("returns [] when file_path is not a string", () => {
    expect(checkMustRule({ tool_input: { file_path: 123, content: "must" } })).toEqual([]);
  });

  test("ignores non-string content/new_string values", () => {
    expect(checkMustRule({ tool_input: { file_path: "CLAUDE.md", content: 5 } })).toEqual([]);
    expect(checkMustRule({ tool_input: { file_path: "CLAUDE.md", new_string: { a: 1 } } })).toEqual(
      [],
    );
  });
});

describe("checkMustRule — never blocks", () => {
  test("every finding is warn severity (advisory, exit-0 contract)", () => {
    const findings = checkMustRule(writePayload("CLAUDE.md", "must\nnever\nalways"));
    expect(findings.every((f) => f.severity === "warn")).toBe(true);
  });
});
