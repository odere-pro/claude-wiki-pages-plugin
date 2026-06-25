/**
 * Colocated tests for src/commands/hook/wikilink-gate.ts — the hook-mode half of
 * scripts/check-wikilinks.sh.
 *
 * Parity target (the bash hook contract, verbatim):
 *   - Path filter: only paths under <vaultName>/wiki/ are gated.
 *   - Edit: scan new_string directly; block on an introduced [text](file.md)
 *     link with the "Edit introduces …" reason.
 *   - Write: empty content → allow; else block on a [text](file.md) link with
 *     the check_content reason.
 */

import { describe, test, expect } from "bun:test";
import { wikilinkHookGate } from "./wikilink-gate.ts";
import type { HookInput } from "../../core/hook-input.ts";

const VAULT_NAME = "vault";

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

describe("Feature: Hook gates › wikilink gate", () => {
  test("out-of-scope path (not under wiki/) → allow", () => {
    const d = wikilinkHookGate({
      vaultName: VAULT_NAME,
      input: input({ filePath: "/p/other/x.md", content: "[a](b.md)" }),
    });
    expect(d.block).toBe(false);
  });

  test("Write of a clean wiki body → allow", () => {
    const d = wikilinkHookGate({
      vaultName: VAULT_NAME,
      input: input({
        filePath: `/p/${VAULT_NAME}/wiki/topics/x.md`,
        content: "# Title\nSee [[Other Page]].",
      }),
    });
    expect(d.block).toBe(false);
  });

  test("Write of a no-frontmatter body with a link → allow (bash sed quirk)", () => {
    // VERBATIM bash contract: `sed '1,/^---$/d'` strips the WHOLE content when
    // there is no `---` frontmatter, so a no-frontmatter body never blocks.
    const d = wikilinkHookGate({
      vaultName: VAULT_NAME,
      input: input({
        filePath: `/p/${VAULT_NAME}/wiki/topics/x.md`,
        content: "# Title\nSee [the page](other.md).",
      }),
    });
    expect(d.block).toBe(false);
  });

  test("Write with frontmatter + a body [text](file.md) link → block with check_content reason", () => {
    const d = wikilinkHookGate({
      vaultName: VAULT_NAME,
      input: input({
        filePath: `/p/${VAULT_NAME}/wiki/topics/x.md`,
        content: "---\ntitle: X\n---\nSee [the page](other.md).",
      }),
    });
    expect(d.block).toBe(true);
    expect(d.reason).toContain("[text](file.md)");
    expect(d.reason).toContain("[[Page Title]]");
    expect(d.reason).toContain("(e.g. [the page](other.md))");
  });

  test("Write with empty content → allow", () => {
    const d = wikilinkHookGate({
      vaultName: VAULT_NAME,
      input: input({ filePath: `/p/${VAULT_NAME}/wiki/topics/x.md`, content: "" }),
    });
    expect(d.block).toBe(false);
  });

  test("link inside a fenced code block (with frontmatter) → allow (fence stripped)", () => {
    const d = wikilinkHookGate({
      vaultName: VAULT_NAME,
      input: input({
        filePath: `/p/${VAULT_NAME}/wiki/topics/x.md`,
        content: "---\ntitle: T\n---\n```\n[ex](a.md)\n```\n",
      }),
    });
    expect(d.block).toBe(false);
  });

  test("Edit new_string with a markdown link → block with 'Edit introduces' reason", () => {
    const d = wikilinkHookGate({
      vaultName: VAULT_NAME,
      input: input({
        toolName: "Edit",
        filePath: `/p/${VAULT_NAME}/wiki/topics/x.md`,
        newString: "See [the page](other.md).",
      }),
    });
    expect(d.block).toBe(true);
    expect(d.reason).toContain("Edit introduces");
    expect(d.reason).toContain("(e.g. [the page](other.md))");
  });

  test("Edit new_string with no link → allow", () => {
    const d = wikilinkHookGate({
      vaultName: VAULT_NAME,
      input: input({
        toolName: "Edit",
        filePath: `/p/${VAULT_NAME}/wiki/topics/x.md`,
        newString: "See [[Other Page]].",
      }),
    });
    expect(d.block).toBe(false);
  });

  test("Edit with empty new_string → allow", () => {
    const d = wikilinkHookGate({
      vaultName: VAULT_NAME,
      input: input({
        toolName: "Edit",
        filePath: `/p/${VAULT_NAME}/wiki/topics/x.md`,
        newString: "",
      }),
    });
    expect(d.block).toBe(false);
  });
});
