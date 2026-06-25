/**
 * Colocated tests for src/commands/hook/frontmatter-gate.ts — the hook-mode
 * decision logic that scripts/validate-frontmatter.sh ran inline (lines 408-447).
 *
 * Parity target (the bash hook-mode contract, verbatim):
 *   1. Path filter — only markdown under `<VAULT_NAME>/wiki/` is gated; anything
 *      else returns allow (the bash `exit 0` pass-through).
 *   2. Edit tool — block when old_string carried a required frontmatter field
 *      that new_string drops; otherwise allow.
 *   3. Write tool — block when validateContent finds a violation; the reason is
 *      the validateContent message verbatim.
 *   4. Empty content on a Write → allow (bash `[ -z "$CONTENT" ] && exit 0`).
 *
 * Schema resolution mirrors the bash `_resolve_schema_file`: the vault's
 * CLAUDE.md table if present, else the bundled template
 * skills/init/template/CLAUDE.md (so eval fixtures / pre-table vaults validate).
 */

import { describe, test, expect, afterEach } from "bun:test";
import { makeVault, type Sandbox } from "../../test-helpers/sandbox/vault.ts";
import { frontmatterGate } from "./frontmatter-gate.ts";

const SCHEMA_CLAUDE_MD = `---
schema_version: 1
---
# Vault schema

### Required fields by type

| Type | Required fields | Conditional |
| --- | --- | --- |
| \`concept\` | \`parent path sources created updated status confidence\` | — |
| \`topic\` | \`summary parent path sources created updated status confidence\` | — |
| \`entity\` | \`entity_type parent path sources created updated status confidence\` | — |
| \`index\` | \`aliases created updated\` | — |
`;

const CLEAN_CONCEPT = `---
type: concept
title: Photosynthesis
parent: "[[Biology]]"
path: topics/biology
sources: ["[[Some Source]]"]
created: 2026-01-01
updated: 2026-01-02
status: published
confidence: 0.9
---
# Photosynthesis
`;

let sb: Sandbox | undefined;
afterEach(() => {
  sb?.cleanup();
  sb = undefined;
});

/** Build the gate input the CLI passes after reading stdin + resolving the vault. */
function gate(args: {
  vault: string;
  vaultName: string;
  toolName: string;
  filePath: string;
  content?: string;
  oldString?: string;
  newString?: string;
}) {
  return frontmatterGate({
    vault: args.vault,
    vaultName: args.vaultName,
    input: {
      toolName: args.toolName,
      filePath: args.filePath,
      content: args.content ?? "",
      oldString: args.oldString ?? "",
      newString: args.newString ?? "",
    },
  });
}

describe("frontmatterGate — path filter (bash pass-through parity)", () => {
  test("a non-wiki path is allowed (not gated)", () => {
    sb = makeVault({ "CLAUDE.md": SCHEMA_CLAUDE_MD });
    const d = gate({
      vault: sb.vault,
      vaultName: "vault",
      toolName: "Write",
      filePath: "/tmp/not-a-wiki.md",
      content: "no frontmatter here\n",
    });
    expect(d.block).toBe(false);
  });

  test("a non-.md file under wiki/ is allowed (not gated)", () => {
    sb = makeVault({ "CLAUDE.md": SCHEMA_CLAUDE_MD });
    const d = gate({
      vault: sb.vault,
      vaultName: "vault",
      toolName: "Write",
      filePath: "/p/vault/wiki/data.json",
      content: "{}",
    });
    expect(d.block).toBe(false);
  });
});

