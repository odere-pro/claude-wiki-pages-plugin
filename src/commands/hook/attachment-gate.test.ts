/**
 * Colocated tests for src/commands/hook/attachment-gate.ts — the hook-mode half
 * of scripts/validate-attachments.sh.
 *
 * Parity target (the bash hook contract, verbatim):
 *   - Only wiki/_sources/*.md writes are inspected.
 *   - source_format text/unset → allow.
 *   - source_format non-text + no attachment_path → block ("no attachment_path").
 *   - source_format non-text + dangling attachment_path → block ("does not exist").
 *   - source_format non-text + existing attachment → allow.
 *   - Edit reconstructs post-edit content from disk (old_string→new_string).
 */

import { describe, test, expect } from "bun:test";
import { attachmentHookGate } from "./attachment-gate.ts";
import type { HookInput } from "../../core/hook-input.ts";

function input(over: Partial<HookInput>): HookInput {
  return Object.freeze({
    toolName: "Write",
    filePath: "",
    content: "",
    oldString: "",
    newString: "",
    ...over,
  });
}

const SRC = "/p/vault/wiki/_sources/img.md";

function note(fields: string): string {
  return `---\ntype: source\n${fields}\n---\n# Img\n`;
}

describe("Feature: Hook gates › attachment gate", () => {
  test("out-of-scope path → allow", () => {
    const d = attachmentHookGate({
      input: input({
        filePath: "/p/vault/wiki/topics/x.md",
        content: note("source_format: image"),
      }),
    });
    expect(d.block).toBe(false);
  });

  test("text source → allow", () => {
    const d = attachmentHookGate({
      input: input({ filePath: SRC, content: note("source_format: text") }),
    });
    expect(d.block).toBe(false);
  });

  test("source_format unset → allow", () => {
    const d = attachmentHookGate({ input: input({ filePath: SRC, content: note("url: x") }) });
    expect(d.block).toBe(false);
  });

  test("non-text source with no attachment_path → block", () => {
    const d = attachmentHookGate({
      input: input({ filePath: SRC, content: note("source_format: image") }),
    });
    expect(d.block).toBe(true);
    expect(d.reason).toContain("no attachment_path");
  });

  test("non-text source with dangling attachment_path → block", () => {
    const d = attachmentHookGate({
      input: input({
        filePath: SRC,
        content: note('source_format: image\nattachment_path: "raw/assets/nope.png"'),
      }),
      exists: () => false,
    });
    expect(d.block).toBe(true);
    expect(d.reason).toContain("does not exist");
  });

  test("non-text source with an existing attachment → allow", () => {
    const d = attachmentHookGate({
      input: input({
        filePath: SRC,
        content: note('source_format: image\nattachment_path: "raw/assets/real.png"'),
      }),
      exists: () => true,
    });
    expect(d.block).toBe(false);
  });

  test("Edit reconstructs post-edit content from disk and blocks", () => {
    const onDisk = note("source_format: text");
    const d = attachmentHookGate({
      input: input({
        toolName: "Edit",
        filePath: SRC,
        oldString: "source_format: text",
        newString: "source_format: image",
      }),
      readFile: () => onDisk,
      exists: () => false,
    });
    expect(d.block).toBe(true);
    expect(d.reason).toContain("no attachment_path");
  });

  test("Edit to a missing file → allow (bash [ -f ] guard)", () => {
    const d = attachmentHookGate({
      input: input({ toolName: "Edit", filePath: SRC, oldString: "a", newString: "b" }),
      readFile: () => null,
    });
    expect(d.block).toBe(false);
  });
});
