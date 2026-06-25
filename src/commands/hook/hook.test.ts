/**
 * Colocated tests for src/commands/hook/hook.ts — the engine hook entry that
 * resolves the vault, narrows the stdin payload, and runs the named gate.
 *
 * The frontmatter rule logic is covered exhaustively in
 * frontmatter-gate.test.ts; here we pin the entry-level contract: vault
 * resolution via --target, the gate-name dispatch, and the block/allow result.
 */

import { describe, test, expect, afterEach } from "bun:test";
import { makeVault, type Sandbox } from "../../test-helpers/sandbox/vault.ts";
import { runHookGate, resolveGateName } from "./hook.ts";

const SCHEMA_CLAUDE_MD = `---
schema_version: 1
---
# Vault schema

### Required fields by type

| Type | Required fields | Conditional |
| --- | --- | --- |
| \`concept\` | \`parent path sources created updated status confidence\` | — |
`;

let sb: Sandbox | undefined;
afterEach(() => {
  sb?.cleanup();
  sb = undefined;
});

describe("Feature: Hook gates › gate dispatch — gate-name resolution", () => {
  test("accepts the known frontmatter gate", () => {
    expect(resolveGateName("frontmatter")).toBe("frontmatter");
  });
  test("rejects an unknown gate name", () => {
    expect(resolveGateName("bogus")).toBeUndefined();
    expect(resolveGateName(undefined)).toBeUndefined();
  });
});

describe("Feature: Hook gates › gate dispatch — frontmatter gate via --target", () => {
  test("a dirty wiki Write blocks with a reason", () => {
    sb = makeVault({ "CLAUDE.md": SCHEMA_CLAUDE_MD });
    const vaultName = sb.vault.split("/").pop() as string;
    const stdin = JSON.stringify({
      tool_name: "Write",
      tool_input: {
        file_path: `/p/${vaultName}/wiki/topics/x.md`,
        content: "# no frontmatter\n",
      },
    });
    const r = runHookGate({ gate: "frontmatter", stdin, target: sb.vault });
    expect(r.block).toBe(true);
    expect(r.reason).toContain("YAML frontmatter");
  });

  test("a clean wiki Write allows (no reason)", () => {
    sb = makeVault({ "CLAUDE.md": SCHEMA_CLAUDE_MD });
    const vaultName = sb.vault.split("/").pop() as string;
    const content = `---
type: concept
title: X
parent: "[[Y]]"
path: topics
sources: ["[[S]]"]
created: 2026-01-01
updated: 2026-01-02
status: published
confidence: 0.7
---
body
`;
    const stdin = JSON.stringify({
      tool_name: "Write",
      tool_input: { file_path: `/p/${vaultName}/wiki/topics/x.md`, content },
    });
    const r = runHookGate({ gate: "frontmatter", stdin, target: sb.vault });
    expect(r.block).toBe(false);
    expect(r.reason).toBeUndefined();
  });

  test("a non-wiki path passes through (allow)", () => {
    sb = makeVault({ "CLAUDE.md": SCHEMA_CLAUDE_MD });
    const stdin = JSON.stringify({
      tool_name: "Write",
      tool_input: { file_path: "/tmp/elsewhere.md", content: "# anything\n" },
    });
    const r = runHookGate({ gate: "frontmatter", stdin, target: sb.vault });
    expect(r.block).toBe(false);
  });

  test("malformed stdin JSON degrades to allow (the file path is empty → not gated)", () => {
    sb = makeVault({ "CLAUDE.md": SCHEMA_CLAUDE_MD });
    const r = runHookGate({ gate: "frontmatter", stdin: "not json", target: sb.vault });
    expect(r.block).toBe(false);
  });
});