describe("frontmatterGate — Write tool (validateContent parity)", () => {
  test("a clean concept page is allowed", () => {
    sb = makeVault({ "CLAUDE.md": SCHEMA_CLAUDE_MD });
    const d = gate({
      vault: sb.vault,
      vaultName: "vault",
      toolName: "Write",
      filePath: "/p/vault/wiki/topics/biology/photosynthesis.md",
      content: CLEAN_CONCEPT,
    });
    expect(d.block).toBe(false);
  });

  test("missing frontmatter is blocked with the validateContent reason", () => {
    sb = makeVault({ "CLAUDE.md": SCHEMA_CLAUDE_MD });
    const d = gate({
      vault: sb.vault,
      vaultName: "vault",
      toolName: "Write",
      filePath: "/p/vault/wiki/topics/no-fm.md",
      content: "# No frontmatter\n",
    });
    expect(d.block).toBe(true);
    expect(d.reason).toContain("YAML frontmatter");
  });

  test("empty content on a Write is allowed (bash empty-content guard)", () => {
    sb = makeVault({ "CLAUDE.md": SCHEMA_CLAUDE_MD });
    const d = gate({
      vault: sb.vault,
      vaultName: "vault",
      toolName: "Write",
      filePath: "/p/vault/wiki/topics/x.md",
      content: "",
    });
    expect(d.block).toBe(false);
  });
});

describe("frontmatterGate — Edit tool (field-removal parity)", () => {
  test("an Edit that drops a required field is blocked", () => {
    sb = makeVault({ "CLAUDE.md": SCHEMA_CLAUDE_MD });
    const d = gate({
      vault: sb.vault,
      vaultName: "vault",
      toolName: "Edit",
      filePath: "/p/vault/wiki/topics/x.md",
      oldString: "type: concept\ntitle: X",
      newString: "title: X",
    });
    expect(d.block).toBe(true);
    expect(d.reason).toContain("type");
  });

  test("an Edit that preserves all fields is allowed", () => {
    sb = makeVault({ "CLAUDE.md": SCHEMA_CLAUDE_MD });
    const d = gate({
      vault: sb.vault,
      vaultName: "vault",
      toolName: "Edit",
      filePath: "/p/vault/wiki/topics/x.md",
      oldString: "type: concept\ntitle: X",
      newString: "type: concept\ntitle: X (renamed)",
    });
    expect(d.block).toBe(false);
  });
});

describe("frontmatterGate — bundled-template fallback", () => {
  test("a vault CLAUDE.md without the table falls back to the bundled template", () => {
    // No "### Required fields by type" heading → bundled template enforces it.
    sb = makeVault({ "CLAUDE.md": "# Schema with no table\n" });
    const missingEntityType = CLEAN_CONCEPT.replace("type: concept", "type: entity").replace(
      'sources: ["[[Some Source]]"]',
      'sources: ["[[Some Source]]"]',
    );
    const d = gate({
      vault: sb.vault,
      vaultName: "vault",
      toolName: "Write",
      filePath: "/p/vault/wiki/topics/e.md",
      content: missingEntityType,
    });
    // entity requires entity_type per the bundled template; it is absent → block.
    expect(d.block).toBe(true);
    expect(d.reason).toContain("entity_type");
  });
});

describe("frontmatterGate — fail-closed on malformed vault table", () => {
  test("a heading present but zero data rows fails closed (block)", () => {
    sb = makeVault({
      "CLAUDE.md":
        "# Schema\n\n### Required fields by type\n\n| Type | Required fields | Conditional |\n| --- | --- | --- |\n",
    });
    const d = gate({
      vault: sb.vault,
      vaultName: "vault",
      toolName: "Write",
      filePath: "/p/vault/wiki/topics/x.md",
      content: CLEAN_CONCEPT,
    });
    expect(d.block).toBe(true);
    expect(d.reason).toContain("required-field table");
  });
});

describe("frontmatterGate — wiki-relative path for the path: check", () => {
  test("the path filter strips through <vaultName>/wiki/ to compute wiki-relative", () => {
    sb = makeVault({ "CLAUDE.md": SCHEMA_CLAUDE_MD });
    const wrongPath = CLEAN_CONCEPT.replace("path: topics/biology", "path: wrong/place");
    const d = gate({
      vault: sb.vault,
      vaultName: "vault",
      toolName: "Write",
      filePath: "/abs/p/vault/wiki/topics/biology/photosynthesis.md",
      content: wrongPath,
    });
    expect(d.block).toBe(true);
    expect(d.reason).toContain("topics/biology");
  });
});
