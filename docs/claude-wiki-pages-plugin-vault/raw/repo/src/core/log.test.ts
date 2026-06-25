import { test, expect, describe } from "bun:test";
import { readFileSync, chmodSync, statSync } from "node:fs";
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

  test("returns false (does not throw) when the log file is not writable", () => {
    const sb = makeVault(VAULT);
    const logPath = join(sb.vault, "wiki/log.md");
    chmodSync(logPath, 0o444);

    // Guard: skip where chmod is a no-op (root bypasses perms; some FS ignore
    // the mode). If the owner-write bit survived the chmod, the negative
    // condition can't be created — assert nothing rather than give a false pass.
    const writableBitGone = (statSync(logPath).mode & 0o200) === 0;
    const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
    if (!writableBitGone || isRoot) {
      chmodSync(logPath, 0o644);
      sb.cleanup();
      return;
    }

    let wrote: boolean | undefined;
    expect(() => {
      wrote = appendLog(sb.vault, { verb: "heal", summary: "blocked write", today: "2026-06-02" });
    }).not.toThrow();
    expect(wrote).toBe(false);

    chmodSync(logPath, 0o644); // restore so cleanup can remove it
    sb.cleanup();
  });

  test("uses a valid ISO date when today is not injected (wall-clock fallback)", () => {
    const sb = makeVault({ "wiki/index.md": "---\ntitle: index\n---\n" });
    const wrote = appendLog(sb.vault, { verb: "sync", summary: "fallback date test" });
    expect(wrote).toBe(true);
    const log = readFileSync(join(sb.vault, "wiki/log.md"), "utf8");
    // Assert format only — never a specific date — so the test is non-flaky
    expect(log).toMatch(/## \[\d{4}-\d{2}-\d{2}\] sync \| fallback date test/);
    sb.cleanup();
  });
});
