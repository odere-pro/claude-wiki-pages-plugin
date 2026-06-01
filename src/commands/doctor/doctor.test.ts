import { test, expect, describe } from "bun:test";
import { execFileSync } from "node:child_process";
import { doctor, doctorExit } from "./doctor.ts";
import { makeVault, CLEAN_VAULT } from "../../test-helpers/sandbox/vault.ts";

describe("doctor", () => {
  test("a healthy vault passes the vault-scoped checks", () => {
    const sb = makeVault({ ...CLEAN_VAULT, "raw/.gitkeep": "" });
    execFileSync("git", ["init"], { cwd: sb.vault, stdio: "ignore" });

    const report = doctor({ target: sb.vault, pluginRoot: sb.vault });
    const byId = Object.fromEntries(report.results.map((c) => [c.id, c.status]));

    expect(byId["D01"]).toBe("pass"); // vault exists
    expect(byId["D02"]).toBe("pass"); // schema_version 1
    expect(byId["D05"]).toBe("pass"); // git repo
    expect(byId["D09"]).toBe("pass"); // verify clean
    expect(report.results).toHaveLength(10);
    sb.cleanup();
  });

  test("a missing vault fails D01 and --strict exits 3", () => {
    const report = doctor({ target: "/no/such/vault-xyz" });
    expect(report.results.find((c) => c.id === "D01")?.status).toBe("fail");
    expect(report.worst).toBe("fail");
    expect(doctorExit(report, true)).toBe(3);
    expect(doctorExit(report, false)).toBe(0);
  });

  test("--fix initialises git (D05) on a non-repo vault", () => {
    const sb = makeVault(CLEAN_VAULT);
    const before = doctor({ target: sb.vault, pluginRoot: sb.vault });
    expect(before.results.find((c) => c.id === "D05")?.status).toBe("warn");

    const after = doctor({ target: sb.vault, pluginRoot: sb.vault, fix: true });
    expect(after.results.find((c) => c.id === "D05")?.status).toBe("fixed");
    sb.cleanup();
  });
});
