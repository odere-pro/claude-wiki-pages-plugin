/**
 * Colocated tests for src/core/hook-input.ts — the untrusted-boundary parser
 * for the PreToolUse hook's stdin JSON.
 *
 * The hook payload is externally controlled (migration-plan.md "Error handling":
 * never trust the payload shape). These tests pin the hand-rolled guard against
 * the shapes scripts/validate-frontmatter.sh extracted via jq:
 *   .tool_input.file_path // .tool_input.file // empty
 *   .tool_name
 *   .tool_input.content // empty
 *   .tool_input.old_string / .tool_input.new_string
 */

import { describe, test, expect } from "bun:test";
import { parseHookInput } from "./hook-input.ts";

describe("parseHookInput — tolerant boundary parsing", () => {
  test("extracts file_path, tool_name, content from a Write payload", () => {
    const json = JSON.stringify({
      tool_name: "Write",
      tool_input: { file_path: "/p/vault/wiki/topics/x.md", content: "---\ntype: topic\n---\n" },
    });
    const hi = parseHookInput(json);
    expect(hi.filePath).toBe("/p/vault/wiki/topics/x.md");
    expect(hi.toolName).toBe("Write");
    expect(hi.content).toBe("---\ntype: topic\n---\n");
  });

  test("falls back to tool_input.file when file_path is absent (jq // semantics)", () => {
    const json = JSON.stringify({ tool_name: "Edit", tool_input: { file: "/p/vault/wiki/a.md" } });
    const hi = parseHookInput(json);
    expect(hi.filePath).toBe("/p/vault/wiki/a.md");
  });

  test("extracts old_string and new_string for the Edit field-removal check", () => {
    const json = JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: "/p/vault/wiki/a.md", old_string: "type: topic", new_string: "x" },
    });
    const hi = parseHookInput(json);
    expect(hi.oldString).toBe("type: topic");
    expect(hi.newString).toBe("x");
  });

  test("missing fields degrade to empty strings, never throw (fail-open advisory shape)", () => {
    const hi = parseHookInput("{}");
    expect(hi.filePath).toBe("");
    expect(hi.toolName).toBe("");
    expect(hi.content).toBe("");
    expect(hi.oldString).toBe("");
    expect(hi.newString).toBe("");
  });

  test("malformed JSON degrades to empty fields, never throw", () => {
    const hi = parseHookInput("not json at all {{{");
    expect(hi.filePath).toBe("");
    expect(hi.toolName).toBe("");
  });

  test("non-string field values are coerced to empty (untrusted shape)", () => {
    const json = JSON.stringify({
      tool_name: 42,
      tool_input: { file_path: { nested: true }, content: ["a"] },
    });
    const hi = parseHookInput(json);
    expect(hi.filePath).toBe("");
    expect(hi.toolName).toBe("");
    expect(hi.content).toBe("");
  });
});
