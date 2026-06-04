import { test, expect, describe } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { appendLog } from "./log.ts";
import { makeVault } from "../test-helpers/sandbox/vault.ts";

const VAULT = {
  "wiki/index.md": "---\ntitle: index\n---\n",
  "wiki/log.md":
    '---\ntitle: "Operations Log"\ntype: log\ncreated: 2026-06-01\nupdated: 2026-06-01\n---\n\n# Operations Log\n',
};

describe("appendLog", () => {
  test("appends a dated entry with details", () => {
    const sb = makeVault(VAULT);
    const wrote = appendLog(sb.vault, {
      verb: "heal",
      summary: "errors 3 → 0 in 2 iteration(s)",
      details: ["rollback: git revert abc123"],
      today: "2026-06-02",
    });
    expect(wrote).toBe(true);
    const log = readFileSync(join(sb.vault, "wiki/log.md"), "utf8");
    expect(log).toContain("## [2026-06-02] heal | errors 3 → 0 in 2 iteration(s)");
    expect(log).toContain("- rollback: git revert abc123");
    sb.cleanup();
  });

  test("is idempotent for an identical header", () => {
    const sb = makeVault(VAULT);
    const e = {
      verb: "migrate",
      summary: "schema_version 1 → 2 (3 change(s))",
      today: "2026-06-02",
    };
    expect(appendLog(sb.vault, e)).toBe(true);
    expect(appendLog(sb.vault, e)).toBe(false); // no duplicate
    const log = readFileSync(join(sb.vault, "wiki/log.md"), "utf8");
    expect(log.match(/migrate \| schema_version 1 → 2/g)).toHaveLength(1);
    sb.cleanup();
  });

  test("creates log.md when absent", () => {
    const sb = makeVault({ "wiki/index.md": "---\ntitle: index\n---\n" });
    expect(appendLog(sb.vault, { verb: "lint", summary: "ok", today: "2026-06-02" })).toBe(true);
    const log = readFileSync(join(sb.vault, "wiki/log.md"), "utf8");
    expect(log).toContain("type: log");
    expect(log).toContain("## [2026-06-02] lint | ok");
    sb.cleanup();
  });

  test("returns false when the vault has no wiki/", () => {
    const sb = makeVault({ "CLAUDE.md": "x" });
    expect(appendLog(sb.vault, { verb: "heal", summary: "x", today: "2026-06-02" })).toBe(false);
    sb.cleanup();
  });
});
